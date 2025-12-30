import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreditCard, AlertCircle, CheckCircle } from 'lucide-react-native';
import { payriffService } from '@/services/payriffService';
import Colors from '@/constants/colors';

import { logger } from '@/utils/logger';
export default function PayriffPaymentScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const amount = parseFloat(params.amount as string);
  const description = params.description as string || 'Ödəniş';
  const orderId = params.orderId as string || `ORDER-${Date.now()}`;

  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const paymentCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check for invalid amount on mount
  useEffect(() => {
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(
        'Xəta',
        'Etibarsız məbləğ. Zəhmət olmasa düzgün məbləğ daxil edin.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    }
  }, [amount, router]);

  const handleConfigError = useCallback(() => {
    if (!payriffService.isConfigured()) {
      Alert.alert(
        'Konfiqurasiya xətası',
        'Payriff ödəniş sistemi konfiqurasiya edilməyib. Zəhmət olmasa .env faylında PAYRIFF_MERCHANT_ID və PAYRIFF_SECRET_KEY dəyərlərini əlavə edin.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    }
  }, [router]);

  useEffect(() => {
    handleConfigError();
  }, [handleConfigError]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (paymentCheckTimeoutRef.current) {
        clearTimeout(paymentCheckTimeoutRef.current);
      }
    };
  }, []);

  const handlePayment = async () => {
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Xəta', 'Məbləğ 0-dan böyük olmalıdır');
      return;
    }

    setLoading(true);
    setPaymentStatus('processing');
    setErrorMessage('');

    try {
      const response = await payriffService.createPayment({
        amount,
        currency: 'AZN',
        description,
        orderId,
        language: 'az',
      });

      if (response.success && response.paymentUrl) {
        if (Platform.OS === 'web') {
          window.location.href = response.paymentUrl;
        } else {
          payriffService.openPaymentPage(response.paymentUrl);

          paymentCheckTimeoutRef.current = setTimeout(() => {
            checkPaymentStatusWithRetry(orderId, 0);
          }, 3000);
        }
      } else {
        setPaymentStatus('error');
        setErrorMessage(response.error || 'Ödəniş yaradıla bilmədi');
        Alert.alert('Xəta', response.error || 'Ödəniş yaradıla bilmədi');
      }
    } catch (error) {
      setPaymentStatus('error');
      const message = error instanceof Error ? error.message : 'Bilinməyən xəta baş verdi';
      setErrorMessage(message);
      Alert.alert('Xəta', message);
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (orderId: string) => {
    try {
      const status = await payriffService.checkPaymentStatus(orderId);

      if (status.status === 'success') {
        setPaymentStatus('success');
        Alert.alert(
          'Uğurlu ödəniş',
          `Ödənişiniz uğurla tamamlandı!\nMəbləğ: ${status.amount} ${status.currency}`,
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ],
        );
      } else if (status.status === 'failed') {
        setPaymentStatus('error');
        setErrorMessage('Ödəniş uğursuz oldu');
      } else if (status.status === 'cancelled') {
        setPaymentStatus('error');
        setErrorMessage('Ödəniş ləğv edildi');
      }
    } catch (error) {
      logger.error('Payment status check failed:', error);
    }
  };

  const checkPaymentStatusWithRetry = async (orderId: string, retryCount: number) => {
    const maxRetries = 5;
    const retryDelay = 2000; // 2 seconds

    try {
      const status = await payriffService.checkPaymentStatus(orderId);

      if (status.status === 'success') {
        setPaymentStatus('success');
        Alert.alert(
          'Uğurlu ödəniş',
          `Ödənişiniz uğurla tamamlandı!\nMəbləğ: ${status.amount} ${status.currency}`,
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ],
        );
        return;
      } else if (status.status === 'failed') {
        setPaymentStatus('error');
        setErrorMessage('Ödəniş uğursuz oldu');
        return;
      } else if (status.status === 'cancelled') {
        setPaymentStatus('error');
        setErrorMessage('Ödəniş ləğv edildi');
        return;
      }

      // If still pending and we haven't exceeded max retries, retry
      if (status.status === 'pending' && retryCount < maxRetries) {
        paymentCheckTimeoutRef.current = setTimeout(() => {
          checkPaymentStatusWithRetry(orderId, retryCount + 1);
        }, retryDelay);
      } else if (retryCount >= maxRetries) {
        setPaymentStatus('error');
        setErrorMessage('Ödəniş statusu yoxlanıla bilmədi. Zəhmət olmasa daha sonra yoxlayın.');
      }
    } catch (error) {
      logger.error('Payment status check failed:', error);

      if (retryCount < maxRetries) {
        paymentCheckTimeoutRef.current = setTimeout(() => {
          checkPaymentStatusWithRetry(orderId, retryCount + 1);
        }, retryDelay);
      } else {
        setPaymentStatus('error');
        setErrorMessage('Ödəniş statusu yoxlanıla bilmədi. Zəhmət olmasa daha sonra yoxlayın.');
      }
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Payriff Ödəniş',
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: '#fff',
        }}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <CreditCard size={48} color={Colors.primary} />
          </View>

          <Text style={styles.title}>Payriff ilə Ödəniş</Text>
          <Text style={styles.subtitle}>Təhlükəsiz və sürətli ödəniş</Text>

          <View style={styles.amountContainer}>
            <Text style={styles.amountLabel}>Ödəniləcək məbləğ</Text>
            <Text style={styles.amount}>{amount.toFixed(2)} AZN</Text>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Təsvir:</Text>
              <Text style={styles.detailValue}>{description}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Sifariş ID:</Text>
              <Text style={styles.detailValue}>{orderId}</Text>
            </View>
          </View>

          {paymentStatus === 'error' && errorMessage && (
            <View style={styles.errorContainer}>
              <AlertCircle size={20} color={Colors.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {paymentStatus === 'success' && (
            <View style={styles.successContainer}>
              <CheckCircle size={20} color={Colors.success} />
              <Text style={styles.successText}>Ödəniş uğurla tamamlandı!</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.payButton,
              (loading || paymentStatus === 'success') && styles.payButtonDisabled,
            ]}
            onPress={handlePayment}
            disabled={loading || paymentStatus === 'success'}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.payButtonText}>
                {paymentStatus === 'success' ? 'Ödəniş Tamamlandı' : 'Ödənişə Keç'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              Ödənişiniz Payriff ödəniş sistemi vasitəsilə təhlükəsiz şəkildə həyata keçiriləcək.
            </Text>
            <Text style={styles.infoText}>
              Visa, Mastercard və digər bank kartları qəbul edilir.
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
  amountContainer: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  amountLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  amount: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
  detailsContainer: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600' as const,
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
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#efe',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: Colors.success,
    fontWeight: '600' as const,
  },
  payButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  payButtonDisabled: {
    backgroundColor: Colors.textSecondary,
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  infoContainer: {
    marginTop: 8,
  },
  infoText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
});
