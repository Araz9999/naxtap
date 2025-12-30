import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Plus, Edit3, Trash2 } from 'lucide-react-native';
import { useDiscountStore } from '@/store/discountStore';
import { useStoreStore } from '@/store/storeStore';
import { useUserStore } from '@/store/userStore';
import { Discount, Campaign } from '@/types/discount';

export default function StorePromotionScreen() {
  const router = useRouter();
  const { getStoreDiscounts, getStoreCampaigns, toggleDiscountStatus, toggleCampaignStatus, deleteDiscount, deleteCampaign } = useDiscountStore();
  const { getActiveStoreForUser } = useStoreStore();
  const { currentUser } = useUserStore();

  const currentStore = currentUser ? getActiveStoreForUser(currentUser.id) : null;
  const [activeTab, setActiveTab] = useState<'discounts' | 'campaigns'>('discounts');

  if (!currentStore) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Mağaza Təşviqi' }} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Mağaza seçilməyib</Text>
        </View>
      </SafeAreaView>
    );
  }

  const discounts = getStoreDiscounts(currentStore.id);
  const campaigns = getStoreCampaigns(currentStore.id);

  const handleDeleteDiscount = (id: string) => {
    Alert.alert(
      'Endirimi Sil',
      'Bu endirimi silmək istədiyinizə əminsiniz?',
      [
        { text: 'Ləğv et', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => deleteDiscount(id) },
      ],
    );
  };

  const handleDeleteCampaign = (id: string) => {
    Alert.alert(
      'Kampaniyanı Sil',
      'Bu kampaniyanı silmək istədiyinizə əminsiniz?',
      [
        { text: 'Ləğv et', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => deleteCampaign(id) },
      ],
    );
  };

  const renderDiscountCard = (discount: Discount) => (
    <View key={discount.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{discount.title}</Text>
          <View style={[styles.statusBadge, discount.isActive ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={[styles.statusText, discount.isActive ? styles.activeText : styles.inactiveText]}>
              {discount.isActive ? 'Aktiv' : 'Deaktiv'}
            </Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <Switch
            value={discount.isActive}
            onValueChange={() => toggleDiscountStatus(discount.id)}
            trackColor={{ false: '#E5E7EB', true: '#10B981' }}
            thumbColor={discount.isActive ? '#FFFFFF' : '#9CA3AF'}
          />
        </View>
      </View>

      <Text style={styles.cardDescription}>{discount.description}</Text>

      <View style={styles.discountInfo}>
        <Text style={styles.discountValue}>
          {discount.type === 'percentage'
            ? `${discount.value}% endirim`
            : discount.type === 'fixed_amount'
              ? `${discount.value} AZN endirim`
              : `${discount.value} al, 1 pulsuz`
          }
        </Text>
        <Text style={styles.discountDates}>
          {new Date(discount.startDate).toLocaleDateString()} - {new Date(discount.endDate).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/store/discount/edit/${discount.id}`)}
        >
          <Edit3 size={16} color="#6B7280" />
          <Text style={styles.actionButtonText}>Redaktə et</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteDiscount(discount.id)}
        >
          <Trash2 size={16} color="#EF4444" />
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Sil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCampaignCard = (campaign: Campaign) => (
    <View key={campaign.id} style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardTitle}>{campaign.title}</Text>
          <View style={[styles.statusBadge, campaign.isActive ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={[styles.statusText, campaign.isActive ? styles.activeText : styles.inactiveText]}>
              {campaign.isActive ? 'Aktiv' : 'Deaktiv'}
            </Text>
          </View>
        </View>
        <View style={styles.cardActions}>
          <Switch
            value={campaign.isActive}
            onValueChange={() => toggleCampaignStatus(campaign.id)}
            trackColor={{ false: '#E5E7EB', true: '#10B981' }}
            thumbColor={campaign.isActive ? '#FFFFFF' : '#9CA3AF'}
          />
        </View>
      </View>

      <Text style={styles.cardDescription}>{campaign.description}</Text>

      <View style={styles.campaignInfo}>
        <Text style={styles.campaignType}>
          {campaign.type === 'flash_sale' ? 'Sürətli Satış' :
            campaign.type === 'seasonal' ? 'Mövsümi' :
              campaign.type === 'clearance' ? 'Təmizlik' :
                campaign.type === 'bundle' ? 'Paket' : 'Sadiqlik'}
        </Text>
        <Text style={styles.campaignDates}>
          {new Date(campaign.startDate).toLocaleDateString()} - {new Date(campaign.endDate).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.analyticsRow}>
        <View style={styles.analyticsItem}>
          <Text style={styles.analyticsValue}>{campaign.analytics.views}</Text>
          <Text style={styles.analyticsLabel}>Baxış</Text>
        </View>
        <View style={styles.analyticsItem}>
          <Text style={styles.analyticsValue}>{campaign.analytics.clicks}</Text>
          <Text style={styles.analyticsLabel}>Klik</Text>
        </View>
        <View style={styles.analyticsItem}>
          <Text style={styles.analyticsValue}>{campaign.analytics.conversions}</Text>
          <Text style={styles.analyticsLabel}>Konversiya</Text>
        </View>
        <View style={styles.analyticsItem}>
          <Text style={styles.analyticsValue}>{campaign.analytics.revenue} AZN</Text>
          <Text style={styles.analyticsLabel}>Gəlir</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push(`/store/campaign/edit/${campaign.id}`)}
        >
          <Edit3 size={16} color="#6B7280" />
          <Text style={styles.actionButtonText}>Redaktə et</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteCampaign(campaign.id)}
        >
          <Trash2 size={16} color="#EF4444" />
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Sil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Mağaza Təşviqi',
          headerRight: () => (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push(activeTab === 'discounts' ? '/store/discount/create' : '/store/campaign/create')}
            >
              <Plus size={24} color="#007AFF" />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'discounts' && styles.activeTab]}
          onPress={() => setActiveTab('discounts')}
        >
          <Text style={[styles.tabText, activeTab === 'discounts' && styles.activeTabText]}>
            Endirimlər ({discounts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'campaigns' && styles.activeTab]}
          onPress={() => setActiveTab('campaigns')}
        >
          <Text style={[styles.tabText, activeTab === 'campaigns' && styles.activeTabText]}>
            Kampaniyalar ({campaigns.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'discounts' ? (
          discounts.length > 0 ? (
            discounts.map(renderDiscountCard)
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Hələ endirim yaratmamısınız</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push('/store/discount/create')}
              >
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.createButtonText}>İlk Endirimi Yaradın</Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          campaigns.length > 0 ? (
            campaigns.map(renderCampaignCard)
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Hələ kampaniya yaratmamısınız</Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push('/store/campaign/create')}
              >
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.createButtonText}>İlk Kampaniyanı Yaradın</Text>
              </TouchableOpacity>
            </View>
          )
        )}
      </ScrollView>
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
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeText: {
    color: '#065F46',
  },
  inactiveText: {
    color: '#991B1B',
  },
  cardActions: {
    alignItems: 'center',
  },
  discountInfo: {
    marginBottom: 12,
  },
  discountValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 4,
  },
  discountDates: {
    fontSize: 12,
    color: '#6B7280',
  },
  campaignInfo: {
    marginBottom: 12,
  },
  campaignType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#7C3AED',
    marginBottom: 4,
  },
  campaignDates: {
    fontSize: 12,
    color: '#6B7280',
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  analyticsItem: {
    alignItems: 'center',
  },
  analyticsValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  analyticsLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 4,
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  deleteButtonText: {
    color: '#EF4444',
  },
  addButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
