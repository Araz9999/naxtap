import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from '@/constants/translations';
import { useUserStore } from '@/store/userStore';
import Colors from '@/constants/colors';
import { X, Eye, EyeOff, Check, Phone, Camera, User as UserIcon, Facebook, Chrome, MessageCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { trpc } from '@/lib/trpc';
import { initiateSocialLogin, showSocialLoginError } from '@/utils/socialAuth';
import { logger } from '@/utils/logger';
import { validateEmail, validateAzerbaijanPhone, sanitizeTextInput } from '@/utils/inputValidation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, UserRole } from '@/types/user';

export default function RegisterScreen() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const { login } = useUserStore();


  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+994 ');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSocial, setLoadingSocial] = useState<string | null>(null);

  const registerMutation = trpc.auth.register.useMutation();

  // Native HTML button for web to ensure clicks always work
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const container = document.getElementById('register-button-container');
    if (!container) return;

    // Clear previous content and recreate button each time
    container.innerHTML = '';

    // Debug: log when we create the button
    console.log('[Register] Creating native web register button');

    const nativeButton = document.createElement('button');
    nativeButton.textContent = isLoading
      ? (t('loading') || 'Loading...')
      : (t('registerNow') || 'Register');

    nativeButton.style.cssText = `
      width: 100%;
      padding: 15px;
      background-color: ${(!agreeToTerms || isLoading) ? '#9CA3AF' : (Colors?.primary || '#0EA5A7')};
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: bold;
      cursor: ${(!agreeToTerms || isLoading) ? 'not-allowed' : 'pointer'};
      margin-top: 10px;
    `;

    nativeButton.disabled = !agreeToTerms || isLoading;

    nativeButton.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Debug: confirm click is firing
      console.log('[Register] Native web register button clicked');
      // Simple visible feedback so we know click works at all
      window.alert('Register button clicked. Now running validation...');

      if (!agreeToTerms) {
        const title = language === 'az' ? 'Xəta' : 'Ошибка';
        const msg =
          language === 'az'
            ? 'İstifadə şərtlərini qəbul edin'
            : 'Примите условия использования';
        window.alert(`${title}: ${msg}`);
        return;
      }

      if (isLoading) {
        return;
      }

      handleRegister();
    };

    container.appendChild(nativeButton);
  }, [agreeToTerms, isLoading, t, language, name, email, phone, password, confirmPassword]);

  // ✅ Enhanced form validation
  const validateForm = (): { isValid: boolean; error?: string } => {
    if (!name || !name.trim()) {
      return { isValid: false, error: language === 'az' ? 'Ad daxil edin' : 'Введите имя' };
    }

    if (name.trim().length < 2) {
      return { isValid: false, error: language === 'az' ? 'Ad ən az 2 simvol olmalıdır' : 'Имя должно содержать минимум 2 символа' };
    }

    if (!email || !email.trim()) {
      return { isValid: false, error: language === 'az' ? 'Email daxil edin' : 'Введите email' };
    }

    if (!validateEmail(email)) {
      return { isValid: false, error: language === 'az' ? 'Düzgün email daxil edin' : 'Введите корректный email' };
    }

    if (!phone || phone.trim() === '+994' || phone.trim() === '+994 ') {
      return { isValid: false, error: language === 'az' ? 'Telefon nömrəsi daxil edin' : 'Введите номер телефона' };
    }

    if (!validateAzerbaijanPhone(phone)) {
      const cleaned = phone.replace(/[^0-9+]/g, '');
      const digitsAfter994 = cleaned.replace('+994', '').replace('994', '');
      return {
        isValid: false,
        error: language === 'az'
          ? `Düzgün telefon nömrəsi daxil edin. Format: +994XXXXXXXXX (9 rəqəm). Sizin: ${phone} (${digitsAfter994.length} rəqəm)`
          : `Введите корректный номер телефона. Формат: +994XXXXXXXXX (9 цифр). Ваш: ${phone} (${digitsAfter994.length} цифр)`,
      };
    }

    if (!password) {
      return {
        isValid: false,
        error: language === 'az' ? 'Şifrə daxil edin' : 'Введите пароль',
      };
    }

    // Simpler frontend rule: only length >= 8, let backend enforce strong rules
    if (password.length < 8) {
      return {
        isValid: false,
        error:
          language === 'az'
            ? 'Şifrə ən az 8 simvol olmalıdır'
            : 'Пароль должен содержать минимум 8 символов',
      };
    }

    if (!confirmPassword) {
      return { isValid: false, error: language === 'az' ? 'Şifrəni təsdiqləyin' : 'Подтвердите пароль' };
    }

    if (password !== confirmPassword) {
      return { isValid: false, error: language === 'az' ? 'Şifrələr uyğun gəlmir' : 'Пароли не совпадают' };
    }

    if (!agreeToTerms) {
      return { isValid: false, error: language === 'az' ? 'İstifadə şərtlərini qəbul edin' : 'Примите условия использования' };
    }

    return { isValid: true };
  };

  const handleRegister = async () => {
    try {
      if (isLoading) {
        return;
      }

      // ✅ Validate form
      const validation = validateForm();
      console.log('[Register] Validation result:', validation);

      if (!validation.isValid) {
        const title = language === 'az' ? 'Xəta' : 'Ошибка';
        const message = validation.error || 'Form düzgün doldurulmayıb';

        Alert.alert(title, message);
        if (Platform.OS === 'web') {
          // Extra visible feedback on web
          window.alert(`${title}: ${message}`);
        }
        return;
      }

      setIsLoading(true);

      try {
        console.log('[Register] Sending register mutation with data:', {
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          name: name.trim(),
        });

        const result = await registerMutation.mutateAsync({
          email: email.trim().toLowerCase(),
          password,
          name: sanitizeTextInput(name.trim(), 100),
          phone: phone.trim(),
        });

        // ✅ Save tokens so user can access protected routes (edit profile, etc.)
        if (result?.tokens) {
          await AsyncStorage.setItem('auth_tokens', JSON.stringify(result.tokens));
        }

        // ✅ Create complete user object
        const normalizedRole = (String(result.user.role || 'USER')).toLowerCase() as UserRole;
        const mockUser: User = {
          id: String(result.user.id),
          name: String(result.user.name || ''),
          email: String(result.user.email || ''),
          phone: typeof result.user.phone === 'string' ? result.user.phone : '',
          avatar: profileImage || String(result.user.avatar || ''),
          rating: 0,
          totalRatings: 0,
          memberSince: new Date().toISOString(),
          location: { az: '', ru: '', en: '' },
          balance: typeof (result.user as any).balance === 'number' ? (result.user as any).balance : 0,
          role: normalizedRole,
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

        // ✅ Always login user and redirect (email sending is optional)
        console.log('[Register] Logging in user and redirecting...');
        login(mockUser);

        // Show success message
        const successMessage = result.emailSent
          ? (language === 'az'
            ? 'Qeydiyyat uğurla tamamlandı! Email ünvanınıza təsdiq linki göndərildi.'
            : 'Регистрация успешно завершена! Ссылка для подтверждения отправлена на ваш email.')
          : (language === 'az'
            ? 'Qeydiyyat uğurlu oldu! Email göndərilmədi, amma hesabınız aktivdir.'
            : 'Регистрация прошла успешно! Email не был отправлен, но ваш аккаунт активен.');

        Alert.alert(
          t('success') || 'Uğurlu',
          successMessage,
          [
            {
              text: 'OK',
              onPress: () => router.replace('/'),
            },
          ],
        );

        // Auto-redirect after 3 seconds if user doesn't click OK
        setTimeout(() => {
          console.log('[Register] Auto-redirecting to home...');
          router.replace('/');
        }, 3000);
      } catch (error: any) {
        logger.error('Registration error:', error);
        const title = language === 'az' ? 'Xəta' : 'Ошибка';
        const message =
        error?.message ||
        (language === 'az' ? 'Qeydiyyat zamanı xəta baş verdi' : 'Ошибка при регистрации');

        Alert.alert(title, message);
        if (Platform.OS === 'web') {
          window.alert(`${title}: ${message}`);
        }
      } finally {
        setIsLoading(false);
      }
    } catch (outerError: any) {
      console.error('[Register] Outer error in handleRegister:', outerError);
      Alert.alert('Error', 'An unexpected error occurred during registration');
    }
  };


  const takePhoto = async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert(
          t('error') || (language === 'az' ? 'Xəta' : 'Ошибка'),
          language === 'az' ? 'Kamera veb versiyada dəstəklənmir' : 'Камера не поддерживается в веб-версии',
        );
        return;
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          t('permissionRequired') || (language === 'az' ? 'İcazə lazımdır' : 'Требуется разрешение'),
          t('cameraPermissionRequired') || (language === 'az' ? 'Kamera icazəsi lazımdır' : 'Требуется разрешение камеры'),
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      logger.error('Camera error:', error);
      Alert.alert(
        t('error'),
        language === 'az' ? 'Kamera açıla bilmədi' : 'Не удалось открыть камеру',
      );
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          t('permissionRequired'),
          language === 'az' ? 'Qalereya icazəsi tələb olunur' : 'Требуется разрешение галереи',
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0 && result.assets[0]) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      logger.error('Image picker error:', error);
      Alert.alert(
        t('error'),
        language === 'az' ? 'Şəkil seçilə bilmədi' : 'Не удалось выбрать изображение',
      );
    }
  };

  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const handleLogin = () => {
    router.push('/auth/login');
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'vk') => {
    try {
      setLoadingSocial(provider);

      const baseUrl =
        process.env.EXPO_PUBLIC_RORK_API_BASE_URL ||
        (Platform.OS === 'web' && typeof window !== 'undefined'
          ? window.location.origin
          : 'http://localhost:3001');
      const statusResponse = await fetch(`${baseUrl}/api/auth/status`);

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        if (!statusData.configured[provider]) {
          setLoadingSocial(null);
          showSocialLoginError(provider, `${provider.charAt(0).toUpperCase() + provider.slice(1)} login is not configured yet. Please contact support.`);
          return;
        }
      }

      await initiateSocialLogin(
        provider,
        (result) => {
          setLoadingSocial(null);
          if (result.success && result.user) {
            login({
              id: result.user.id as string,
              name: result.user.name as string,
              email: result.user.email as string,
              avatar: result.user.avatar as string,
              phone: '',
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
            });
            router.replace('/(tabs)');
          }
        },
        (error) => {
          setLoadingSocial(null);
          showSocialLoginError(provider, error);
        },
      );
    } catch (error) {
      setLoadingSocial(null);
      showSocialLoginError(provider, 'Failed to initiate registration. Please try again.');
    } finally {
      setIsLoading(false);
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

        <Text style={styles.title}>
          {t('registerNow')}
        </Text>

        {/* Avatar preview + pick image */}
        <View style={styles.avatarWrapper}>
          <Image
            source={{ uri: profileImage || 'https://placehold.co/100x100?text=Avatar' }}
            style={styles.avatar}
          />
          <View style={styles.avatarButtonsRow}>
            <TouchableOpacity style={styles.smallButton} onPress={pickImage}>
              <Text style={styles.smallButtonText}>{language === 'az' ? 'Şəkil seç' : 'Выбрать'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.smallButton} onPress={takePhoto}>
              <Text style={styles.smallButtonText}>{language === 'az' ? 'Kamera' : 'Камера'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('name' as any) || (language === 'az' ? 'Ad' : 'Имя')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={language === 'az' ? 'Adınız' : 'Ваше имя'}
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
          />
        </View>

        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('email')}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={t('emailAddress')}
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Phone */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('phone') || (language === 'az' ? 'Telefon' : 'Телефон')}</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+994 XX XXX XX XX"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
          />
        </View>

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('password')}</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder={t('yourPassword')}
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} color="#6B7280" /> : <Eye size={20} color="#6B7280" />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirm Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('confirmPassword') || (language === 'az' ? 'Şifrəni təsdiqlə' : 'Подтвердите пароль')}</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t('confirmPassword') || ''}
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <EyeOff size={20} color="#6B7280" /> : <Eye size={20} color="#6B7280" />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Terms */}
        <TouchableOpacity style={styles.termsRow} onPress={() => setAgreeToTerms(!agreeToTerms)}>
          <View style={[styles.termsBox, agreeToTerms && styles.termsBoxChecked]}>
            {agreeToTerms && <Check size={14} color="#fff" />}
          </View>
          <Text style={styles.termsText}>
            {t('agreeToTerms')}
          </Text>
        </TouchableOpacity>


        {/* Register Button */}
        {Platform.OS === 'web' ? (
          <View
            nativeID="register-button-container"
            style={{ marginTop: 10 }}
          />
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.registerButton,
              (!agreeToTerms || isLoading) && styles.disabledButton,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => {
              if (!agreeToTerms) {
                Alert.alert(
                  language === 'az' ? 'Xəta' : 'Ошибка',
                  language === 'az'
                    ? 'İstifadə şərtlərini qəbul edin'
                    : 'Примите условия использования',
                );
                return;
              }
              if (isLoading) {
                return;
              }
              handleRegister();
            }}
            disabled={!agreeToTerms || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.registerButtonText}>{t('registerNow')}</Text>
            )}
          </Pressable>
        )}

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('or')}</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social buttons */}
        <View style={styles.socialButtons}>
          <TouchableOpacity
            style={[styles.socialButton, styles.googleButton]}
            onPress={() => handleSocialLogin('google')}
            disabled={loadingSocial !== null || isLoading}
          >
            {loadingSocial === 'google' ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Chrome size={20} color="white" />
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
                <Facebook size={20} color="white" />
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
                <MessageCircle size={20} color="white" />
                <Text style={styles.socialButtonText}>VK</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Already have an account */}
        <TouchableOpacity onPress={handleLogin} style={styles.loginLink}>
          <Text style={styles.loginLinkText}>{t('login')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: (Colors && (Colors.background || Colors.white)) || '#ffffff',
  },
  scrollContent: {
    padding: 16,
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
    color: Colors?.text || '#111827',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: Colors?.text || '#111827',
  },
  avatarWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E5E7EB',
    marginBottom: 8,
  },
  avatarButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    backgroundColor: Colors?.card || '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  smallButtonText: {
    color: Colors?.text || '#111827',
    fontSize: 12,
  },
  button: {
    backgroundColor: Colors && Colors.primary ? Colors.primary : '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: Colors?.card || '#FFFFFF',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: Colors?.text || '#111827',
  },
  eyeButton: {
    padding: 12,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  termsBox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  termsBoxChecked: {
    backgroundColor: Colors?.primary || '#0EA5A7',
    borderColor: Colors?.primary || '#0EA5A7',
  },
  termsText: {
    color: Colors?.textSecondary || '#6B7280',
    flex: 1,
  },
  registerButton: {
    backgroundColor: Colors?.primary || '#0EA5A7',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  disabledButton: {
    backgroundColor: Colors?.border || '#D1D5DB',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors?.border || '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 12,
    color: Colors?.textSecondary || '#6B7280',
  },
  socialButtons: {
    gap: 10,
    marginBottom: 16,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  googleButton: {
    backgroundColor: '#DB4437',
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  vkButton: {
    backgroundColor: '#0077FF',
  },
  socialButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 8,
  },
  loginLinkText: {
    color: Colors?.primary || '#0EA5A7',
    fontWeight: '500',
  },
});
