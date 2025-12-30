import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useThemeStore } from '@/store/themeStore';
import { useUserStore } from '@/store/userStore';
import { useSupportStore } from '@/store/supportStore';
import { getColors } from '@/constants/colors';
import { Headphones, Clock, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react-native';

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
type StatusFilter = 'all' | TicketStatus;

export default function AdminTicketsScreen() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const { currentUser } = useUserStore();
  const colors = getColors(themeMode, colorTheme);

  const canAccess = currentUser?.role === 'admin' || currentUser?.role === 'moderator';
  const canManageTickets =
    currentUser?.role === 'admin' ||
    (currentUser?.role === 'moderator' && currentUser?.moderatorInfo?.permissions?.includes('manage_tickets' as any));

  const { tickets, updateTicketStatus } = useSupportStore();
  const [filter, setFilter] = useState<StatusFilter>('open');

  const filtered = useMemo(() => {
    if (filter === 'all') return tickets;
    return tickets.filter((t) => t.status === filter);
  }, [tickets, filter]);

  if (!canAccess) return null;

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

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            {filtered.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
                <Text style={{ color: colors.textSecondary }}>
                  {language === 'az' ? 'Bilet yoxdur.' : 'Тикетов нет.'}
                </Text>
              </View>
            ) : (
              filtered.map((t) => {
                const c = statusColor(t.status as TicketStatus);
                const Icon = t.status === 'open' ? Clock : t.status === 'in_progress' ? AlertCircle : CheckCircle;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
                    activeOpacity={0.85}
                    onPress={() => {
                      Alert.alert(
                        language === 'az' ? 'Bilet' : 'Тикет',
                        `${language === 'az' ? 'Mövzu' : 'Тема'}: ${t.subject}\n\n${t.message}\n\n${language === 'az' ? 'Status' : 'Статус'}: ${statusTitle(t.status as TicketStatus)}`,
                        [
                          { text: language === 'az' ? 'İcrada' : 'В работе', onPress: () => updateTicketStatus(t.id, 'in_progress') },
                          { text: language === 'az' ? 'Həll' : 'Решен', onPress: () => updateTicketStatus(t.id, 'resolved') },
                          { text: language === 'az' ? 'Bağla' : 'Закрыть', style: 'destructive', onPress: () => updateTicketStatus(t.id, 'closed') },
                          { text: language === 'az' ? 'Bağla (pəncərə)' : 'Закрыть (окно)', style: 'cancel' },
                        ]
                      );
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
  list: { paddingHorizontal: 16, paddingTop: 8 },
  emptyCard: { padding: 16, borderRadius: 12, alignItems: 'center' },
  card: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  left: { flex: 1 },
  subject: { fontSize: 16, fontWeight: '800' },
  preview: { marginTop: 6, fontSize: 13, lineHeight: 18 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 999 },
});

