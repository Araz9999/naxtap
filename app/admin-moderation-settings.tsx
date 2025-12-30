import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguageStore } from '@/store/languageStore';
import { useThemeStore } from '@/store/themeStore';
import { useUserStore } from '@/store/userStore';
import { getColors } from '@/constants/colors';
import { logger } from '@/utils/logger';

const STORAGE_KEY = 'moderation_settings_v1';

type SettingsState = {
  autoRefresh: boolean;
  showResolved: boolean;
  notifyOnNewReport: boolean;
};

const defaults: SettingsState = {
  autoRefresh: true,
  showResolved: true,
  notifyOnNewReport: true,
};

export default function AdminModerationSettingsScreen() {
  const { language } = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const { currentUser } = useUserStore();
  const colors = getColors(themeMode, colorTheme);

  const canAccess = currentUser?.role === 'admin' || currentUser?.role === 'moderator';
  const [state, setState] = useState<SettingsState>(defaults);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!canAccess) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setState({ ...defaults, ...parsed });
        }
      } catch (e) {
        logger.debug('[AdminModerationSettings] load failed', e);
      } finally {
        setLoaded(true);
      }
    })();
  }, [canAccess]);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        logger.debug('[AdminModerationSettings] save failed', e);
      }
    })();
  }, [state, loaded]);

  if (!canAccess) return null;

  const Row = ({ title, subtitle, value, onValueChange }: any) => (
    <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.rowSub, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: language === 'az' ? 'Moderasiya tənzimləmələri' : 'Настройки модерации',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        <Row
          title={language === 'az' ? 'Avto yenilə' : 'Автообновление'}
          subtitle={language === 'az' ? 'Panel məlumatları avtomatik yenilənsin' : 'Автоматически обновлять данные панели'}
          value={state.autoRefresh}
          onValueChange={(v: boolean) => setState((s) => ({ ...s, autoRefresh: v }))}
        />
        <Row
          title={language === 'az' ? 'Həll edilənləri göstər' : 'Показывать решенные'}
          subtitle={language === 'az' ? 'Siyahıda həll edilmiş şikayətlər də görünsün' : 'Показывать решенные жалобы в списке'}
          value={state.showResolved}
          onValueChange={(v: boolean) => setState((s) => ({ ...s, showResolved: v }))}
        />
        <Row
          title={language === 'az' ? 'Yeni şikayət bildirişi' : 'Уведомление о новых жалобах'}
          subtitle={language === 'az' ? 'Yeni şikayət gələndə bildiriş ver' : 'Уведомлять при новых жалобах'}
          value={state.notifyOnNewReport}
          onValueChange={(v: boolean) => setState((s) => ({ ...s, notifyOnNewReport: v }))}
        />

        <View style={[styles.note, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>
            {language === 'az'
              ? 'Qeyd: Bu tənzimləmələr hazırda cihazda saxlanır (lokal).'
              : 'Примечание: Эти настройки пока сохраняются локально на устройстве.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingTop: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  rowTitle: { fontSize: 16, fontWeight: '800' },
  rowSub: { marginTop: 4, fontSize: 12, lineHeight: 16 },
  note: { padding: 14, borderRadius: 14, borderWidth: 1, marginTop: 6 },
  noteText: { fontSize: 12, lineHeight: 16 },
});

