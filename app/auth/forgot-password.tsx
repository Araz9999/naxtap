import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import Colors from '@/constants/colors';
import { X, ArrowLeft, Mail, CheckCircle, Phone, User } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { logger } from '@/utils/logger';
import { validateEmail } from '@/utils/inputValidation';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { language } = useLanguageStore();
  
  const [contactInfo, setContactInfo] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isOTPVerified, setIsOTPVerified] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [contactType, setContactType] = useState<'email' | 'phone'>('email');
  
  const forgotPasswordMutation = trpc.auth.forgotPassword.useMutation();
  const verifyOTPMutation = trpc.auth.verifyPasswordOTP.useMutation();
  
  const detectContactType = (input: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[+]?[0-9\s\-\(\)]{7,}$/;
    
    if (emailRegex.test(input)) {
      return 'email';
    } else if (phoneRegex.test(input.replace(/\s/g, ''))) {
      return 'phone';
    }
    
    // Default detection based on presence of @ symbol
    return input.includes('@') ? 'email' : 'phone';
  };
  
  const handleContactInfoChange = (text: string) => {
    setContactInfo(text);
  };
  
  const handlePhoneChange = (text: string) => {
    // Remove any non-digit characters except spaces and dashes
    const cleaned = text.replace(/[^0-9\s\-]/g, '');
    setPhoneNumber(cleaned);
    setContactInfo('+994 ' + cleaned);
    setContactType('phone');
  };
  
  const handleSendResetCode = async () => {
    // ===== VALIDATION START =====
    
    // 1. Contact info required
    if (!contactInfo || typeof contactInfo !== 'string' || contactInfo.trim().length === 0) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        contactType === 'email' 
          ? (language === 'az' ? 'E-poçt ünvanını daxil edin' : 'Введите адрес электронной почты')
          : (language === 'az' ? 'Mobil nömrəni daxil edin' : 'Введите номер телефона')
      );
      return;
    }
    
    // 2. Auto-detect contact type
    const detectedType = detectContactType(contactInfo.trim());
    setContactType(detectedType);
    
    // 3. Validate based on detected type
    if (detectedType === 'email') {
      const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      const trimmedEmail = contactInfo.trim();
      
      if (!emailRegex.test(trimmedEmail)) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Düzgün e-poçt ünvanı daxil edin' : 'Введите правильный адрес электронной почты'
        );
        return;
      }
      
      if (trimmedEmail.length > 255) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Email çox uzundur' : 'Email слишком длинный'
        );
        return;
      }
    } else {
      const phoneRegex = /^[+]?[0-9]{10,15}$/;
      const cleanedPhone = contactInfo.replace(/[\s\-\(\)]/g, '');
      
      if (!phoneRegex.test(cleanedPhone)) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Düzgün mobil nömrə daxil edin (10-15 rəqəm)' : 'Введите правильный номер телефона (10-15 цифр)'
        );
        return;
      }
      
      if (cleanedPhone.length < 10) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Telefon nömrəsi çox qısadır' : 'Номер телефона слишком короткий'
        );
        return;
      }
    }
    
    // ===== VALIDATION END =====
    
    setIsLoading(true);
    
    try {
      const input = detectedType === 'email' 
        ? { email: contactInfo.trim() }
        : { phone: contactInfo.replace(/[\s\-\(\)]/g, '') };
      
      await forgotPasswordMutation.mutateAsync(input as any);
      
      setIsLoading(false);
      setIsCodeSent(true);
    } catch (error: any) {
      logger.error('Password reset error:', error);
      setIsLoading(false);
      const errorMessage = error?.message || (language === 'az' 
        ? 'Kod göndərilərkən xəta baş verdi. Yenidən cəhd edin.'
        : 'Ошибка при отправке кода. Попробуйте снова.');
      
      if (typeof window !== 'undefined') {
        window.alert(errorMessage);
      } else {
        Alert.alert(language === 'az' ? 'Xəta' : 'Ошибка', errorMessage);
      }
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      const message = language === 'az' 
        ? 'OTP kodu 6 rəqəm olmalıdır'
        : 'OTP код должен содержать 6 цифр';
      
      if (typeof window !== 'undefined') {
        window.alert(message);
      } else {
        Alert.alert(language === 'az' ? 'Xəta' : 'Ошибка', message);
      }
      return;
    }

    setIsLoading(true);

    try {
      const input = contactType === 'email'
        ? { email: contactInfo.trim(), otp: otpCode }
        : { phone: contactInfo.replace(/[\s\-\(\)]/g, ''), otp: otpCode };
      
      const result = await verifyOTPMutation.mutateAsync(input);
      
      if (result?.resetToken) {
        setIsLoading(false);
        setIsOTPVerified(true);
        // Redirect to reset password page with token
        router.replace(`/auth/reset-password?token=${result.resetToken}`);
      }
    } catch (error: any) {
      logger.error('OTP verification error:', error);
      setIsLoading(false);
      const errorMessage = error?.message || (language === 'az'
        ? 'Yanlış OTP kodu. Yenidən cəhd edin.'
        : 'Неверный OTP код. Попробуйте снова.');
      
      if (typeof window !== 'undefined') {
        window.alert(errorMessage);
      } else {
        Alert.alert(language === 'az' ? 'Xəta' : 'Ошибка', errorMessage);
      }
    }
  };
  
  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };
  
  const handleBackToLogin = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };
  
  const handleResendCode = async () => {
    setIsCodeSent(false);
    setIsOTPVerified(false);
    setOtpCode('');
    await handleSendResetCode();
  };
  
  if (isCodeSent && !isOTPVerified) {
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
          
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Mail size={60} color={Colors.primary} />
            </View>
            
            <Text style={styles.title}>
              {language === 'az' ? 'OTP Kodu Daxil Edin' : 'Введите OTP код'}
            </Text>
            
            <Text style={styles.subtitle}>
              {contactType === 'email'
                ? (language === 'az' 
                    ? `${contactInfo} ünvanına göndərilən 6 rəqəmli OTP kodunu daxil edin`
                    : `Введите 6-значный OTP код, отправленный на ${contactInfo}`)
                : (language === 'az'
                    ? `${contactInfo} nömrəsinə göndərilən 6 rəqəmli OTP kodunu daxil edin`
                    : `Введите 6-значный OTP код, отправленный на ${contactInfo}`)
              }
            </Text>
            
            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  value={otpCode}
                  onChangeText={(text) => setOtpCode(text.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder={language === 'az' ? '000000' : '000000'}
                  placeholderTextColor={Colors.placeholder}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                  editable={!isLoading}
                />
              </View>
              
              <TouchableOpacity 
                style={[
                  styles.primaryButton,
                  (!otpCode || otpCode.length !== 6 || isLoading) && styles.disabledButton
                ]} 
                onPress={handleVerifyOTP}
                disabled={!otpCode || otpCode.length !== 6 || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {language === 'az' ? 'OTP Kodunu Təsdiqlə' : 'Подтвердить OTP код'}
                  </Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.secondaryButton} onPress={handleResendCode}>
                <Text style={styles.secondaryButtonText}>
                  {language === 'az' ? 'Kodu Yenidən Göndər' : 'Отправить код снова'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.secondaryButton} onPress={handleBackToLogin}>
                <Text style={styles.secondaryButtonText}>
                  {language === 'az' ? 'Girişə qayıt' : 'Вернуться к входу'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }
  
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
          <TouchableOpacity style={styles.backButton} onPress={handleClose}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <X size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <User size={60} color={Colors.primary} />
          </View>
          
          <Text style={styles.title}>
            {language === 'az' ? 'Şifrəni unutmusunuz?' : 'Забыли пароль?'}
          </Text>
          
          <Text style={styles.subtitle}>
            {language === 'az' 
              ? 'Şifrəniz qeydiyyat zamanı yazdığınız e-poçt və ya nömrənizə göndəriləcək'
              : 'Ваш пароль будет отправлен на email или номер, указанный при регистрации'
            }
          </Text>
          
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <View style={styles.tabContainer}>
                <TouchableOpacity 
                  style={[styles.tab, contactType === 'email' && styles.activeTab]}
                  onPress={() => {
                    setContactType('email');
                    setContactInfo('');
                    setPhoneNumber('');
                  }}
                >
                  <Mail size={16} color={contactType === 'email' ? Colors.primary : Colors.textSecondary} />
                  <Text style={[styles.tabText, contactType === 'email' && styles.activeTabText]}>
                    {language === 'az' ? 'E-poçt' : 'Email'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.tab, contactType === 'phone' && styles.activeTab]}
                  onPress={() => {
                    setContactType('phone');
                    setContactInfo('+994 ');
                    setPhoneNumber('');
                  }}
                >
                  <Phone size={16} color={contactType === 'phone' ? Colors.primary : Colors.textSecondary} />
                  <Text style={[styles.tabText, contactType === 'phone' && styles.activeTabText]}>
                    {language === 'az' ? 'Telefon' : 'Телефон'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.inputContainer}>
                {contactType === 'email' ? (
                  <View style={styles.inputWithIcon}>
                    <View style={styles.iconWrapper}>
                      <Mail size={20} color={Colors.textSecondary} />
                    </View>
                    <TextInput
                      style={styles.inputField}
                      value={contactInfo}
                      onChangeText={handleContactInfoChange}
                      placeholder={language === 'az' ? 'E-poçt ünvanınız' : 'Ваш email адрес'}
                      placeholderTextColor={Colors.placeholder}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      editable={!isLoading}
                    />
                  </View>
                ) : (
                  <View style={styles.phoneInputContainer}>
                    <View style={styles.countryCodeContainer}>
                      <Phone size={20} color={Colors.textSecondary} />
                      <Text style={styles.countryCode}>+994</Text>
                    </View>
                    <TextInput
                      style={styles.phoneInputField}
                      value={phoneNumber}
                      onChangeText={handlePhoneChange}
                      placeholder={language === 'az' ? 'XX XXX XX XX' : 'XX XXX XX XX'}
                      placeholderTextColor={Colors.placeholder}
                      keyboardType="phone-pad"
                      maxLength={12}
                      editable={!isLoading}
                    />
                  </View>
                )}
              </View>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.primaryButton,
                (!contactInfo || isLoading) && styles.disabledButton
              ]} 
              onPress={handleSendResetCode}
              disabled={!contactInfo || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {language === 'az' ? 'Şifrə sıfırlama linki göndər' : 'Отправить ссылку для сброса'}
                </Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.secondaryButton} onPress={handleBackToLogin}>
              <Text style={styles.secondaryButtonText}>
                {language === 'az' ? 'Girişə qayıt' : 'Вернуться к входу'}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  successIconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  successMessage: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    marginBottom: 8,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  iconWrapper: {
    marginRight: 12,
    padding: 8,
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 12,
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: Colors.border,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    padding: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    gap: 8,
  },
  activeTab: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  activeTabText: {
    color: 'white',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    overflow: 'hidden',
  },
  countryCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.backgroundSecondary,
    borderRightWidth: 1,
    borderRightColor: Colors.border,
  },
  countryCode: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  phoneInputField: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 32,
    letterSpacing: 8,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});