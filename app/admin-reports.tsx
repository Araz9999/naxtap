import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useThemeStore } from '@/store/themeStore';
import { useUserStore } from '@/store/userStore';
import { getColors } from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { logger } from '@/utils/logger';
import { Flag, RefreshCw, CheckCircle2, XCircle, Eye, ExternalLink, StickyNote } from 'lucide-react-native';
import { useModerationSettingsStore } from '@/store/moderationSettingsStore';

type ReportStatus = 'all' | 'pending' | 'in_review' | 'resolved' | 'dismissed';
type ReportItem = {
  id: string;
  type?: string;
  reason?: string;
  description?: string;
  reporterId?: string;
  reportedUserId?: string;
  reportedListingId?: string;
  reportedStoreId?: string;
  assignedModeratorId?: string;
  moderatorNotes?: string;
  resolution?: string;
  status?: Exclude<ReportStatus, 'all'>;
  createdAt?: string;
  updatedAt?: string;
};

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

const typeLabelAz: Record<string, string> = {
  spam: 'Spam',
  inappropriate_content: 'Uyğunsuz məzmun',
  fake_listing: 'Saxta elan',
  harassment: 'Təhqir / təqib',
  fraud: 'Dələduzluq',
  copyright: 'Müəllif hüququ',
  other: 'Digər',
};

const typeLabelRu: Record<string, string> = {
  spam: 'Спам',
  inappropriate_content: 'Неприемлемый контент',
  fake_listing: 'Фейковое объявление',
  harassment: 'Оскорбление / преследование',
  fraud: 'Мошенничество',
  copyright: 'Авторское право',
  other: 'Другое',
};

export default function AdminReportsScreen() {
  const { language } = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const { currentUser } = useUserStore();
  const colors = getColors(themeMode, colorTheme);
  const router = useRouter();
  const { settings } = useModerationSettingsStore();

  const [status, setStatus] = useState<ReportStatus>('pending');
  const [search, setSearch] = useState('');

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [resolutionDraft, setResolutionDraft] = useState('');
  const [pendingAction, setPendingAction] = useState<Exclude<ReportStatus, 'all'> | null>(null);

  const canAccess = currentUser?.role === 'admin' || currentUser?.role === 'moderator';
  const canManageReports =
    currentUser?.role === 'admin' ||
    (currentUser?.role === 'moderator' && currentUser?.moderatorInfo?.permissions?.includes('manage_reports'));

  const queryInput = useMemo(() => {
    if (status === 'all') return undefined;
    return { status };
  }, [status]);

  // Enforce moderation settings for visibility
  useEffect(() => {
    if (!settings.showResolvedReports && status === 'resolved') setStatus('pending');
    if (!settings.showDismissedReports && status === 'dismissed') setStatus('pending');
  }, [settings.showResolvedReports, settings.showDismissedReports, status]);

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
      closeDetails();
    },
    onError: (e: unknown) => {
      logger.error('[AdminReports] update status failed:', e);
      const err = e as { message?: unknown };
      const msgStr = typeof err?.message === 'string' ? err.message : '';
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az'
          ? (msgStr.includes('Resolution') ? 'Həll/Rədd səbəbi tələb olunur.' : 'Status yenilənmədi.')
          : (msgStr.includes('Resolution') ? 'Требуется причина/резолюция.' : 'Не удалось обновить статус.'),
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

  const reports = useMemo<ReportItem[]>(
    () => (reportsQuery.data as unknown as ReportItem[] | undefined) ?? [],
    [reportsQuery.data],
  );
  const isRefreshing = reportsQuery.isFetching && !reportsQuery.isLoading;

  const filteredReports = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((r) => {
      const hay = [
        r?.id,
        r?.type,
        r?.reason,
        r?.description,
        r?.reporterId,
        r?.reportedUserId,
        r?.reportedListingId,
        r?.reportedStoreId,
        r?.assignedModeratorId,
        r?.moderatorNotes,
        r?.resolution,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [reports, search]);

  const openDetails = (r: ReportItem) => {
    setSelectedReport(r);
    setNotesDraft((r?.moderatorNotes || '').toString());
    setResolutionDraft((r?.resolution || '').toString());
    setPendingAction(null);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setSelectedReport(null);
    setNotesDraft('');
    setResolutionDraft('');
    setPendingAction(null);
  };

  const formatDateTime = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const typeLabel = (t?: string) => {
    if (!t) return language === 'az' ? 'Şikayət' : 'Жалоба';
    return language === 'az' ? (typeLabelAz[t] || t) : (typeLabelRu[t] || t);
  };

  const goToTarget = (r: ReportItem) => {
    try {
      if (r?.reportedListingId) {
        router.push(`/listing/${r.reportedListingId}`);
        return;
      }
      if (r?.reportedStoreId) {
        router.push(`/store/${r.reportedStoreId}`);
        return;
      }
      if (r?.reportedUserId) {
        router.push(`/profile/${r.reportedUserId}`);
        return;
      }
      Alert.alert(
        language === 'az' ? 'Məlumat' : 'Инфо',
        language === 'az' ? 'Hədəf tapılmadı.' : 'Цель не найдена.',
      );
    } catch (e) {
      logger.error('[AdminReports] navigation to target failed:', e);
    }
  };

  const submitStatus = (next: Exclude<ReportStatus, 'all'>) => {
    if (!selectedReport?.id) return;

    const needsResolution = next === 'resolved' || next === 'dismissed';
    const res = resolutionDraft.trim();
    const notes = notesDraft.trim();

    if (needsResolution && !res) {
      Alert.alert(
        language === 'az' ? 'Tələb olunur' : 'Требуется',
        language === 'az' ? 'Həll/Rədd səbəbini yazın.' : 'Укажите причину/резолюцию.',
      );
      return;
    }

    updateStatusMutation.mutate({
      reportId: selectedReport.id,
      status: next,
      resolution: needsResolution ? res : undefined,
      moderatorNotes: notes ? notes : undefined,
    });
  };

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
              {settings.showResolvedReports && renderStatusChip('resolved', language === 'az' ? 'Həll' : 'Решено')}
              {settings.showDismissedReports && renderStatusChip('dismissed', language === 'az' ? 'Rədd' : 'Отклонено')}
              {renderStatusChip('all', language === 'az' ? 'Hamısı' : 'Все')}
            </ScrollView>

            <TouchableOpacity
              style={[styles.refreshBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => reportsQuery.refetch()}
            >
              <RefreshCw size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={language === 'az' ? 'Axtar… (ID, səbəb, istifadəçi, elan, mağaza)' : 'Поиск… (ID, причина, пользователь, объявление, магазин)'}
              placeholderTextColor={colors.textSecondary}
              style={[
                styles.searchInput,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode={Platform.OS === 'ios' ? 'while-editing' : 'never'}
            />
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
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={() => reportsQuery.refetch()}
                  tintColor={colors.primary}
                />
              }
            >
              {filteredReports.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                  <Flag size={22} color={colors.textSecondary} />
                  <Text style={{ marginTop: 8, color: colors.textSecondary, textAlign: 'center' }}>
                    {search.trim()
                      ? (language === 'az' ? 'Uyğun şikayət tapılmadı.' : 'Ничего не найдено.')
                      : (language === 'az' ? 'Şikayət yoxdur.' : 'Жалоб нет.')}
                  </Text>
                </View>
              ) : (
                filteredReports.map((r: ReportItem) => {
                  const s = (r.status || 'pending') as Exclude<ReportStatus, 'all'>;
                  const badgeColor = statusColor(s);
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                      activeOpacity={0.8}
                      onPress={() => {
                        openDetails(r);
                      }}
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.row}>
                          <View style={[styles.dot, { backgroundColor: badgeColor }]} />
                          <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                            {typeLabel(r.type)}
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

                      <Text style={[styles.metaText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {(language === 'az' ? 'Tarix: ' : 'Дата: ') + formatDateTime(r.createdAt)}
                      </Text>

                      <View style={styles.actionsRow}>
                        <TouchableOpacity
                          style={[styles.smallBtn, { backgroundColor: `${colors.primary}15` }]}
                          onPress={() => openDetails(r)}
                          disabled={updateStatusMutation.isPending}
                        >
                          <Eye size={16} color={colors.primary} />
                          <Text style={[styles.smallBtnText, { color: colors.primary }]}>
                            {language === 'az' ? 'Baxış' : 'Проверка'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.smallBtn, { backgroundColor: '#10B98115' }]}
                          onPress={() => {
                            openDetails(r);
                            setPendingAction('resolved');
                          }}
                          disabled={updateStatusMutation.isPending}
                        >
                          <CheckCircle2 size={16} color="#10B981" />
                          <Text style={[styles.smallBtnText, { color: '#10B981' }]}>
                            {language === 'az' ? 'Həll' : 'Решить'}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.smallBtn, { backgroundColor: '#EF444415' }]}
                          onPress={() => {
                            openDetails(r);
                            setPendingAction('dismissed');
                          }}
                          disabled={updateStatusMutation.isPending}
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

      <Modal
        visible={detailsOpen}
        transparent
        animationType="fade"
        onRequestClose={closeDetails}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                {language === 'az' ? 'Şikayət detalları' : 'Детали жалобы'}
              </Text>
              <TouchableOpacity onPress={closeDetails} style={styles.modalCloseBtn}>
                <Text style={{ color: colors.textSecondary, fontWeight: '800' }}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
              <View style={styles.kvRow}>
                <Text style={[styles.kvKey, { color: colors.textSecondary }]}>{language === 'az' ? 'Növ' : 'Тип'}</Text>
                <Text style={[styles.kvVal, { color: colors.text }]}>{typeLabel(selectedReport?.type)}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={[styles.kvKey, { color: colors.textSecondary }]}>{language === 'az' ? 'Status' : 'Статус'}</Text>
                <Text style={[styles.kvVal, { color: colors.text }]}>
                  {selectedReport?.status
                    ? (language === 'az'
                      ? (statusLabelAz[selectedReport.status as Exclude<ReportStatus, 'all'>] || selectedReport.status)
                      : (statusLabelRu[selectedReport.status as Exclude<ReportStatus, 'all'>] || selectedReport.status))
                    : '-'}
                </Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={[styles.kvKey, { color: colors.textSecondary }]}>{language === 'az' ? 'Tarix' : 'Дата'}</Text>
                <Text style={[styles.kvVal, { color: colors.text }]}>{formatDateTime(selectedReport?.createdAt)}</Text>
              </View>

              <View style={styles.sectionBlock}>
                <Text style={[styles.blockTitle, { color: colors.text }]}>{language === 'az' ? 'Səbəb' : 'Причина'}</Text>
                <Text style={[styles.blockText, { color: colors.textSecondary }]}>{selectedReport?.reason || '-'}</Text>
              </View>

              <View style={styles.sectionBlock}>
                <Text style={[styles.blockTitle, { color: colors.text }]}>{language === 'az' ? 'Təsvir' : 'Описание'}</Text>
                <Text style={[styles.blockText, { color: colors.textSecondary }]}>{selectedReport?.description || '-'}</Text>
              </View>

              <TouchableOpacity
                style={[styles.targetBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}
                onPress={() => goToTarget(selectedReport)}
              >
                <ExternalLink size={16} color={colors.primary} />
                <Text style={[styles.targetBtnText, { color: colors.primary }]}>
                  {language === 'az' ? 'Hədəfi aç (istifadəçi/elan/mağaza)' : 'Открыть цель (пользователь/объявление/магазин)'}
                </Text>
              </TouchableOpacity>

              <View style={styles.sectionBlock}>
                <Text style={[styles.blockTitle, { color: colors.text }]}>
                  {language === 'az' ? 'Moderator qeydləri (opsional)' : 'Заметки модератора (опц.)'}
                </Text>
                <View style={[styles.textAreaWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <StickyNote size={16} color={colors.textSecondary} />
                  <TextInput
                    value={notesDraft}
                    onChangeText={setNotesDraft}
                    placeholder={language === 'az' ? 'Qeyd yazın…' : 'Добавьте заметку…'}
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.textArea, { color: colors.text }]}
                    multiline
                  />
                </View>
              </View>

              {(pendingAction === 'resolved' || pendingAction === 'dismissed') && (
                <View style={styles.sectionBlock}>
                  <Text style={[styles.blockTitle, { color: colors.text }]}>
                    {pendingAction === 'resolved'
                      ? (language === 'az' ? 'Həll (tələb olunur)' : 'Резолюция (обязательно)')
                      : (language === 'az' ? 'Rədd səbəbi (tələb olunur)' : 'Причина отклонения (обязательно)')}
                  </Text>
                  <View style={[styles.textAreaWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                    <TextInput
                      value={resolutionDraft}
                      onChangeText={setResolutionDraft}
                      placeholder={language === 'az' ? 'Qısa və aydın yazın…' : 'Коротко и ясно…'}
                      placeholderTextColor={colors.textSecondary}
                      style={[styles.textArea, { color: colors.text }]}
                      multiline
                    />
                  </View>
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionPill, { backgroundColor: '#3B82F615' }]}
                  onPress={() => {
                    setPendingAction('in_review');
                    submitStatus('in_review');
                  }}
                  disabled={updateStatusMutation.isPending}
                >
                  <Eye size={16} color="#3B82F6" />
                  <Text style={[styles.actionPillText, { color: '#3B82F6' }]}>
                    {language === 'az' ? 'Baxışda' : 'На проверке'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionPill, { backgroundColor: '#10B98115' }]}
                  onPress={() => {
                    if (pendingAction !== 'resolved') {
                      setPendingAction('resolved');
                      return;
                    }
                    submitStatus('resolved');
                  }}
                  disabled={updateStatusMutation.isPending}
                >
                  <CheckCircle2 size={16} color="#10B981" />
                  <Text style={[styles.actionPillText, { color: '#10B981' }]}>
                    {language === 'az' ? 'Həll et' : 'Решить'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionPill, { backgroundColor: '#EF444415' }]}
                  onPress={() => {
                    if (pendingAction !== 'dismissed') {
                      setPendingAction('dismissed');
                      return;
                    }
                    submitStatus('dismissed');
                  }}
                  disabled={updateStatusMutation.isPending}
                >
                  <XCircle size={16} color="#EF4444" />
                  <Text style={[styles.actionPillText, { color: '#EF4444' }]}>
                    {language === 'az' ? 'Rədd et' : 'Отклонить'}
                  </Text>
                </TouchableOpacity>
              </View>

              {updateStatusMutation.isPending && (
                <View style={{ paddingTop: 8 }}>
                  <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                    {language === 'az' ? 'Yenilənir…' : 'Обновление…'}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  searchRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
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
  metaText: { marginTop: 6, fontSize: 12 },
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

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  modalHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalTitle: { fontSize: 16, fontWeight: '800', flex: 1 },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
  },
  kvKey: { fontSize: 12, fontWeight: '700' },
  kvVal: { fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' },
  sectionBlock: { marginTop: 10 },
  blockTitle: { fontSize: 13, fontWeight: '800', marginBottom: 6 },
  blockText: { fontSize: 13, lineHeight: 18 },
  targetBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  targetBtnText: { fontSize: 12, fontWeight: '800', flex: 1 },
  textAreaWrap: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  textArea: {
    flex: 1,
    minHeight: 64,
    fontSize: 13,
    lineHeight: 18,
    padding: 0,
  },
  modalActions: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    flexGrow: 1,
    justifyContent: 'center',
  },
  actionPillText: { fontSize: 12, fontWeight: '900' },
});

