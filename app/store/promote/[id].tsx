import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useStoreStore } from '@/store/storeStore';
import { useUserStore } from '@/store/userStore';
import Colors from '@/constants/colors';
import { logger } from '@/utils/logger';
import {
  ArrowLeft,
  TrendingUp,
  Star,
  Zap,
  Crown,
  CreditCard,
  Check,
  X,
} from 'lucide-react-native';

export default function StorePromotionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language } = useLanguageStore();
  const { stores } = useStoreStore();
  const { currentUser, walletBalance, bonusBalance, spendFromBalance, getTotalBalance } = useUserStore();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // ✅ Log screen access
  useEffect(() => {
    logger.info('[StorePromotion] Screen opened:', { storeId: id });
  }, [id]);

  const store = stores.find(s => s.id === id);

  if (!store || !currentUser || store.userId !== currentUser.id) {
    logger.warn('[StorePromotion] Access denied or store not found:', {
      storeId: id,
      hasStore: !!store,
      hasUser: !!currentUser,
      isOwner: store?.userId === currentUser?.id,
    });
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text || '#1F2937'} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {language === 'az' ? 'Xəta' : 'Ошибка'}
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {language === 'az' ? 'Mağaza tapılmadı və ya icazəniz yoxdur' : 'Магазин не найден или у вас нет доступа'}
          </Text>
        </View>
      </View>
    );
  }

  const promotionPlans = [
    {
      id: 'premium',
      name: language === 'az' ? 'Premium Mağaza' : 'Премиум Магазин',
      price: 25,
      duration: 30,
      features: [
        language === 'az' ? 'Axtarış nəticələrində önə çıxma' : 'Приоритет в результатах поиска',
        language === 'az' ? 'Premium nişanı' : 'Премиум значок',
        language === 'az' ? 'Əlavə görünürlük' : 'Дополнительная видимость',
        language === 'az' ? '30 gün müddətində' : 'На 30 дней',
      ],
      color: Colors.primary || '#0E7490',
      icon: TrendingUp,
    },
    {
      id: 'featured',
      name: language === 'az' ? 'Seçilmiş Mağaza' : 'Рекомендуемый Магазин',
      price: 40,
      duration: 30,
      features: [
        language === 'az' ? 'Ana səhifədə göstərilmə' : 'Показ на главной странице',
        language === 'az' ? 'Xüsusi nişan' : 'Специальный значок',
        language === 'az' ? 'Maksimum görünürlük' : 'Максимальная видимость',
        language === 'az' ? '30 gün müddətində' : 'На 30 дней',
      ],
      color: Colors.warning,
      icon: Star,
    },
    {
      id: 'vip',
      name: language === 'az' ? 'VIP Mağaza' : 'VIP Магазин',
      price: 60,
      duration: 30,
      features: [
        language === 'az' ? 'Bütün premium xüsusiyyətlər' : 'Все премиум функции',
        language === 'az' ? 'VIP nişanı' : 'VIP значок',
        language === 'az' ? 'Ən yüksək prioritet' : 'Наивысший приоритет',
        language === 'az' ? 'Xüsusi dəstək' : 'Специальная поддержка',
        language === 'az' ? '30 gün müddətində' : 'На 30 дней',
      ],
      color: '#8B5CF6',
      icon: Crown,
    },
  ];

  const handleSelectPlan = (planId: string) => {
    logger.info('[StorePromotion] Plan selected:', {
      storeId: id,
      planId,
      previousPlan: selectedPlan,
    });
    setSelectedPlan(planId);
  };

  const handlePurchase = async () => {
    if (!selectedPlan) {
      logger.warn('[StorePromotion] No plan selected');
      return;
    }

    if (isProcessing) {
      logger.warn('[StorePromotion] Already processing a purchase');
      return;
    }

    const plan = promotionPlans.find(p => p.id === selectedPlan);
    if (!plan) {
      logger.error('[StorePromotion] Selected plan not found:', { planId: selectedPlan });
      return;
    }

    logger.info('[StorePromotion] Purchase initiated:', {
      storeId: id,
      planId: plan.id,
      price: plan.price,
      duration: plan.duration,
    });

    // ✅ Check balance first
    const totalBalance = getTotalBalance();
    if (totalBalance < plan.price) {
      logger.warn('[StorePromotion] Insufficient balance:', {
        required: plan.price,
        available: totalBalance,
      });
      Alert.alert(
        language === 'az' ? 'Balans kifayət etmir' : 'Недостаточно средств',
        language === 'az'
          ? `Bu plan üçün ${plan.price} AZN lazımdır. Balansınız: ${totalBalance.toFixed(2)} AZN`
          : `Для этого плана требуется ${plan.price} AZN. Ваш баланс: ${totalBalance.toFixed(2)} AZN`,
        [
          {
            text: language === 'az' ? 'Ləğv et' : 'Отмена',
            style: 'cancel',
            onPress: () => logger.info('[StorePromotion] User cancelled due to insufficient balance'),
          },
          {
            text: language === 'az' ? 'Balans artır' : 'Пополнить баланс',
            onPress: () => {
              logger.info('[StorePromotion] Navigating to wallet to add balance');
              router.push('/wallet');
            },
          },
        ],
      );
      return;
    }

    logger.info('[StorePromotion] Showing confirmation dialog:', {
      planId: plan.id,
      price: plan.price,
      balance: totalBalance,
    });

    Alert.alert(
      language === 'az' ? 'Ödəniş təsdiqi' : 'Подтверждение оплаты',
      language === 'az'
        ? `${plan.name} planını ${plan.price} AZN-ə satın almaq istədiyinizə əminsiniz?\n\nBalansınız: ${totalBalance.toFixed(2)} AZN`
        : `Вы уверены, что хотите купить план ${plan.name} за ${plan.price} AZN?\n\nВаш баланс: ${totalBalance.toFixed(2)} AZN`,
      [
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
          onPress: () => {
            logger.info('[StorePromotion] User cancelled payment confirmation');
          },
        },
        {
          text: language === 'az' ? 'Ödə' : 'Оплатить',
          onPress: async () => {
            if (isProcessing) {
              logger.warn('[StorePromotion] Already processing payment');
              return;
            }

            setIsProcessing(true);
            logger.info('[StorePromotion] Processing payment:', {
              storeId: id,
              planId: plan.id,
              price: plan.price,
            });

            try {
              // ✅ Use spendFromBalance for automatic bonus → wallet ordering
              const paymentSuccess = spendFromBalance(plan.price);

              if (!paymentSuccess) {
                logger.error('[StorePromotion] Payment failed:', {
                  price: plan.price,
                  balance: getTotalBalance(),
                });
                Alert.alert(
                  language === 'az' ? 'Xəta' : 'Ошибка',
                  language === 'az' ? 'Ödəniş uğursuz oldu' : 'Платеж не удался',
                );
                return;
              }

              logger.info('[StorePromotion] Payment successful:', {
                price: plan.price,
                remainingBalance: getTotalBalance(),
              });

              // ✅ Payment successful - show success
              Alert.alert(
                language === 'az' ? 'Uğurlu!' : 'Успешно!',
                language === 'az'
                  ? `Mağazanız ${plan.name} paketi ilə uğurla təşviq edildi! ${plan.price} AZN balansınızdan çıxarıldı.`
                  : `Ваш магазин успешно продвинут с пакетом ${plan.name}! ${plan.price} AZN списано с баланса.`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      logger.info('[StorePromotion] Success confirmed, navigating back');
                      router.back();
                    },
                  },
                ],
              );
            } catch (error) {
              logger.error('[StorePromotion] Store promotion error:', error);
              Alert.alert(
                language === 'az' ? 'Xəta' : 'Ошибка',
                language === 'az' ? 'Təşviq zamanı xəta baş verdi' : 'Произошла ошибка при продвижении',
              );
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text || '#1F2937'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'az' ? 'Mağazanı təşviq et' : 'Продвинуть магазин'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.storeInfo}>
          <Text style={styles.storeName}>{store.name}</Text>
          <Text style={styles.storeDescription}>
            {language === 'az'
              ? 'Mağazanızın görünürlüyünü artırın və daha çox müştəri cəlb edin'
              : 'Увеличьте видимость вашего магазина и привлеките больше клиентов'}
          </Text>
        </View>

        {/* Balance Display */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>
              {language === 'az' ? 'Cari Balans:' : 'Текущий баланс:'}
            </Text>
            <Text style={styles.balanceAmount}>
              {(walletBalance + bonusBalance).toFixed(2)} AZN
            </Text>
          </View>
          <View style={styles.balanceBreakdown}>
            <Text style={styles.balanceDetail}>
              {language === 'az' ? 'Əsas:' : 'Основной:'} {walletBalance.toFixed(2)} AZN
            </Text>
            <Text style={styles.balanceDetail}>
              {language === 'az' ? 'Bonus:' : 'Бонус:'} {bonusBalance.toFixed(2)} AZN
            </Text>
          </View>
        </View>

        <View style={styles.plansContainer}>
          {promotionPlans.map((plan) => {
            const IconComponent = plan.icon;
            const isSelected = selectedPlan === plan.id;

            return (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  isSelected && styles.selectedPlanCard,
                  { borderColor: plan.color },
                ]}
                onPress={() => handleSelectPlan(plan.id)}
              >
                <View style={styles.planHeader}>
                  <View style={[styles.planIcon, { backgroundColor: `${plan.color}20` }]}>
                    <IconComponent size={24} color={plan.color} />
                  </View>
                  <View style={styles.planInfo}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planPrice}>
                      {plan.price} AZN / {plan.duration} {language === 'az' ? 'gün' : 'дней'}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.selectedIndicator}>
                      <Check size={20} color="white" />
                    </View>
                  )}
                </View>

                <View style={styles.planFeatures}>
                  {plan.features.map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Check size={16} color={plan.color} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>
            {language === 'az' ? 'Təşviq etməyin faydaları' : 'Преимущества продвижения'}
          </Text>
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Zap size={20} color={Colors.warning} />
              <Text style={styles.benefitText}>
                {language === 'az'
                  ? 'Daha çox müştəri və satış'
                  : 'Больше клиентов и продаж'}
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <TrendingUp size={20} color={Colors.primary || '#0E7490'} />
              <Text style={styles.benefitText}>
                {language === 'az'
                  ? 'Axtarış nəticələrində üstünlük'
                  : 'Преимущество в результатах поиска'}
              </Text>
            </View>
            <View style={styles.benefitItem}>
              <Star size={20} color={Colors.warning} />
              <Text style={styles.benefitText}>
                {language === 'az'
                  ? 'Brendinizin tanınması'
                  : 'Узнаваемость вашего бренда'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {selectedPlan && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.purchaseButton,
              isProcessing && styles.processingButton,
            ]}
            onPress={handlePurchase}
            disabled={isProcessing}
          >
            <CreditCard size={20} color="white" />
            <Text style={styles.purchaseButtonText}>
              {isProcessing
                ? (language === 'az' ? 'Emal edilir...' : 'Обработка...')
                : (language === 'az' ? 'Ödəniş et' : 'Оплатить')
              }
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background || '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card || '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border || '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text || '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  storeInfo: {
    backgroundColor: Colors.card || '#FFFFFF',
    padding: 20,
    alignItems: 'center',
  },
  storeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text || '#1F2937',
    marginBottom: 8,
  },
  storeDescription: {
    fontSize: 16,
    color: Colors.textSecondary || '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  plansContainer: {
    padding: 16,
    gap: 16,
  },
  planCard: {
    backgroundColor: Colors.card || '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.border || '#E5E7EB',
  },
  selectedPlanCard: {
    borderWidth: 2,
    backgroundColor: 'rgba(14, 116, 144, 0.05)',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text || '#1F2937',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 16,
    color: Colors.primary || '#0E7490',
    fontWeight: '600',
  },
  selectedIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary || '#0E7490',
    justifyContent: 'center',
    alignItems: 'center',
  },
  planFeatures: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    color: Colors.text || '#1F2937',
    marginLeft: 8,
    flex: 1,
  },
  benefitsSection: {
    backgroundColor: Colors.card || '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 16,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text || '#1F2937',
    marginBottom: 16,
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 14,
    color: Colors.text || '#1F2937',
    marginLeft: 12,
    flex: 1,
  },
  footer: {
    padding: 16,
    backgroundColor: Colors.card || '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: Colors.border || '#E5E7EB',
  },
  purchaseButton: {
    backgroundColor: Colors.primary || '#0E7490',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  purchaseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textSecondary || '#6B7280',
    textAlign: 'center',
  },
  balanceCard: {
    backgroundColor: Colors.card || '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border || '#E5E7EB',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text || '#1F2937',
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary || '#0E7490',
  },
  balanceBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border || '#E5E7EB',
  },
  balanceDetail: {
    fontSize: 12,
    color: Colors.textSecondary || '#6B7280',
  },
  processingButton: {
    opacity: 0.6,
  },
});
