import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { trpc } from '@/lib/trpc';
import colors from '@/constants/colors';

import { logger } from '@/utils/logger';
export default function CreateInvoiceScreen() {
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [sendSms, setSendSms] = useState<boolean>(true);
  const [sendEmail, setSendEmail] = useState<boolean>(false);
  const [sendWhatsapp, setSendWhatsapp] = useState<boolean>(false);
  const [currencyType, setCurrencyType] = useState<'AZN' | 'USD' | 'EUR'>('AZN');
  const [languageType, setLanguageType] = useState<'AZ' | 'EN' | 'RU'>('AZ');

  const createInvoiceMutation = trpc.payriff.createInvoice.useMutation();

  const handleCreateInvoice = async () => {
    // Amount validation
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Xəta', 'Zəhmət olmasa düzgün məbləğ daxil edin');
      return;
    }

    if (parsedAmount > 50000) {
      Alert.alert('Xəta', 'Maksimum faktura məbləği 50,000 AZN-dir');
      return;
    }

    // Description validation
    if (!description.trim()) {
      Alert.alert('Xəta', 'Zəhmət olmasa təsvir daxil edin');
      return;
    }

    if (description.trim().length < 5) {
      Alert.alert('Xəta', 'Təsvir ən azı 5 simvol olmalıdır');
      return;
    }

    // Email validation (more comprehensive)
    if (sendEmail && !email.trim()) {
      Alert.alert('Xəta', 'Email göndərmək üçün email ünvanı daxil edin');
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      Alert.alert('Xəta', 'Düzgün email formatı daxil edin (məsələn: email@example.com)');
      return;
    }

    // Phone validation
    if ((sendSms || sendWhatsapp) && !phoneNumber.trim()) {
      Alert.alert('Xəta', 'SMS və ya WhatsApp göndərmək üçün telefon nömrəsi daxil edin');
      return;
    }

    if (phoneNumber.trim() && phoneNumber.trim().length < 9) {
      Alert.alert('Xəta', 'Düzgün telefon nömrəsi daxil edin (ən azı 9 rəqəm)');
      return;
    }

    try {

      const result = await createInvoiceMutation.mutateAsync({
        amount: parsedAmount,
        description: description.trim(),
        fullName: fullName.trim() || undefined,
        email: email.trim() || undefined,
        phoneNumber: phoneNumber.trim() || undefined,
        customMessage: customMessage.trim() || undefined,
        sendSms,
        sendEmail,
        sendWhatsapp,
        currencyType,
        languageType,
      });

      logger.debug('Invoice created:', result);

      Alert.alert(
        'Uğurlu!',
        `Faktura yaradıldı!\nFaktura kodu: ${result.payload.invoiceCode}\nÖdəniş linki: ${result.payload.paymentUrl}`,
        [
          {
            text: 'Ödəniş səhifəsinə keç',
            onPress: () => {
              if (Platform.OS === 'web') {
                window.open(result.payload.paymentUrl, '_blank');
              } else {
                Linking.openURL(result.payload.paymentUrl);
              }
            },
          },
          {
            text: 'Bağla',
            style: 'cancel',
            onPress: () => router.back(),
          },
        ],
      );
    } catch (error) {
      logger.error('Failed to create invoice:', error);
      Alert.alert(
        'Xəta',
        error instanceof Error ? error.message : 'Faktura yaradılarkən xəta baş verdi',
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Faktura Yarat',
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#fff',
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ödəniş Məlumatları</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Məbləğ *</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Valyuta</Text>
            <View style={styles.currencyButtons}>
              {(['AZN', 'USD', 'EUR'] as const).map((currency) => (
                <TouchableOpacity
                  key={currency}
                  style={[
                    styles.currencyButton,
                    currencyType === currency && styles.currencyButtonActive,
                  ]}
                  onPress={() => setCurrencyType(currency)}
                >
                  <Text
                    style={[
                      styles.currencyButtonText,
                      currencyType === currency && styles.currencyButtonTextActive,
                    ]}
                  >
                    {currency}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Təsvir *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Ödəniş təsviri"
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Xüsusi Mesaj</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={customMessage}
              onChangeText={setCustomMessage}
              placeholder="Müştəriyə göndəriləcək xüsusi mesaj"
              multiline
              numberOfLines={2}
              placeholderTextColor="#999"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Müştəri Məlumatları</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Ad Soyad</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Müştərinin adı və soyadı"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefon Nömrəsi</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="+994501234567"
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bildiriş Parametrləri</Text>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setSendSms(!sendSms)}
          >
            <View style={[styles.checkbox, sendSms && styles.checkboxChecked]}>
              {sendSms && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>SMS göndər</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setSendEmail(!sendEmail)}
          >
            <View style={[styles.checkbox, sendEmail && styles.checkboxChecked]}>
              {sendEmail && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Email göndər</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setSendWhatsapp(!sendWhatsapp)}
          >
            <View style={[styles.checkbox, sendWhatsapp && styles.checkboxChecked]}>
              {sendWhatsapp && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>WhatsApp göndər</Text>
          </TouchableOpacity>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Dil</Text>
            <View style={styles.currencyButtons}>
              {(['AZ', 'EN', 'RU'] as const).map((lang) => (
                <TouchableOpacity
                  key={lang}
                  style={[
                    styles.currencyButton,
                    languageType === lang && styles.currencyButtonActive,
                  ]}
                  onPress={() => setLanguageType(lang)}
                >
                  <Text
                    style={[
                      styles.currencyButtonText,
                      languageType === lang && styles.currencyButtonTextActive,
                    ]}
                  >
                    {lang}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.createButton, createInvoiceMutation.isPending && styles.createButtonDisabled]}
          onPress={handleCreateInvoice}
          disabled={createInvoiceMutation.isPending}
        >
          {createInvoiceMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Faktura Yarat</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  currencyButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  currencyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  currencyButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  currencyButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#666',
  },
  currencyButtonTextActive: {
    color: '#fff',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
  },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700' as const,
  },
});
