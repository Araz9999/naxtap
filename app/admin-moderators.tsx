import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useThemeStore } from '@/store/themeStore';
import { useUserStore } from '@/store/userStore';
import { getColors } from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { logger } from '@/utils/logger';
import { RefreshCw, Shield, UserCheck } from 'lucide-react-native';

export default function AdminModeratorsScreen() {
  const { language } = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const { currentUser } = useUserStore();
  const colors = getColors(themeMode, colorTheme);

  const canAccess = currentUser?.role === 'admin';

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
      Alert.alert(language === 'az' ? 'Xəta' : 'Ошибка', language === 'az' ? 'Yenilənmə alınmadı.' : 'Не удалось обновить.');
    },
  });

  if (!canAccess) return null;

  const moderators = (moderatorsQuery.data as any[]) || [];

  const roleTitle = (r: string) => {
    if (language === 'az') return r === 'ADMIN' ? 'Admin' : 'Moderator';
    return r === 'ADMIN' ? 'Админ' : 'Модератор';
  };

  const roleColor = (r: string) => (r === 'ADMIN' ? '#F59E0B' : '#10B981');

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
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {language === 'az'
            ? 'Moderator və adminləri idarə edin (rol dəyişimi).'
            : 'Управление модераторами и админами (смена роли).'}
        </Text>
        <TouchableOpacity
          style={[styles.refreshBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => moderatorsQuery.refetch()}
        >
          <RefreshCw size={18} color={colors.text} />
        </TouchableOpacity>
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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {moderators.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
              <Text style={{ color: colors.textSecondary }}>
                {language === 'az' ? 'Moderator tapılmadı.' : 'Модераторы не найдены.'}
              </Text>
            </View>
          ) : (
            moderators.map((m: any) => {
              const c = roleColor(m.role);
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.85}
                  onPress={() => {
                    const title = m.name || m.email || (language === 'az' ? 'Moderator' : 'Модератор');
                    Alert.alert(
                      title,
                      `${language === 'az' ? 'Email' : 'Email'}: ${m.email || '-'}\n` +
                        `${language === 'az' ? 'Telefon' : 'Тел'}: ${m.phone || '-'}\n` +
                        `${language === 'az' ? 'Rol' : 'Роль'}: ${roleTitle(m.role)}`,
                      [
                        {
                          text: m.role === 'ADMIN' ? (language === 'az' ? 'Moderator et' : 'Сделать модератором') : (language === 'az' ? 'Admin et' : 'Сделать админом'),
                          onPress: () =>
                            updateUser.mutate({ userId: m.id, role: m.role === 'ADMIN' ? 'MODERATOR' : 'ADMIN' } as any),
                        },
                        { text: language === 'az' ? 'Bağla' : 'Закрыть', style: 'cancel' },
                      ]
                    );
                  }}
                >
                  <View style={styles.row}>
                    <View style={styles.left}>
                      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                        {m.name || m.email || '-'}
                      </Text>
                      <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
                        {m.email || '-'}
                      </Text>
                    </View>
                    <View style={[styles.rolePill, { backgroundColor: `${c}20` }]}>
                      {m.role === 'ADMIN' ? <Shield size={12} color={c} /> : <UserCheck size={12} color={c} />}
                      <Text style={{ color: c, fontWeight: '800', fontSize: 11, marginLeft: 6 }}>
                        {roleTitle(m.role)}
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
  header: {
    padding: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
  list: { paddingHorizontal: 16, paddingTop: 8 },
  emptyCard: { padding: 16, borderRadius: 12, alignItems: 'center' },
  card: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  left: { flex: 1 },
  name: { fontSize: 16, fontWeight: '800' },
  meta: { marginTop: 4, fontSize: 13 },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
});

