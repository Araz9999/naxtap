import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import Colors from '@/constants/colors';

export default function AboutScreen() {
  const { language } = useLanguageStore();

  const aboutContent = {
    az: {
      title: 'Naxtap.az haqqında',
      description: 'Naxtap.az - Naxçıvan Muxtar Respublikasının ən böyük elan saytı',
      sections: [
        {
          title: 'Bizim missiyamız',
          content: 'Naxtap.az Naxçıvan Muxtar Respublikasında yaşayan insanların həyatını asanlaşdırmaq və onlara keyfiyyətli xidmət göstərmək məqsədi ilə yaradılmışdır. Biz insanların ehtiyaclarını ödəmək, alış-veriş prosesini sadələşdirmək və təhlükəsiz ticarət mühiti yaratmaq üçün çalışırıq.',
        },
        {
          title: 'Xidmətlərimiz',
          content: 'Saytımızda siz müxtəlif kateqoriyalarda elanlar yerləşdirə və axtara bilərsiniz:\n\n• Daşınmaz əmlak\n• Nəqliyyat vasitələri\n• Elektronika\n• Ev əşyaları\n• Geyim və aksesuarlar\n• İş elanları\n• Xidmətlər\n• Əl işləri\n• Və daha çox...',
        },
        {
          title: 'Təhlükəsizlik',
          content: 'Naxtap.az istifadəçilərinin təhlükəsizliyini ön planda tutur. Biz bütün elanları moderasiya edirik və şübhəli fəaliyyətləri izləyirik. İstifadəçilərimizə təhlükəsiz alış-veriş mühiti təmin etmək üçün daim çalışırıq.',
        },
        {
          title: 'Dəstək xidməti',
          content: 'Bizim peşəkar dəstək komandamız istifadəçilərimizə 24/7 xidmət göstərir. Hər hansı sual və ya problemlə bağlı bizimlə əlaqə saxlaya bilərsiniz.\n\nEmail: naxtapaz@gmail.com\nTelefon: +994504801313\nÜnvan: Naxçıvan, Azərbaycan',
        },
        {
          title: 'Gələcək planlarımız',
          content: 'Naxtap.az daim inkişaf edir və yeni xüsusiyyətlər əlavə edir. Mobil tətbiq, AI-əsaslı axtarış, virtual tur və digər innovativ həllər üzərində işləyirik.',
        },
      ],
    },
    ru: {
      title: 'О Naxtap.az',
      description: 'Naxtap.az - крупнейший сайт объявлений Нахчыванской Автономной Республики',
      sections: [
        {
          title: 'Наша миссия',
          content: 'Naxtap.az создан с целью упростить жизнь людей, живущих в Нахчыванской Автономной Республике, и предоставить им качественные услуги. Мы работаем для удовлетворения потребностей людей, упрощения процесса покупок и создания безопасной торговой среды.',
        },
        {
          title: 'Наши услуги',
          content: 'На нашем сайте вы можете размещать и искать объявления в различных категориях:\n\n• Недвижимость\n• Транспортные средства\n• Электроника\n• Товары для дома\n• Одежда и аксессуары\n• Вакансии\n• Услуги\n• Рукоделие\n• И многое другое...',
        },
        {
          title: 'Безопасность',
          content: 'Naxtap.az ставит безопасность пользователей на первое место. Мы модерируем все объявления и отслеживаем подозрительную активность. Мы постоянно работаем над обеспечением безопасной среды для покупок наших пользователей.',
        },
        {
          title: 'Служба поддержки',
          content: 'Наша профессиональная команда поддержки обслуживает наших пользователей 24/7. Вы можете связаться с нами по любым вопросам или проблемам.\n\nEmail: naxtapaz@gmail.com\nТелефон: +994504801313\nАдрес: Нахчыван, Азербайджан',
        },
        {
          title: 'Наши планы на будущее',
          content: 'Naxtap.az постоянно развивается и добавляет новые функции. Мы работаем над мобильным приложением, поиском на основе ИИ, виртуальными турами и другими инновационными решениями.',
        },
      ],
    },
  };

  const content = aboutContent[language];

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: content.title }} />

      <View style={styles.header}>
        <Text style={styles.title}>{content.title}</Text>
        <Text style={styles.description}>{content.description}</Text>
      </View>

      {content.sections.map((section, index) => (
        <View key={index} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionContent}>{section.content}</Text>
        </View>
      ))}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {language === 'az'
            ? '© 2024 Naxtap.az. Bütün hüquqlar qorunur.'
            : '© 2024 Naxtap.az. Все права защищены.'}
        </Text>
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
    padding: 20,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
