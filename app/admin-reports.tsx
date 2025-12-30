import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useThemeStore } from '@/store/themeStore';
import { useUserStore } from '@/store/userStore';
import { getColors } from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { logger } from '@/utils/logger';
import { Flag, RefreshCw, CheckCircle2, XCircle, Eye } from 'lucide-react-native';

type ReportStatus = 'all' | 'pending' | 'in_review' | 'resolved' | 'dismissed';

const statusLabelAz: Record<Exclude<ReportStatus, 'all'>, string> = {
  pending: 'Gözləyən',
  in_review: 'Baxışda',
  resolved: 'Həll edilib',
  dismissed: 'Rədd edilib',
};

const statusLabelRu: Record<Exclude<ReportStatus, 'all'>, string> = {
  pending: 'Ожидает',
  in_review: 'На проверке',
  resolved: 'Решено',
  dismissed: 'Отклонено',
};

export default function AdminReportsScreen() {
  const { language } = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const { currentUser } = useUserStore();
  const colors = getColors(themeMode, colorTheme);

  const [status, setStatus] = useState<ReportStatus>('pending');

  const canAccess = currentUser?.role === 'admin' || currentUser?.role === 'moderator';
  const canManageReports =
    currentUser?.role === 'admin' ||
    (currentUser?.role === 'moderator' && currentUser?.moderatorInfo?.permissions?.includes('manage_reports' as any));

  const queryInput = useMemo(() => {
    if (status === 'all') return undefined;
    return { status };
  }, [status]);

  const utils = trpc.useUtils();
  const reportsQuery = trpc.moderation.getReports.useQuery(queryInput, {
    enabled: canAccess && canManageReports,
    refetchInterval: 30000,
  });

  const updateStatusMutation = trpc.moderation.updateReportStatus.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.moderation.getReports.invalidate(),
        utils.moderation.getStats.invalidate(),
      ]);
    },
    onError: (e: any) => {
      logger.error('[AdminReports] update status failed:', e);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Status yenilənmədi.' : 'Не удалось обновить статус.'
      );
    },
  });

  const statusColor = (s: Exclude<ReportStatus, 'all'>) => {
    switch (s) {
      case 'pending':
        return '#F59E0B';
      case 'in_review':
        return '#3B82F6';
      case 'resolved':
        return '#10B981';
      case 'dismissed':
        return '#EF4444';
    }
  };

  const renderStatusChip = (s: ReportStatus, title: string) => {
    const active = status === s;
    return (
      <TouchableOpacity
        key={s}
        onPress={() => setStatus(s)}
        style={[
          styles.chip,
          {
            backgroundColor: active ? colors.primary : colors.card,
            borderColor: active ? colors.primary : colors.border,
          },
        ]}
      >
        <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '600' }}>{title}</Text>
      </TouchableOpacity>
    );
  };

  const reports = (reportsQuery.data as any[]) || [];

  if (!canAccess) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: language === 'az' ? 'Şikayətlər' : 'Жалобы',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }}
      />

      {!canManageReports ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
            {language === 'az'
              ? 'Şikayətləri idarə etmək üçün icazəniz yoxdur.'
              : 'У вас нет прав на управление жалобами.'}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.topBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {renderStatusChip('pending', language === 'az' ? 'Gözləyən' : 'Ожидает')}
              {renderStatusChip('in_review', language === 'az' ? 'Baxışda' : 'На проверке')}
              {renderStatusChip('resolved', language === 'az' ? 'Həll' : 'Решено')}
              {renderStatusChip('dismissed', language === 'az' ? 'Rədd' : 'Отклонено')}
              {renderStatusChip('all', language === 'az' ? 'Hamısı' : 'Все')}
            </ScrollView>

            <TouchableOpacity
              style={[styles.refreshBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => reportsQuery.refetch()}
            >
              <RefreshCw size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {reportsQuery.isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ marginTop: 10, color: colors.textSecondary }}>
                {language === 'az' ? 'Yüklənir...' : 'Загрузка...'}
              </Text>
            </View>
          ) : reportsQuery.error ? (
            <View style={styles.center}>
              <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                {language === 'az'
                  ? 'Məlumat alınmadı. Giriş icazəsi və ya şəbəkəni yoxlayın.'
                  : 'Не удалось загрузить данные. Проверьте доступ или сеть.'}
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
              {reports.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                  <Flag size={22} color={colors.textSecondary} />
                  <Text style={{ marginTop: 8, color: colors.textSecondary, textAlign: 'center' }}>
                    {language === 'az' ? 'Şikayət yoxdur.' : 'Жалоб нет.'}
                  </Text>
                </View>
              ) : (
                reports.map((r: any) => {
                  const s = (r.status || 'pending') as Exclude<ReportStatus, 'all'>;
                  const badgeColor = statusColor(s);
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                      activeOpacity={0.8}
                      onPress={() => {
                        const title = language === 'az' ? 'Şikayət detalları' : 'Детали жалобы';
                        const statusText = language === 'az' ? statusLabelAz[s] : statusLabelRu[s];
                        Alert.alert(
                          title,
                          `${language === 'az' ? 'Status' : 'Статус'}: ${statusText}\n` +
                            `${language === 'az' ? 'Səbəb' : 'Причина'}: ${r.reason || '-'}\n\n` +
                            `${r.description || ''}`.trim(),
                          [
                            {
                              text: language === 'az' ? 'Baxışda' : 'На проверке',
                              onPress: () =>
                                updateStatusMutation.mutate({ reportId: r.id, status: 'in_review' }),
                            },
                            {
                              text: language === 'az' ? 'Həll et' : 'Решить',
                              onPress: () =>
                                updateStatusMutation.mutate({ reportId: r.id, status: 'resolved' }),
                            },
                            {
                              text: language === 'az' ? 'Rədd et' : 'Отклонить',
                              style: 'destructive',
                              onPress: () =>
                                updateStatusMutation.mutate({ reportId: r.id, status: 'dismissed' }),
                            },
                            { text: language === 'az' ? 'Bağla' : 'Закрыть', style: 'cancel' },
                          ]
                        );
                      }}
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.row}>
                          <View style={[styles.dot, { backgroundColor: badgeColor }]} />
                          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                            {r.type || (language === 'az' ? 'Şikayət' : 'Жалоба')}
                          </Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: `${badgeColor}20` }]}>
                          <Text style={{ color: badgeColor, fontWeight: '700', fontSize: 12 }}>
                            {language === 'az' ? statusLabelAz[s] : statusLabelRu[s]}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.cardSub, { color: colors.textSecondary }]} numberOfLines={2}>
                        {r.reason || r.description || '-'}
                      </Text>

                      <View style={styles.actionsRow}>
                        <TouchableOpacity
                          style={[styles.smallBtn, { backgroundColor: `${colors.primary}15` }]}
                          onPress={() => updateStatusMutation.mutate({ reportId: r.id, status: 'in_review' })}
                        >
                          <Eye size={16} color={colors.primary} />
                          <Text style={[styles.smallBtnText, { color: colors.primary }]}>
                            {language === 'az' ? 'Baxış' : 'Проверка'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.smallBtn, { backgroundColor: '#10B98115' }]}
                          onPress={() => updateStatusMutation.mutate({ reportId: r.id, status: 'resolved' })}
                        >
                          <CheckCircle2 size={16} color="#10B981" />
                          <Text style={[styles.smallBtnText, { color: '#10B981' }]}>
                            {language === 'az' ? 'Həll' : 'Решить'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.smallBtn, { backgroundColor: '#EF444415' }]}
                          onPress={() => updateStatusMutation.mutate({ reportId: r.id, status: 'dismissed' })}
                        >
                          <XCircle size={16} color="#EF4444" />
                          <Text style={[styles.smallBtnText, { color: '#EF4444' }]}>
                            {language === 'az' ? 'Rədd' : 'Отклонить'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}

              <View style={{ height: 24 }} />
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  chipsRow: { gap: 8, paddingRight: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  emptyCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  cardTitle: { fontSize: 16, fontWeight: '700', flex: 1 },
  cardSub: { marginTop: 8, fontSize: 13, lineHeight: 18 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  smallBtnText: { fontSize: 12, fontWeight: '700' },
});

