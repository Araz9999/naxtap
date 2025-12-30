import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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
import { RefreshCw, UserCog, Shield, BadgeCheck, BadgeX, Trash2, ExternalLink, Edit3 } from 'lucide-react-native';

type RoleFilter = 'all' | 'USER' | 'MODERATOR' | 'ADMIN';
type VerifiedFilter = 'all' | 'verified' | 'unverified';

type AdminUserItem = {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: 'USER' | 'MODERATOR' | 'ADMIN' | string;
  verified?: boolean;
  balance?: number;
  createdAt?: string;
  updatedAt?: string;
  moderatorPermissions?: string[];
};

type AdminUsersQueryResult = {
  users: AdminUserItem[];
  pagination?: { totalPages?: number; page?: number; limit?: number; totalCount?: number };
};

export default function AdminUsersScreen() {
  const { language } = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const { currentUser } = useUserStore();
  const colors = getColors(themeMode, colorTheme);
  const router = useRouter();

  const canAccess = currentUser?.role === 'admin';

  const [search, setSearch] = useState('');
  const [role, setRole] = useState<RoleFilter>('all');
  const [verified, setVerified] = useState<VerifiedFilter>('all');
  const [page, setPage] = useState(1);
  const limit = 20;
  const [items, setItems] = useState<AdminUserItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState<AdminUserItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editBalance, setEditBalance] = useState('');
  const [saving, setSaving] = useState(false);

  const input = useMemo(() => {
    return {
      page,
      limit,
      role: role === 'all' ? undefined : role,
      search: search.trim() ? search.trim() : undefined,
      verified: verified === 'all' ? undefined : verified === 'verified',
    };
  }, [page, limit, role, search, verified]);

  const utils = trpc.useUtils();
  const usersQuery = trpc.admin.getUsers.useQuery(input, {
    enabled: canAccess,
    refetchInterval: 30000,
  });
  const usersData = usersQuery.data as unknown as AdminUsersQueryResult | undefined;

  const updateUser = trpc.admin.updateUser.useMutation({
    onSuccess: async () => {
      await utils.admin.getUsers.invalidate();
      await utils.admin.getModerators.invalidate();
      await utils.admin.getAnalytics.invalidate();
    },
    onError: (e: unknown) => {
      logger.error('[AdminUsers] update user failed:', e);
      const err = e as { message?: unknown };
      const msg =
        typeof err?.message === 'string' && err.message.trim()
          ? err.message
          : (language === 'az' ? 'Yenilənmə alınmadı.' : 'Не удалось обновить.');
      Alert.alert(language === 'az' ? 'Xəta' : 'Ошибка', msg);
    },
  });

  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: async () => {
      await utils.admin.getUsers.invalidate();
      await utils.admin.getAnalytics.invalidate();
    },
    onError: (e: unknown) => {
      logger.error('[AdminUsers] delete user failed:', e);
      const err = e as { message?: unknown };
      const msg =
        typeof err?.message === 'string' && err.message.trim()
          ? err.message
          : (language === 'az' ? 'Silinmə alınmadı.' : 'Не удалось удалить.');
      Alert.alert(language === 'az' ? 'Xəta' : 'Ошибка', msg);
    },
  });

  const pageData: AdminUserItem[] = usersData?.users ?? [];
  const pagination = usersData?.pagination;
  const totalPages = pagination?.totalPages || 1;
  const canLoadMore = page < totalPages;

  useEffect(() => {
    // Reset list when filters change
    setPage(1);
    setItems([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, verified, search]);

  useEffect(() => {
    if (!usersQuery.data) return;
    setItems((prev) => {
      const base = page === 1 ? [] : prev;
      const merged = [...base, ...pageData];
      const seen = new Set<string>();
      return merged.filter((u: AdminUserItem) => {
        if (!u?.id) return false;
        if (seen.has(u.id)) return false;
        seen.add(u.id);
        return true;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usersQuery.data]);

  useEffect(() => {
    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, []);

  const roleTitle = (r: string) => {
    if (language === 'az') {
      if (r === 'ADMIN') return 'Admin';
      if (r === 'MODERATOR') return 'Moderator';
      return 'İstifadəçi';
    }
    if (r === 'ADMIN') return 'Админ';
    if (r === 'MODERATOR') return 'Модератор';
    return 'Пользователь';
  };

  const formatDateTime = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '-';
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  if (!canAccess) return null;

  const RoleChip = ({ value, title }: { value: RoleFilter; title: string }) => {
    const active = role === value;
    return (
      <TouchableOpacity
        onPress={() => setRole(value)}
        style={[
          styles.chip,
          { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border },
        ]}
      >
        <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '700', fontSize: 12 }}>{title}</Text>
      </TouchableOpacity>
    );
  };

  const VerifiedChip = ({ value, title }: { value: VerifiedFilter; title: string }) => {
    const active = verified === value;
    return (
      <TouchableOpacity
        onPress={() => setVerified(value)}
        style={[
          styles.chip,
          { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border },
        ]}
      >
        <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '700', fontSize: 12 }}>{title}</Text>
      </TouchableOpacity>
    );
  };

  const openDetails = (u: AdminUserItem) => {
    setSelected(u);
    setEditName((u?.name || '').toString());
    setEditEmail((u?.email || '').toString());
    setEditPhone((u?.phone || '').toString());
    setEditBalance(typeof u?.balance === 'number' ? String(u.balance) : '0');
    setSaving(false);
    setDetailsOpen(true);
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setSelected(null);
    setEditName('');
    setEditEmail('');
    setEditPhone('');
    setEditBalance('');
    setSaving(false);
  };

  const onRefresh = () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    setIsRefreshing(true);
    setPage(1);
    setItems([]);
    usersQuery.refetch();
    refreshTimer.current = setTimeout(() => setIsRefreshing(false), 450);
  };

  const goToProfile = (userId?: string) => {
    if (!userId) return;
    try {
      router.push(`/profile/${userId}`);
    } catch (e) {
      logger.error('[AdminUsers] profile navigation failed:', e);
    }
  };

  const saveEdits = async () => {
    if (!selected?.id) return;
    if (saving) return;
    setSaving(true);
    try {
      const balanceNum = Number(editBalance);
      if (!Number.isFinite(balanceNum)) {
        Alert.alert(language === 'az' ? 'Xəta' : 'Ошибка', language === 'az' ? 'Balans düzgün deyil.' : 'Неверный баланс.');
        setSaving(false);
        return;
      }
      await updateUser.mutateAsync({
        userId: selected.id,
        name: editName.trim() || undefined,
        email: editEmail.trim() || undefined,
        phone: editPhone.trim() ? editPhone.trim() : null,
        balance: balanceNum,
      });
      closeDetails();
    } catch {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: language === 'az' ? 'İstifadəçilər' : 'Пользователи',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }}
      />

      <View style={styles.header}>
        <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <UserCog size={18} color={colors.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder={language === 'az' ? 'Axtarış (ad, email, tel)' : 'Поиск (имя, email, тел)'}
            placeholderTextColor={colors.textSecondary}
            style={[styles.search, { color: colors.text }]}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode={Platform.OS === 'ios' ? 'while-editing' : 'never'}
          />
        </View>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={onRefresh}
        >
          <RefreshCw size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        <RoleChip value="all" title={language === 'az' ? 'Hamısı' : 'Все'} />
        <RoleChip value="USER" title={language === 'az' ? 'İstifadəçi' : 'Пользователь'} />
        <RoleChip value="MODERATOR" title={language === 'az' ? 'Moderator' : 'Модератор'} />
        <RoleChip value="ADMIN" title={language === 'az' ? 'Admin' : 'Админ'} />
        <View style={{ width: 8 }} />
        <VerifiedChip value="all" title={language === 'az' ? 'Təsdiq: hamısı' : 'Вериф: все'} />
        <VerifiedChip value="verified" title={language === 'az' ? 'Təsdiqli' : 'Вериф.'} />
        <VerifiedChip value="unverified" title={language === 'az' ? 'Təsdiqsiz' : 'Без вериф.'} />
      </ScrollView>

      {usersQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ marginTop: 10, color: colors.textSecondary }}>{language === 'az' ? 'Yüklənir...' : 'Загрузка...'}</Text>
        </View>
      ) : usersQuery.error ? (
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
          {items.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <Text style={{ color: colors.textSecondary }}>
                {language === 'az' ? 'İstifadəçi tapılmadı.' : 'Пользователи не найдены.'}
              </Text>
            </View>
          ) : (
            items.map((u: AdminUserItem) => {
              const roleColor = u.role === 'ADMIN' ? '#F59E0B' : u.role === 'MODERATOR' ? '#10B981' : colors.textSecondary;
              return (
                <TouchableOpacity
                  key={u.id}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.85}
                  onPress={() => {
                    openDetails(u);
                  }}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.left}>
                      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                        {u.name || u.email || '-'}
                      </Text>
                      <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
                        {u.email || u.phone || '-'}
                      </Text>
                      <Text style={[styles.meta2, { color: colors.textSecondary }]} numberOfLines={1}>
                        {(language === 'az' ? 'Yaradılıb: ' : 'Создан: ') + formatDateTime(u.createdAt)}
                      </Text>
                    </View>
                    <View style={styles.right}>
                      <View style={[styles.rolePill, { backgroundColor: `${roleColor}20` }]}>
                        <Shield size={12} color={roleColor} />
                        <Text style={{ color: roleColor, fontWeight: '800', fontSize: 11, marginLeft: 6 }}>
                          {roleTitle(u.role)}
                        </Text>
                      </View>
                      {u.verified ? <BadgeCheck size={18} color="#10B981" /> : <BadgeX size={18} color="#EF4444" />}
                    </View>
                  </View>
                  <View style={styles.cardBottom}>
                    <View style={styles.smallRow}>
                      <Text style={[styles.small, { color: colors.textSecondary }]}>
                        {language === 'az' ? 'Balans' : 'Баланс'}: {typeof u.balance === 'number' ? u.balance : 0}
                      </Text>
                    </View>
                    <View style={styles.smallRow}>
                      <Edit3 size={14} color={colors.textSecondary} />
                      <Text style={[styles.small, { color: colors.textSecondary, marginLeft: 6 }]}>
                        {language === 'az' ? 'Düzəliş / Rol / Təsdiq / Sil' : 'Правка / Роль / Вериф. / Удалить'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {items.length > 0 && (
            <TouchableOpacity
              style={[
                styles.loadMoreBtn,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: canLoadMore ? 1 : 0.5 },
              ]}
              disabled={!canLoadMore || usersQuery.isFetching}
              onPress={() => setPage((p) => p + 1)}
            >
              <Text style={{ color: colors.text, fontWeight: '800' }}>
                {canLoadMore
                  ? (language === 'az' ? 'Daha çox yüklə' : 'Загрузить еще')
                  : (language === 'az' ? 'Hamısı yükləndi' : 'Все загружено')}
              </Text>
            </TouchableOpacity>
          )}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}

      <Modal visible={detailsOpen} transparent animationType="fade" onRequestClose={closeDetails}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={1}>
                {language === 'az' ? 'İstifadəçi detalları' : 'Детали пользователя'}
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
              <View style={styles.kvRow}>
                <Text style={[styles.kvKey, { color: colors.textSecondary }]}>{language === 'az' ? 'Yenilənib' : 'Обновлен'}</Text>
                <Text style={[styles.kvVal, { color: colors.text }]}>{formatDateTime(selected?.updatedAt)}</Text>
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

              <View style={styles.sectionBlock}>
                <Text style={[styles.blockTitle, { color: colors.text }]}>{language === 'az' ? 'Redaktə' : 'Редактирование'}</Text>

                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{language === 'az' ? 'Ad' : 'Имя'}</Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder={language === 'az' ? 'Ad' : 'Имя'}
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                />

                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email</Text>
                <TextInput
                  value={editEmail}
                  onChangeText={setEditEmail}
                  placeholder="email@example.com"
                  placeholderTextColor={colors.textSecondary}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                />

                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{language === 'az' ? 'Telefon' : 'Телефон'}</Text>
                <TextInput
                  value={editPhone}
                  onChangeText={setEditPhone}
                  placeholder="+994…"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                />

                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{language === 'az' ? 'Balans' : 'Баланс'}</Text>
                <TextInput
                  value={editBalance}
                  onChangeText={setEditBalance}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
                  style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                />

                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
                  disabled={saving}
                  onPress={saveEdits}
                >
                  <Text style={styles.primaryBtnText}>
                    {saving ? (language === 'az' ? 'Yadda saxlanır…' : 'Сохранение…') : (language === 'az' ? 'Yadda saxla' : 'Сохранить')}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.actionPill, { backgroundColor: '#10B98115' }]}
                  onPress={() => {
                    if (!selected?.id) return;
                    updateUser.mutate({ userId: selected.id, verified: !selected.verified });
                  }}
                >
                  <BadgeCheck size={16} color="#10B981" />
                  <Text style={[styles.actionPillText, { color: '#10B981' }]}>
                    {selected?.verified
                      ? (language === 'az' ? 'Təsdiqi ləğv et' : 'Снять вериф.')
                      : (language === 'az' ? 'Təsdiqlə' : 'Вериф.')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionPill, { backgroundColor: '#3B82F615' }]}
                  onPress={() => {
                    const title = selected?.name || selected?.email || 'User';
                    Alert.alert(
                      language === 'az' ? 'Rol seçin' : 'Выберите роль',
                      title,
                      [
                        { text: language === 'az' ? 'İstifadəçi' : 'Пользователь', onPress: () => selected?.id && updateUser.mutate({ userId: selected.id, role: 'USER' }) },
                        { text: language === 'az' ? 'Moderator' : 'Модератор', onPress: () => selected?.id && updateUser.mutate({ userId: selected.id, role: 'MODERATOR' }) },
                        { text: language === 'az' ? 'Admin' : 'Админ', onPress: () => selected?.id && updateUser.mutate({ userId: selected.id, role: 'ADMIN' }) },
                        { text: language === 'az' ? 'Ləğv et' : 'Отмена', style: 'cancel' },
                      ],
                    );
                  }}
                >
                  <Shield size={16} color="#3B82F6" />
                  <Text style={[styles.actionPillText, { color: '#3B82F6' }]}>
                    {language === 'az' ? 'Rolu dəyiş' : 'Сменить роль'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionPill, { backgroundColor: '#EF444415' }]}
                  onPress={() => {
                    Alert.alert(
                      language === 'az' ? 'Silmək?' : 'Удалить?',
                      language === 'az'
                        ? 'Bu istifadəçini silmək istədiyinizə əminsiniz?'
                        : 'Вы уверены, что хотите удалить этого пользователя?',
                      [
                        { text: language === 'az' ? 'Ləğv' : 'Отмена', style: 'cancel' },
                        {
                          text: language === 'az' ? 'Sil' : 'Удалить',
                          style: 'destructive',
                          onPress: () => {
                            if (selected?.id) deleteUser.mutate({ userId: selected.id });
                            closeDetails();
                          },
                        },
                      ],
                    );
                  }}
                >
                  <Trash2 size={16} color="#EF4444" />
                  <Text style={[styles.actionPillText, { color: '#EF4444' }]}>
                    {language === 'az' ? 'Sil' : 'Удалить'}
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
  header: { flexDirection: 'row', gap: 12, padding: 16, paddingBottom: 10 },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  search: { flex: 1, fontSize: 14 },
  refreshBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  emptyCard: { padding: 16, borderRadius: 12, alignItems: 'center' },
  card: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'center' },
  left: { flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 10 },
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
  cardBottom: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  smallRow: { flexDirection: 'row', alignItems: 'center' },
  small: { fontSize: 12, fontWeight: '600' },

  loadMoreBtn: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  sectionBlock: { marginTop: 12 },
  blockTitle: { fontSize: 13, fontWeight: '900', marginBottom: 10 },
  inputLabel: { fontSize: 12, fontWeight: '800', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  primaryBtnText: { color: '#fff', fontSize: 13, fontWeight: '900' },
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

