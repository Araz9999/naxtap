import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useThemeStore } from '@/store/themeStore';
import { useUserStore } from '@/store/userStore';
import { getColors } from '@/constants/colors';
import { useModerationSettingsStore } from '@/store/moderationSettingsStore';
import Toast from '@/components/Toast';

export default function AdminModerationSettingsScreen() {
  const { language } = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const { currentUser } = useUserStore();
  const colors = getColors(themeMode, colorTheme);

  const canAccess = currentUser?.role === 'admin' || currentUser?.role === 'moderator';
  const { settings, setSettings, reset } = useModerationSettingsStore();
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

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

  const Chip = ({ title, active, onPress }: { title: string; active: boolean; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.primary : colors.card,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '800', fontSize: 12 }}>{title}</Text>
    </TouchableOpacity>
  );

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
  };

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
          value={settings.autoRefresh}
          onValueChange={(v: boolean) => {
            setSettings({ autoRefresh: v });
            showToast(language === 'az' ? 'Yadda saxlanıldı' : 'Сохранено');
          }}
        />

        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.groupTitle, { color: colors.text }]}>
            {language === 'az' ? 'Yeniləmə intervalı' : 'Интервал обновления'}
          </Text>
          <Text style={[styles.groupSub, { color: colors.textSecondary }]}>
            {language === 'az' ? 'Auto yenilə aktivdirsə, nə qədər tez-tez yenilənsin' : 'Если автообновление включено — как часто обновлять'}
          </Text>
          <View style={styles.chipsRow}>
            <Chip
              title={language === 'az' ? '15 san' : '15 сек'}
              active={settings.autoRefreshIntervalSec === 15}
              onPress={() => {
                setSettings({ autoRefreshIntervalSec: 15 });
                showToast(language === 'az' ? 'Yadda saxlanıldı' : 'Сохранено');
              }}
            />
            <Chip
              title={language === 'az' ? '30 san' : '30 сек'}
              active={settings.autoRefreshIntervalSec === 30}
              onPress={() => {
                setSettings({ autoRefreshIntervalSec: 30 });
                showToast(language === 'az' ? 'Yadda saxlanıldı' : 'Сохранено');
              }}
            />
            <Chip
              title={language === 'az' ? '60 san' : '60 сек'}
              active={settings.autoRefreshIntervalSec === 60}
              onPress={() => {
                setSettings({ autoRefreshIntervalSec: 60 });
                showToast(language === 'az' ? 'Yadda saxlanıldı' : 'Сохранено');
              }}
            />
          </View>
        </View>

        <Row
          title={language === 'az' ? 'Həll edilmiş şikayətlər' : 'Решенные жалобы'}
          subtitle={language === 'az' ? 'Şikayət siyahısında “Həll edilib” statusunu göstər' : 'Показывать статус “Решено” в списке жалоб'}
          value={settings.showResolvedReports}
          onValueChange={(v: boolean) => {
            setSettings({ showResolvedReports: v });
            showToast(language === 'az' ? 'Yadda saxlanıldı' : 'Сохранено');
          }}
        />
        <Row
          title={language === 'az' ? 'Rədd edilmiş şikayətlər' : 'Отклоненные жалобы'}
          subtitle={language === 'az' ? 'Şikayət siyahısında “Rədd edilib” statusunu göstər' : 'Показывать статус “Отклонено” в списке жалоб'}
          value={settings.showDismissedReports}
          onValueChange={(v: boolean) => {
            setSettings({ showDismissedReports: v });
            showToast(language === 'az' ? 'Yadda saxlanıldı' : 'Сохранено');
          }}
        />
        <Row
          title={language === 'az' ? 'Yeni şikayət bildirişi' : 'Уведомление о новых жалобах'}
          subtitle={language === 'az' ? 'Yeni şikayət gələndə bildiriş ver' : 'Уведомлять при новых жалобах'}
          value={settings.notifyOnNewReport}
          onValueChange={(v: boolean) => {
            setSettings({ notifyOnNewReport: v });
            showToast(language === 'az' ? 'Yadda saxlanıldı' : 'Сохранено');
          }}
        />

        <TouchableOpacity
          style={[styles.resetBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            reset();
            showToast(language === 'az' ? 'Standart tənzimləmələr bərpa olundu' : 'Настройки сброшены');
          }}
        >
          <Text style={{ color: colors.text, fontWeight: '900' }}>
            {language === 'az' ? 'Standarta qaytar' : 'Сбросить'}
          </Text>
        </TouchableOpacity>

        <View style={[styles.note, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.noteText, { color: colors.textSecondary }]}>
            {language === 'az'
              ? 'Qeyd: Bu tənzimləmələr moderasiya ekranlarında real-time tətbiq olunur.'
              : 'Примечание: Эти настройки применяются в экранах модерации в реальном времени.'}
          </Text>
        </View>
      </ScrollView>

      <Toast
        type="success"
        message={toastMsg}
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
      />
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
  group: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  groupTitle: { fontSize: 14, fontWeight: '900' },
  groupSub: { marginTop: 4, fontSize: 12, lineHeight: 16 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  resetBtn: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 6,
  },
});

