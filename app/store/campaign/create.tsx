import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Zap, Calendar, Target, Package, Heart } from 'lucide-react-native';
import { useDiscountStore } from '@/store/discountStore';
import { useStoreStore } from '@/store/storeStore';
import { useUserStore } from '@/store/userStore';
import { useListingStore } from '@/store/listingStore';

export default function CreateCampaignScreen() {
  const router = useRouter();
  const { addCampaign } = useDiscountStore();
  const { getActiveStoreForUser } = useStoreStore();
  const { currentUser } = useUserStore();
  const { listings } = useListingStore();

  const currentStore = currentUser ? getActiveStoreForUser(currentUser.id) : null;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'flash_sale' as 'flash_sale' | 'seasonal' | 'clearance' | 'bundle' | 'loyalty',
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    targetAudience: 'all' as 'all' | 'new_customers' | 'returning_customers',
    priority: 1,
    isActive: true,
  });

  const [selectedListings, setSelectedListings] = useState<string[]>([]);

  if (!currentStore) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Kampaniya Yarat' }} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Mağaza seçilməyib</Text>
        </View>
      </SafeAreaView>
    );
  }

  const storeListings = listings.filter(l => l.storeId === currentStore.id && !l.deletedAt);

  const handleSubmit = () => {
    // Validation: Title
    if (!formData.title.trim()) {
      Alert.alert('Xəta', 'Kampaniya başlığı daxil edin');
      return;
    }

    if (formData.title.trim().length < 3) {
      Alert.alert('Xəta', 'Kampaniya başlığı ən azı 3 simvol olmalıdır');
      return;
    }

    if (formData.title.trim().length > 100) {
      Alert.alert('Xəta', 'Kampaniya başlığı maksimum 100 simvol ola bilər');
      return;
    }

    // Validation: Description (optional but if provided)
    if (formData.description.trim() && formData.description.trim().length < 10) {
      Alert.alert('Xəta', 'Açıqlama ən azı 10 simvol olmalıdır');
      return;
    }

    // Validation: Listings
    if (selectedListings.length === 0) {
      Alert.alert('Xəta', 'Ən azı bir məhsul seçin');
      return;
    }

    // Validation: Date range
    if (formData.startDate >= formData.endDate) {
      Alert.alert('Xəta', 'Başlama tarixi bitmə tarixindən əvvəl olmalıdır');
      return;
    }

    // Validation: Priority
    if (formData.priority < 1 || formData.priority > 10) {
      Alert.alert('Xəta', 'Prioritet 1-10 arasında olmalıdır');
      return;
    }

    addCampaign({
      storeId: currentStore.id,
      title: formData.title.trim(),
      description: formData.description.trim(),
      type: formData.type,
      featuredListings: selectedListings,
      startDate: formData.startDate,
      endDate: formData.endDate,
      targetAudience: formData.targetAudience,
      priority: formData.priority,
      isActive: formData.isActive,
      analytics: {
        views: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
      },
    });

    Alert.alert('Uğurlu', 'Kampaniya yaradıldı', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const toggleListingSelection = (listingId: string) => {
    setSelectedListings(prev =>
      prev.includes(listingId)
        ? prev.filter(id => id !== listingId)
        : [...prev, listingId],
    );
  };

  const selectAllListings = () => {
    if (selectedListings.length === storeListings.length) {
      setSelectedListings([]);
    } else {
      setSelectedListings(storeListings.map(l => l.id));
    }
  };

  const getCampaignTypeIcon = (type: string) => {
    switch (type) {
      case 'flash_sale': return <Zap size={20} />;
      case 'seasonal': return <Calendar size={20} />;
      case 'clearance': return <Package size={20} />;
      case 'bundle': return <Package size={20} />;
      case 'loyalty': return <Heart size={20} />;
      default: return <Target size={20} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Kampaniya Yarat',
          headerRight: () => (
            <TouchableOpacity style={styles.saveButton} onPress={handleSubmit}>
              <Text style={styles.saveButtonText}>Yadda saxla</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Əsas Məlumatlar</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kampaniya Başlığı *</Text>
            <TextInput
              style={styles.input}
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
              placeholder="Məsələn: Yay Sürətli Satışı"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Açıqlama</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              placeholder="Kampaniya haqqında ətraflı məlumat"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kampaniya Növü</Text>

          <View style={styles.typeGrid}>
            {[
              { key: 'flash_sale', label: 'Sürətli Satış', icon: 'flash_sale' },
              { key: 'seasonal', label: 'Mövsümi', icon: 'seasonal' },
              { key: 'clearance', label: 'Təmizlik', icon: 'clearance' },
              { key: 'bundle', label: 'Paket', icon: 'bundle' },
              { key: 'loyalty', label: 'Sadiqlik', icon: 'loyalty' },
            ].map((type) => (
              <TouchableOpacity
                key={type.key}
                style={[styles.typeButton, formData.type === type.key && styles.activeTypeButton]}
                onPress={() => setFormData(prev => ({ ...prev, type: type.key as 'flash_sale' | 'seasonal' | 'clearance' | 'bundle' | 'loyalty' }))}
              >
                <View style={[styles.typeIcon, formData.type === type.key && styles.activeTypeIcon]}>
                  {React.cloneElement(getCampaignTypeIcon(type.icon), {
                    color: formData.type === type.key ? '#FFFFFF' : '#6B7280',
                  })}
                </View>
                <Text style={[styles.typeButtonText, formData.type === type.key && styles.activeTypeButtonText]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hədəf Auditoriya</Text>

          <View style={styles.audienceContainer}>
            {[
              { key: 'all', label: 'Bütün Müştərilər' },
              { key: 'new_customers', label: 'Yeni Müştərilər' },
              { key: 'returning_customers', label: 'Daimi Müştərilər' },
            ].map((audience) => (
              <TouchableOpacity
                key={audience.key}
                style={[styles.audienceButton, formData.targetAudience === audience.key && styles.activeAudienceButton]}
                onPress={() => setFormData(prev => ({ ...prev, targetAudience: audience.key as 'all' | 'new_customers' | 'returning_customers' }))}
              >
                <Text style={[styles.audienceButtonText, formData.targetAudience === audience.key && styles.activeAudienceButtonText]}>
                  {audience.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Seçilmiş Məhsullar</Text>

          <TouchableOpacity style={styles.selectAllButton} onPress={selectAllListings}>
            <Text style={styles.selectAllButtonText}>
              {selectedListings.length === storeListings.length ? 'Hamısını Ləğv et' : 'Hamısını Seç'}
            </Text>
          </TouchableOpacity>

          {storeListings.map((listing) => (
            <TouchableOpacity
              key={listing.id}
              style={[styles.listingItem, selectedListings.includes(listing.id) && styles.selectedListingItem]}
              onPress={() => toggleListingSelection(listing.id)}
            >
              <View style={styles.listingInfo}>
                <Text style={styles.listingTitle}>{typeof listing.title === 'string' ? listing.title : listing.title.az}</Text>
                <Text style={styles.listingPrice}>{listing.price} AZN</Text>
              </View>
              <View style={[styles.checkbox, selectedListings.includes(listing.id) && styles.checkedCheckbox]}>
                {selectedListings.includes(listing.id) && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Əlavə Parametrlər</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Prioritet (1-10)</Text>
            <TextInput
              style={styles.input}
              value={formData.priority.toString()}
              onChangeText={(text) => {
                const parsed = parseInt(text, 10);
                if (isNaN(parsed) || text === '') {
                  setFormData(prev => ({ ...prev, priority: 1 }));
                } else {
                  const clampedPriority = Math.min(10, Math.max(1, parsed));
                  setFormData(prev => ({ ...prev, priority: clampedPriority }));
                }
              }}
              placeholder="1"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
            />
            <Text style={styles.helperText}>Yüksək prioritet kampaniyalar daha çox göstərilir</Text>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Dərhal Aktivləşdir</Text>
            <Switch
              value={formData.isActive}
              onValueChange={(value) => setFormData(prev => ({ ...prev, isActive: value }))}
              trackColor={{ false: '#E5E7EB', true: '#10B981' }}
              thumbColor={formData.isActive ? '#FFFFFF' : '#9CA3AF'}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    padding: 16,
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
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  typeButton: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  activeTypeButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeIcon: {
    marginBottom: 8,
  },
  activeTypeIcon: {
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  activeTypeButtonText: {
    color: '#FFFFFF',
  },
  audienceContainer: {
    gap: 8,
    marginBottom: 16,
  },
  audienceButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  activeAudienceButton: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  audienceButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  activeAudienceButtonText: {
    color: '#FFFFFF',
  },
  selectAllButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  selectAllButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  listingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  selectedListingItem: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F9FF',
  },
  listingInfo: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 2,
  },
  listingPrice: {
    fontSize: 12,
    color: '#6B7280',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkedCheckbox: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
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
});
