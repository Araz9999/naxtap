import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useThemeStore } from '@/store/themeStore';
import { useUserStore } from '@/store/userStore';
import { getColors } from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { RefreshCw, Users, Shield, BadgeCheck, Wallet, Flag, HelpCircle } from 'lucide-react-native';

export default function AdminAnalyticsScreen() {
  const { language } = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const { currentUser } = useUserStore();
  const colors = getColors(themeMode, colorTheme);

  const canAccess = currentUser?.role === 'admin';
  const [refreshing, setRefreshing] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const analyticsQuery = trpc.admin.getAnalytics.useQuery(undefined, {
    enabled: canAccess,
    refetchInterval: 60000,
  });
  const moderationStatsQuery = trpc.moderation.getStats.useQuery(undefined, {
    enabled: canAccess,
    refetchInterval: 60000,
  });

  if (!canAccess) return null;

  const data: any = analyticsQuery.data;
  const mod: any = moderationStatsQuery.data;

  const onRefresh = () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    setRefreshing(true);
    Promise.all([analyticsQuery.refetch(), moderationStatsQuery.refetch()]).finally(() => {
      refreshTimer.current = setTimeout(() => setRefreshing(false), 450);
    });
  };

  const users = data?.users || {};
  const roles = data?.roles || {};
  const verifiedRate = useMemo(() => {
    const total = Number(users?.total || 0);
    const verified = Number(users?.verified || 0);
    if (!total) return 0;
    return Math.round((verified / total) * 1000) / 10;
  }, [users?.total, users?.verified]);

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
          onPress={onRefresh}
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{language === 'az' ? 'İstifadəçilər' : 'Пользователи'}</Text>
          <Card icon={Users} title={language === 'az' ? 'Cəmi' : 'Всего'} value={users?.total ?? 0} color={colors.primary} />
          <Card
            icon={BadgeCheck}
            title={language === 'az' ? `Təsdiqli (${verifiedRate}%)` : `Вериф. (${verifiedRate}%)`}
            value={users?.verified ?? 0}
            color="#10B981"
          />
          <Card icon={Users} title={language === 'az' ? 'Təsdiqsiz' : 'Без вериф.'} value={users?.unverified ?? 0} color="#EF4444" />
          <Card icon={Users} title={language === 'az' ? 'Sosial login' : 'Соц. логин'} value={users?.withSocial ?? 0} color="#8B5CF6" />
          <Card icon={Users} title={language === 'az' ? 'Son 24 saat' : 'За 24 часа'} value={users?.last24h ?? 0} color="#3B82F6" />
          <Card icon={Users} title={language === 'az' ? 'Son 7 gün' : 'За 7 дней'} value={users?.last7d ?? 0} color="#8B5CF6" />
          <Card icon={Users} title={language === 'az' ? 'Son 30 gün' : 'За 30 дней'} value={users?.last30d ?? 0} color="#F59E0B" />

          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 14 }]}>{language === 'az' ? 'Rollar' : 'Роли'}</Text>
          <Card icon={Shield} title={language === 'az' ? 'Adminlər' : 'Админы'} value={roles?.admins ?? 0} color="#F59E0B" />
          <Card icon={Shield} title={language === 'az' ? 'Moderatorlar' : 'Модераторы'} value={roles?.moderators ?? 0} color="#10B981" />
          <Card icon={Users} title={language === 'az' ? 'Adi istifadəçilər' : 'Обычные'} value={roles?.regular ?? 0} color={colors.textSecondary} />

          {(roles?.byRole || []).length > 0 && (
            <View style={[styles.breakdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.breakdownTitle, { color: colors.text }]}>
                {language === 'az' ? 'Rol bölgüsü' : 'Распределение ролей'}
              </Text>
              {(roles.byRole as any[]).map((r) => (
                <View key={r.role} style={styles.breakdownRow}>
                  <Text style={[styles.breakdownKey, { color: colors.textSecondary }]}>{r.role}</Text>
                  <Text style={[styles.breakdownVal, { color: colors.text }]}>{r.count}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 14 }]}>{language === 'az' ? 'Balans' : 'Баланс'}</Text>
          <Card icon={Wallet} title={language === 'az' ? 'Ümumi balans' : 'Суммарный баланс'} value={data?.balance?.total ?? 0} color="#0EA5E9" />

          <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 14 }]}>
            {language === 'az' ? 'Moderasiya' : 'Модерация'}
          </Text>
          {moderationStatsQuery.isLoading ? (
            <View style={[styles.inlineInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ marginLeft: 10, color: colors.textSecondary }}>
                {language === 'az' ? 'Moderasiya statistikası yüklənir…' : 'Загрузка статистики модерации…'}
              </Text>
            </View>
          ) : moderationStatsQuery.error ? (
            <View style={[styles.inlineInfo, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={{ color: colors.textSecondary }}>
                {language === 'az' ? 'Moderasiya statistikası alınmadı.' : 'Не удалось загрузить статистику модерации.'}
              </Text>
            </View>
          ) : (
            <>
              <Card icon={Flag} title={language === 'az' ? 'Gözləyən şikayətlər' : 'Ожидающие жалобы'} value={mod?.pendingReports ?? 0} color="#F59E0B" />
              <Card icon={Flag} title={language === 'az' ? 'Baxışda' : 'На проверке'} value={mod?.inReviewReports ?? 0} color="#3B82F6" />
              <Card icon={Flag} title={language === 'az' ? 'Həll edilmiş' : 'Решенные'} value={mod?.resolvedReports ?? 0} color="#10B981" />
              <Card icon={HelpCircle} title={language === 'az' ? 'Açıq biletlər' : 'Открытые тикеты'} value={mod?.openTickets ?? 0} color="#F59E0B" />
              <Card icon={HelpCircle} title={language === 'az' ? 'İcrada biletlər' : 'Тикеты в работе'} value={mod?.inProgressTickets ?? 0} color="#3B82F6" />
              <Card icon={HelpCircle} title={language === 'az' ? 'Həll edilmiş biletlər' : 'Решенные тикеты'} value={mod?.resolvedTickets ?? 0} color="#10B981" />
            </>
          )}

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
  breakdownCard: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  breakdownTitle: { fontSize: 13, fontWeight: '900', marginBottom: 10 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  breakdownKey: { fontSize: 12, fontWeight: '800' },
  breakdownVal: { fontSize: 12, fontWeight: '900' },
  inlineInfo: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
});

