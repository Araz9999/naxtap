import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import Colors from '@/constants/colors';
import { ArrowLeft, Tag, Percent, Calendar, Users, TrendingUp, Gift, Zap, Info, CheckCircle } from 'lucide-react-native';
import { logger } from '@/utils/logger';

export default function DiscountHelpScreen() {
  const router = useRouter();
  const { language } = useLanguageStore();

  // ✅ Log screen open
  React.useEffect(() => {
    logger.info('[DiscountHelp] Screen opened', { language });
  }, []);

  const features = [
    {
      icon: Tag,
      title: language === 'az' ? 'Tək Məhsula Endirim' : 'Скидка на отдельный товар',
      description: language === 'az'
        ? 'Hər hansı bir məhsula fərdi endirim tətbiq edin. Faiz və ya sabit məbləğ olaraq təyin edə bilərsiniz.'
        : 'Применяйте индивидуальную скидку к любому товару. Можете установить в процентах или фиксированной суммой.',
      benefits: language === 'az'
        ? ['Məhsul satışını artırır', 'Müştəri marağını cəlb edir', 'Rəqabətdə üstünlük verir']
        : ['Увеличивает продажи товара', 'Привлекает внимание покупателей', 'Дает преимущество в конкуренции'],
    },
    {
      icon: Percent,
      title: language === 'az' ? 'Endirim Növləri' : 'Типы скидок',
      description: language === 'az'
        ? 'İki növ endirim mövcuddur: faiz endirimi (məs: 20%) və sabit məbləğ endirimi (məs: 50 AZN).'
        : 'Доступны два типа скидок: процентная скидка (напр: 20%) и скидка фиксированной суммой (напр: 50 AZN).',
      benefits: language === 'az'
        ? ['Çevik qiymətləndirmə', 'Müxtəlif strategiyalar', 'Maksimum nəzarət']
        : ['Гибкое ценообразование', 'Различные стратегии', 'Максимальный контроль'],
    },
    {
      icon: Calendar,
      title: language === 'az' ? 'Müddət Nəzarəti' : 'Контроль сроков',
      description: language === 'az'
        ? 'Endirimin başlama və bitmə tarixlərini təyin edin. Məhdud müddətli təkliflər yaradın.'
        : 'Устанавливайте даты начала и окончания скидки. Создавайте предложения ограниченного времени.',
      benefits: language === 'az'
        ? ['Təcili hiss yaradır', 'Planlaşdırılmış kampaniyalar', 'Avtomatik idarəetmə']
        : ['Создает ощущение срочности', 'Запланированные кампании', 'Автоматическое управление'],
    },
    {
      icon: Users,
      title: language === 'az' ? 'İstifadə Limiti' : 'Лимит использования',
      description: language === 'az'
        ? 'Endirimin neçə dəfə istifadə oluna biləcəyini məhdudlaşdırın. Eksklüziv təkliflər yaradın.'
        : 'Ограничивайте количество использований скидки. Создавайте эксклюзивные предложения.',
      benefits: language === 'az'
        ? ['Eksklüzivlik hissi', 'Nəzarətli xərclər', 'Strategik paylaşma']
        : ['Ощущение эксклюзивности', 'Контролируемые расходы', 'Стратегическое распределение'],
    },
    {
      icon: Gift,
      title: language === 'az' ? 'Promo Kodlar' : 'Промокоды',
      description: language === 'az'
        ? 'Hər endirim üçün xüsusi promo kodlar yaradın. Müştərilər bu kodları istifadə edərək endirim ala bilərlər.'
        : 'Создавайте специальные промокоды для каждой скидки. Покупатели могут использовать эти коды для получения скидки.',
      benefits: language === 'az'
        ? ['Marketinq alətı', 'İzləmə imkanı', 'Müştəri sadiqliyi']
        : ['Маркетинговый инструмент', 'Возможность отслеживания', 'Лояльность клиентов'],
    },
    {
      icon: TrendingUp,
      title: language === 'az' ? 'Satış Artımı' : 'Увеличение продаж',
      description: language === 'az'
        ? 'Endirimlər məhsullarınızın görünürlüyünü artırır və daha çox müştəri cəlb edir.'
        : 'Скидки повышают видимость ваших товаров и привлекают больше покупателей.',
      benefits: language === 'az'
        ? ['Daha çox baxış', 'Artmış satış', 'Müştəri bazası genişlənməsi']
        : ['Больше просмотров', 'Увеличенные продажи', 'Расширение клиентской базы'],
    },
  ];

  const howToUse = [
    {
      step: 1,
      title: language === 'az' ? 'Məhsulu seçin' : 'Выберите товар',
      description: language === 'az'
        ? 'Mənim Elanlarım səhifəsindən mağaza məhsulunuzu seçin və "Endirim" düyməsinə basın.'
        : 'На странице "Мои объявления" выберите товар из магазина и нажмите кнопку "Скидка".',
    },
    {
      step: 2,
      title: language === 'az' ? 'Endirim təyin edin' : 'Установите скидку',
      description: language === 'az'
        ? 'Endirim adı, təsviri və dəyərini daxil edin. Faiz və ya sabit məbləğ seçin.'
        : 'Введите название скидки, описание и значение. Выберите процент или фиксированную сумму.',
    },
    {
      step: 3,
      title: language === 'az' ? 'Əlavə tənzimləmələr' : 'Дополнительные настройки',
      description: language === 'az'
        ? 'İstəyə görə minimum alış məbləği, maksimum endirim və istifadə limiti təyin edin.'
        : 'При желании установите минимальную сумму покупки, максимальную скидку и лимит использования.',
    },
    {
      step: 4,
      title: language === 'az' ? 'Promo kod yaradın' : 'Создайте промокод',
      description: language === 'az'
        ? 'Endirim yaradıldıqdan sonra promo kodlar yarada və müştərilərlə paylaşa bilərsiniz.'
        : 'После создания скидки можете создавать промокоды и делиться ими с покупателями.',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            logger.info('[DiscountHelp] Back button clicked');
            router.back();
          }}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {language === 'az' ? 'Endirim Sistemi Kömək' : 'Помощь по системе скидок'}
        </Text>
      </View>

      {/* Introduction */}
      <View style={styles.section}>
        <View style={styles.introCard}>
          <Zap size={32} color={Colors.primary} />
          <Text style={styles.introTitle}>
            {language === 'az' ? 'Güclü Endirim Sistemi' : 'Мощная система скидок'}
          </Text>
          <Text style={styles.introDescription}>
            {language === 'az'
              ? 'Məhsullarınıza fərdi endirimlər tətbiq edin, promo kodlar yaradın və satışlarınızı artırın. Tam nəzarət sizin əlinizdədir!'
              : 'Применяйте индивидуальные скидки к товарам, создавайте промокоды и увеличивайте продажи. Полный контроль в ваших руках!'
            }
          </Text>
        </View>
      </View>

      {/* Features */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {language === 'az' ? 'Əsas Xüsusiyyətlər' : 'Основные возможности'}
        </Text>
        {features.map((feature, index) => (
          <View key={index} style={styles.featureCard}>
            <View style={styles.featureHeader}>
              <View style={styles.featureIcon}>
                <feature.icon size={24} color={Colors.primary} />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
            </View>
            <Text style={styles.featureDescription}>{feature.description}</Text>
            <View style={styles.benefitsList}>
              {feature.benefits.map((benefit, benefitIndex) => (
                <View key={benefitIndex} style={styles.benefitItem}>
                  <CheckCircle size={16} color={Colors.success} />
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>

      {/* How to Use */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {language === 'az' ? 'Necə İstifadə Etmək Olar?' : 'Как использовать?'}
        </Text>
        {howToUse.map((step, index) => (
          <View key={index} style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{step.step}</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDescription}>{step.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Tips */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {language === 'az' ? 'Faydalı Məsləhətlər' : 'Полезные советы'}
        </Text>
        <View style={styles.tipsCard}>
          <Info size={20} color={Colors.primary} />
          <View style={styles.tipsContent}>
            <Text style={styles.tipsTitle}>
              {language === 'az' ? 'Uğurlu Endirim Strategiyaları' : 'Успешные стратегии скидок'}
            </Text>
            <View style={styles.tipsList}>
              <Text style={styles.tipItem}>
                • {language === 'az'
                  ? 'Məhdud müddətli endirimlər təcili hiss yaradır'
                  : 'Скидки ограниченного времени создают ощущение срочности'
                }
              </Text>
              <Text style={styles.tipItem}>
                • {language === 'az'
                  ? 'Minimum alış məbləği orta çeki artırır'
                  : 'Минимальная сумма покупки увеличивает средний чек'
                }
              </Text>
              <Text style={styles.tipItem}>
                • {language === 'az'
                  ? 'Promo kodları sosial mediada paylaşın'
                  : 'Делитесь промокодами в социальных сетях'
                }
              </Text>
              <Text style={styles.tipItem}>
                • {language === 'az'
                  ? 'Endirim dəyərini məhsulun qiymətinə uyğun seçin'
                  : 'Выбирайте размер скидки соответственно цене товара'
                }
              </Text>
              <Text style={styles.tipItem}>
                • {language === 'az'
                  ? 'Müntəzəm olaraq endirim performansını izləyin'
                  : 'Регулярно отслеживайте эффективность скидок'
                }
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* CTA */}
      <View style={styles.section}>
        <View style={styles.ctaCard}>
          <Text style={styles.ctaTitle}>
            {language === 'az' ? 'İndi Başlayın!' : 'Начните сейчас!'}
          </Text>
          <Text style={styles.ctaDescription}>
            {language === 'az'
              ? 'Məhsullarınıza endirim tətbiq etmək üçün "Mənim Elanlarım" səhifəsinə keçin və mağaza məhsulunuzu seçin.'
              : 'Перейдите на страницу "Мои объявления" и выберите товар из магазина, чтобы применить скидку.'
            }
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => {
              logger.info('[DiscountHelp] CTA button clicked - navigating to my listings');
              router.push('/my-listings');
            }}
          >
            <Text style={styles.ctaButtonText}>
              {language === 'az' ? 'Mənim Elanlarım' : 'Мои объявления'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    marginRight: 16,
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  introCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  introDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  featureCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
  },
  featureDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  benefitsList: {
    gap: 8,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  tipsContent: {
    flex: 1,
    marginLeft: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  ctaCard: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  ctaDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  ctaButton: {
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  ctaButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
