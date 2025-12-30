import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreditCard, Trash2, Plus, DollarSign, X } from 'lucide-react-native';
import { payriffService } from '@/services/payriffService';
import Colors from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { SavedCard } from '@/types/payment';

import { logger } from '@/utils/logger';
export default function SavedCardsScreen() {
  const router = useRouter();

  const { data: cardsData, isLoading, refetch } = trpc.payriff.getSavedCards.useQuery();
  const deleteCardMutation = trpc.payriff.deleteCard.useMutation();

  const savedCards = cardsData?.cards || [];
  const [refreshing, setRefreshing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<SavedCard | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDescription, setPaymentDescription] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  const handleAddCard = () => {
    router.push('/payment/card-save');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleDeleteCard = (card: SavedCard) => {
    Alert.alert(
      'Kartı Sil',
      `${card.pan} nömrəli kartı silmək istədiyinizdən əminsiniz?`,
      [
        { text: 'Ləğv et', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCardMutation.mutateAsync({ cardId: card.id });
              await refetch();
              Alert.alert('Uğurlu', 'Kart silindi');
            } catch (error) {
              logger.error('Delete card error:', error);
              // Error handled by mutation
              Alert.alert('Xəta', 'Kartı silmək mümkün olmadı');
            }
          },
        },
      ],
    );
  };

  const handlePayWithCard = (card: SavedCard) => {
    setSelectedCard(card);
    setPaymentAmount('');
    setPaymentDescription('');
    setShowPaymentModal(true);
  };

  const processAutoPayment = async () => {
    if (!selectedCard) return;

    const amount = parseFloat(paymentAmount);
    if (!paymentAmount || isNaN(amount) || amount <= 0) {
      Alert.alert('Xəta', 'Məbləğ 0-dan böyük olmalıdır');
      return;
    }

    if (!paymentDescription.trim()) {
      Alert.alert('Xəta', 'Təsvir daxil edin');
      return;
    }

    setProcessingPayment(true);

    try {
      const orderId = `AUTO-${Date.now()}`;

      const response = await payriffService.autoPay({
        amount,
        cardUuid: selectedCard.cardUuid,
        description: paymentDescription.trim(),
        orderId,
        currencyType: 'AZN',
      });

      logger.debug('Auto payment response:', response);
      // Auto payment processed successfully

      if (response.payload?.orderStatus === 'APPROVED') {
        setShowPaymentModal(false);
        Alert.alert(
          'Uğurlu Ödəniş',
          `Ödənişiniz uğurla tamamlandı!\nMəbləğ: ${amount} AZN\nSifariş ID: ${orderId}`,
          [{ text: 'OK' }],
        );
      } else {
        throw new Error(response.payload?.responseDescription || 'Ödəniş uğursuz oldu');
      }
    } catch (error) {
      logger.error('Auto payment error:', error);
      // Error will be shown to user
      const message = error instanceof Error ? error.message : 'Bilinməyən xəta baş verdi';
      Alert.alert('Xəta', message);
    } finally {
      setProcessingPayment(false);
    }
  };

  const getBrandColor = (brand: string) => {
    switch (brand.toUpperCase()) {
      case 'VISA':
        return '#1A1F71';
      case 'MASTERCARD':
        return '#EB001B';
      default:
        return Colors.primary;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Yadda Saxlanmış Kartlar',
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: '#fff',
        }}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <TouchableOpacity style={styles.addButton} onPress={handleAddCard}>
          <Plus size={24} color="#fff" />
          <Text style={styles.addButtonText}>Yeni Kart Əlavə Et</Text>
        </TouchableOpacity>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Kartlar yüklənir...</Text>
          </View>
        ) : savedCards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <CreditCard size={64} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>Yadda saxlanmış kart yoxdur</Text>
            <Text style={styles.emptyText}>
              Kartınızı yadda saxlayın və gələcək ödənişləri daha sürətli edin
            </Text>
          </View>
        ) : (
          <View style={styles.cardsContainer}>
            {savedCards.map((card: SavedCard) => (
              <View key={card.id} style={styles.cardItem}>
                <View style={[styles.cardBrand, { backgroundColor: getBrandColor(card.brand) }]}>
                  <Text style={styles.cardBrandText}>{card.brand}</Text>
                </View>

                <View style={styles.cardInfo}>
                  <Text style={styles.cardNumber}>{card.pan}</Text>
                  {card.cardHolderName && (
                    <Text style={styles.cardHolder}>{card.cardHolderName}</Text>
                  )}
                  <Text style={styles.cardDate}>
                    Əlavə edilib: {card.savedAt ? new Date(card.savedAt).toLocaleDateString('az-AZ') : '—'}
                  </Text>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.payButton}
                    onPress={() => handlePayWithCard(card)}
                  >
                    <DollarSign size={20} color="#fff" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteCard(card)}
                  >
                    <Trash2 size={20} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Təhlükəsizlik</Text>
          <Text style={styles.infoText}>
            🔒 Kartlarınızın məlumatları Payriff-in təhlükəsiz serverlərində saxlanılır
          </Text>
          <Text style={styles.infoText}>
            🔐 Ödənişlər PCI DSS standartlarına uyğun həyata keçirilir
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ödəniş Et</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {selectedCard && (
              <View style={styles.selectedCardInfo}>
                <Text style={styles.selectedCardLabel}>Seçilmiş kart:</Text>
                <Text style={styles.selectedCardNumber}>{selectedCard.pan}</Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Məbləğ (AZN)</Text>
              <TextInput
                style={styles.input}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Təsvir</Text>
              <TextInput
                style={styles.input}
                value={paymentDescription}
                onChangeText={setPaymentDescription}
                placeholder="Ödəniş təsviri"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            <TouchableOpacity
              style={[styles.confirmButton, processingPayment && styles.confirmButtonDisabled]}
              onPress={processAutoPayment}
              disabled={processingPayment}
            >
              {processingPayment ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>Ödənişi Təsdiqlə</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  cardsContainer: {
    gap: 12,
  },
  cardItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardBrand: {
    width: 50,
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardBrandText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#fff',
  },
  cardInfo: {
    flex: 1,
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  cardHolder: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  cardDate: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  payButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#fee',
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  selectedCardInfo: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  selectedCardLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  selectedCardNumber: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
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
  confirmButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: Colors.textSecondary,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginTop: 12,
  },
});
