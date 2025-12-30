import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useThemeStore } from '@/store/themeStore';
import { getColors } from '@/constants/colors';
import {
  Shield,
  Eye,
  Lock,
  Database,
  Users,
  Globe,
  Settings,
  AlertTriangle,
  Info,
  Mail,
  Calendar,
  ArrowLeft,
  Cookie,
  Share2,
  Trash2,
} from 'lucide-react-native';

export default function PrivacyScreen() {
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
  }, [headerAnimation, contentAnimation]);

  const privacyData = {
    az: {
      title: 'Məxfilik Siyasəti',
      lastUpdated: 'Son yenilənmə: 10 Avqust 2025',
      sections: [
        {
          icon: Info,
          title: '1. Ümumi Məlumat',
          content: 'Bu məxfilik siyasəti Naxtap mobil tətbiqi ("Tətbiq") tərəfindən şəxsi məlumatlarınızın necə toplandığı, istifadə edildiyi və qorunduğunu izah edir. Məxfiliyiniz bizim üçün çox vacibdir.',
        },
        {
          icon: Database,
          title: '2. Topladığımız Məlumatlar',
          content: 'Biz aşağıdakı məlumatları toplaya bilərik:\n\n• Şəxsi məlumatlar (ad, e-poçt, telefon)\n• Hesab məlumatları və profil şəkli\n• Elan məlumatları və şəkillər\n• Cihaz məlumatları və IP ünvanı\n• İstifadə statistikaları və tətbiq davranışı',
        },
        {
          icon: Eye,
          title: '3. Məlumatların İstifadəsi',
          content: 'Topladığımız məlumatları aşağıdakı məqsədlər üçün istifadə edirik:\n\n• Xidmətlərimizi təqdim etmək və təkmilləşdirmək\n• İstifadəçi hesablarını idarə etmək\n• Elanları nəşr etmək və göstərmək\n• Müştəri dəstəyi təqdim etmək\n• Təhlükəsizlik və saxtakarlığın qarşısını almaq',
        },
        {
          icon: Share2,
          title: '4. Məlumatların Paylaşılması',
          content: 'Şəxsi məlumatlarınızı üçüncü tərəflərlə paylaşmırıq, yalnız aşağıdakı hallarda istisna:\n\n• Qanuni tələblər və məhkəmə qərarları\n• Təhlükəsizlik və saxtakarlıq halları\n• Xidmət təminatçıları (məhdud və təhlükəsiz)\n• Sizin açıq razılığınızla',
        },
        {
          icon: Cookie,
          title: '5. Kukilər və İzləmə',
          content: 'Tətbiqimiz istifadə təcrübəsini yaxşılaşdırmaq üçün kukilər və oxşar texnologiyalar istifadə edir. Bu texnologiyalar tətbiq parametrlərini yadda saxlamaq və analitika üçün istifadə olunur.',
        },
        {
          icon: Lock,
          title: '6. Məlumatların Təhlükəsizliyi',
          content: 'Şəxsi məlumatlarınızın təhlükəsizliyi üçün müasir şifrələmə və təhlükəsizlik tədbirləri tətbiq edirik. Məlumatlar təhlükəsiz serverlərdə saxlanılır və məhdud girişə malikdir.',
        },
        {
          icon: Settings,
          title: '7. Məxfilik Parametrləri',
          content: 'Siz öz məxfilik parametrlərinizi idarə edə bilərsiniz:\n\n• Profil görünürlüyü\n• Elan məxfiliyi\n• Bildiriş parametrləri\n• Məlumat paylaşımı seçimləri\n• Hesab deaktivləşdirmə',
        },
        {
          icon: Trash2,
          title: '8. Məlumatların Silinməsi',
          content: 'Siz istənilən vaxt hesabınızı və şəxsi məlumatlarınızı silə bilərsiniz. Hesab silindikdən sonra bütün şəxsi məlumatlar 30 gün ərzində sistemdən tamamilə silinir.',
        },
        {
          icon: Users,
          title: '9. Uşaqların Məxfiliyi',
          content: '13 yaşından kiçik uşaqlardan şüurlu şəkildə şəxsi məlumat toplamırıq. Əgər belə məlumat toplandığını öyrənsək, dərhal silirik. Valideynlər uşaqlarının onlayn fəaliyyətini nəzarət etməlidilər.',
        },
        {
          icon: Globe,
          title: '10. Beynəlxalq Ötürmə',
          content: 'Məlumatlarınız Azərbaycan ərazisində saxlanılır. Beynəlxalq ötürmə hallarında uyğun təhlükəsizlik tədbirləri və qanuni tələblər təmin edilir.',
        },
        {
          icon: AlertTriangle,
          title: '11. Siyasətdə Dəyişikliklər',
          content: 'Bu məxfilik siyasətini vaxtaşırı yeniləyə bilərik. Əhəmiyyətli dəyişikliklər haqqında sizi məlumatlandıracağıq. Dəyişikliklər tətbiqdə elan ediləcək.',
        },
        {
          icon: Mail,
          title: '12. Əlaqə',
          content: 'Məxfilik siyasəti ilə bağlı suallarınız üçün bizimlə əlaqə saxlayın:\n\nE-poçt: naxtapaz@gmail.com\nTelefon: +994504801313\nÜnvan: Naxçıvan, Azərbaycan',
        },
      ],
    },
    ru: {
      title: 'Политика конфиденциальности',
      lastUpdated: 'Последнее обновление: 10 августа 2025',
      sections: [
        {
          icon: Info,
          title: '1. Общая информация',
          content: 'Данная политика конфиденциальности объясняет, как мобильное приложение Naxtap ("Приложение") собирает, использует и защищает вашу персональную информацию. Ваша конфиденциальность очень важна для нас.',
        },
        {
          icon: Database,
          title: '2. Собираемая информация',
          content: 'Мы можем собирать следующую информацию:\n\n• Персональные данные (имя, email, телефон)\n• Информация аккаунта и фото профиля\n• Данные объявлений и изображения\n• Информация устройства и IP-адрес\n• Статистика использования и поведение в приложении',
        },
        {
          icon: Eye,
          title: '3. Использование информации',
          content: 'Собранную информацию мы используем для следующих целей:\n\n• Предоставление и улучшение наших сервисов\n• Управление пользовательскими аккаунтами\n• Публикация и отображение объявлений\n• Предоставление клиентской поддержки\n• Обеспечение безопасности и предотвращение мошенничества',
        },
        {
          icon: Share2,
          title: '4. Передача информации',
          content: 'Мы не передаем вашу персональную информацию третьим лицам, за исключением следующих случаев:\n\n• Законные требования и судебные решения\n• Случаи безопасности и мошенничества\n• Поставщики услуг (ограниченно и безопасно)\n• С вашего явного согласия',
        },
        {
          icon: Cookie,
          title: '5. Куки и отслеживание',
          content: 'Наше приложение использует куки и похожие технологии для улучшения пользовательского опыта. Эти технологии используются для запоминания настроек приложения и аналитики.',
        },
        {
          icon: Lock,
          title: '6. Безопасность данных',
          content: 'Для безопасности ваших персональных данных мы применяем современные методы шифрования и меры безопасности. Данные хранятся на защищенных серверах с ограниченным доступом.',
        },
        {
          icon: Settings,
          title: '7. Настройки конфиденциальности',
          content: 'Вы можете управлять своими настройками конфиденциальности:\n\n• Видимость профиля\n• Конфиденциальность объявлений\n• Настройки уведомлений\n• Выбор передачи данных\n• Деактивация аккаунта',
        },
        {
          icon: Trash2,
          title: '8. Удаление данных',
          content: 'Вы можете в любое время удалить свой аккаунт и персональные данные. После удаления аккаунта все персональные данные полностью удаляются из системы в течение 30 дней.',
        },
        {
          icon: Users,
          title: '9. Конфиденциальность детей',
          content: 'Мы сознательно не собираем персональную информацию от детей младше 13 лет. Если мы узнаем о сборе такой информации, мы немедленно ее удаляем. Родители должны контролировать онлайн-активность своих детей.',
        },
        {
          icon: Globe,
          title: '10. Международная передача',
          content: 'Ваши данные хранятся на территории Азербайджана. В случаях международной передачи обеспечиваются соответствующие меры безопасности и законные требования.',
        },
        {
          icon: AlertTriangle,
          title: '11. Изменения в политике',
          content: 'Мы можем периодически обновлять данную политику конфиденциальности. О значительных изменениях мы вас уведомим. Изменения будут объявлены в приложении.',
        },
        {
          icon: Mail,
          title: '12. Контакты',
          content: 'По вопросам политики конфиденциальности обращайтесь к нам:\n\nE-mail: naxtapaz@gmail.com\nТелефон: +994504801313\nАдрес: Нахчыван, Азербайджан',
        },
      ],
    },
  };

  const currentPrivacy = privacyData[language as keyof typeof privacyData];

  const SectionItem = ({ section, index }: { section: any; index: number }) => {
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
          title: currentPrivacy.title,
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
              <Shield size={32} color="#fff" />
            </View>
            <Text style={styles.heroTitle}>
              {currentPrivacy.title}
            </Text>
            <Text style={styles.heroSubtitle}>
              {currentPrivacy.lastUpdated}
            </Text>
            <View style={styles.protectionBadge}>
              <Lock size={16} color="#fff" />
              <Text style={styles.protectionText}>
                {language === 'az' ? 'Qorunur' : 'Защищено'}
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
            <Eye size={20} color="#4CAF50" />
            <Text style={[styles.noticeTitle, { color: colors.text }]}>
              {language === 'az' ? 'Məxfilik Təminatı' : 'Гарантия конфиденциальности'}
            </Text>
          </View>
          <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
            {language === 'az'
              ? 'Şəxsi məlumatlarınızın təhlükəsizliyi və məxfiliyi bizim əsas prioritetimizdir. Məlumatlarınız yalnız sizin razılığınızla istifadə edilir.'
              : 'Безопасность и конфиденциальность ваших персональных данных - наш основной приоритет. Ваши данные используются только с вашего согласия.'
            }
          </Text>
        </Animated.View>

        {/* Privacy Sections */}
        <View style={styles.sectionsContainer}>
          {currentPrivacy.sections.map((section, index) => (
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
              ? 'Bu məxfilik siyasəti 10 Avqust 2025 tarixindən qüvvədədir.'
              : 'Данная политика конфиденциальности действует с 10 августа 2025 года.'
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
  protectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  protectionText: {
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
