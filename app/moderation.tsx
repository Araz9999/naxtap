import React, { useEffect } from 'react';
import { logger } from '@/utils/logger';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useThemeStore } from '@/store/themeStore';
import { useUserStore } from '@/store/userStore';
import { useModerationStore } from '@/store/moderationStore';
import { getColors } from '@/constants/colors';
import { trpc } from '@/lib/trpc';
import { 
  Shield, 
  Users, 
  BarChart3, 
  Settings,
  ChevronRight,
  Clock,
  CheckCircle,
  UserCheck,
  Flag,
  HelpCircle
} from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function ModerationScreen() {
  const router = useRouter();
  const { language } = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const { currentUser } = useUserStore();
  const { 
    moderators, 
    stats,
    getReportsByStatus,
    getTicketsByStatus
  } = useModerationStore();

  const colors = getColors(themeMode, colorTheme);

  // Check if user has moderation permissions (must be defined before useQuery hooks)
  const canAccessModeration = currentUser?.role === 'admin' || currentUser?.role === 'moderator';

  // ✅ Fetch data from backend using tRPC
  const { data: backendStats, isLoading: statsLoading, error: statsError } = trpc.moderation.getStats.useQuery(undefined, {
    enabled: canAccessModeration,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: false, // Don't retry on auth errors
  });

  const { data: allReports, isLoading: reportsLoading, error: reportsError } = trpc.moderation.getReports.useQuery(undefined, {
    enabled: canAccessModeration,
    refetchInterval: 30000,
    retry: false, // Don't retry on auth errors
  });

  // ✅ Fetch moderators from backend (admin only)
  const { data: backendModerators, isLoading: moderatorsLoading } = trpc.admin.getModerators.useQuery(undefined, {
    enabled: canAccessModeration && currentUser?.role === 'admin',
    refetchInterval: 60000, // Refetch every minute
    retry: false,
  });

  // ✅ Use backend data if available, fallback to local store
  const actualStats = backendStats || stats;
  const actualReports = allReports || getReportsByStatus('pending');
  const actualModerators = backendModerators || moderators || [];
  
  const isLoading = statsLoading || reportsLoading || moderatorsLoading;
  const hasError = statsError || reportsError;
  
  // Log errors for debugging
  useEffect(() => {
    if (statsError) {
      logger.error('[Moderation] Error fetching stats:', statsError);
    }
    if (reportsError) {
      logger.error('[Moderation] Error fetching reports:', reportsError);
    }
  }, [statsError, reportsError]);
  
  // ✅ Get moderator permissions
  const hasPermission = (permission: string) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true; // Admin has all permissions
    if (currentUser.role === 'moderator' && currentUser.moderatorInfo) {
      return currentUser.moderatorInfo.permissions.includes(permission as any);
    }
    return false;
  };
  
  const canManageReports = hasPermission('manage_reports');
  const canManageTickets = hasPermission('manage_tickets');
  const canManageUsers = hasPermission('manage_users');
  const canManageModerators = hasPermission('manage_moderators');
  const canViewAnalytics = hasPermission('view_analytics');

  useEffect(() => {
    if (!canAccessModeration) {
      Alert.alert(
        language === 'az' ? 'Giriş rədd edildi' : 'Доступ запрещен',
        language === 'az' ? 'Bu bölməyə giriş icazəniz yoxdur' : 'У вас нет доступа к этому разделу',
        [
          {
            text: language === 'az' ? 'Geri' : 'Назад',
            onPress: () => router.back(),
          },
        ]
      );
    }
  }, [canAccessModeration, language, router]);

  if (!canAccessModeration) {
    return null;
  }

  // ✅ Get reports by status from backend data
  const pendingReports = actualReports?.filter((r: any) => r.status === 'pending') || [];
  const resolvedReports = actualReports?.filter((r: any) => r.status === 'resolved') || [];
  const openTickets = getTicketsByStatus('open'); // Still using local store for tickets
  const inProgressTickets = getTicketsByStatus('in_progress');

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color, 
    onPress 
  }: {
    title: string;
    value: number;
    icon: React.ComponentType<{size: number; color: string}>; // ✅ Proper type
    color: string;
    onPress?: () => void;
  }) => (
    <TouchableOpacity 
      style={[styles.statCard, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.statIconContainer, { backgroundColor: `${color}20` }]}>
        <Icon size={24} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.textSecondary }]}>{title}</Text>
    </TouchableOpacity>
  );

  const MenuCard = ({ 
    title, 
    subtitle, 
    icon: Icon, 
    onPress,
    badge,
    color = colors.primary
  }: {
    title: string;
    subtitle: string;
    icon: React.ComponentType<{size: number; color: string}>; // ✅ Proper type
    onPress: () => void;
    badge?: number;
    color?: string;
  }) => (
    <TouchableOpacity 
      style={[styles.menuCard, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconContainer, { backgroundColor: `${color}20` }]}>
        <Icon size={24} color={color} />
        {badge && badge > 0 && (
          <View style={[styles.badge, { backgroundColor: '#FF6B6B' }]}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <View style={styles.menuContent}>
        <Text style={[styles.menuTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>
      <ChevronRight size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  const showComingSoon = (feature: string) => {
    const message = language === 'az' 
      ? 'Bu funksiya tezliklə əlavə ediləcək' 
      : 'Эта функция скоро будет добавлена';
    
    // Use web-compatible alert
    if (typeof window !== 'undefined') {
      window.alert(`${feature}\n\n${message}`);
    } else {
      Alert.alert(feature, message);
    }
    
    // Also log for debugging
    logger.info('[Moderation] Coming soon feature clicked:', feature);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen 
        options={{ 
          title: language === 'az' ? 'Moderasiya' : 'Модерация',
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.text,
        }} 
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={styles.headerContent}>
            <Shield size={32} color="#fff" />
            <Text style={styles.headerTitle}>
              {language === 'az' ? 'Moderasiya Paneli' : 'Панель модерации'}
            </Text>
            <Text style={styles.headerSubtitle}>
              {language === 'az' 
                ? 'Tətbiqi təhlükəsiz saxlayın' 
                : 'Обеспечьте безопасность приложения'
              }
            </Text>
          </View>
        </View>

        {/* Statistics */}
        <View style={styles.statsContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {language === 'az' ? 'Statistika' : 'Статистика'}
          </Text>
          {hasError ? (
            <View style={[styles.errorContainer, { backgroundColor: `${colors.error || '#EF4444'}15` }]}>
              <Text style={[styles.errorText, { color: colors.error || '#EF4444' }]}>
                {language === 'az' 
                  ? 'Məlumat yüklənərkən xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.' 
                  : 'Произошла ошибка при загрузке данных. Пожалуйста, попробуйте еще раз.'}
              </Text>
            </View>
          ) : isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                {language === 'az' ? 'Yüklənir...' : 'Загрузка...'}
              </Text>
            </View>
          ) : (
          <View style={styles.statsGrid}>
            <StatCard
              title={language === 'az' ? 'Gözləyən şikayətlər' : 'Ожидающие жалобы'}
              value={pendingReports?.length || 0}
              icon={Clock}
              color="#F59E0B"
              onPress={() => showComingSoon(language === 'az' ? 'Şikayətlər' : 'Жалобы')}
            />
            <StatCard
              title={language === 'az' ? 'Açıq biletlər' : 'Открытые тикеты'}
              value={(openTickets?.length || 0) + (inProgressTickets?.length || 0)}
              icon={HelpCircle}
              color="#3B82F6"
              onPress={() => showComingSoon(language === 'az' ? 'Dəstək biletləri' : 'Тикеты поддержки')}
            />
            <StatCard
              title={language === 'az' ? 'Moderatorlar' : 'Модераторы'}
              value={actualModerators?.length || 0} 
              icon={UserCheck}
              color="#10B981"
              onPress={() => showComingSoon(language === 'az' ? 'Moderatorlar' : 'Модераторы')}
            />
            <StatCard
              title={language === 'az' ? 'Həll edilmiş' : 'Решенные'}
              value={resolvedReports?.length || actualStats?.resolvedReports || 0}
              icon={CheckCircle}
              color="#059669"
            />
          </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {language === 'az' ? 'Sürətli əməliyyatlar' : 'Быстрые действия'}
          </Text>
          
          {/* ✅ Only show if user has manage_reports permission */}
          {canManageReports && (
            <MenuCard
              title={language === 'az' ? 'Şikayətləri idarə et' : 'Управление жалобами'}
              subtitle={language === 'az' 
                ? `${pendingReports?.length || 0} gözləyən şikayət` 
                : `${pendingReports?.length || 0} ожидающих жалоб`
              }
              icon={Flag}
              onPress={() => showComingSoon(language === 'az' ? 'Şikayətlər' : 'Жалобы')}
              badge={pendingReports?.length || 0}
              color="#EF4444"
            />
          )}

          {/* ✅ Only show if user has manage_tickets permission */}
          {canManageTickets && (
            <MenuCard
              title={language === 'az' ? 'Dəstək biletləri' : 'Тикеты поддержки'}
              subtitle={language === 'az' 
                ? `${(openTickets?.length || 0) + (inProgressTickets?.length || 0)} aktiv bilet` 
                : `${(openTickets?.length || 0) + (inProgressTickets?.length || 0)} активных тикетов`
              }
              icon={HelpCircle}
              onPress={() => showComingSoon(language === 'az' ? 'Dəstək biletləri' : 'Тикеты поддержки')}
              badge={(openTickets?.length || 0) + (inProgressTickets?.length || 0)}
              color="#3B82F6"
            />
          )}

          {/* ✅ Only show if user has manage_users permission */}
          {canManageUsers && (
            <MenuCard
              title={language === 'az' ? 'İstifadəçi idarəetməsi' : 'Управление пользователями'}
              subtitle={language === 'az' 
                ? 'İstifadəçiləri idarə edin və moderasiya edin' 
                : 'Управляйте и модерируйте пользователей'
              }
              icon={Users}
              onPress={() => showComingSoon(language === 'az' ? 'İstifadəçi idarəetməsi' : 'Управление пользователями')}
              color="#8B5CF6"
            />
          )}

          {/* ✅ Only show if user has manage_moderators permission */}
          {canManageModerators && (
            <MenuCard
              title={language === 'az' ? 'Moderator idarəetməsi' : 'Управление модераторами'}
              subtitle={language === 'az' 
                ? `${actualModerators?.length || 0} aktiv moderator` 
                : `${actualModerators?.length || 0} активных модераторов`
              }
              icon={UserCheck}
              onPress={() => showComingSoon(language === 'az' ? 'Moderator idarəetməsi' : 'Управление модераторами')}
              color="#10B981"
            />
          )}

          {/* ✅ Only show if user has view_analytics permission */}
          {canViewAnalytics && (
            <MenuCard
              title={language === 'az' ? 'Analitika və hesabatlar' : 'Аналитика и отчеты'}
              subtitle={language === 'az' 
                ? 'Moderasiya statistikası və hesabatlar' 
                : 'Статистика модерации и отчеты'
              }
              icon={BarChart3}
              onPress={() => showComingSoon(language === 'az' ? 'Analitika' : 'Аналитика')}
              color="#F59E0B"
            />
          )}

          {/* ✅ Settings always visible to all moderators */}
          <MenuCard
            title={language === 'az' ? 'Moderasiya tənzimləmələri' : 'Настройки модерации'}
            subtitle={language === 'az' 
              ? 'Avtomatik qaydalar və tənzimləmələr' 
              : 'Автоматические правила и настройки'
            }
            icon={Settings}
            onPress={() => showComingSoon(language === 'az' ? 'Moderasiya tənzimləmələri' : 'Настройки модерации')}
            color="#6B7280"
          />
          
          {/* ✅ Show warning if moderator has no permissions */}
          {currentUser?.role === 'moderator' && 
           !canManageReports && 
           !canManageTickets && 
           !canManageUsers && 
           !canManageModerators && 
           !canViewAnalytics && (
            <View style={[styles.warningCard, { backgroundColor: `${colors.error}20` }]}>
              <Text style={[styles.warningText, { color: colors.error }]}>
                {language === 'az' 
                  ? 'Sizin heç bir moderasiya icazəniz yoxdur. Admin ilə əlaqə saxlayın.' 
                  : 'У вас нет прав модерации. Обратитесь к администратору.'
                }
              </Text>
            </View>
          )}
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {language === 'az' ? 'Son fəaliyyət' : 'Последняя активность'}
          </Text>
          
          <View style={[styles.activityCard, { backgroundColor: colors.card }]}>
            <View style={styles.activityItem}>
              <View style={[styles.activityIcon, { backgroundColor: '#EF444420' }]}>
                <Flag size={16} color="#EF4444" />
              </View>
              <View style={styles.activityContent}>
                <Text style={[styles.activityTitle, { color: colors.text }]}>
                  {language === 'az' ? 'Yeni şikayət alındı' : 'Получена новая жалоба'}
                </Text>
                <Text style={[styles.activityTime, { color: colors.textSecondary }]}>
                  {language === 'az' ? '5 dəqiqə əvvəl' : '5 минут назад'}
                </Text>
              </View>
            </View>

            <View style={styles.activityItem}>
              <View style={[styles.activityIcon, { backgroundColor: '#10B98120' }]}>
                <CheckCircle size={16} color="#10B981" />
              </View>
              <View style={styles.activityContent}>
                <Text style={[styles.activityTitle, { color: colors.text }]}>
                  {language === 'az' ? 'Şikayət həll edildi' : 'Жалоба решена'}
                </Text>
                <Text style={[styles.activityTime, { color: colors.textSecondary }]}>
                  {language === 'az' ? '1 saat əvvəl' : '1 час назад'}
                </Text>
              </View>
            </View>

            <View style={styles.activityItem}>
              <View style={[styles.activityIcon, { backgroundColor: '#3B82F620' }]}>
                <HelpCircle size={16} color="#3B82F6" />
              </View>
              <View style={styles.activityContent}>
                <Text style={[styles.activityTitle, { color: colors.text }]}>
                  {language === 'az' ? 'Yeni dəstək bileti' : 'Новый тикет поддержки'}
                </Text>
                <Text style={[styles.activityTime, { color: colors.textSecondary }]}>
                  {language === 'az' ? '2 saat əvvəl' : '2 часа назад'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  statsContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 48) / 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 14,
  },
  activityCard: {
    borderRadius: 12,
    padding: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
  },
  bottomSpacing: {
    height: 40,
  },
  warningCard: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  warningText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    padding: 20,
    borderRadius: 12,
    marginVertical: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});