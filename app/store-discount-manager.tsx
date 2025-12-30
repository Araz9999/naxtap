import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import {
  Percent,
  Zap,
  TrendingUp,
  Users,
  Eye,
  MousePointer,
  ShoppingCart,
  DollarSign,
  Calendar,
  Target,
} from 'lucide-react-native';
import CountdownTimer from '@/components/CountdownTimer';
import { useDiscountStore } from '@/store/discountStore';
import { useStoreStore } from '@/store/storeStore';
import { useUserStore } from '@/store/userStore';
import { useListingStore } from '@/store/listingStore';
import { logger } from '@/utils/logger';

export default function DiscountAnalyticsScreen() {
  const router = useRouter();
  const { getStoreDiscounts, getStoreCampaigns, getActiveDiscounts, getActiveCampaigns } = useDiscountStore();
  const { getActiveStoreForUser, applyDiscountToProduct, removeDiscountFromProduct, applyStoreWideDiscount, removeStoreWideDiscount } = useStoreStore();
  const { currentUser } = useUserStore();
  const { listings } = useListingStore();

  // ✅ Validate currentUser
  if (!currentUser) {
    logger.warn('[DiscountManager] No current user');
  }

  const currentStore = currentUser ? getActiveStoreForUser(currentUser.id) : null;
  const [selectedTab, setSelectedTab] = useState<'overview' | 'discounts' | 'campaigns' | 'quick-actions'>('overview');

  if (!currentStore) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Endirim və Kampaniya İdarəsi' }} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Mağaza seçilməyib</Text>
        </View>
      </SafeAreaView>
    );
  }

  const allDiscounts = getStoreDiscounts(currentStore.id);
  const allCampaigns = getStoreCampaigns(currentStore.id);
  const activeDiscounts = getActiveDiscounts(currentStore.id);
  const activeCampaigns = getActiveCampaigns(currentStore.id);
  const storeListings = listings.filter(l => l.storeId === currentStore.id && !l.deletedAt);

  const totalRevenue = activeCampaigns.reduce((sum, campaign) => sum + campaign.analytics.revenue, 0);
  const totalViews = activeCampaigns.reduce((sum, campaign) => sum + campaign.analytics.views, 0);
  const totalClicks = activeCampaigns.reduce((sum, campaign) => sum + campaign.analytics.clicks, 0);
  const totalConversions = activeCampaigns.reduce((sum, campaign) => sum + campaign.analytics.conversions, 0);

  const handleQuickDiscount = (percentage: number) => {
    // Validation: Percentage range
    if (percentage < 1 || percentage > 99) {
      Alert.alert('Xəta', 'Endirim faizi 1-99 arasında olmalıdır');
      return;
    }

    Alert.alert(
      'Sürətli Endirim',
      `Bütün məhsullara ${percentage}% endirim tətbiq etmək istəyirsiniz?`,
      [
        { text: 'Ləğv et', style: 'cancel' },
        {
          text: 'Tətbiq et',
          onPress: async () => {
            logger.info('[DiscountManager] Applying quick discount:', { storeId: currentStore.id, percentage });

            try {
              await applyStoreWideDiscount(currentStore.id, percentage);

              logger.info('[DiscountManager] Quick discount applied successfully');

              Alert.alert('Uğurlu', `${percentage}% endirim bütün məhsullara tətbiq edildi`);
            } catch (error) {
              logger.error('[DiscountManager] Error applying quick discount:', error);

              Alert.alert('Xəta', 'Endirim tətbiq edilərkən xəta baş verdi');
            }
          },
        },
      ],
    );
  };

  const handleRemoveAllDiscounts = () => {
    // ✅ Validate current store
    if (!currentStore) {
      logger.error('[DiscountManager] No current store for remove discounts');
      Alert.alert('Xəta', 'Mağaza seçilməyib');
      return;
    }

    Alert.alert(
      'Endirimi Ləğv et',
      'Bütün məhsullardan endirimi ləğv etmək istəyirsiniz?',
      [
        { text: 'Ləğv et', style: 'cancel' },
        {
          text: 'Ləğv et',
          style: 'destructive',
          onPress: async () => {
            logger.info('[DiscountManager] Removing all discounts:', currentStore.id);

            try {
              await removeStoreWideDiscount(currentStore.id);

              logger.info('[DiscountManager] All discounts removed successfully');

              Alert.alert('Uğurlu', 'Bütün endirimlər ləğv edildi');
            } catch (error) {
              logger.error('[DiscountManager] Error removing all discounts:', error);

              Alert.alert('Xəta', 'Endirimlər ləğv edilərkən xəta baş verdi');
            }
          },
        },
      ],
    );
  };

  const renderOverview = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Percent size={24} color="#059669" />
          </View>
          <Text style={styles.statValue}>{activeDiscounts.length}</Text>
          <Text style={styles.statLabel}>Aktiv Endirimlər</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <Zap size={24} color="#7C3AED" />
          </View>
          <Text style={styles.statValue}>{activeCampaigns.length}</Text>
          <Text style={styles.statLabel}>Aktiv Kampaniyalar</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <DollarSign size={24} color="#DC2626" />
          </View>
          <Text style={styles.statValue}>{totalRevenue.toFixed(0)} AZN</Text>
          <Text style={styles.statLabel}>Gəlir</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statIcon}>
            <TrendingUp size={24} color="#0891B2" />
          </View>
          <Text style={styles.statValue}>{totalConversions}</Text>
          <Text style={styles.statLabel}>Konversiyalar</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performans Məlumatları</Text>

        <View style={styles.performanceCard}>
          <View style={styles.performanceRow}>
            <View style={styles.performanceItem}>
              <Eye size={20} color="#6B7280" />
              <Text style={styles.performanceLabel}>Baxışlar</Text>
              <Text style={styles.performanceValue}>{totalViews.toLocaleString()}</Text>
            </View>

            <View style={styles.performanceItem}>
              <MousePointer size={20} color="#6B7280" />
              <Text style={styles.performanceLabel}>Kliklər</Text>
              <Text style={styles.performanceValue}>{totalClicks.toLocaleString()}</Text>
            </View>

            <View style={styles.performanceItem}>
              <ShoppingCart size={20} color="#6B7280" />
              <Text style={styles.performanceLabel}>Satışlar</Text>
              <Text style={styles.performanceValue}>{totalConversions}</Text>
            </View>
          </View>

          <View style={styles.conversionRate}>
            <Text style={styles.conversionLabel}>Konversiya Dərəcəsi</Text>
            <Text style={styles.conversionValue}>
              {/* ✅ Prevent division by zero */}
              {totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : '0.0'}%
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aktiv Endirimlər</Text>

        {activeDiscounts.slice(0, 3).map((discount) => (
          <View key={discount.id} style={styles.discountPreview}>
            <View style={styles.discountHeader}>
              <Text style={styles.discountTitle}>{discount.title}</Text>
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>
                  {discount.type === 'percentage' ? `${discount.value}%` :
                    discount.type === 'fixed_amount' ? `${discount.value} AZN` :
                      `${discount.value} Al`}
                </Text>
              </View>
            </View>

            {discount.hasCountdown && discount.countdownEndDate && (
              <CountdownTimer
                endDate={discount.countdownEndDate}
                title={discount.countdownTitle || discount.title}
                compact
                style={styles.discountTimer}
              />
            )}

            <View style={styles.discountStats}>
              <Text style={styles.discountStat}>{discount.usedCount}/{discount.usageLimit || '∞'} istifadə</Text>
              <Text style={styles.discountStat}>{discount.applicableListings.length} məhsul</Text>
              <Text style={styles.discountStat}>
                {new Date(discount.endDate).toLocaleDateString('az-AZ')}
              </Text>
            </View>
          </View>
        ))}

        {activeDiscounts.length === 0 && (
          <Text style={styles.emptyText}>Aktiv endirim yoxdur</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Son Kampaniyalar</Text>

        {activeCampaigns.slice(0, 3).map((campaign) => (
          <View key={campaign.id} style={styles.campaignPreview}>
            <View style={styles.campaignHeader}>
              <Text style={styles.campaignTitle}>{campaign.title}</Text>
              <View style={styles.campaignType}>
                <Text style={styles.campaignTypeText}>
                  {campaign.type === 'flash_sale' ? 'Sürətli Satış' :
                    campaign.type === 'seasonal' ? 'Mövsümi' :
                      campaign.type === 'clearance' ? 'Təmizlik' :
                        campaign.type === 'bundle' ? 'Paket' : 'Sadiqlik'}
                </Text>
              </View>
            </View>

            <View style={styles.campaignStats}>
              <Text style={styles.campaignStat}>{campaign.analytics.views} baxış</Text>
              <Text style={styles.campaignStat}>{campaign.analytics.clicks} klik</Text>
              <Text style={styles.campaignStat}>{campaign.analytics.revenue} AZN gəlir</Text>
            </View>
          </View>
        ))}

        {activeCampaigns.length === 0 && (
          <Text style={styles.emptyText}>Aktiv kampaniya yoxdur</Text>
        )}
      </View>
    </ScrollView>
  );

  const renderQuickActions = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sürətli Endirimlər</Text>
        <Text style={styles.sectionDescription}>
          Bütün məhsullara tez endirim tətbiq edin
        </Text>

        <View style={styles.quickActionGrid}>
          {[10, 15, 20, 25, 30, 50].map((percentage) => (
            <TouchableOpacity
              key={percentage}
              style={styles.quickActionButton}
              onPress={() => handleQuickDiscount(percentage)}
            >
              <Text style={styles.quickActionText}>{percentage}%</Text>
              <Text style={styles.quickActionLabel}>Endirim</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.removeDiscountButton}
          onPress={handleRemoveAllDiscounts}
        >
          <Text style={styles.removeDiscountText}>Bütün Endirimi Ləğv et</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kampaniya Şablonları</Text>
        <Text style={styles.sectionDescription}>
          Hazır şablonlarla tez kampaniya yaradın
        </Text>

        <View style={styles.templateGrid}>
          <TouchableOpacity
            style={styles.templateCard}
            onPress={() => router.push('/store/campaign/create')}
          >
            <Zap size={32} color="#EF4444" />
            <Text style={styles.templateTitle}>Sürətli Satış</Text>
            <Text style={styles.templateDescription}>24 saatlıq məhdud təklif</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.templateCard}
            onPress={() => router.push('/store/campaign/create')}
          >
            <Calendar size={32} color="#F59E0B" />
            <Text style={styles.templateTitle}>Mövsümi</Text>
            <Text style={styles.templateDescription}>Mövsüm sonu endirimi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.templateCard}
            onPress={() => router.push('/store/campaign/create')}
          >
            <Target size={32} color="#10B981" />
            <Text style={styles.templateTitle}>Hədəfli</Text>
            <Text style={styles.templateDescription}>Xüsusi müştəri qrupu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.templateCard}
            onPress={() => router.push('/store/campaign/create')}
          >
            <Users size={32} color="#8B5CF6" />
            <Text style={styles.templateTitle}>Sadiqlik</Text>
            <Text style={styles.templateDescription}>Daimi müştərilər üçün</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Endirim və Kampaniya İdarəsi',
          headerRight: () => (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/store-promotion')}
            >
              <Text style={styles.addButtonText}>İdarə et</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'overview' && styles.activeTab]}
          onPress={() => setSelectedTab('overview')}
        >
          <Text style={[styles.tabText, selectedTab === 'overview' && styles.activeTabText]}>
            Ümumi
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'quick-actions' && styles.activeTab]}
          onPress={() => setSelectedTab('quick-actions')}
        >
          <Text style={[styles.tabText, selectedTab === 'quick-actions' && styles.activeTabText]}>
            Sürətli
          </Text>
        </TouchableOpacity>
      </View>

      {selectedTab === 'overview' && renderOverview()}
      {selectedTab === 'quick-actions' && renderQuickActions()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#007AFF',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  performanceCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 16,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  performanceItem: {
    alignItems: 'center',
    flex: 1,
  },
  performanceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 2,
  },
  performanceValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  conversionRate: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  conversionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  conversionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  campaignPreview: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  campaignHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  campaignTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  campaignType: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  campaignTypeText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  campaignStats: {
    flexDirection: 'row',
    gap: 16,
  },
  campaignStat: {
    fontSize: 12,
    color: '#6B7280',
  },
  quickActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  quickActionButton: {
    width: '30%',
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  quickActionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  quickActionLabel: {
    fontSize: 12,
    color: '#FFFFFF',
  },
  removeDiscountButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  removeDiscountText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  templateCard: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  templateTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  templateDescription: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  discountPreview: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  discountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  discountTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  discountBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  discountTimer: {
    marginBottom: 8,
  },
  discountStats: {
    flexDirection: 'row',
    gap: 16,
  },
  discountStat: {
    fontSize: 12,
    color: '#6B7280',
  },
});
