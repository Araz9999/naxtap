import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
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
import { RefreshCw, Shield, UserCheck, UserPlus, ExternalLink, BadgeCheck, BadgeX } from 'lucide-react-native';

export default function AdminModeratorsScreen() {
  const { language } = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const { currentUser } = useUserStore();
  const colors = getColors(themeMode, colorTheme);
  const router = useRouter();

  const canAccess = currentUser?.role === 'admin';
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'ADMIN' | 'MODERATOR'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const utils = trpc.useUtils();
  const moderatorsQuery = trpc.admin.getModerators.useQuery(undefined, {
    enabled: canAccess,
    refetchInterval: 60000,
  });

  const updateUser = trpc.admin.updateUser.useMutation({
    onSuccess: async () => {
      await utils.admin.getModerators.invalidate();
      await utils.admin.getUsers.invalidate();
      await utils.admin.getAnalytics.invalidate();
    },
    onError: (e: any) => {
      logger.error('[AdminModerators] update failed:', e);
      const msg =
        typeof e?.message === 'string' && e.message.trim()
          ? e.message
          : (language === 'az' ? 'Yenilənmə alınmadı.' : 'Не удалось обновить.');
      Alert.alert(language === 'az' ? 'Xəta' : 'Ошибка', msg);
    },
  });

  const createModerator = trpc.admin.createModerator.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.admin.getModerators.invalidate(),
        utils.admin.getUsers.invalidate(),
        utils.admin.getAnalytics.invalidate(),
      ]);
      setCreateOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewPassword('');
      Alert.alert(
        language === 'az' ? 'Uğurlu' : 'Успешно',
        language === 'az' ? 'Moderator yaradıldı.' : 'Модератор создан.'
      );
    },
    onError: (e: any) => {
      logger.error('[AdminModerators] create failed:', e);
      const msg =
        typeof e?.message === 'string' && e.message.trim()
          ? e.message
          : (language === 'az' ? 'Yaradılma alınmadı.' : 'Не удалось создать.');
      Alert.alert(language === 'az' ? 'Xəta' : 'Ошибка', msg);
    },
  });

  if (!canAccess) return null;

  const moderators = (moderatorsQuery.data as any[]) || [];

  useEffect(() => {
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, []);

  const roleTitle = (r: string) => {
    if (language === 'az') return r === 'ADMIN' ? 'Admin' : 'Moderator';
    return r === 'ADMIN' ? 'Админ' : 'Модератор';
  };

  const roleColor = (r: string) => (r === 'ADMIN' ? '#F59E0B' : '#10B981');

  const formatDateTime = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return moderators.filter((m: any) => {
      if (roleFilter !== 'all' && m.role !== roleFilter) return false;
      if (!q) return true;
      const hay = [m.id, m.name, m.email, m.phone].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [moderators, roleFilter, search]);

  const onRefresh = () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    setIsRefreshing(true);
    moderatorsQuery.refetch();
    refreshTimer.current = setTimeout(() => setIsRefreshing(false), 450);
  };

  const openDetails = (m: any) => {
    setSelected(m);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setSelected(null);
    setDetailsOpen(false);
  };

  const goToProfile = (userId?: string) => {
    if (!userId) return;
    try {
      router.push(`/profile/${userId}` as any);
    } catch (e) {
      logger.error('[AdminModerators] profile navigation failed:', e);
    }
  };

  const submitCreate = () => {
    const email = newEmail.trim().toLowerCase();
    const name = newName.trim();
    const password = newPassword;
    const phone = newPhone.trim();

    if (!email || !name || password.length < 8) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az'
          ? 'Ad, email və minimum 8 simvolluq şifrə tələb olunur.'
          : 'Требуются имя, email и пароль минимум 8 символов.'
      );
      return;
    }
    createModerator.mutate({ email, name, password, phone: phone || undefined } as any);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: language === 'az' ? 'Moderatorlar' : 'Модераторы',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }}
      />

      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {language === 'az'
              ? 'Moderator və adminləri idarə edin (rol, təsdiq, yeni moderator).'
              : 'Управление модераторами и админами (роль, вериф., новый модератор).'}
          </Text>
          <TouchableOpacity
            style={[styles.refreshBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={onRefresh}
          >
            <RefreshCw size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.actionsRow}>
          <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={language === 'az' ? 'Axtar… (ad, email, tel)' : 'Поиск… (имя, email, тел)'}
              placeholderTextColor={colors.textSecondary}
              style={[styles.search, { color: colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode={Platform.OS === 'ios' ? 'while-editing' : 'never'}
            />
          </View>

          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
            onPress={() => setCreateOpen(true)}
          >
            <UserPlus size={18} color="#fff" />
            <Text style={styles.createBtnText}>{language === 'az' ? 'Yeni' : 'Новый'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {(['all', 'MODERATOR', 'ADMIN'] as const).map((v) => {
            const active = roleFilter === v;
            const label =
              v === 'all'
                ? (language === 'az' ? 'Hamısı' : 'Все')
                : (language === 'az' ? roleTitle(v) : roleTitle(v));
            return (
              <TouchableOpacity
                key={v}
                onPress={() => setRoleFilter(v)}
                style={[
                  styles.chip,
                  { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border },
                ]}
              >
                <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '800', fontSize: 12 }}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {moderatorsQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 10, color: colors.textSecondary }}>{language === 'az' ? 'Yüklənir...' : 'Загрузка...'}</Text>
        </View>
      ) : moderatorsQuery.error ? (
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
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {filtered.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <Text style={{ color: colors.textSecondary }}>
                {search.trim()
                  ? (language === 'az' ? 'Uyğun nəticə tapılmadı.' : 'Ничего не найдено.')
                  : (language === 'az' ? 'Moderator tapılmadı.' : 'Модераторы не найдены.')}
              </Text>
            </View>
          ) : (
            filtered.map((m: any) => {
              const c = roleColor(m.role);
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.85}
                  onPress={() => {
                    openDetails(m);
                  }}
                >
                  <View style={styles.row}>
                    <View style={styles.left}>
                      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                        {m.name || m.email || '-'}
                      </Text>
                      <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
                        {m.email || '-'} {m.phone ? `• ${m.phone}` : ''}
                      </Text>
                      <Text style={[styles.meta2, { color: colors.textSecondary }]} numberOfLines={1}>
                        {(language === 'az' ? 'Yaradılıb: ' : 'Создан: ') + formatDateTime(m.createdAt)}
                      </Text>
                    </View>
                    <View style={[styles.rolePill, { backgroundColor: `${c}20` }]}>
                      {m.role === 'ADMIN' ? <Shield size={12} color={c} /> : <UserCheck size={12} color={c} />}
                      <Text style={{ color: c, fontWeight: '800', fontSize: 11, marginLeft: 6 }}>
                        {roleTitle(m.role)}
                      </Text>
                    </View>
                    {m.verified ? <BadgeCheck size={18} color="#10B981" /> : <BadgeX size={18} color="#EF4444" />}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      <Modal visible={detailsOpen} transparent animationType="fade" onRequestClose={closeDetails}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                {language === 'az' ? 'Moderator detalları' : 'Детали модератора'}
              </Text>
              <TouchableOpacity onPress={closeDetails} style={styles.modalCloseBtn}>
                <Text style={{ color: colors.textSecondary, fontWeight: '800' }}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
              <View style={styles.kvRow}>
                <Text style={[styles.kvKey, { color: colors.textSecondary }]}>ID</Text>
                <Text style={[styles.kvVal, { color: colors.text }]} numberOfLines={1}>
                  {selected?.id || '-'}
                </Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={[styles.kvKey, { color: colors.textSecondary }]}>Email</Text>
                <Text style={[styles.kvVal, { color: colors.text }]} numberOfLines={1}>
                  {selected?.email || '-'}
                </Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={[styles.kvKey, { color: colors.textSecondary }]}>{language === 'az' ? 'Telefon' : 'Телефон'}</Text>
                <Text style={[styles.kvVal, { color: colors.text }]} numberOfLines={1}>
                  {selected?.phone || '-'}
                </Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={[styles.kvKey, { color: colors.textSecondary }]}>{language === 'az' ? 'Rol' : 'Роль'}</Text>
                <Text style={[styles.kvVal, { color: colors.text }]}>{selected?.role ? roleTitle(selected.role) : '-'}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={[styles.kvKey, { color: colors.textSecondary }]}>{language === 'az' ? 'Təsdiq' : 'Вериф.'}</Text>
                <Text style={[styles.kvVal, { color: colors.text }]}>{selected?.verified ? '✓' : '✗'}</Text>
              </View>
              <View style={styles.kvRow}>
                <Text style={[styles.kvKey, { color: colors.textSecondary }]}>{language === 'az' ? 'Yaradılıb' : 'Создан'}</Text>
                <Text style={[styles.kvVal, { color: colors.text }]}>{formatDateTime(selected?.createdAt)}</Text>
              </View>

              <TouchableOpacity
                style={[styles.targetBtn, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}
                onPress={() => goToProfile(selected?.id)}
              >
                <ExternalLink size={16} color={colors.primary} />
                <Text style={[styles.targetBtnText, { color: colors.primary }]}>
                  {language === 'az' ? 'Profilə keç' : 'Открыть профиль'}
                </Text>
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionPill, { backgroundColor: '#10B98115' }]}
                  onPress={() => updateUser.mutate({ userId: selected?.id, verified: !selected?.verified } as any)}
                >
                  {selected?.verified ? <BadgeX size={16} color="#10B981" /> : <BadgeCheck size={16} color="#10B981" />}
                  <Text style={[styles.actionPillText, { color: '#10B981' }]}>
                    {selected?.verified
                      ? (language === 'az' ? 'Təsdiqi ləğv et' : 'Снять вериф.')
                      : (language === 'az' ? 'Təsdiqlə' : 'Вериф.')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionPill, { backgroundColor: '#3B82F615' }]}
                  onPress={() => {
                    if (!selected?.id) return;
                    const nextRole = selected.role === 'ADMIN' ? 'MODERATOR' : 'ADMIN';
                    updateUser.mutate({ userId: selected.id, role: nextRole } as any);
                  }}
                >
                  <Shield size={16} color="#3B82F6" />
                  <Text style={[styles.actionPillText, { color: '#3B82F6' }]}>
                    {selected?.role === 'ADMIN'
                      ? (language === 'az' ? 'Moderator et' : 'Сделать модератором')
                      : (language === 'az' ? 'Admin et' : 'Сделать админом')}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {language === 'az' ? 'Yeni moderator' : 'Новый модератор'}
              </Text>
              <TouchableOpacity onPress={() => setCreateOpen(false)} style={styles.modalCloseBtn}>
                <Text style={{ color: colors.textSecondary, fontWeight: '800' }}>×</Text>
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{language === 'az' ? 'Ad' : 'Имя'}</Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder={language === 'az' ? 'Ad' : 'Имя'}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email</Text>
              <TextInput
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="email@example.com"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="none"
                keyboardType="email-address"
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{language === 'az' ? 'Telefon (opsional)' : 'Телефон (опц.)'}</Text>
              <TextInput
                value={newPhone}
                onChangeText={setNewPhone}
                placeholder="+994…"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{language === 'az' ? 'Şifrə (min 8)' : 'Пароль (мин 8)'}</Text>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="********"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
                style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: createModerator.isPending ? 0.6 : 1 }]}
                disabled={createModerator.isPending}
                onPress={submitCreate}
              >
                <Text style={styles.primaryBtnText}>
                  {createModerator.isPending
                    ? (language === 'az' ? 'Yaradılır…' : 'Создание…')
                    : (language === 'az' ? 'Yarat' : 'Создать')}
                </Text>
              </TouchableOpacity>
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
  header: {
    padding: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    gap: 10,
    flexWrap: 'wrap',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
  },
  subtitle: { flex: 1, fontSize: 13, lineHeight: 18 },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  searchWrap: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center',
  },
  search: { fontSize: 14 },
  createBtn: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createBtnText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  chipsRow: { gap: 8, paddingTop: 2, paddingBottom: 2 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  emptyCard: { padding: 16, borderRadius: 12, alignItems: 'center' },
  card: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  left: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800' },
  meta: { marginTop: 4, fontSize: 13 },
  meta2: { marginTop: 4, fontSize: 12 },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

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
  modalTitle: { fontSize: 16, fontWeight: '900', flex: 1 },
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
  kvKey: { fontSize: 12, fontWeight: '800' },
  kvVal: { fontSize: 13, fontWeight: '800', flex: 1, textAlign: 'right' },
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
  targetBtnText: { fontSize: 12, fontWeight: '900', flex: 1 },
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
  inputLabel: { fontSize: 12, fontWeight: '800', marginTop: 10, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  primaryBtn: {
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },
});

