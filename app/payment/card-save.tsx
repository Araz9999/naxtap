import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreditCard, Save, AlertCircle } from 'lucide-react-native';
import { payriffService } from '@/services/payriffService';
import Colors from '@/constants/colors';

import { logger } from '@/utils/logger';
export default function CardSaveScreen() {
  const router = useRouter();

  const [amount, setAmount] = useState('4');
  const [description, setDescription] = useState('Kartı yadda saxla');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCardSave = async () => {
    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Xəta', 'Məbləğ 0-dan böyük olmalıdır');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Xəta', 'Təsvir daxil edin');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await payriffService.cardSave({
        amount: amountNum,
        description: description.trim(),
        currencyType: 'AZN',
        language: 'AZ',
        directPay: true,
      });

      logger.debug('Card save initiated:', response);

      if (response.payload?.paymentUrl) {
        if (Platform.OS === 'web') {
          window.location.href = response.payload.paymentUrl;
        } else {
          payriffService.openPaymentPage(response.payload.paymentUrl);
        }
      } else {
        throw new Error('Payment URL not received');
      }
    } catch (error) {
      logger.error('Card save error:', error);
      const message = error instanceof Error ? error.message : 'Bilinməyən xəta baş verdi';
      setError(message);
      Alert.alert('Xəta', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Kartı Yadda Saxla',
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: '#fff',
        }}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <CreditCard size={48} color={Colors.primary} />
          </View>

          <Text style={styles.title}>Kartı Yadda Saxla</Text>
          <Text style={styles.subtitle}>
            Kartınızı yadda saxlayın və gələcək ödənişləri daha sürətli edin
          </Text>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Məbləğ (AZN)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="4.00"
                placeholderTextColor={Colors.textSecondary}
              />
              <Text style={styles.hint}>
                Kartı yadda saxlamaq üçün kiçik məbləğ bloklanacaq
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Təsvir</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder="Kartı yadda saxla"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <AlertCircle size={20} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleCardSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Save size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Kartı Yadda Saxla</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>Necə işləyir?</Text>
            <Text style={styles.infoText}>
              1. Kiçik məbləğ (4 AZN) kartınızdan bloklanacaq
            </Text>
            <Text style={styles.infoText}>
              2. Ödəniş uğurlu olarsa, kartınız təhlükəsiz şəkildə yadda saxlanacaq
            </Text>
            <Text style={styles.infoText}>
              3. Gələcək ödənişləri kartı yenidən daxil etmədən edə biləcəksiniz
            </Text>
            <Text style={styles.infoText}>
              4. Bloklanmış məbləğ ödənişdən sonra geri qaytarılacaq
            </Text>
          </View>

          <View style={styles.securityContainer}>
            <Text style={styles.securityText}>
              🔒 Kartınızın məlumatları Payriff-in təhlükəsiz serverlərində saxlanılır
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  formContainer: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  hint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: Colors.error,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.textSecondary,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  infoContainer: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  securityContainer: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 12,
  },
  securityText: {
    fontSize: 12,
    color: '#2e7d32',
    textAlign: 'center',
  },
});
