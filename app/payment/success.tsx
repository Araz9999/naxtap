import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { trpc } from '@/lib/trpc';

import { logger } from '@/utils/logger';
export default function PaymentSuccessScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const orderId = params.orderId as string;
  const amount = params.amount as string;
  const cardUuid = params.cardUuid as string || params.cardUID as string;
  const rawPan = params.pan as string;
  const pan = rawPan && rawPan.length >= 4 ? `**** **** **** ${rawPan.slice(-4)}` : rawPan;
  const brand = params.brand as string;
  const cardHolderName = params.cardHolderName as string;

  const [savingCard, setSavingCard] = useState(false);
  const [cardSaved, setCardSaved] = useState(false);

  const saveCardMutation = trpc.payriff.saveCard.useMutation();

  useEffect(() => {
    logger.debug('Payment success:', { orderId, amount, cardUuid, brand });

    if (cardUuid && pan && brand && !cardSaved && !savingCard) {
      setSavingCard(true);
      saveCardMutation.mutate(
        {
          cardUuid,
          pan,
          brand,
          cardHolderName: cardHolderName || '',
        },
        {
          onSuccess: () => {
            logger.debug('Card saved successfully!');
            setCardSaved(true);
            setSavingCard(false);
          },
          onError: (error) => {
            logger.error('Failed to save card:', error);
            setSavingCard(false);
          },
        },
      );
    }
  }, [orderId, amount, cardUuid, pan, brand, cardHolderName]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Ödəniş Uğurlu',
          headerStyle: { backgroundColor: Colors.success },
          headerTintColor: '#fff',
        }}
      />

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <CheckCircle size={80} color={Colors.success} />
        </View>

        <Text style={styles.title}>Ödəniş Uğurla Tamamlandı!</Text>
        <Text style={styles.subtitle}>
          Ödənişiniz uğurla həyata keçirildi
        </Text>

        {orderId && (
          <View style={styles.detailsCard}>
            <Text style={styles.detailLabel}>Sifariş ID:</Text>
            <Text style={styles.detailValue}>{orderId}</Text>
          </View>
        )}

        {amount && (
          <View style={styles.detailsCard}>
            <Text style={styles.detailLabel}>Məbləğ:</Text>
            <Text style={styles.detailValue}>{amount} AZN</Text>
          </View>
        )}

        {cardUuid && (
          <View style={[styles.detailsCard, styles.cardSavedCard]}>
            <View style={{ flex: 1 }}>
              {savingCard ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color="#2e7d32" />
                  <Text style={styles.cardSavedTitle}>Kart yadda saxlanılır...</Text>
                </View>
              ) : cardSaved ? (
                <>
                  <Text style={styles.cardSavedTitle}>✓ Kart Yadda Saxlanıldı</Text>
                  <Text style={styles.cardSavedText}>
                    Kartınız təhlükəsiz şəkildə yadda saxlanıldı. Gələcək ödənişləri daha sürətli edə bilərsiniz.
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.cardSavedTitle}>✓ Kart Yadda Saxlanıldı</Text>
                  <Text style={styles.cardSavedText}>
                    Kartınız təhlükəsiz şəkildə yadda saxlanıldı. Gələcək ödənişləri daha sürətli edə bilərsiniz.
                  </Text>
                </>
              )}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/(tabs)')}
        >
          <Text style={styles.buttonText}>Ana Səhifəyə Qayıt</Text>
        </TouchableOpacity>
      </View>
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
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  button: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  cardSavedCard: {
    backgroundColor: '#e8f5e9',
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  cardSavedTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#2e7d32',
    marginBottom: 4,
  },
  cardSavedText: {
    fontSize: 13,
    color: '#2e7d32',
    lineHeight: 18,
  },
});
