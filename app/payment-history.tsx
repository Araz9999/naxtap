import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import {
  CreditCard,
  Calendar,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Receipt,
  RefreshCw,
  AlertCircle,
  DollarSign,
  FileText,
} from 'lucide-react-native';
import { useUserStore } from '@/store/userStore';
import { useLanguageStore } from '@/store/languageStore';
import { getColors } from '@/constants/colors';
import { useThemeStore } from '@/store/themeStore';
import { Alert } from 'react-native';
import { logger } from '@/utils/logger';
import { trpc } from '@/lib/trpc';
import type { PayriffWalletHistory } from '@/services/payriffService';
import { useFocusEffect } from '@react-navigation/native';

interface PaymentRecord {
  id: string;
  date: string;
  amount: number;
  description: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  method: 'card' | 'bank' | 'wallet' | 'bonus';
  transactionId: string;
  storeId?: string;
  storeName?: string;
  type:
    | 'store_renewal'
    | 'listing_promotion'
    | 'view_purchase'
    | 'premium_feature'
    | 'wallet_topup'
    | 'wallet_operation'
    | 'transfer';
}

const filterOptions = [
  { id: 'all', label: 'Hamısı' },
  { id: 'completed', label: 'Tamamlanmış' },
  { id: 'pending', label: 'Gözləyən' },
  { id: 'failed', label: 'Uğursuz' },
  { id: 'refunded', label: 'Geri qaytarılmış' },
];

const typeLabels = {
  store_renewal: 'Mağaza Yeniləməsi',
  listing_promotion: 'Elan Tanıtımı',
  view_purchase: 'Baxış Alma',
  premium_feature: 'Premium Xüsusiyyət',
  wallet_topup: 'Balans Artırılması',
  wallet_operation: 'Balans Əməliyyatı',
  transfer: 'Transfer',
};

export default function PaymentHistoryScreen() {
  const router = useRouter();
  const { currentUser } = useUserStore();
  const { language } = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const colors = getColors(themeMode, colorTheme);

  const [selectedFilter, setSelectedFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const walletQuery = trpc.payriff.getWallet.useQuery(undefined, {
    // Keep the screen "live" without hammering the API.
    // (If you want it more aggressive, reduce this interval.)
    refetchInterval: 15000,
    refetchIntervalInBackground: true,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  useFocusEffect(
    useCallback(() => {
      // Refetch when user navigates back to this screen.
      walletQuery.refetch().catch(() => {
        // swallow - UI handles error state
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const toPaymentRecord = useCallback((t: PayriffWalletHistory): PaymentRecord | null => {
    if (!t || typeof t.id !== 'number') return null;

    const op = (t.operation || '').toString();
    const opUpper = op.toUpperCase();
    const description = typeof t.description === 'string' ? t.description : '';
    const date = typeof t.createdAt === 'string' ? t.createdAt : new Date().toISOString();
    const signedAmount = Number(t.amount || 0);
    const descLower = description.toLowerCase();

    const status: PaymentRecord['status'] =
      opUpper.includes('REFUND') || description.toLowerCase().includes('refund')
        ? 'refunded'
        : t.active === false
          ? 'pending'
          : 'completed';

    const method: PaymentRecord['method'] =
      opUpper === 'BONUS' || descLower.includes('bonus')
        ? 'bonus'
        : descLower.includes('kart') || descLower.includes('card') || opUpper === 'TOPUP' || opUpper === 'PURCHASE'
          ? 'card'
          : descLower.includes('bank') || opUpper.includes('TRANSFER')
            ? 'bank'
            : 'wallet';

    const type: PaymentRecord['type'] =
      descLower.includes('mağaza') || descLower.includes('magaza')
        ? 'store_renewal'
        : descLower.includes('elan') || descLower.includes('tanıtım') || descLower.includes('tanitim')
          ? 'listing_promotion'
          : descLower.includes('baxış') || descLower.includes('baxis') || descLower.includes('view')
            ? 'view_purchase'
            : descLower.includes('premium')
              ? 'premium_feature'
              : opUpper === 'TOPUP' || opUpper === 'PURCHASE'
                ? 'wallet_topup'
                : opUpper.includes('TRANSFER')
                  ? 'transfer'
                  : 'wallet_operation';

    return {
      id: String(t.id),
      date,
      amount: Number.isFinite(signedAmount) ? signedAmount : 0,
      description: description || (language === 'az' ? 'Ödəniş əməliyyatı' : 'Платежная операция'),
      status,
      method,
      transactionId: `PAY-${t.id}`,
      type,
    };
    // language is safe here for fallback description
  }, [language]);

  const paymentHistory = useMemo<PaymentRecord[]>(() => {
    const history = walletQuery.data?.payload?.historyResponse || [];
    const mapped = history
      .map(toPaymentRecord)
      .filter((p: PaymentRecord | null | undefined): p is PaymentRecord => Boolean(p))
      .filter((p: PaymentRecord) => Math.abs(p.amount) > 0);

    // Most recent first
    mapped.sort(
      (a: PaymentRecord, b: PaymentRecord) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    return mapped;
  }, [toPaymentRecord, walletQuery.data?.payload?.historyResponse]);

  logger.info('[PaymentHistory] Screen opened:', {
    userId: currentUser?.id,
    totalPayments: paymentHistory.length,
    filter: selectedFilter,
    source: 'payriff_wallet_history',
  });

  const filteredPayments = paymentHistory.filter(payment => {
    if (!payment || !payment.status) {
      logger.warn('[PaymentHistory] Invalid payment record:', payment);
      return false;
    }

    if (selectedFilter === 'all') return true;
    return payment.status === selectedFilter;
  });

  const totalSpent = paymentHistory
    .filter((p: PaymentRecord) => p.status === 'completed' && p.amount < 0)
    .reduce((sum, p) => sum + Math.abs(p.amount), 0);

  const monthlyStats = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 30);

    const monthPayments = paymentHistory.filter((p) => {
      const d = new Date(p.date);
      return !Number.isNaN(d.getTime()) && d >= start && d <= now;
    });

    const completed = monthPayments.filter((p) => p.status === 'completed');
    const completedCount = completed.length;
    const monthTotal = completed.reduce((sum, p) => sum + p.amount, 0);
    const avg = completedCount > 0 ? monthTotal / completedCount : 0;
    const successRate = monthPayments.length > 0 ? (completedCount / monthPayments.length) * 100 : 0;

    return {
      count: completedCount,
      total: monthTotal,
      avg,
      successRate,
    };
  }, [paymentHistory]);

  const getStatusIcon = (status: PaymentRecord['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={20} color={colors.success} />;
      case 'pending':
        return <Clock size={20} color={colors.warning} />;
      case 'failed':
        return <XCircle size={20} color={colors.error} />;
      case 'refunded':
        return <RefreshCw size={20} color={colors.primary} />;
      default:
        return <AlertCircle size={20} color={colors.textSecondary} />;
    }
  };

  const getStatusText = (status: PaymentRecord['status']) => {
    switch (status) {
      case 'completed':
        return 'Tamamlandı';
      case 'pending':
        return 'Gözləyir';
      case 'failed':
        return 'Uğursuz';
      case 'refunded':
        return 'Geri qaytarıldı';
      default:
        return 'Naməlum';
    }
  };

  const getStatusColor = (status: PaymentRecord['status']) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'failed':
        return colors.error;
      case 'refunded':
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  const getMethodIcon = (method: PaymentRecord['method']) => {
    switch (method) {
      case 'card':
        return <CreditCard size={16} color={colors.textSecondary} />;
      case 'bank':
        return <Receipt size={16} color={colors.textSecondary} />;
      case 'wallet':
        return <DollarSign size={16} color={colors.textSecondary} />;
      case 'bonus':
        return <FileText size={16} color={colors.textSecondary} />;
      default:
        return <CreditCard size={16} color={colors.textSecondary} />;
    }
  };

  const getMethodText = (method: PaymentRecord['method']) => {
    switch (method) {
      case 'card':
        return 'Kart';
      case 'bank':
        return 'Bank';
      case 'wallet':
        return 'Balans';
      case 'bonus':
        return 'Bonus';
      default:
        return 'Naməlum';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) {
        logger.warn('[PaymentHistory] Empty date string provided');
        return language === 'az' ? 'Tarix məlum deyil' : 'Дата неизвестна';
      }

      const date = new Date(dateString);

      if (isNaN(date.getTime())) {
        logger.warn('[PaymentHistory] Invalid date string:', dateString);
        return language === 'az' ? 'Tarix səhv' : 'Неверная дата';
      }

      return date.toLocaleDateString(language === 'az' ? 'az-AZ' : 'ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      logger.error('[PaymentHistory] Date formatting error:', error);
      return language === 'az' ? 'Tarix xətası' : 'Ошибка даты';
    }
  };

  const renderPaymentItem = (payment: PaymentRecord) => {
    if (!payment) {
      logger.error('[PaymentHistory] Null payment record in renderPaymentItem');
      return null;
    }

    if (!payment.id || !payment.status || typeof payment.amount !== 'number') {
      logger.warn('[PaymentHistory] Incomplete payment record:', { id: payment.id, status: payment.status });
      return null;
    }

    const isCredit = payment.amount > 0;
    const displayAmount = Math.abs(payment.amount);

    return (
      <TouchableOpacity
        key={payment.id}
        style={styles.paymentItem}
        onPress={() => {
          logger.info('[PaymentHistory] Payment item clicked:', {
            paymentId: payment.id,
            transactionId: payment.transactionId,
          });

          Alert.alert(
            language === 'az' ? 'Ödəniş Detalları' : 'Детали платежа',
            `${language === 'az' ? 'Transaksiya ID' : 'ID транзакции'}: ${payment.transactionId}\n` +
            `${language === 'az' ? 'Məbləğ' : 'Сумма'}: ${payment.amount < 0 ? '-' : '+'}${Math.abs(payment.amount)} AZN\n` +
            `${language === 'az' ? 'Status' : 'Статус'}: ${getStatusText(payment.status)}\n` +
            `${language === 'az' ? 'Tarix' : 'Дата'}: ${formatDate(payment.date)}`,
          );
        }}
      >
        <View style={styles.paymentLeft}>
          <View style={styles.statusIconContainer}>
            {getStatusIcon(payment.status)}
          </View>
          <View style={styles.paymentContent}>
            <Text style={styles.paymentDescription} numberOfLines={2}>
              {payment.description}
            </Text>
            <Text style={styles.paymentType}>
              {typeLabels[payment.type] || (language === 'az' ? 'Ödəniş' : 'Платеж')}
            </Text>
            <View style={styles.paymentMeta}>
              <Text style={styles.paymentDate}>
                {formatDate(payment.date)}
              </Text>
              <View style={styles.paymentMethod}>
                {getMethodIcon(payment.method)}
                <Text style={styles.methodText}>
                  {getMethodText(payment.method)}
                </Text>
              </View>
            </View>
            {payment.storeName && (
              <Text style={styles.storeName}>
                Mağaza: {payment.storeName}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.paymentRight}>
          <Text style={[
            styles.paymentAmount,
            {
              color:
                payment.status === 'refunded' || isCredit
                  ? colors.success
                  : colors.text,
            },
          ]}>
            {payment.status === 'refunded' || isCredit ? '+' : '-'}{displayAmount} AZN
          </Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: `${getStatusColor(payment.status)}20` },
          ]}>
            <Text style={[
              styles.statusText,
              { color: getStatusColor(payment.status) },
            ]}>
              {getStatusText(payment.status)}
            </Text>
          </View>
          <Text style={styles.transactionId}>
            {payment.transactionId}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await walletQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const styles = createStyles(colors);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Ödəniş Tarixçəsi',
          headerRight: () => (
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => {
                  logger.info('[PaymentHistory] Export payment history requested');
                  Alert.alert(
                    language === 'az' ? 'Tarixçəni Yüklə' : 'Загрузить историю',
                    language === 'az'
                      ? 'Ödəniş tarixçəsi PDF formatında yükləniləcək.'
                      : 'История платежей будет загружена в формате PDF.',
                  );
                }}
              >
                <Download size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>Ümumi Xərc</Text>
            <DollarSign size={24} color={colors.primary} />
          </View>
          {walletQuery.isLoading ? (
            <View style={styles.summaryLoadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.summaryLoadingText}>
                {language === 'az' ? 'Yüklənir...' : 'Загрузка...'}
              </Text>
            </View>
          ) : walletQuery.error ? (
            <TouchableOpacity
              style={styles.retryInline}
              onPress={() => walletQuery.refetch()}
            >
              <RefreshCw size={16} color={colors.primary} />
              <Text style={styles.retryInlineText}>
                {language === 'az' ? 'Yenidən cəhd et' : 'Повторить'}
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={styles.summaryAmount}>{totalSpent} AZN</Text>
              <Text style={styles.summarySubtitle}>
                {paymentHistory.filter((p: PaymentRecord) => p.status === 'completed' && p.amount < 0).length} uğurlu ödəniş
              </Text>
            </>
          )}
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {filterOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.filterTab,
                  selectedFilter === option.id && styles.activeFilterTab,
                ]}
                onPress={() => {
                  logger.info('[PaymentHistory] Filter changed:', { from: selectedFilter, to: option.id });
                  setSelectedFilter(option.id);
                }}
              >
                <Text style={[
                  styles.filterTabText,
                  selectedFilter === option.id && styles.activeFilterTabText,
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Payment List */}
        <View style={styles.paymentList}>
          {walletQuery.isLoading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingStateText}>
                {language === 'az' ? 'Ödəniş tarixçəsi yüklənir...' : 'Загрузка истории платежей...'}
              </Text>
            </View>
          ) : walletQuery.error ? (
            <View style={styles.emptyState}>
              <AlertCircle size={48} color={colors.textSecondary} />
              <Text style={styles.emptyStateTitle}>
                {language === 'az' ? 'Xəta baş verdi' : 'Произошла ошибка'}
              </Text>
              <Text style={styles.emptyStateText}>
                {language === 'az'
                  ? 'Ödəniş tarixçəsi yüklənə bilmədi. Yenidən cəhd edin.'
                  : 'Не удалось загрузить историю платежей. Попробуйте снова.'}
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => walletQuery.refetch()}>
                <RefreshCw size={18} color={colors.primary} />
                <Text style={styles.retryButtonText}>
                  {language === 'az' ? 'Yenidən cəhd et' : 'Попробовать снова'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : filteredPayments.length > 0 ? (
            filteredPayments.map(renderPaymentItem)
          ) : (
            <View style={styles.emptyState}>
              <Receipt size={48} color={colors.textSecondary} />
              <Text style={styles.emptyStateTitle}>Ödəniş tapılmadı</Text>
              <Text style={styles.emptyStateText}>
                Seçilmiş filtrə uyğun ödəniş yoxdur
              </Text>
            </View>
          )}
        </View>

        {/* Monthly Summary */}
        <View style={styles.monthlySection}>
          <Text style={styles.sectionTitle}>Aylıq Xülasə</Text>
          <View style={styles.monthlyGrid}>
            <View style={styles.monthlyItem}>
              <Text style={styles.monthlyValue}>{monthlyStats.count}</Text>
              <Text style={styles.monthlyLabel}>Son 30 gün</Text>
            </View>
            <View style={styles.monthlyItem}>
              <Text style={styles.monthlyValue}>{monthlyStats.total.toFixed(0)} AZN</Text>
              <Text style={styles.monthlyLabel}>Ümumi məbləğ</Text>
            </View>
            <View style={styles.monthlyItem}>
              <Text style={styles.monthlyValue}>{monthlyStats.avg.toFixed(0)} AZN</Text>
              <Text style={styles.monthlyLabel}>Orta ödəniş</Text>
            </View>
            <View style={styles.monthlyItem}>
              <Text style={styles.monthlyValue}>{monthlyStats.successRate.toFixed(0)}%</Text>
              <Text style={styles.monthlyLabel}>Uğur nisbəti</Text>
            </View>
          </View>
        </View>

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Text style={styles.sectionTitle}>Kömək və Dəstək</Text>
          <TouchableOpacity
            style={styles.helpItem}
            onPress={() => {
              logger.info('[PaymentHistory] Payment issues help requested');
              Alert.alert(
                language === 'az' ? 'Ödəniş Problemləri' : 'Проблемы с оплатой',
                language === 'az'
                  ? 'Ödəniş ilə bağlı problemləriniz varsa, dəstək komandamızla əlaqə saxlayın.'
                  : 'Если у вас есть проблемы с оплатой, свяжитесь с нашей службой поддержки.',
              );
            }}
          >
            <AlertCircle size={20} color={colors.primary} />
            <Text style={styles.helpText}>
              {language === 'az' ? 'Ödəniş problemləri' : 'Проблемы с оплатой'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.helpItem}
            onPress={() => {
              logger.info('[PaymentHistory] Refund request initiated');
              Alert.alert(
                language === 'az' ? 'Geri Qaytarma' : 'Возврат',
                language === 'az'
                  ? 'Geri qaytarma tələbləri 24 saat ərzində işlənir. Dəstək komandası sizinlə əlaqə saxlayacaq.'
                  : 'Запросы на возврат обрабатываются в течение 24 часов. Служба поддержки свяжется с вами.',
              );
            }}
          >
            <RefreshCw size={20} color={colors.primary} />
            <Text style={styles.helpText}>
              {language === 'az' ? 'Geri qaytarma tələbi' : 'Запрос на возврат'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.helpItem}
            onPress={() => {
              logger.info('[PaymentHistory] Receipt request initiated');
              Alert.alert(
                language === 'az' ? 'Qəbz Tələb Et' : 'Запросить чек',
                language === 'az'
                  ? 'Qəbz email ünvanınıza göndəriləcək. Zəhmət olmasa bir neçə dəqiqə gözləyin.'
                  : 'Чек будет отправлен на ваш email. Пожалуйста, подождите несколько минут.',
              );
            }}
          >
            <FileText size={20} color={colors.primary} />
            <Text style={styles.helpText}>
              {language === 'az' ? 'Qəbz tələb et' : 'Запросить чек'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerButton: {
      padding: 8,
      marginLeft: 8,
    },
    summaryCard: {
      backgroundColor: colors.card,
      margin: 16,
      padding: 20,
      borderRadius: 12,
      ...Platform.select({
        ios: {
          shadowColor: colors.shadow || '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 3,
        },
      }),
    },
    summaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    summaryTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    summaryAmount: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    summarySubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    summaryLoadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 8,
    },
    summaryLoadingText: {
      fontSize: 14,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    retryInline: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
    },
    retryInlineText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '600',
    },
    filterContainer: {
      backgroundColor: colors.card,
      paddingVertical: 16,
      marginBottom: 8,
    },
    filterScrollContent: {
      paddingHorizontal: 16,
    },
    filterTab: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginRight: 12,
      borderRadius: 20,
      backgroundColor: colors.background,
    },
    activeFilterTab: {
      backgroundColor: colors.primary,
    },
    filterTabText: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    activeFilterTabText: {
      color: '#FFFFFF',
    },
    paymentList: {
      backgroundColor: colors.card,
      marginBottom: 8,
    },
    loadingState: {
      alignItems: 'center',
      padding: 28,
      gap: 10,
    },
    loadingStateText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    paymentItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    paymentLeft: {
      flexDirection: 'row',
      flex: 1,
    },
    statusIconContainer: {
      marginRight: 12,
      marginTop: 2,
    },
    paymentContent: {
      flex: 1,
    },
    paymentDescription: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
      marginBottom: 4,
    },
    paymentType: {
      fontSize: 12,
      color: colors.primary,
      fontWeight: '600',
      marginBottom: 8,
    },
    paymentMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    paymentDate: {
      fontSize: 12,
      color: colors.textSecondary,
      marginRight: 16,
    },
    paymentMethod: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    methodText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginLeft: 4,
    },
    storeName: {
      fontSize: 12,
      color: colors.textSecondary,
      fontStyle: 'italic',
    },
    paymentRight: {
      alignItems: 'flex-end',
      marginLeft: 12,
    },
    paymentAmount: {
      fontSize: 16,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      marginBottom: 4,
    },
    statusText: {
      fontSize: 10,
      fontWeight: '600',
    },
    transactionId: {
      fontSize: 10,
      color: colors.textSecondary,
      fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    emptyState: {
      alignItems: 'center',
      padding: 40,
    },
    emptyStateTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyStateText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 14,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}10`,
    },
    retryButtonText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: '600',
    },
    monthlySection: {
      backgroundColor: colors.card,
      padding: 16,
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
    },
    monthlyGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    monthlyItem: {
      width: '50%',
      alignItems: 'center',
      paddingVertical: 12,
    },
    monthlyValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.primary,
    },
    monthlyLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    helpSection: {
      backgroundColor: colors.card,
      padding: 16,
      marginBottom: 16,
    },
    helpItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    helpText: {
      fontSize: 16,
      color: colors.text,
      marginLeft: 12,
    },
  });
}
