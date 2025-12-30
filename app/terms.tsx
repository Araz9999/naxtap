import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useThemeStore } from '@/store/themeStore';
import { getColors } from '@/constants/colors';
import {
  FileText,
  Shield,
  Eye,
  Users,
  Lock,
  AlertTriangle,
  CheckCircle,
  Info,
  Scale,
  Globe,
  Mail,
  Phone,
  Calendar,
  ArrowLeft,
} from 'lucide-react-native';

interface TermsSection {
  icon: React.ComponentType<any>;
  title: string;
  content: string;
}

const { width } = Dimensions.get('window');

export default function TermsScreen() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const colors = getColors(themeMode, colorTheme);
  const [headerAnimation] = useState(new Animated.Value(0));
  const [contentAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(contentAnimation, {
        toValue: 1,
        duration: 1000,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const termsData = {
    az: {
      title: 'İstifadəçi Razılaşması',
      lastUpdated: 'Son yenilənmə: 10 Avqust 2025',
      sections: [
        {
          icon: Info,
          title: '1. Ümumi Müddəalar',
          content: 'Bu istifadəçi razılaşması ("Razılaşma") Naxtap mobil tətbiqi ("Tətbiq") və onun xidmətlərinin istifadəsini tənzimləyir. Tətbiqi istifadə etməklə siz bu şərtləri qəbul etmiş olursunuz.',
        },
        {
          icon: Users,
          title: '2. İstifadəçi Hesabları',
          content: 'Tətbiqdən tam faydalanmaq üçün hesab yaratmalısınız. Hesab məlumatlarınızın doğruluğundan və təhlükəsizliyindən siz məsulsiniz. Hesabınızı başqaları ilə paylaşmayın.',
        },
        {
          icon: FileText,
          title: '3. Elan Yerləşdirmə Qaydalari',
          content: 'Elanlarınız qanuni, doğru və tam olmalıdır. Saxta məlumat, qeyri-qanuni məhsullar və ya xidmətlər qadağandır. Hər elan üçün müvafiq kateqoriya seçilməlidir.',
        },
        {
          icon: Shield,
          title: '4. Qadağan Edilən Fəaliyyətlər',
          content: 'Spam göndərmək, digər istifadəçiləri aldatmaq, qeyri-qanuni məzmun paylaşmaq, sistemə zərər vermək və ya digər istifadəçiləri narahat etmək qadağandır.',
        },
        {
          icon: Eye,
          title: '5. Məxfilik və Şəxsi Məlumatlar',
          content: 'Şəxsi məlumatlarınızın qorunması bizim üçün vacibdir. Məlumatlarınızın necə toplandığı və istifadə edildiyi haqqında ətraflı məlumat üçün Məxfilik Siyasətimizi oxuyun.',
        },
        {
          icon: Scale,
          title: '6. Ödəniş və Geri Qaytarma',
          content: 'Premium xidmətlər və reklam paketləri üçün ödənişlər təhlükəsizdir. Geri qaytarma siyasətimiz xidmət növündən asılı olaraq dəyişir. Ətraflı məlumat üçün bizimlə əlaqə saxlayın.',
        },
        {
          icon: AlertTriangle,
          title: '7. Məsuliyyət Məhdudiyyəti',
          content: 'Tətbiq "olduğu kimi" təqdim edilir. İstifadəçilər arasında baş verən əməliyyatlardan və ya zərərlərdən məsuliyyət daşımırıq. Tətbiqi öz riskinizlə istifadə edin.',
        },
        {
          icon: Lock,
          title: '8. Əqli Mülkiyyət',
          content: 'Tətbiqin dizaynı, loqosu və məzmunu bizim əqli mülkiyyətimizdir. İcazəsiz istifadə qadağandır. İstifadəçilərin yerləşdirdiyi məzmunun məsuliyyəti onlara aiddir.',
        },
        {
          icon: Globe,
          title: '9. Razılaşmada Dəyişikliklər',
          content: 'Bu razılaşmanı istənilən vaxt dəyişdirmək hüququmuzu saxlayırıq. Dəyişikliklər tətbiqdə elan ediləcək və qüvvəyə minmə tarixi göstəriləcək.',
        },
        {
          icon: Mail,
          title: '10. Əlaqə Məlumatları',
          content: 'Suallarınız və ya şikayətləriniz üçün bizimlə əlaqə saxlayın:\n\nE-poçt: naxtapaz@gmail.com\nTelefon: +994504801313\nÜnvan: Naxçıvan, Azərbaycan',
        },
      ],
    },
    ru: {
      title: 'Пользовательское соглашение',
      lastUpdated: 'Последнее обновление: 10 августа 2025',
      sections: [
        {
          icon: Info,
          title: '1. Общие положения',
          content: 'Данное пользовательское соглашение ("Соглашение") регулирует использование мобильного приложения Naxtap ("Приложение") и его сервисов. Используя приложение, вы соглашаетесь с данными условиями.',
        },
        {
          icon: Users,
          title: '2. Пользовательские ак��аунты',
          content: 'Для полного использования приложения необходимо создать аккаунт. Вы несете ответственность за точность и безопасность данных вашего аккаунта. Не делитесь своим аккаунтом с другими.',
        },
        {
          icon: FileText,
          title: '3. Правила размещения объявлений',
          content: 'Ваши объявления должны быть законными, правдивыми и полными. Запрещена ложная информация, незаконные товары или услуги. Для каждого объявления должна быть выбрана соответствующая категория.',
        },
        {
          icon: Shield,
          title: '4. Запрещенные действия',
          content: 'Запрещается отправка спама, обман других пользователей, публикация незаконного контента, нанесение вреда системе или беспокойство других пользователей.',
        },
        {
          icon: Eye,
          title: '5. Конфиденциальность и персональные данные',
          content: 'Защита ваших персональных данных важна для нас. Подробную информацию о том, как собираются и используются ваши данные, читайте в нашей Политике конфиденциальности.',
        },
        {
          icon: Scale,
          title: '6. Оплата и возврат средств',
          content: 'Платежи за премиум-сервисы и рекламные пакеты безопасны. Наша политика возврата средств варьируется в зависимости от типа услуги. Для подробной информации свяжитесь с нами.',
        },
        {
          icon: AlertTriangle,
          title: '7. Ограничение ответственности',
          content: 'Приложение предоставляется "как есть". Мы не несем ответственности за сделки между пользователями или ущерб. Используйте приложение на свой риск.',
        },
        {
          icon: Lock,
          title: '8. Интеллектуальная собственность',
          content: 'Дизайн, логотип и контент приложения являются нашей интеллектуальной собственностью. Несанкционированное использование запрещено. Ответственность за контент, размещаемый пользователями, лежит на них.',
        },
        {
          icon: Globe,
          title: '9. Изменения в соглашении',
          content: 'Мы оставляем за собой право изменять данное соглашение в любое время. Изменения будут объявлены в приложении с указанием даты вступления в силу.',
        },
        {
          icon: Mail,
          title: '10. Контактная информация',
          content: 'По вопросам и жалобам обращайтесь к нам:\n\nE-mail: naxtapaz@gmail.com\nТелефон: +994504801313\nАдрес: Нахчыван, Азербайджан',
        },
      ],
    },
  };

  const currentTerms = termsData[language as keyof typeof termsData];

  const SectionItem = ({ section, index }: { section: TermsSection; index: number }) => {
    const Icon = section.icon;

    return (
      <Animated.View
        style={[
          styles.sectionItem,
          { backgroundColor: colors.card },
          {
            opacity: contentAnimation,
            transform: [{
              translateY: contentAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            }],
          },
        ]}
      >
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconContainer, { backgroundColor: `${colors.primary}15` }]}>
            <Icon size={20} color={colors.primary} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {section.title}
          </Text>
        </View>
        <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>
          {section.content}
        </Text>
      </Animated.View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: currentTerms.title,
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <Animated.View style={[
          styles.heroSection,
          {
            backgroundColor: colors.primary,
            opacity: headerAnimation,
            transform: [{
              translateY: headerAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0],
              }),
            }],
          },
        ]}>
          <View style={styles.heroContent}>
            <View style={styles.heroIconContainer}>
              <FileText size={32} color="#fff" />
            </View>
            <Text style={styles.heroTitle}>
              {currentTerms.title}
            </Text>
            <Text style={styles.heroSubtitle}>
              {currentTerms.lastUpdated}
            </Text>
            <View style={styles.acceptanceBadge}>
              <CheckCircle size={16} color="#fff" />
              <Text style={styles.acceptanceText}>
                {language === 'az' ? 'Qəbul edilmiş' : 'Принято'}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Important Notice */}
        <Animated.View style={[
          styles.noticeContainer,
          { backgroundColor: colors.card },
          {
            opacity: contentAnimation,
            transform: [{
              translateY: contentAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            }],
          },
        ]}>
          <View style={styles.noticeHeader}>
            <AlertTriangle size={20} color="#FF6B6B" />
            <Text style={[styles.noticeTitle, { color: colors.text }]}>
              {language === 'az' ? 'Vacib Qeyd' : 'Важное примечание'}
            </Text>
          </View>
          <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
            {language === 'az'
              ? 'Bu razılaşmanı diqqətlə oxuyun. Tətbiqi istifadə etməklə siz bu şərtləri qəbul etmiş olursunuz.'
              : 'Внимательно прочитайте данное соглашение. Используя приложение, вы соглашаетесь с этими условиями.'
            }
          </Text>
        </Animated.View>

        {/* Terms Sections */}
        <View style={styles.sectionsContainer}>
          {currentTerms.sections.map((section, index) => (
            <SectionItem key={index} section={section} index={index} />
          ))}
        </View>

        {/* Footer */}
        <Animated.View style={[
          styles.footer,
          { backgroundColor: colors.card },
          {
            opacity: contentAnimation,
          },
        ]}>
          <View style={styles.footerIconContainer}>
            <Calendar size={16} color={colors.primary} />
          </View>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            {language === 'az'
              ? 'Bu razılaşma 10 Avqust 2025 tarixindən qüvvədədir.'
              : 'Данное соглашение действует с 10 августа 2025 года.'
            }
          </Text>
        </Animated.View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  heroSection: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  heroContent: {
    alignItems: 'center',
  },
  heroIconContainer: {
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 16,
  },
  acceptanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  acceptanceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  noticeContainer: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
  },
  sectionsContainer: {
    marginTop: 20,
  },
  sectionItem: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  sectionContent: {
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  footerIconContainer: {
    marginRight: 8,
  },
  footerText: {
    fontSize: 12,
    flex: 1,
  },
  bottomSpacing: {
    height: 40,
  },
});
