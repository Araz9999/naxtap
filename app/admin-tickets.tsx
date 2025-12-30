import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { useSupportStore } from '@/store/supportStore';
import { getColors } from '@/constants/colors';
import { Headphones, Clock, AlertCircle, CheckCircle, ChevronRight, ExternalLink, Send, StickyNote } from 'lucide-react-native';
import { trpc } from '@/lib/trpc';
import { logger } from '@/utils/logger';

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type StatusFilter = 'all' | TicketStatus;

type TicketResponseItem = {
  id: string;
  ticketId?: string;
  responderId?: string;
  responderRole?: string;
  message: string;
  createdAt?: string;
  isAdmin?: boolean;
  isInternal?: boolean;
};

type TicketItem = {
  id: string;
  userId?: string;
  subject?: string;
  message?: string;
  category?: string;
  priority?: string;
  status: TicketStatus;
  createdAt?: string;
  updatedAt?: string;
  assignedModeratorId?: string;
  moderatorNotes?: string;
  resolution?: string;
  responses?: TicketResponseItem[];
  attachments?: unknown[];
  user?: { id: string; name?: string; email?: string };
};

type TicketsQueryResult = {
  tickets: TicketItem[];
  pagination?: { totalPages?: number; page?: number; limit?: number; totalCount?: number };
};

export default function AdminTicketsScreen() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const { currentUser } = useUserStore();
  const colors = getColors(themeMode, colorTheme);

  const canAccess = currentUser?.role === 'admin' || currentUser?.role === 'moderator';
  const canManageTickets =
    currentUser?.role === 'admin' ||
    (currentUser?.role === 'moderator' && currentUser?.moderatorInfo?.permissions?.includes('manage_tickets'));

  const { categories } = useSupportStore();
  const [filter, setFilter] = useState<StatusFilter>('open');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<TicketItem | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [replyDraft, setReplyDraft] = useState('');
  const [resolutionDraft, setResolutionDraft] = useState('');
  const [pendingAction, setPendingAction] = useState<TicketStatus | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filter, search]);

  const ticketsQueryInput = useMemo(() => {
    return {
      page,
      limit,
      status: filter === 'all' ? undefined : filter,
      search: search.trim() ? search.trim() : undefined,
    };
  }, [page, limit, filter, search]);

  const utils = trpc.useUtils();
  const ticketsQuery = trpc.support.getTickets.useQuery(ticketsQueryInput, {
    enabled: canAccess && canManageTickets,
    refetchInterval: 30000,
  });

  const ticketsData = ticketsQuery.data as unknown as TicketsQueryResult | undefined;
  const tickets: TicketItem[] = ticketsData?.tickets ?? [];
  // pagination is currently unused in UI, keep data available via ticketsData if needed

  const updateStatusMutation = trpc.support.updateTicketStatus.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.support.getTickets.invalidate(),
        utils.moderation.getStats.invalidate(),
      ]);
    },
    onError: (e: unknown) => {
      logger.error('[AdminTickets] update status failed:', e);
      const err = e as { message?: unknown };
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        typeof err?.message === 'string' && err.message.trim()
          ? err.message
          : (language === 'az' ? 'Status yenilənmədi.' : 'Не удалось обновить статус.'),
      );
    },
  });

  const addResponseMutation = trpc.support.addTicketResponse.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.support.getTickets.invalidate(),
        utils.moderation.getStats.invalidate(),
      ]);
    },
    onError: (e: unknown) => {
      logger.error('[AdminTickets] add response failed:', e);
      const err = e as { message?: unknown };
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        typeof err?.message === 'string' && err.message.trim()
          ? err.message
          : (language === 'az' ? 'Cavab göndərilmədi.' : 'Не удалось отправить ответ.'),
      );
    },
  });

  if (!canAccess) return null;

  const formatDateTime = (d?: Date) => {
    if (!d) return '-';
    const date = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(date.getTime())) return '-';
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const statusTitle = (s: TicketStatus) => {
    if (language === 'az') {
      if (s === 'open') return 'Açıq';
      if (s === 'in_progress') return 'İcrada';
      if (s === 'resolved') return 'Həll edilib';
      return 'Bağlı';
    }
    if (s === 'open') return 'Открыт';
    if (s === 'in_progress') return 'В работе';
    if (s === 'resolved') return 'Решен';
    return 'Закрыт';
  };

  const statusColor = (s: TicketStatus) => {
    if (s === 'open') return '#F59E0B';
    if (s === 'in_progress') return '#3B82F6';
    if (s === 'resolved') return '#10B981';
    return '#6B7280';
  };

  const priorityTitle = (p?: string) => {
    if (language === 'az') {
      if (p === 'low') return 'Aşağı';
      if (p === 'medium') return 'Orta';
      if (p === 'high') return 'Yüksək';
      if (p === 'urgent') return 'Təcili';
      return '-';
    }
    if (p === 'low') return 'Низкий';
    if (p === 'medium') return 'Средний';
    if (p === 'high') return 'Высокий';
    if (p === 'urgent') return 'Срочный';
    return '-';
  };

  const categoryTitle = (id?: string) => {
    if (!id) return '-';
    const c = (categories || []).find((x) => x.id === id);
    if (!c) return id;
    return language === 'az' ? c.name : c.nameRu;
  };

  const openDetails = (t: TicketItem) => {
    setSelected(t);
    setNotesDraft((t?.moderatorNotes || '').toString());
    setResolutionDraft((t?.resolution || '').toString());
    setReplyDraft('');
    setPendingAction(null);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setSelected(null);
    setNotesDraft('');
    setResolutionDraft('');
    setReplyDraft('');
    setPendingAction(null);
  };

  const goToUser = (userId?: string) => {
    if (!userId) return;
    try {
      router.push(`/profile/${userId}`);
    } catch {
      // ignore
    }
  };

  const ensureLoggedInModerator = () => {
    if (!currentUser?.id) {
      Alert.alert(language === 'az' ? 'Xəta' : 'Ошибка', language === 'az' ? 'İstifadəçi tapılmadı.' : 'Пользователь не найден.');
      return false;
    }
    return true;
  };

  const sendAdminReply = (ticketId: string, message: string) => {
    if (!ensureLoggedInModerator()) return;
    const text = message.trim();
    if (!text) return;
    addResponseMutation.mutate({
      ticketId,
      message: text,
    });
    setReplyDraft('');
  };

  const applyStatus = async (next: TicketStatus) => {
    if (!selected?.id) return;
    if (!ensureLoggedInModerator()) return;

    const notes = notesDraft.trim();
    const resolution = resolutionDraft.trim();

    if ((next === 'resolved' || next === 'closed') && !resolution) {
      Alert.alert(
        language === 'az' ? 'Tələb olunur' : 'Требуется',
        language === 'az' ? 'Həll/bağlama səbəbini yazın.' : 'Укажите причину решения/закрытия.',
      );
      return;
    }

    await updateStatusMutation.mutateAsync({
      ticketId: selected.id,
      status: next,
      moderatorNotes: notes || undefined,
      resolution: next === 'resolved' || next === 'closed' ? resolution : undefined,
    });

    // If no explicit reply is written, send a short system-like admin message on closing actions.
    if (next === 'resolved' || next === 'closed') {
      const hasReply = !!replyDraft.trim();
      const autoText =
        next === 'resolved'
          ? (language === 'az' ? `Bilet həll edildi: ${resolution}` : `Тикет решен: ${resolution}`)
          : (language === 'az' ? `Bilet bağlandı: ${resolution}` : `Тикет закрыт: ${resolution}`);

      sendAdminReply(selected.id, hasReply ? replyDraft : autoText);
      closeDetails();
      return;
    }

    // For in_progress, keep the modal open; user might want to reply.
    setPendingAction(null);
  };

  const StatusChip = ({ value, title }: { value: StatusFilter; title: string }) => {
    const active = filter === value;
    return (
      <TouchableOpacity
        onPress={() => setFilter(value)}
        style={[
          styles.chip,
          { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border },
        ]}
      >
        <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '700', fontSize: 12 }}>{title}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: language === 'az' ? 'Dəstək biletləri' : 'Тикеты поддержки',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }}
      />

      {!canManageTickets ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
            {language === 'az'
              ? 'Biletləri idarə etmək üçün icazəniz yoxdur.'
              : 'У вас нет прав на управление тикетами.'}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.top}>
            <TouchableOpacity
              style={[styles.operatorBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/operator-dashboard')}
            >
              <Headphones size={18} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '800' }}>
                {language === 'az' ? 'Operator paneli' : 'Панель оператора'}
              </Text>
              <ChevronRight size={18} color={colors.primary} />
            </TouchableOpacity>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              <StatusChip value="open" title={language === 'az' ? 'Açıq' : 'Открыт'} />
              <StatusChip value="in_progress" title={language === 'az' ? 'İcrada' : 'В работе'} />
              <StatusChip value="resolved" title={language === 'az' ? 'Həll' : 'Решен'} />
              <StatusChip value="closed" title={language === 'az' ? 'Bağlı' : 'Закрыт'} />
              <StatusChip value="all" title={language === 'az' ? 'Hamısı' : 'Все'} />
            </ScrollView>
          </View>

          <View style={styles.searchRow}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={language === 'az' ? 'Axtar… (mövzu, mesaj, ID, userId)' : 'Поиск… (тема, текст, ID, userId)'}
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

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  if (refreshTimer.current) clearTimeout(refreshTimer.current);
                  setRefreshing(true);
                  ticketsQuery.refetch();
                  refreshTimer.current = setTimeout(() => setRefreshing(false), 250);
                }}
                tintColor={colors.primary}
              />
            }
          >
            {ticketsQuery.isLoading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 10, color: colors.textSecondary }}>
                  {language === 'az' ? 'Yüklənir...' : 'Загрузка...'}
                </Text>
              </View>
            ) : ticketsQuery.error ? (
              <View style={styles.center}>
                <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                  {language === 'az'
                    ? 'Məlumat alınmadı. Giriş icazəsi və ya şəbəkəni yoxlayın.'
                    : 'Не удалось загрузить данные. Проверьте доступ или сеть.'}
                </Text>
              </View>
            ) : tickets.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                <Text style={{ color: colors.textSecondary }}>
                  {search.trim()
                    ? (language === 'az' ? 'Uyğun bilet tapılmadı.' : 'Ничего не найдено.')
                    : (language === 'az' ? 'Bilet yoxdur.' : 'Тикетов нет.')}
                </Text>
              </View>
            ) : (
              tickets.map((t: TicketItem) => {
                const c = statusColor(t.status as TicketStatus);
                const Icon = t.status === 'open' ? Clock : t.status === 'in_progress' ? AlertCircle : CheckCircle;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                    activeOpacity={0.85}
                    onPress={() => {
                      openDetails(t);
                    }}
                  >
                    <View style={styles.cardTop}>
                      <View style={styles.left}>
                        <Text style={[styles.subject, { color: colors.text }]} numberOfLines={1}>
                          {t.subject}
                        </Text>
                        <Text style={[styles.preview, { color: colors.textSecondary }]} numberOfLines={2}>
                          {t.message}
                        </Text>
                        <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
                          {(language === 'az' ? 'Yenilənib: ' : 'Обновлено: ') + formatDateTime(t.updatedAt)}
                        </Text>
                      </View>
                      <View style={[styles.badge, { backgroundColor: `${c}20` }]}>
                        <Icon size={14} color={c} />
                        <Text style={{ marginLeft: 6, color: c, fontWeight: '800', fontSize: 11 }}>
                          {statusTitle(t.status as TicketStatus)}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
            <View style={{ height: 24 }} />
          </ScrollView>
        </>
      )}

      <Modal visible={detailsOpen} transparent animationType="fade" onRequestClose={closeDetails}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                {language === 'az' ? 'Bilet detalları' : 'Детали тикета'}
              </Text>
              <TouchableOpacity onPress={closeDetails} style={styles.modalCloseBtn}>
                <Text style={{ color: colors.textSecondary, fontWeight: '800' }}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
              <View style={styles.kvRow}>
                <Text style={[styles.kvKey, { color: colors.textSecondary }]}>{language === 'az' ? 'Mövzu' : 'Тема'}</Text>
                <Text style={[styles.kvVal, { color: colors.text }]} numberOfLines={2}>
                  {selected?.subject || '-'}
                </Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={[styles.kvKey, { color: colors.textSecondary }]}>{language === 'az' ? 'Status' : 'Статус'}</Text>
                <Text style={[styles.kvVal, { color: colors.text }]}>{selected?.status ? statusTitle(selected.status) : '-'}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={[styles.kvKey, { color: colors.textSecondary }]}>{language === 'az' ? 'Kateqoriya' : 'Категория'}</Text>
                <Text style={[styles.kvVal, { color: colors.text }]}>{categoryTitle(selected?.category)}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={[styles.kvKey, { color: colors.textSecondary }]}>{language === 'az' ? 'Prioritet' : 'Приоритет'}</Text>
                <Text style={[styles.kvVal, { color: colors.text }]}>{priorityTitle(selected?.priority)}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={[styles.kvKey, { color: colors.textSecondary }]}>{language === 'az' ? 'Tarix' : 'Дата'}</Text>
                <Text style={[styles.kvVal, { color: colors.text }]}>
                  {formatDateTime(selected?.createdAt)}
                </Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={[styles.kvKey, { color: colors.textSecondary }]}>{language === 'az' ? 'İstifadəçi' : 'Пользователь'}</Text>
                <Text style={[styles.kvVal, { color: colors.text }]}>{selected?.userId || '-'}</Text>
              </View>

              <TouchableOpacity
                style={[styles.targetBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}
                onPress={() => goToUser(selected?.userId)}
              >
                <ExternalLink size={16} color={colors.primary} />
                <Text style={[styles.targetBtnText, { color: colors.primary }]}>
                  {language === 'az' ? 'İstifadəçi profilini aç' : 'Открыть профиль пользователя'}
                </Text>
              </TouchableOpacity>

              <View style={styles.sectionBlock}>
                <Text style={[styles.blockTitle, { color: colors.text }]}>{language === 'az' ? 'Mesaj' : 'Сообщение'}</Text>
                <Text style={[styles.blockText, { color: colors.textSecondary }]}>{selected?.message || '-'}</Text>
              </View>

              {selected?.attachments?.length ? (
                <View style={styles.sectionBlock}>
                  <Text style={[styles.blockTitle, { color: colors.text }]}>{language === 'az' ? 'Əlavələr' : 'Вложения'}</Text>
                  <Text style={[styles.blockText, { color: colors.textSecondary }]}>
                    {language === 'az'
                      ? `${selected.attachments.length} fayl əlavə olunub`
                      : `Добавлено файлов: ${selected.attachments.length}`}
                  </Text>
                </View>
              ) : null}

              <View style={styles.sectionBlock}>
                <Text style={[styles.blockTitle, { color: colors.text }]}>{language === 'az' ? 'Cavablar' : 'Ответы'}</Text>
                {(selected?.responses || []).length === 0 ? (
                  <Text style={[styles.blockText, { color: colors.textSecondary }]}>
                    {language === 'az' ? 'Hələ cavab yoxdur.' : 'Пока нет ответов.'}
                  </Text>
                ) : (
                  (selected.responses ?? [])
                    .slice()
                    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                    .slice(0, 8)
                    .map((r) => (
                      <View key={r.id} style={[styles.replyCard, { borderColor: colors.border }]}>
                        <Text style={[styles.replyMeta, { color: colors.textSecondary }]}>
                          {(r.isAdmin ? (language === 'az' ? 'Dəstək' : 'Поддержка') : (language === 'az' ? 'İstifadəçi' : 'Пользователь')) +
                            ' • ' +
                            formatDateTime(r.createdAt)}
                        </Text>
                        <Text style={[styles.replyText, { color: colors.text }]}>{r.message}</Text>
                      </View>
                    ))
                )}
              </View>

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

              <View style={styles.sectionBlock}>
                <Text style={[styles.blockTitle, { color: colors.text }]}>
                  {language === 'az' ? 'Cavab yaz (istifadəçiyə)' : 'Ответ пользователю'}
                </Text>
                <View style={[styles.textAreaWrap, { borderColor: colors.border, backgroundColor: colors.background }]}>
                  <TextInput
                    value={replyDraft}
                    onChangeText={setReplyDraft}
                    placeholder={language === 'az' ? 'Cavab mesajı…' : 'Текст ответа…'}
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.textArea, { color: colors.text }]}
                    multiline
                  />
                </View>
                <TouchableOpacity
                  style={[styles.replyBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}
                  onPress={() => {
                    if (!selected?.id) return;
                    if (!replyDraft.trim()) return;
                    sendAdminReply(selected.id, replyDraft);
                  }}
                >
                  <Send size={16} color={colors.primary} />
                  <Text style={[styles.replyBtnText, { color: colors.primary }]}>
                    {language === 'az' ? 'Cavabı göndər' : 'Отправить ответ'}
                  </Text>
                </TouchableOpacity>
              </View>

              {(pendingAction === 'resolved' || pendingAction === 'closed') && (
                <View style={styles.sectionBlock}>
                  <Text style={[styles.blockTitle, { color: colors.text }]}>
                    {pendingAction === 'resolved'
                      ? (language === 'az' ? 'Həll (tələb olunur)' : 'Решение (обязательно)')
                      : (language === 'az' ? 'Bağlama səbəbi (tələb olunur)' : 'Причина закрытия (обязательно)')}
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
                  onPress={() => applyStatus('in_progress')}
                >
                  <AlertCircle size={16} color="#3B82F6" />
                  <Text style={[styles.actionPillText, { color: '#3B82F6' }]}>
                    {language === 'az' ? 'İcraya al' : 'В работу'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionPill, { backgroundColor: '#10B98115' }]}
                  onPress={() => {
                    if (pendingAction !== 'resolved') {
                      setPendingAction('resolved');
                      return;
                    }
                    applyStatus('resolved');
                  }}
                >
                  <CheckCircle size={16} color="#10B981" />
                  <Text style={[styles.actionPillText, { color: '#10B981' }]}>
                    {language === 'az' ? 'Həll et' : 'Решить'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionPill, { backgroundColor: '#6B728015' }]}
                  onPress={() => {
                    if (pendingAction !== 'closed') {
                      setPendingAction('closed');
                      return;
                    }
                    applyStatus('closed');
                  }}
                >
                  <CheckCircle size={16} color="#6B7280" />
                  <Text style={[styles.actionPillText, { color: '#6B7280' }]}>
                    {language === 'az' ? 'Bağla' : 'Закрыть'}
                  </Text>
                </TouchableOpacity>
              </View>
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
  top: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  operatorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  chipsRow: { gap: 8, paddingRight: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  searchRow: { paddingHorizontal: 16, paddingBottom: 8 },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  emptyCard: { padding: 16, borderRadius: 12, alignItems: 'center' },
  card: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  left: { flex: 1 },
  subject: { fontSize: 16, fontWeight: '800' },
  preview: { marginTop: 6, fontSize: 13, lineHeight: 18 },
  meta: { marginTop: 6, fontSize: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999 },

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
  modalBody: { paddingHorizontal: 14, paddingBottom: 14 },
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
  replyCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  replyMeta: { fontSize: 11, fontWeight: '700', marginBottom: 6 },
  replyText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
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
  replyBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  replyBtnText: { fontSize: 12, fontWeight: '900' },
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

