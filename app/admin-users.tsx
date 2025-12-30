import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useThemeStore } from '@/store/themeStore';
import { useUserStore } from '@/store/userStore';
import { getColors } from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { logger } from '@/utils/logger';
import { RefreshCw, UserCog, Shield, BadgeCheck, BadgeX, Trash2 } from 'lucide-react-native';

type RoleFilter = 'all' | 'USER' | 'MODERATOR' | 'ADMIN';

export default function AdminUsersScreen() {
  const { language } = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const { currentUser } = useUserStore();
  const colors = getColors(themeMode, colorTheme);

  const canAccess = currentUser?.role === 'admin';

  const [search, setSearch] = useState('');
  const [role, setRole] = useState<RoleFilter>('all');
  const [page] = useState(1);
  const limit = 20;

  const input = useMemo(() => {
    return {
      page,
      limit,
      role: role === 'all' ? undefined : role,
      search: search.trim() ? search.trim() : undefined,
    };
  }, [page, limit, role, search]);

  const utils = trpc.useUtils();
  const usersQuery = trpc.admin.getUsers.useQuery(input as any, {
    enabled: canAccess,
    refetchInterval: 30000,
  });

  const updateUser = trpc.admin.updateUser.useMutation({
    onSuccess: async () => {
      await utils.admin.getUsers.invalidate();
      await utils.admin.getModerators.invalidate();
      await utils.admin.getAnalytics.invalidate();
    },
    onError: (e: any) => {
      logger.error('[AdminUsers] update user failed:', e);
      Alert.alert(language === 'az' ? 'Xəta' : 'Ошибка', language === 'az' ? 'Yenilənmə alınmadı.' : 'Не удалось обновить.');
    },
  });

  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: async () => {
      await utils.admin.getUsers.invalidate();
      await utils.admin.getAnalytics.invalidate();
    },
    onError: (e: any) => {
      logger.error('[AdminUsers] delete user failed:', e);
      Alert.alert(language === 'az' ? 'Xəta' : 'Ошибка', language === 'az' ? 'Silinmə alınmadı.' : 'Не удалось удалить.');
    },
  });

  if (!canAccess) return null;

  const users = usersQuery.data?.users || [];

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
          />
        </View>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => usersQuery.refetch()}
        >
          <RefreshCw size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
        <RoleChip value="all" title={language === 'az' ? 'Hamısı' : 'Все'} />
        <RoleChip value="USER" title={language === 'az' ? 'İstifadəçi' : 'Пользователь'} />
        <RoleChip value="MODERATOR" title={language === 'az' ? 'Moderator' : 'Модератор'} />
        <RoleChip value="ADMIN" title={language === 'az' ? 'Admin' : 'Админ'} />
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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {users.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <Text style={{ color: colors.textSecondary }}>
                {language === 'az' ? 'İstifadəçi tapılmadı.' : 'Пользователи не найдены.'}
              </Text>
            </View>
          ) : (
            users.map((u: any) => {
              const roleColor = u.role === 'ADMIN' ? '#F59E0B' : u.role === 'MODERATOR' ? '#10B981' : colors.textSecondary;
              return (
                <TouchableOpacity
                  key={u.id}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.85}
                  onPress={() => {
                    const title = u.name || u.email || (language === 'az' ? 'İstifadəçi' : 'Пользователь');
                    Alert.alert(
                      title,
                      `${language === 'az' ? 'Email' : 'Email'}: ${u.email || '-'}\n` +
                        `${language === 'az' ? 'Telefon' : 'Тел'}: ${u.phone || '-'}\n` +
                        `${language === 'az' ? 'Rol' : 'Роль'}: ${roleTitle(u.role)}\n` +
                        `${language === 'az' ? 'Təsdiq' : 'Вериф.'}: ${u.verified ? '✓' : '✗'}`,
                      [
                        {
                          text: u.verified ? (language === 'az' ? 'Təsdiqi ləğv et' : 'Снять вериф.') : (language === 'az' ? 'Təsdiqlə' : 'Вериф.'),
                          onPress: () => updateUser.mutate({ userId: u.id, verified: !u.verified } as any),
                        },
                        {
                          text: language === 'az' ? 'Rolu dəyiş' : 'Сменить роль',
                          onPress: () => {
                            Alert.alert(
                              language === 'az' ? 'Rol seçin' : 'Выберите роль',
                              title,
                              [
                                { text: language === 'az' ? 'İstifadəçi' : 'Пользователь', onPress: () => updateUser.mutate({ userId: u.id, role: 'USER' } as any) },
                                { text: language === 'az' ? 'Moderator' : 'Модератор', onPress: () => updateUser.mutate({ userId: u.id, role: 'MODERATOR' } as any) },
                                { text: language === 'az' ? 'Admin' : 'Админ', onPress: () => updateUser.mutate({ userId: u.id, role: 'ADMIN' } as any) },
                                { text: language === 'az' ? 'Ləğv et' : 'Отмена', style: 'cancel' },
                              ]
                            );
                          },
                        },
                        {
                          text: language === 'az' ? 'Sil' : 'Удалить',
                          style: 'destructive',
                          onPress: () => {
                            Alert.alert(
                              language === 'az' ? 'Silmək?' : 'Удалить?',
                              language === 'az'
                                ? 'Bu istifadəçini silmək istədiyinizə əminsiniz?'
                                : 'Вы уверены, что хотите удалить этого пользователя?',
                              [
                                { text: language === 'az' ? 'Ləğv' : 'Отмена', style: 'cancel' },
                                { text: language === 'az' ? 'Sil' : 'Удалить', style: 'destructive', onPress: () => deleteUser.mutate({ userId: u.id } as any) },
                              ]
                            );
                          },
                        },
                        { text: language === 'az' ? 'Bağla' : 'Закрыть', style: 'cancel' },
                      ]
                    );
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
                      <Trash2 size={14} color={colors.textSecondary} />
                      <Text style={[styles.small, { color: colors.textSecondary, marginLeft: 6 }]}>
                        {language === 'az' ? 'Sil / Rol / Təsdiq' : 'Удалить / Роль / Вериф.'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
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
});

