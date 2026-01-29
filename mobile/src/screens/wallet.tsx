import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, TextInput, ActivityIndicator, RefreshControl, Linking, Platform, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback } from 'react-native';

import { useLanguageStore } from '../../../store/languageStore';
import { useUserStore } from '../../../store/userStore';
import Colors from '../../../constants/colors';
import { Wallet, Gift, Plus, ArrowUpRight, ArrowDownLeft, CreditCard, RefreshCw } from 'lucide-react-native';
import { trpc } from '../../../lib/trpc';
import type { PayriffWalletHistory } from '../../../services/payriffService';

import { logger } from '../../../utils/logger';
import { sanitizeNumericInput } from '../../../utils/inputValidation';

export default function WalletScreen() {
  const { language } = useLanguageStore();
  const { walletBalance, bonusBalance, addToWallet, addBonus, currentUser } = useUserStore();

  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [amountError, setAmountError] = useState<string | null>(null);

  const walletQuery = trpc.payriff.getWallet.useQuery(undefined, {
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  const createOrderMutation = trpc.payriff.createOrder.useMutation();

  const [refreshing, setRefreshing] = useState(false);

  // ✅ Sync local balance with Payriff balance
  useEffect(() => {
    if (walletQuery.data?.payload?.totalBalance !== undefined) {
      const payriffBalance = walletQuery.data.payload.totalBalance;
      const currentTotalBalance = walletBalance + bonusBalance;

      // Only sync if there's a significant difference (more than 0.01 AZN)
      if (Math.abs(payriffBalance - currentTotalBalance) > 0.01) {
        logger.info('[Wallet] Syncing local balance with Payriff:', {
          payriff: payriffBalance,
          local: currentTotalBalance,
        });

        // Update wallet balance to match Payriff (keep bonus separate)
        const newWalletBalance = Math.max(0, payriffBalance - bonusBalance);
        addToWallet(newWalletBalance - walletBalance);
      }
    }
  }, [walletQuery.data]);

  const onRefresh = async () => {
    setRefreshing(true);
    logger.info('[Wallet] Refreshing wallet data...');

    try {
      await walletQuery.refetch();
      logger.info('[Wallet] Refresh completed successfully');
    } catch (error) {
      logger.error('[Wallet] Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const paymentMethods = [
    { id: 'card', name: 'Bank kartı', icon: CreditCard, color: '#4CAF50' },
  ];

  // Real-time amount validation
  const validateAmount = (value: string) => {
    if (!value || value.trim().length === 0) {
      setAmountError(null);
      return;
    }

    const amount = parseFloat(value.trim());

    if (isNaN(amount) || !isFinite(amount)) {
      setAmountError(language === 'az' ? 'Düzgün məbləğ daxil edin' : 'Введите корректную сумму');
      return;
    }

    if (amount < 1) {
      setAmountError(language === 'az' ? 'Min: 1 AZN' : 'Мин: 1 AZN');
      return;
    }

    if (amount > 10000) {
      setAmountError(language === 'az' ? 'Maks: 10,000 AZN' : 'Макс: 10,000 AZN');
      return;
    }

    const decimalPlaces = (value.split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      setAmountError(language === 'az' ? 'Maks 2 onluq rəqəm' : 'Макс 2 десятичных знака');
      return;
    }

    setAmountError(null);
  };

  const handleAmountChange = (value: string) => {
    setTopUpAmount(value);
    validateAmount(value);
  };

  const handleTopUp = async () => {
    // ===== VALIDATION START =====

    // 0. Check if user is authenticated
    if (!currentUser) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Daxil olmamısınız' : 'Вы не вошли в систему',
      );
      return;
    }

    // 1. Check if amount is entered
    if (!topUpAmount || typeof topUpAmount !== 'string' || topUpAmount.trim().length === 0) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Məbləğ daxil edin' : 'Введите сумму',
      );
      return;
    }

    // 2. Parse amount
    const amount = parseFloat(topUpAmount.trim());

    // 3. Check if amount is a valid number
    if (isNaN(amount) || !isFinite(amount)) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Düzgün məbləğ daxil edin' : 'Введите корректную сумму',
      );
      return;
    }

    // 4. Check if amount is positive
    if (amount <= 0) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Məbləğ 0-dan böyük olmalıdır' : 'Сумма должна быть больше 0',
      );
      return;
    }

    // 5. Check minimum amount (1 AZN)
    if (amount < 1) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Minimum məbləğ 1 AZN olmalıdır' : 'Минимальная сумма 1 AZN',
      );
      return;
    }

    // 6. Check maximum amount (10,000 AZN)
    if (amount > 10000) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Maksimum məbləğ 10,000 AZN olmalıdır' : 'Максимальная сумма 10,000 AZN',
      );
      return;
    }

    // 7. Check decimal places (max 2)
    const decimalPlaces = (topUpAmount.split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Məbləğ maksimum 2 onluq rəqəm ola bilər' : 'Сумма может иметь максимум 2 десятичных знака',
      );
      return;
    }

    // 8. Check payment method selected
    if (!selectedPaymentMethod || typeof selectedPaymentMethod !== 'string') {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Ödəniş üsulunu seçin' : 'Выберите способ оплаты',
      );
      return;
    }

    // ===== VALIDATION END =====

    try {
      setIsProcessing(true);

      const result = await createOrderMutation.mutateAsync({
        amount,
        language: language === 'az' ? 'AZ' : 'RU',
        currency: 'AZN',
        description: language === 'az'
          ? `Balans artırılması - ${amount.toFixed(2)} AZN`
          : `Пополнение баланса - ${amount.toFixed(2)} AZN`,
        operation: 'PURCHASE',
        metadata: {
          type: 'wallet_topup',
          userId: useUserStore.getState().currentUser?.id || 'guest',
          amount: amount.toFixed(2),
          timestamp: new Date().toISOString(),
        },
      });

      logger.info('[Wallet] Order created successfully:', { orderId: result.payload?.orderId });

      if (result.payload?.paymentUrl) {
        const paymentUrl = result.payload.paymentUrl;

        if (Platform.OS === 'web') {
          window.location.href = paymentUrl;
        } else {
          const supported = await Linking.canOpenURL(paymentUrl);
          if (supported) {
            await Linking.openURL(paymentUrl);
          } else {
            Alert.alert(
              language === 'az' ? 'Xəta' : 'Ошибка',
              language === 'az'
                ? 'Ödəniş səhifəsi açıla bilmədi'
                : 'Не удалось открыть страницу оплаты',
            );
          }
        }

        setShowTopUp(false);
        setTopUpAmount('');
        setSelectedPaymentMethod('');

        logger.info('[Wallet] Payment page opened successfully');
      } else {
        logger.error('[Wallet] No payment URL in response');
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az'
            ? 'Ödəniş linki alına bilmədi'
            : 'Не удалось получить ссылку на оплату',
        );
      }
    } catch (error) {
      logger.error('[WalletTopUp] Error:', error);

      // User-friendly error messages
      let errorMessage = language === 'az'
        ? 'Ödəniş zamanı xəta baş verdi'
        : 'Произошла ошибка при оплате';

      if (error instanceof Error) {
        logger.error('[WalletTopUp] Error message:', error.message);

        if (error.message.includes('amount') || error.message.includes('məbləğ')) {
          errorMessage = language === 'az'
            ? 'Məbləğ düzgün deyil'
            : 'Некорректная сумма';
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
          errorMessage = language === 'az'
            ? 'Şəbəkə xətası. İnternet əlaqənizi yoxlayın.'
            : 'Ошибка сети. Проверьте интернет-соединение.';
        } else if (error.message.includes('payment') || error.message.includes('ödəniş')) {
          errorMessage = language === 'az'
            ? 'Ödəniş linki yaradıla bilmədi'
            : 'Не удалось создать платежную ссылку';
        } else if (error.message.includes('user') || error.message.includes('auth')) {
          errorMessage = language === 'az'
            ? 'Daxil olmamısınız. Yenidən daxil olun.'
            : 'Вы не авторизованы. Войдите снова.';
        }
      }

      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        errorMessage,
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const getOperationLabel = (operation: string) => {
    const operationMap: Record<string, { az: string; ru: string }> = {
      'TOPUP': { az: 'Balans artırılması', ru: 'Пополнение баланса' },
      'PURCHASE': { az: 'Balans artırılması', ru: 'Пополнение баланса' },
      'SPEND': { az: 'Xərc', ru: 'Расход' },
      'TRANSFER_IN': { az: 'Transfer (daxil olma)', ru: 'Перевод (входящий)' },
      'TRANSFER_OUT': { az: 'Transfer (çıxış)', ru: 'Перевод (исходящий)' },
      'PAYMENT': { az: 'Ödəniş', ru: 'Оплата' },
      'REFUND': { az: 'Geri qaytarma', ru: 'Возврат' },
      'BONUS': { az: 'Bonus', ru: 'Бонус' },
    };

    const mapped = operationMap[operation?.toUpperCase()];
    if (mapped) {
      return language === 'az' ? mapped.az : mapped.ru;
    }
    return operation || (language === 'az' ? 'Naməlum əməliyyat' : 'Неизвестная операция');
  };

  // ✅ Format date helper
  const formatTransactionDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return language === 'az' ? 'Bu gün' : 'Сегодня';
      } else if (diffDays === 1) {
        return language === 'az' ? 'Dünən' : 'Вчера';
      } else if (diffDays < 7) {
        return language === 'az' ? `${diffDays} gün əvvəl` : `${diffDays} дней назад`;
      } else {
        return date.toLocaleDateString(language === 'az' ? 'az-AZ' : 'ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
      }
    } catch (error) {
      logger.error('[Wallet] Date format error:', error);
      return dateString;
    }
  };

  const transactions = walletQuery.data?.payload?.historyResponse || [];
  const totalBalance = walletQuery.data?.payload?.totalBalance || 0;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <Stack.Screen
        options={{
          title: language === 'az' ? 'Pul kisəsi' : 'Кошелек',
          headerStyle: { backgroundColor: Colors.card },
          headerTintColor: Colors.text,
        }}
      />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.flex}>
          <ScrollView
            style={styles.container}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* Total Balance Card */}
            <View style={styles.balanceSection}>
              {walletQuery.isLoading ? (
                <View style={[styles.balanceCard, styles.totalBalanceCard]}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.loadingText}>
                    {language === 'az' ? 'Yüklənir...' : 'Загрузка...'}
                  </Text>
                </View>
              ) : walletQuery.error ? (
                <View style={[styles.balanceCard, styles.totalBalanceCard]}>
                  <Text style={styles.errorText}>
                    {language === 'az' ? 'Xəta baş verdi' : 'Произошла ошибка'}
                  </Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => walletQuery.refetch()}
                  >
                    <RefreshCw size={16} color={Colors.primary} />
                    <Text style={styles.retryButtonText}>
                      {language === 'az' ? 'Yenidən cəhd et' : 'Попробовать снова'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={[styles.balanceCard, styles.totalBalanceCard]}>
                  <View style={styles.balanceHeader}>
                    <Wallet size={28} color={Colors.primary} />
                    <Text style={styles.totalBalanceTitle}>
                      {language === 'az' ? 'Payriff balans' : 'Баланс Payriff'}
                    </Text>
                  </View>
                  <Text style={styles.totalBalanceAmount}>{totalBalance.toFixed(2)} AZN</Text>
                  <Text style={styles.totalBalanceSubtext}>
                    {language === 'az'
                      ? 'Payriff hesabınızdakı balans'
                      : 'Баланс на вашем счете Payriff'}
                  </Text>
                </View>
              )}

              <View style={styles.balanceBreakdown}>
                <View style={styles.balanceCard}>
                  <View style={styles.balanceHeader}>
                    <Wallet size={20} color={Colors.primary} />
                    <Text style={styles.balanceTitle}>
                      {language === 'az' ? 'Əsas balans' : 'Основной баланс'}
                    </Text>
                  </View>
                  <Text style={styles.balanceAmount}>{walletBalance.toFixed(2)} AZN</Text>
                </View>

                <View style={[styles.balanceCard, styles.bonusCard]}>
                  <View style={styles.balanceHeader}>
                    <Gift size={20} color={Colors.secondary} />
                    <Text style={styles.balanceTitle}>
                      {language === 'az' ? 'Bonus balans' : 'Бонусный баланс'}
                    </Text>
                  </View>
                  <Text style={[styles.balanceAmount, styles.bonusAmount]}>
                    {bonusBalance.toFixed(2)} AZN
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowTopUp(true)}
              >
                <Plus size={20} color="white" />
                <Text style={styles.actionButtonText}>
                  {language === 'az' ? 'Balans artır' : 'Пополнить'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Top Up Modal */}
            {showTopUp && (
              <View style={styles.topUpSection}>
                <Text style={styles.sectionTitle}>
                  {language === 'az' ? 'Balans artırılması' : 'Пополнение баланса'}
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    {language === 'az' ? 'Məbləğ (AZN)' : 'Сумма (AZN)'}
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      amountError && styles.inputError,
                    ]}
                    value={topUpAmount}
                    onChangeText={handleAmountChange}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                    placeholderTextColor={Colors.placeholder}
                  />

                  {/* Validation Error */}
                  {amountError && (
                    <Text style={styles.errorText}>{amountError}</Text>
                  )}

                  {/* Min/Max Info */}
                  {!amountError && !topUpAmount && (
                    <Text style={styles.hintText}>
                      {language === 'az'
                        ? 'Minimum: 1 AZN • Maksimum: 10,000 AZN'
                        : 'Минимум: 1 AZN • Максимум: 10,000 AZN'
                      }
                    </Text>
                  )}

                  {/* Quick Amount Buttons */}
                  <View style={styles.quickAmounts}>
                    {[10, 20, 50, 100, 200, 500].map((quickAmount) => (
                      <TouchableOpacity
                        key={quickAmount}
                        style={[
                          styles.quickAmountButton,
                          topUpAmount === quickAmount.toString() && styles.selectedQuickAmount,
                        ]}
                        onPress={() => setTopUpAmount(quickAmount.toString())}
                      >
                        <Text style={[
                          styles.quickAmountText,
                          topUpAmount === quickAmount.toString() && styles.selectedQuickAmountText,
                        ]}>
                          {quickAmount} ₼
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Amount Info */}
                  {topUpAmount && parseFloat(topUpAmount) > 0 && !isNaN(parseFloat(topUpAmount)) && (
                    <View style={styles.amountInfo}>
                      <Text style={styles.amountInfoText}>
                        {language === 'az'
                          ? `✓ ${parseFloat(topUpAmount).toFixed(2)} AZN balansınıza əlavə ediləcək`
                          : `✓ ${parseFloat(topUpAmount).toFixed(2)} AZN будет добавлено на ваш баланс`
                        }
                      </Text>
                      {parseFloat(topUpAmount) >= 100 && (
                        <Text style={styles.bonusInfoText}>
                      🎁 {language === 'az'
                            ? `+ ${(parseFloat(topUpAmount) * 0.05).toFixed(2)} AZN bonus (5%)`
                            : `+ ${(parseFloat(topUpAmount) * 0.05).toFixed(2)} AZN бонус (5%)`
                          }
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>
                    {language === 'az' ? 'Ödəniş üsulu' : 'Способ оплаты'}
                  </Text>
                  <View style={styles.paymentMethods}>
                    {paymentMethods.map((method) => {
                      const IconComponent = method.icon;
                      return (
                        <TouchableOpacity
                          key={method.id}
                          style={[
                            styles.paymentMethod,
                            selectedPaymentMethod === method.id && styles.selectedPaymentMethod,
                          ]}
                          onPress={() => setSelectedPaymentMethod(method.id)}
                        >
                          <IconComponent size={20} color={method.color} />
                          <Text style={styles.paymentMethodText}>{method.name}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.topUpButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowTopUp(false);
                      setTopUpAmount('');
                      setSelectedPaymentMethod('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>
                      {language === 'az' ? 'Ləğv et' : 'Отмена'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      (isProcessing || !!amountError || !topUpAmount || !selectedPaymentMethod) && styles.disabledButton,
                    ]}
                    onPress={handleTopUp}
                    disabled={isProcessing || !!amountError || !topUpAmount || !selectedPaymentMethod}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text style={styles.confirmButtonText}>
                        {language === 'az' ? 'Ödə' : 'Оплатить'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Bonus Info */}
            <View style={styles.bonusInfo}>
              <Text style={styles.sectionTitle}>
                {language === 'az' ? 'Bonus sistemi' : 'Бонусная система'}
              </Text>
              <View style={styles.bonusInfoCard}>
                <Text style={styles.bonusInfoText}>
                  {language === 'az'
                    ? '• Balans artırdıqda avtomatik bonus qazanın\n• Bonuslar əvvəlcə xərclənir, sonra əsas balans\n• Bonusların müddəti yoxdur\n• Minimum yükləmə: 1 AZN\n• Maksimum yükləmə: 10,000 AZN'
                    : '• Получайте автоматический бонус при пополнении\n• Бонусы тратятся первыми, затем основной баланс\n• Бонусы не имеют срока действия\n• Минимальное пополнение: 1 AZN\n• Максимальное пополнение: 10,000 AZN'
                  }
                </Text>
              </View>
            </View>

            {/* Transaction History */}
            <View style={styles.transactionSection}>
              <Text style={styles.sectionTitle}>
                {language === 'az' ? 'Əməliyyat tarixçəsi' : 'История операций'}
              </Text>

              {walletQuery.isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                </View>
              ) : transactions.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {language === 'az' ? 'Əməliyyat tarixçəsi yoxdur' : 'История операций пуста'}
                  </Text>
                </View>
              ) : (
                transactions.map((transaction: PayriffWalletHistory) => {
                  const isPositive = transaction.amount > 0;
                  return (
                    <View key={transaction.id} style={styles.transactionItem}>
                      <View style={styles.transactionIcon}>
                        {isPositive ? (
                          <ArrowDownLeft size={20} color={Colors.success} />
                        ) : (
                          <ArrowUpRight size={20} color={Colors.error} />
                        )}
                      </View>

                      <View style={styles.transactionDetails}>
                        <Text style={styles.transactionDescription}>
                          {getOperationLabel(transaction.operation)}
                        </Text>
                        <Text style={styles.transactionDate}>
                          {transaction.createdAt ? formatTransactionDate(transaction.createdAt) : ''}
                        </Text>
                        {transaction.description && (
                          <Text style={styles.transactionMeta}>
                            {transaction.description}
                          </Text>
                        )}
                      </View>

                      <Text style={[
                        styles.transactionAmount,
                        isPositive ? styles.positiveAmount : styles.negativeAmount,
                      ]}>
                        {isPositive ? '+' : ''}{transaction.amount.toFixed(2)} AZN
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  balanceSection: {
    padding: 16,
    gap: 16,
  },
  totalBalanceCard: {
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    borderColor: Colors.primary,
    borderWidth: 2,
    alignItems: 'center',
    paddingVertical: 24,
  },
  totalBalanceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  totalBalanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.primary,
    marginVertical: 8,
  },
  totalBalanceSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  balanceBreakdown: {
    flexDirection: 'row',
    gap: 12,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bonusCard: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderColor: Colors.secondary,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  balanceTitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  bonusAmount: {
    color: Colors.secondary,
  },
  actionButtons: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  topUpSection: {
    margin: 16,
    padding: 20,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: Colors.text,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: Colors.text,
  },
  paymentMethods: {
    gap: 8,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    gap: 12,
  },
  selectedPaymentMethod: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
  },
  paymentMethodText: {
    fontSize: 16,
    color: Colors.text,
  },
  topUpButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.text,
    fontSize: 16,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  bonusInfo: {
    padding: 16,
  },
  bonusInfoCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bonusInfoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  transactionSection: {
    padding: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  transactionMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
    fontStyle: 'italic',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  positiveAmount: {
    color: Colors.success,
  },
  negativeAmount: {
    color: Colors.error,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  retryButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  quickAmountButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  selectedQuickAmount: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  selectedQuickAmountText: {
    color: Colors.primary,
  },
  amountInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  amountInfoText: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: '500',
    marginBottom: 4,
  },
  // bonusInfoText: {
  //   fontSize: 13,
  //   color: Colors.secondary,
  //   fontWeight: '600',
  // },
  inputError: {
    borderColor: Colors.error,
    borderWidth: 2,
  },
  // errorText: {
  //   fontSize: 12,
  //   color: Colors.error,
  //   marginTop: 4,
  // },
  hintText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});
