import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Pressable, Image, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useTranslation } from '@/constants/translations';
import { useUserStore } from '@/store/userStore';
import Colors from '@/constants/colors';
import { X, Eye, EyeOff, Facebook, Chrome, MessageCircle as AlertIcon, MessageCircle } from 'lucide-react-native';
// import { Alert } from 'react-native';
import { initiateSocialLogin, showSocialLoginError } from '@/utils/socialAuth';
import { trpc } from '@/lib/trpc';
import { logger } from '@/utils/logger';
import { validateEmail } from '@/utils/inputValidation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, UserRole } from '@/types/user';

export default function LoginScreen() {
  console.log('[Login] Component mounted');

  const router = useRouter();
  const { t, language } = useTranslation();
  const { login } = useUserStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSocial, setLoadingSocial] = useState<string | null>(null);

  const loginMutation = trpc.auth.login.useMutation();

  const handleLogin = async () => {
    console.log('[Login] handleLogin called', { email, hasPassword: !!password });
    logger.info('[Login] Login button clicked', { email: email?.substring(0, 5) + '...' });

    // ===== VALIDATION START =====

    // 1. Email validation
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
      console.log('[Login] Email validation failed');
      Alert.alert(
        t('error'),
        t('emailRequired') || 'Email tələb olunur',
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert(
        t('error'),
        t('invalidEmail') || 'Düzgün email daxil edin',
      );
      return;
    }

    if (email.length > 255) {
      Alert.alert(
        t('error'),
        'Email çox uzundur (maks 255 simvol)',
      );
      return;
    }

    // 2. Password validation
    if (!password || typeof password !== 'string' || password.length === 0) {
      Alert.alert(
        t('error'),
        t('passwordRequired') || 'Şifrə tələb olunur',
      );
      return;
    }

    if (password.length < 6) {
      Alert.alert(
        t('error'),
        'Şifrə ən azı 6 simvol olmalıdır',
      );
      return;
    }

    if (password.length > 128) {
      Alert.alert(
        t('error'),
        'Şifrə çox uzundur (maks 128 simvol)',
      );
      return;
    }

    // ===== VALIDATION END =====

    setIsLoading(true);
    console.log('[Login] Starting login mutation...');

    try {
      // ✅ Use tRPC mutation for real backend login
      console.log('[Login] Calling loginMutation.mutateAsync');
      const result = await loginMutation.mutateAsync({
        email: email.trim().toLowerCase(),
        password: password,
      });
      console.log('[Login] Login mutation result:', result ? 'Success' : 'No result');

      if (result && result.user && result.tokens) {
        // ✅ Convert role to lowercase (backend returns uppercase: ADMIN, MODERATOR, USER)
        const normalizedRole = (String(result.user.role || 'USER')).toLowerCase() as UserRole;

        // ✅ Create user object for store
        const baseUser = result.user as any;
        const user: User = {
          id: String(baseUser.id),
          name: String(baseUser.name || ''),
          phone: typeof baseUser.phone === 'string' ? baseUser.phone : '',
          email: String(baseUser.email || ''),
          avatar: String(baseUser.avatar || ''),
          balance: typeof baseUser.balance === 'number' ? baseUser.balance : 0,
          role: normalizedRole,
          rating: 0,
          totalRatings: 0,
          memberSince: new Date().toISOString(),
          location: { az: '', ru: '', en: '' },
          privacySettings: {
            hidePhoneNumber: false,
            allowDirectContact: true,
            onlyAppMessaging: false,
          },
          analytics: {
            lastOnline: new Date().toISOString(),
            messageResponseRate: 0,
            averageResponseTime: 0,
            totalMessages: 0,
            totalResponses: 0,
            isOnline: true,
          },
        };

        // ✅ Attach moderator permissions from DB (if any)
        if (user.role === 'moderator') {
          const perms = baseUser.moderatorPermissions || [];
          user.moderatorInfo = {
            assignedDate: new Date().toISOString(),
            permissions: perms,
            handledReports: 0,
            averageResponseTime: 0,
            isActive: true,
          };
        }

        // ✅ Save tokens
        await AsyncStorage.setItem('auth_tokens', JSON.stringify(result.tokens));

        // ✅ Login user
        login(user);
        console.log('[Login] User logged in successfully', { role: user.role, userId: user.id, email: user.email });

        // ✅ Redirect based on user role
        if (user.role === 'admin') {
          console.log('[Login] Redirecting admin to tabs');
          router.replace('/(tabs)');
        } else if (user.role === 'moderator') {
          console.log('[Login] Redirecting moderator to tabs');
          router.replace('/(tabs)');
        } else {
          console.log('[Login] Redirecting user to tabs');
          router.replace('/(tabs)');
        }
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      logger.error('Login error:', error);
      console.error('[Login] Full error:', error);

      // Extract error message from tRPC error structure
      let errorMessage = 'Giriş zamanı xəta baş verdi. Yenidən cəhd edin.';

      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.cause?.message) {
        errorMessage = error.cause.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      console.log('[Login] Showing error alert:', errorMessage);
      Alert.alert(
        t('error'),
        errorMessage,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleRegister = () => {
    logger.info('[Login] Navigating to /auth/register');
    console.log('[Login] Register button clicked - navigating to /auth/register');

    try {
      router.push('/auth/register');
    } catch (error) {
      console.error('[Login] Navigation error:', error);
      // Fallback navigation
      router.replace('/auth/register');
    }
  };

  const handleForgotPassword = () => {
    router.push('/auth/forgot-password');
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'vk') => {
    logger.info('[Login] Social login initiated:', { provider });

    try {
      setLoadingSocial(provider);

      // ✅ Use correct backend URL (port 3000) - always use 3000 in dev
      const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL ||
                      process.env.EXPO_PUBLIC_BACKEND_URL ||
                      (__DEV__ ? 'http://localhost:3000' : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'));

      console.log('[Login] Checking social auth status at:', `${baseUrl}/api/auth/status`);

      try {
        const statusResponse = await fetch(`${baseUrl}/api/auth/status`);

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          console.log('[Login] Social auth status:', statusData);
          if (!statusData.configured || !statusData.configured[provider]) {
            setLoadingSocial(null);
            logger.warn('[Login] Provider not configured:', { provider });
            Alert.alert(
              'Not Configured',
              `${provider.charAt(0).toUpperCase() + provider.slice(1)} login is not configured yet. Please use email/password login.`,
            );
            return;
          }
        } else {
          console.warn('[Login] Status check failed:', statusResponse.status);
          // Continue anyway - might work
        }
      } catch (statusError) {
        console.error('[Login] Status check error:', statusError);
        // Continue anyway - might work
      }

      await initiateSocialLogin(
        provider,
        (result) => {
          setLoadingSocial(null);
          if (result.success && result.user) {
            logger.info(`[Login] Social login successful (${provider}):`, {
              userId: result.user.id,
              email: result.user.email,
            });

            // ✅ Create complete user object
            const userObject = {
              id: result.user.id as string,
              name: result.user.name as string,
              email: result.user.email as string,
              phone: '',
              avatar: result.user.avatar as string || '',
              verified: true,
              rating: 0,
              totalRatings: 0,
              memberSince: new Date().toISOString(),
              location: { az: '', ru: '', en: '' },
              privacySettings: {
                hidePhoneNumber: false,
                allowDirectContact: true,
                onlyAppMessaging: false,
              },
              analytics: {
                lastOnline: new Date().toISOString(),
                messageResponseRate: 0,
                averageResponseTime: 0,
                totalMessages: 0,
                totalResponses: 0,
                isOnline: true,
              },
              balance: 0,
              role: 'user',
            };

            login(userObject as any);
            router.replace('/(tabs)');
          }
        },
        (error) => {
          setLoadingSocial(null);
          logger.error(`[Login] Social login error (${provider}):`, error);
          showSocialLoginError(provider, error);
        },
      );
    } catch (error) {
      setLoadingSocial(null);
      logger.error(`[Login] Social login initiation error (${provider}):`, error);
      showSocialLoginError(provider, 'Failed to initiate login. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.logoContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=200' }}
            style={styles.logo}
          />
        </View>

        <Text style={styles.title}>
          {t('loginToAccount')}
        </Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t('email')}
            </Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t('emailAddress')}
              placeholderTextColor={Colors.placeholder}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              blurOnSubmit={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t('password')}
            </Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder={t('yourPassword')}
                placeholderTextColor={Colors.placeholder}
                secureTextEntry={!showPassword}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff size={20} color={Colors.textSecondary} />
                ) : (
                  <Eye size={20} color={Colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={handleForgotPassword}
            disabled={isLoading}
          >
            <Text style={styles.forgotPasswordText}>
              {t('forgotPassword')}
            </Text>
          </TouchableOpacity>

          <Pressable
            style={[
              styles.loginButton,
              ((!email || !password) || isLoading) && styles.disabledButton,
            ]}
            onPress={() => {
              if (!email || !password || isLoading) {
                console.log('[Login] Button is disabled');
                return;
              }
              console.log('[Login] Calling handleLogin...');
              handleLogin();
            }}
            disabled={!email || !password || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>
                {t('login')}
              </Text>
            )}
          </Pressable>


          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>
              {t('or')}
            </Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialButtons}>
            <TouchableOpacity
              style={[styles.socialButton, styles.googleButton]}
              onPress={() => {
                console.log('[Login] Google button pressed');
                handleSocialLogin('google');
              }}
              disabled={loadingSocial !== null || isLoading}
            >
              {loadingSocial === 'google' ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Chrome size={24} color="white" />
                  <Text style={styles.socialButtonText}>Google</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, styles.facebookButton]}
              onPress={() => handleSocialLogin('facebook')}
              disabled={loadingSocial !== null || isLoading}
            >
              {loadingSocial === 'facebook' ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Facebook size={24} color="white" />
                  <Text style={styles.socialButtonText}>Facebook</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.socialButton, styles.vkButton]}
              onPress={() => handleSocialLogin('vk')}
              disabled={loadingSocial !== null || isLoading}
            >
              {loadingSocial === 'vk' ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <MessageCircle size={24} color="white" />
                  <Text style={styles.socialButtonText}>VK</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.termsNotice}>
            <Text style={styles.termsNoticeText}>
              {t('agreeToTerms')}
            </Text>
          </View>

          <View style={styles.registerSection}>
            <Text style={styles.footerText}>
              {t('noAccount') || 'Hesabınız yoxdur?'}
            </Text>
            <TouchableOpacity
              onPress={() => {
                console.log('[Login] Register link clicked!');
                handleRegister();
              }}
              disabled={isLoading}
              style={styles.registerButtonWrapper}
              activeOpacity={0.7}
            >
              <Text style={styles.registerText}>
                {t('registerNow') || 'Qeydiyyatdan keçin'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'flex-end',
  },
  closeButton: {
    padding: 8,
  },
  logoContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 30,
  },
  form: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
  },
  eyeButton: {
    padding: 12,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: Colors.primary,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: Colors.border,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 30,
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  termsNotice: {
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  termsNoticeText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: Colors.primary,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginTop: 10,
  },
  registerButtonWrapper: {
    paddingHorizontal: 4,
    paddingVertical: 4,
    minHeight: 30,
  },
  footerText: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginRight: 6,
  },
  registerText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginHorizontal: 16,
  },
  socialButtons: {
    gap: 12,
    marginBottom: 20,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  googleButton: {
    backgroundColor: '#DB4437',
  },
  vkButton: {
    backgroundColor: '#0077FF',
  },
  socialButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  noSocialAuth: {
    padding: 16,
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  noSocialAuthText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
