import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { CreditCard } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';

import { logger } from '@/utils/logger';
interface PayriffPaymentButtonProps {
  amount: number;
  orderId: string;
  description: string;
  onSuccess?: (transactionId: string) => void;
  onError?: (error: string) => void;
  buttonText?: string;
  disabled?: boolean;
}

export default function PayriffPaymentButton({
  amount,
  orderId,
  description,
  onSuccess,
  onError,
  buttonText = 'Ödə',
  disabled = false,
}: PayriffPaymentButtonProps) {
  const [loading, setLoading] = useState(false);

  const createPaymentMutation = trpc.payriff.createPayment.useMutation({
    onSuccess: async (data) => {
      try {
        logger.debug('Payment created:', data);

        if (!data.paymentUrl) {
          Alert.alert('Xəta', 'Ödəniş linki alınmadı');
          onError?.('Payment URL not received');
          setLoading(false);
          return;
        }

        const canOpen = await Linking.canOpenURL(data.paymentUrl);

        if (canOpen) {
          if (Platform.OS === 'web') {
            window.location.href = data.paymentUrl;
            // Note: loading will stay true as page redirects
          } else {
            await Linking.openURL(data.paymentUrl);
            // Give time for app to open
            setTimeout(() => setLoading(false), 2000);
          }
        } else {
          Alert.alert('Xəta', 'Ödəniş səhifəsi açıla bilmədi');
          onError?.('Cannot open payment URL');
          setLoading(false);
        }
      } catch (error) {
        logger.error('Payment URL open error:', error);
        Alert.alert('Xəta', 'Ödəniş səhifəsi açılarkən xəta baş verdi');
        onError?.('Failed to open payment URL');
        setLoading(false);
      }
    },
    onError: (error) => {
      logger.error('Payment creation error:', error);
      Alert.alert('Xəta', error.message || 'Ödəniş yaradıla bilmədi');
      onError?.(error.message);
      setLoading(false); // ✅ Already here
    },
  });

  const handlePayment = async () => {
    // Validation before starting
    if (disabled || loading) return;

    // ===== CLIENT-SIDE VALIDATION =====

    // 1. Amount validation
    if (!amount || typeof amount !== 'number' || isNaN(amount) || !isFinite(amount)) {
      Alert.alert('Xəta', 'Məbləğ düzgün deyil');
      onError?.('Invalid amount');
      return;
    }

    if (amount <= 0) {
      Alert.alert('Xəta', 'Məbləğ 0-dan böyük olmalıdır');
      onError?.('Amount must be positive');
      return;
    }

    if (amount > 100000) {
      Alert.alert('Xəta', 'Məbləğ maksimum limiti keçir (100,000 AZN)');
      onError?.('Amount exceeds limit');
      return;
    }

    // 2. OrderId validation
    if (!orderId || typeof orderId !== 'string' || orderId.trim().length === 0) {
      Alert.alert('Xəta', 'Sifariş nömrəsi yoxdur');
      onError?.('Invalid order ID');
      return;
    }

    // 3. Description validation
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      Alert.alert('Xəta', 'Açıqlama yoxdur');
      onError?.('Invalid description');
      return;
    }

    if (description.length > 500) {
      Alert.alert('Xəta', 'Açıqlama çox uzundur (maks 500 simvol)');
      onError?.('Description too long');
      return;
    }

    // ===== END VALIDATION =====

    setLoading(true);

    try {
      await createPaymentMutation.mutateAsync({
        amount,
        orderId: orderId.trim(),
        description: description.trim(),
        language: 'az',
      });
    } catch (error) {
      logger.error('Payment error:', error);
      setLoading(false); // ✅ Fixed: Always reset loading
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        (disabled || loading) && styles.buttonDisabled,
      ]}
      onPress={handlePayment}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      <View style={styles.buttonContent}>
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <CreditCard size={20} color="#fff" style={styles.icon} />
            <Text style={styles.buttonText}>
              {buttonText} ({amount.toFixed(2)} AZN)
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
