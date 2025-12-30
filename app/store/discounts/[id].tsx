import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Switch,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useLanguageStore } from '@/store/languageStore';
import { useStoreStore } from '@/store/storeStore';
import { useListingStore } from '@/store/listingStore';
import { useUserStore } from '@/store/userStore';
import Colors from '@/constants/colors';
import { logger } from '@/utils/logger';
import {
  ArrowLeft,
  Percent,
  Package,
  Tag,
  Trash2,
  Plus,
  Eye,
  Edit3,
  Save,
  X,
} from 'lucide-react-native';

export default function StoreDiscountsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { language } = useLanguageStore();
  const {
    stores,
    applyDiscountToProduct,
    removeDiscountFromProduct,
    applyStoreWideDiscount,
    removeStoreWideDiscount,
  } = useStoreStore();
  const { listings } = useListingStore();
  const { currentUser } = useUserStore();

  const store = stores.find(s => s.id === id);
  const storeListings = listings.filter(l =>
    l.storeId === id &&
    !l.deletedAt &&
    !store?.deletedListings.includes(l.id),
  );

  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showStoreWideModal, setShowStoreWideModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const [discountPercentage, setDiscountPercentage] = useState('');
  const [storeWideDiscount, setStoreWideDiscount] = useState('');
  const [excludeListings, setExcludeListings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Helper: Validate discount percentage (removed duplicate)
  const validateDiscountPercentage = (value: string): number | null => {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Endirim faizini daxil edin' : 'Введите процент скидки',
      );
      return null;
    }

    const discount = parseFloat(value.trim());

    if (isNaN(discount) || !isFinite(discount)) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Düzgün endirim faizi daxil edin' : 'Введите корректный процент',
      );
      return null;
    }

    if (discount < 1 || discount > 99) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Endirim faizi 1-99 arasında olmalıdır' : 'Процент скидки должен быть от 1 до 99',
      );
      return null;
    }

    return discount;
  };

  const handleApplyDiscount = async () => {
    if (!selectedListing || !store) return;

    const discount = validateDiscountPercentage(discountPercentage);
    if (discount === null) return;

    const listing = storeListings.find(l => l.id === selectedListing);
    if (!listing) {
      logger.error('[StoreDiscounts] Listing not found:', selectedListing);
      return;
    }

    // ✅ Validate listing type
    if (listing.priceByAgreement) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Razılaşma ilə qiymətli məhsullara endirim tətbiq edilə bilməz' : 'Нельзя применить скидку к товарам с ценой по договоренности',
      );
      logger.warn('[StoreDiscounts] Cannot apply discount to priceByAgreement listing:', selectedListing);
      return;
    }

    Alert.alert(
      language === 'az' ? 'Endirim tətbiq edilsin?' : 'Применить скидку?',
      language === 'az'
        ? `${listing.title[language]} məhsuluna ${discount}% endirim tətbiq edilsin?`
        : `Применить скидку ${discount}% к товару ${listing.title[language]}?`,
      [
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
        },
        {
          text: language === 'az' ? 'Tətbiq et' : 'Применить',
          onPress: async () => {
            setIsLoading(true);
            logger.info('[StoreDiscounts] Applying discount to product:', { storeId: store.id, listingId: selectedListing, discount });

            try {
              await applyDiscountToProduct(store.id, selectedListing, discount);

              logger.info('[StoreDiscounts] Discount applied successfully');

              Alert.alert(
                language === 'az' ? 'Uğurlu!' : 'Успешно!',
                language === 'az' ? 'Endirim tətbiq edildi' : 'Скидка применена',
              );
              setShowDiscountModal(false);
              setSelectedListing(null);
              setDiscountPercentage('');
            } catch (error) {
              logger.error('[StoreDiscounts] Error applying discount:', error);

              Alert.alert(
                language === 'az' ? 'Xəta' : 'Ошибка',
                language === 'az' ? 'Endirim tətbiq edilərkən xəta baş verdi' : 'Ошибка при применении скидки',
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleRemoveDiscount = async (listingId: string) => {
    if (!store) {
      logger.error('[StoreDiscounts] Store not found for removeDiscount');
      return;
    }

    if (!listingId) {
      logger.error('[StoreDiscounts] Invalid listingId for removeDiscount');
      return;
    }

    Alert.alert(
      language === 'az' ? 'Endirimi sil' : 'Удалить скидку',
      language === 'az' ? 'Bu məhsuldan endirimi silmək istəyirsiniz?' : 'Хотите удалить скидку с этого товара?',
      [
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
        },
        {
          text: language === 'az' ? 'Sil' : 'Удалить',
          style: 'destructive',
          onPress: async () => {
            logger.info('[StoreDiscounts] Removing discount from product:', { storeId: store.id, listingId });

            try {
              await removeDiscountFromProduct(store.id, listingId);

              logger.info('[StoreDiscounts] Discount removed successfully');

              Alert.alert(
                language === 'az' ? 'Uğurlu!' : 'Успешно!',
                language === 'az' ? 'Endirim silindi' : 'Скидка удалена',
              );
            } catch (error) {
              logger.error('[StoreDiscounts] Error removing discount:', error);

              Alert.alert(
                language === 'az' ? 'Xəta' : 'Ошибка',
                language === 'az' ? 'Endirim silinərkən xəta baş verdi' : 'Ошибка при удалении скидки',
              );
            }
          },
        },
      ],
    );
  };

  const handleApplyStoreWideDiscount = async () => {
    if (!store) {
      logger.error('[StoreDiscounts] Store not found for storeWideDiscount');
      return;
    }

    const discount = validateDiscountPercentage(storeWideDiscount);
    if (discount === null) return;

    const applicableListings = storeListings.filter(l =>
      !excludeListings.includes(l.id) && !l.priceByAgreement,
    );

    if (applicableListings.length === 0) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Endirim tətbiq ediləcək məhsul yoxdur' : 'Нет товаров для применения скидки',
      );
      logger.warn('[StoreDiscounts] No applicable listings for store-wide discount');
      return;
    }

    Alert.alert(
      language === 'az' ? 'Mağaza endirimi tətbiq edilsin?' : 'Применить скидку по магазину?',
      language === 'az'
        ? `${applicableListings.length} məhsula ${discount}% endirim tətbiq edilsin?`
        : `Применить скидку ${discount}% к ${applicableListings.length} товарам?`,
      [
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
        },
        {
          text: language === 'az' ? 'Tətbiq et' : 'Применить',
          onPress: async () => {
            setIsLoading(true);
            logger.info('[StoreDiscounts] Applying store-wide discount:', { storeId: store.id, discount, excludeListings });

            try {
              await applyStoreWideDiscount(store.id, discount, excludeListings);

              logger.info('[StoreDiscounts] Store-wide discount applied successfully');

              Alert.alert(
                language === 'az' ? 'Uğurlu!' : 'Успешно!',
                language === 'az' ? 'Mağaza üzrə endirim tətbiq edildi' : 'Скидка по магазину применена',
              );
              setShowStoreWideModal(false);
              setStoreWideDiscount('');
              setExcludeListings([]);
            } catch (error) {
              logger.error('[StoreDiscounts] Error applying store-wide discount:', error);

              Alert.alert(
                language === 'az' ? 'Xəta' : 'Ошибка',
                language === 'az' ? 'Endirim tətbiq edilərkən xəta baş verdi' : 'Ошибка при применении скидки',
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleRemoveStoreWideDiscount = async () => {
    if (!store) {
      logger.error('[StoreDiscounts] Store not found for removeStoreWideDiscount');
      return;
    }

    Alert.alert(
      language === 'az' ? 'Mağaza endirimi sil' : 'Удалить скидку магазина',
      language === 'az' ? 'Bütün məhsullardan endirimi silmək istəyirsiniz?' : 'Хотите удалить скидку со всех товаров?',
      [
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
        },
        {
          text: language === 'az' ? 'Sil' : 'Удалить',
          style: 'destructive',
          onPress: async () => {
            logger.info('[StoreDiscounts] Removing store-wide discount:', store.id);

            try {
              await removeStoreWideDiscount(store.id);

              logger.info('[StoreDiscounts] Store-wide discount removed successfully');

              Alert.alert(
                language === 'az' ? 'Uğurlu!' : 'Успешно!',
                language === 'az' ? 'Mağaza endirimi silindi' : 'Скидка магазина удалена',
              );
            } catch (error) {
              logger.error('[StoreDiscounts] Error removing store-wide discount:', error);

              Alert.alert(
                language === 'az' ? 'Xəta' : 'Ошибка',
                language === 'az' ? 'Endirim silinərkən xəta baş verdi' : 'Ошибка при удалении скидки',
              );
            }
          },
        },
      ],
    );
  };

  const toggleExcludeListing = (listingId: string) => {
    setExcludeListings(prev =>
      prev.includes(listingId)
        ? prev.filter(id => id !== listingId)
        : [...prev, listingId],
    );
  };

  if (!store) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {language === 'az' ? 'Endirim idarəetməsi' : 'Управление скидками'}
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Package size={64} color={Colors.textSecondary} />
          <Text style={styles.errorTitle}>
            {language === 'az' ? 'Mağaza tapılmadı' : 'Магазин не найден'}
          </Text>
        </View>
      </View>
    );
  }

  if (store.userId !== currentUser?.id) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {language === 'az' ? 'Endirim idarəetməsi' : 'Управление скидками'}
          </Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorContainer}>
          <Package size={64} color={Colors.textSecondary} />
          <Text style={styles.errorTitle}>
            {language === 'az' ? 'İcazə yoxdur' : 'Нет доступа'}
          </Text>
        </View>
      </View>
    );
  }

  const discountedListings = storeListings.filter(l => l.hasDiscount);
  const regularListings = storeListings.filter(l => !l.hasDiscount);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {language === 'az' ? 'Endirim idarəetməsi' : 'Управление скидками'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Store-wide Discount Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {language === 'az' ? 'Mağaza üzrə endirim' : 'Скидка по магазину'}
            </Text>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setShowStoreWideModal(true)}
              >
                <Percent size={20} color={Colors.primary} />
                <Text style={styles.actionButtonText}>
                  {language === 'az' ? 'Mağaza endirimi tətbiq et' : 'Применить скидку магазина'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.dangerButton]}
                onPress={handleRemoveStoreWideDiscount}
              >
                <Trash2 size={20} color={Colors.error} />
                <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
                  {language === 'az' ? 'Mağaza endirimi sil' : 'Удалить скидку магазина'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Discounted Products */}
          {discountedListings.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {language === 'az' ? 'Endirimdə olan məhsullar' : 'Товары со скидкой'} ({discountedListings.length})
              </Text>

              <View style={styles.listingsList}>
                {discountedListings.map((listing) => (
                  <View key={listing.id} style={styles.listingItem}>
                    <View style={styles.listingInfo}>
                      <Text style={styles.listingTitle} numberOfLines={1}>
                        {listing.title[language]}
                      </Text>
                      <View style={styles.priceContainer}>
                        {listing.originalPrice && (
                          <Text style={styles.originalPrice}>
                            {listing.originalPrice} {listing.currency}
                          </Text>
                        )}
                        <Text style={styles.discountedPrice}>
                          {listing.price} {listing.currency}
                        </Text>
                        {listing.discountPercentage && (
                          <View style={styles.discountBadge}>
                            <Text style={styles.discountBadgeText}>
                            -{listing.discountPercentage}%
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.listingActions}>
                      <TouchableOpacity
                        style={styles.listingActionButton}
                        onPress={() => {
                          setSelectedListing(listing.id);
                          setDiscountPercentage(listing.discountPercentage?.toString() || '');
                          setShowDiscountModal(true);
                        }}
                      >
                        <Edit3 size={16} color={Colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.listingActionButton}
                        onPress={() => handleRemoveDiscount(listing.id)}
                      >
                        <Trash2 size={16} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Regular Products */}
          {regularListings.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {language === 'az' ? 'Adi qiymətli məhsullar' : 'Товары по обычной цене'} ({regularListings.length})
              </Text>

              <View style={styles.listingsList}>
                {regularListings.map((listing) => (
                  <View key={listing.id} style={styles.listingItem}>
                    <View style={styles.listingInfo}>
                      <Text style={styles.listingTitle} numberOfLines={1}>
                        {listing.title[language]}
                      </Text>
                      <Text style={styles.listingPrice}>
                        {listing.priceByAgreement
                          ? (language === 'az' ? 'Razılaşma ilə' : 'По договоренности')
                          : `${listing.price} ${listing.currency}`
                        }
                      </Text>
                    </View>

                    <View style={styles.listingActions}>
                      <TouchableOpacity
                        style={styles.listingActionButton}
                        onPress={() => {
                          setSelectedListing(listing.id);
                          setDiscountPercentage('');
                          setShowDiscountModal(true);
                        }}
                      >
                        <Tag size={16} color={Colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {storeListings.length === 0 && (
            <View style={styles.emptyContainer}>
              <Package size={64} color={Colors.textSecondary} />
              <Text style={styles.emptyTitle}>
                {language === 'az' ? 'Məhsul yoxdur' : 'Нет товаров'}
              </Text>
              <Text style={styles.emptyDescription}>
                {language === 'az' ? 'Mağazanızda hələ məhsul yoxdur' : 'В вашем магазине пока нет товаров'}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Individual Discount Modal */}
        <Modal
          visible={showDiscountModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDiscountModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {language === 'az' ? 'Məhsula endirim tətbiq et' : 'Применить скидку к товару'}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowDiscountModal(false)}
                  style={styles.modalCloseButton}
                >
                  <X size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>
                  {language === 'az' ? 'Endirim faizi (%)' : 'Процент скидки (%)'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={discountPercentage}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9.]/g, '');
                    setDiscountPercentage(numericValue);
                  }}
                  placeholder={language === 'az' ? 'Məsələn: 20' : 'Например: 20'}
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  maxLength={5}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowDiscountModal(false)}
                >
                  <Text style={styles.modalCancelButtonText}>
                    {language === 'az' ? 'Ləğv et' : 'Отмена'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmButton, isLoading && styles.modalConfirmButtonDisabled]}
                  onPress={handleApplyDiscount}
                  disabled={isLoading}
                >
                  <Save size={16} color="white" />
                  <Text style={styles.modalConfirmButtonText}>
                    {isLoading
                      ? (language === 'az' ? 'Tətbiq edilir...' : 'Применение...')
                      : (language === 'az' ? 'Tətbiq et' : 'Применить')
                    }
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Store-wide Discount Modal */}
        <Modal
          visible={showStoreWideModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowStoreWideModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, styles.largeModalContent]}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {language === 'az' ? 'Mağaza üzrə endirim' : 'Скидка по магазину'}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowStoreWideModal(false)}
                  style={styles.modalCloseButton}
                >
                  <X size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <Text style={styles.inputLabel}>
                  {language === 'az' ? 'Endirim faizi (%)' : 'Процент скидки (%)'}
                </Text>
                <TextInput
                  style={styles.textInput}
                  value={storeWideDiscount}
                  onChangeText={(text) => {
                    const numericValue = text.replace(/[^0-9.]/g, '');
                    setStoreWideDiscount(numericValue);
                  }}
                  placeholder={language === 'az' ? 'Məsələn: 15' : 'Например: 15'}
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                  maxLength={5}
                />

                {storeListings.length > 0 && (
                  <>
                    <Text style={[styles.inputLabel, { marginTop: 20 }]}>
                      {language === 'az' ? 'İstisna ediləcək məhsullar' : 'Исключить товары'}
                    </Text>
                    <Text style={styles.inputDescription}>
                      {language === 'az' ? 'Endirimdən istisna ediləcək məhsulları seçin' : 'Выберите товары, которые будут исключены из скидки'}
                    </Text>

                    <View style={styles.excludeList}>
                      {storeListings.map((listing) => (
                        <View key={listing.id} style={styles.excludeItem}>
                          <View style={styles.excludeItemInfo}>
                            <Text style={styles.excludeItemTitle} numberOfLines={1}>
                              {listing.title[language]}
                            </Text>
                            <Text style={styles.excludeItemPrice}>
                              {listing.price} {listing.currency}
                            </Text>
                          </View>
                          <Switch
                            value={excludeListings.includes(listing.id)}
                            onValueChange={() => toggleExcludeListing(listing.id)}
                            trackColor={{ false: Colors.border, true: Colors.primary }}
                            thumbColor={excludeListings.includes(listing.id) ? 'white' : Colors.textSecondary}
                          />
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowStoreWideModal(false)}
                >
                  <Text style={styles.modalCancelButtonText}>
                    {language === 'az' ? 'Ləğv et' : 'Отмена'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmButton, isLoading && styles.modalConfirmButtonDisabled]}
                  onPress={handleApplyStoreWideDiscount}
                  disabled={isLoading}
                >
                  <Percent size={16} color="white" />
                  <Text style={styles.modalConfirmButtonText}>
                    {isLoading
                      ? (language === 'az' ? 'Tətbiq edilir...' : 'Применение...')
                      : (language === 'az' ? 'Tətbiq et' : 'Применить')
                    }
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  section: {
    backgroundColor: Colors.card,
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dangerButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: Colors.error,
  },
  actionButtonText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 12,
    fontWeight: '500',
  },
  dangerButtonText: {
    color: Colors.error,
  },
  listingsList: {
    gap: 12,
  },
  listingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  listingInfo: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  originalPrice: {
    fontSize: 12,
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  discountedPrice: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  listingPrice: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  discountBadge: {
    backgroundColor: Colors.error,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  listingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  listingActionButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: Colors.background,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  largeModalContent: {
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  inputDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  excludeList: {
    gap: 12,
  },
  excludeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  excludeItemInfo: {
    flex: 1,
  },
  excludeItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  excludeItemPrice: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  modalCancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalCancelButtonText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  modalConfirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  modalConfirmButtonDisabled: {
    backgroundColor: Colors.textSecondary,
  },
  modalConfirmButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
  },
});
