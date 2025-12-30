import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useThemeStore } from '@/store/themeStore';
import { useUserStore } from '@/store/userStore';
import { getColors } from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { RefreshCw, Users, Shield, BadgeCheck, Wallet } from 'lucide-react-native';

export default function AdminAnalyticsScreen() {
  const { language } = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const { currentUser } = useUserStore();
  const colors = getColors(themeMode, colorTheme);

  const canAccess = currentUser?.role === 'admin';

  const analyticsQuery = trpc.admin.getAnalytics.useQuery(undefined, {
    enabled: canAccess,
    refetchInterval: 60000,
  });

  if (!canAccess) return null;

  const data: any = analyticsQuery.data;

  const Card = ({ icon: Icon, title, value, color }: any) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}15` }]}>
        <Icon size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
        <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: language === 'az' ? 'Analitika' : 'Аналитика',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }}
      />

      <View style={styles.top}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {language === 'az' ? 'Sistem statistikası (admin).' : 'Системная статистика (админ).'}
        </Text>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => analyticsQuery.refetch()}
        >
          <RefreshCw size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      {analyticsQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 10, color: colors.textSecondary }}>{language === 'az' ? 'Yüklənir...' : 'Загрузка...'}</Text>
        </View>
      ) : analyticsQuery.error ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
            {language === 'az'
              ? 'Məlumat alınmadı. Admin girişinizi yoxlayın.'
              : 'Не удалось загрузить данные. Проверьте админ-доступ.'}
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{language === 'az' ? 'İstifadəçilər' : 'Пользователи'}</Text>
          <Card icon={Users} title={language === 'az' ? 'Cəmi' : 'Всего'} value={data?.users?.total ?? 0} color={colors.primary} />
          <Card icon={BadgeCheck} title={language === 'az' ? 'Təsdiqli' : 'Верифицированные'} value={data?.users?.verified ?? 0} color="#10B981" />
          <Card icon={Users} title={language === 'az' ? 'Son 24 saat' : 'За 24 часа'} value={data?.users?.last24h ?? 0} color="#3B82F6" />
          <Card icon={Users} title={language === 'az' ? 'Son 7 gün' : 'За 7 дней'} value={data?.users?.last7d ?? 0} color="#8B5CF6" />
          <Card icon={Users} title={language === 'az' ? 'Son 30 gün' : 'За 30 дней'} value={data?.users?.last30d ?? 0} color="#F59E0B" />

          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 14 }]}>{language === 'az' ? 'Rollar' : 'Роли'}</Text>
          <Card icon={Shield} title={language === 'az' ? 'Adminlər' : 'Админы'} value={data?.roles?.admins ?? 0} color="#F59E0B" />
          <Card icon={Shield} title={language === 'az' ? 'Moderatorlar' : 'Модераторы'} value={data?.roles?.moderators ?? 0} color="#10B981" />
          <Card icon={Users} title={language === 'az' ? 'Adi istifadəçilər' : 'Обычные'} value={data?.roles?.regular ?? 0} color={colors.textSecondary} />

          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 14 }]}>{language === 'az' ? 'Balans' : 'Баланс'}</Text>
          <Card icon={Wallet} title={language === 'az' ? 'Ümumi balans' : 'Суммарный баланс'} value={data?.balance?.total ?? 0} color="#0EA5E9" />

          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  top: { padding: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  subtitle: { flex: 1, fontSize: 13, lineHeight: 18 },
  refreshBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12, gap: 12 },
  iconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 18, fontWeight: '900' },
  title: { marginTop: 2, fontSize: 12, fontWeight: '600' },
});

