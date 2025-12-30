import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert, Linking, Platform, Modal, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import UserActionModal from '@/components/UserActionModal';
import UserAnalytics from '@/components/UserAnalytics';
import { useLanguageStore } from '@/store/languageStore';
import { useUserStore } from '@/store/userStore';
import { useListingStore } from '@/store/listingStore';
import { useCallStore } from '@/store/callStore';
import { useDiscountStore } from '@/store/discountStore';
// import { listings } from '@/mocks/listings'; // Removed - using store instead
import { users } from '@/mocks/users';
import { categories } from '@/constants/categories';
import Colors from '@/constants/colors';
import { Heart, Share, ChevronLeft, ChevronRight, MapPin, Calendar, Eye, Phone, MessageCircle, Clock, X, MoreVertical, Tag, Percent } from 'lucide-react-native';
import { SocialIcons } from '@/components/Icons';
import CountdownTimer from '@/components/CountdownTimer';

import { logger } from '@/utils/logger';
import { getListingWebUrl } from '@/utils/shareLinks';
const { width } = Dimensions.get('window');

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { language } = useLanguageStore();
  const { favorites, toggleFavorite, isAuthenticated, currentUser } = useUserStore(); // ✅ Add currentUser
  const { incrementViewCount } = useListingStore();
  const { initiateCall } = useCallStore();
  const { getActiveDiscounts } = useDiscountStore();
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [showUserActionModal, setShowUserActionModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  // Get listings from store instead of mock data
  const { listings } = useListingStore();
  
  logger.debug('[ListingDetail] Looking for listing with ID:', id);
  logger.debug('[ListingDetail] Available listings count:', listings.length);
  logger.debug('[ListingDetail] Available listing IDs:', listings.map(l => l.id).slice(0, 10));
  
  const listing = listings.find(item => item.id === id);
  logger.debug('[ListingDetail] Found listing:', listing ? 'Yes' : 'No');
  
  // Get active discounts for this listing
  const activeDiscounts = listing?.storeId ? getActiveDiscounts(listing.storeId).filter(discount => 
    discount.applicableListings.includes(listing.id)
  ) : [];
  
  // Calculate discounted price - using same logic as ListingCard
  const calculateDiscountedPrice = () => {
    if (!listing) return null;
    
    let originalPrice = listing.originalPrice ?? listing.price;
    let discountedPrice = listing.price;
    let discountPercentage = 0;
    let discountType: 'percentage' | 'fixed_amount' = 'percentage';
    let discountValue = 0;

    logger.debug(`[ListingDetail] Calculating discount for listing ${listing.id}:`, {
      activeDiscounts: activeDiscounts.length,
      hasDiscount: listing.hasDiscount,
      originalPrice,
      currentPrice: listing.price,
      discountPercentage: listing.discountPercentage
    });

    // Check for active store/campaign discounts first
    if (activeDiscounts.length > 0) {
      const discount = activeDiscounts[0];
      discountType = discount.type === 'buy_x_get_y' ? 'percentage' : discount.type as 'percentage' | 'fixed_amount';
      discountValue = discount.value;

      logger.debug(`[ListingDetail] Applying store discount:`, {
        type: discount.type,
        value: discount.value,
        originalPrice
      });

      if (discount.type === 'percentage' || discount.type === 'buy_x_get_y') {
        discountPercentage = discount.value;
        discountedPrice = originalPrice * (1 - discount.value / 100);
      } else if (discount.type === 'fixed_amount') {
        discountedPrice = Math.max(0, originalPrice - discount.value);
        discountPercentage = originalPrice > 0 ? ((originalPrice - discountedPrice) / originalPrice) * 100 : 0;
        discountValue = Math.min(discount.value, originalPrice);
      }
    }
    // Listing-level discount handling
    else if (listing.hasDiscount) {
      // Check if we have a stored discount percentage that's reasonable (not a tiny decimal)
      if (typeof listing.discountPercentage === 'number' && listing.discountPercentage >= 1) {
        // This is a percentage discount
        discountPercentage = listing.discountPercentage;
        discountType = 'percentage';
        discountValue = listing.discountPercentage;
        if (listing.originalPrice) {
          originalPrice = listing.originalPrice;
          discountedPrice = originalPrice * (1 - listing.discountPercentage / 100);
        } else {
          originalPrice = listing.price / (1 - listing.discountPercentage / 100);
          discountedPrice = listing.price;
        }
      } else if (typeof listing.originalPrice === 'number' && listing.originalPrice > listing.price) {
        // This is a fixed amount discount - derive from price difference
        discountType = 'fixed_amount';
        discountValue = Math.max(0, Math.round(listing.originalPrice - listing.price));
        originalPrice = listing.originalPrice;
        discountedPrice = listing.price;
        discountPercentage = originalPrice > 0 ? ((originalPrice - discountedPrice) / originalPrice) * 100 : 0;
        logger.debug('[ListingDetail] Derived fixed-amount listing discount', { discountValue, originalPrice, discountedPrice });
      } else if (typeof listing.discountPercentage === 'number' && listing.discountPercentage < 1 && listing.discountPercentage > 0) {
        // This looks like a calculated percentage from a fixed amount discount
        // Try to derive the original fixed amount
        if (listing.originalPrice && listing.originalPrice > listing.price) {
          discountType = 'fixed_amount';
          discountValue = Math.round(listing.originalPrice - listing.price);
          originalPrice = listing.originalPrice;
          discountedPrice = listing.price;
          discountPercentage = listing.discountPercentage;
          logger.debug('[ListingDetail] Detected fixed-amount from small percentage', { discountValue, originalPrice, discountedPrice });
        } else {
          // Fallback to percentage
          discountPercentage = listing.discountPercentage;
          discountType = 'percentage';
          discountValue = listing.discountPercentage;
        }
      }
    }

    const absoluteSavings = Math.max(0, originalPrice - discountedPrice);

    if (absoluteSavings < 1) {
      return null; // No meaningful discount
    }

    const result = {
      discountedPrice: Math.round(discountedPrice),
      originalPrice: Math.round(originalPrice),
      discountPercentage,
      discountType,
      discountValue: Math.round(discountValue),
      absoluteSavings: Math.round(absoluteSavings),
      discount: { type: discountType, value: discountValue }
    } as const;

    logger.debug(`[ListingDetail] Final discount calculation:`, result);

    return result;
  };
  
  const priceInfo = listing ? calculateDiscountedPrice() : null;
  
  // Increment view count when listing is viewed
  useEffect(() => {
    if (listing && id) {
      incrementViewCount(id);
    }
  }, [id, incrementViewCount]);
  if (!listing) {
    logger.debug('[ListingDetail] Listing not found. ID:', id);
    logger.debug('[ListingDetail] All listing IDs:', listings.map(l => ({ id: l.id, title: l.title.az })));
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>
          {language === 'az' ? 'Elan tapılmadı' : 'Объявление не найдено'}
        </Text>
        <Text style={styles.notFoundSubtext}>
          ID: {id}
        </Text>
      </View>
    );
  }
  
  const seller = users.find(user => user.id === listing.userId);
  
  // ✅ Log warning if seller not found
  if (!seller) {
    logger.warn('Seller not found for listing:', listing.userId);
  }
  
  const isFavorite = favorites.includes(listing.id);
  
  const category = categories.find(c => c.id === listing.categoryId);
  const subcategory = category?.subcategories.find(s => s.id === listing.subcategoryId);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'az' ? 'az-AZ' : 'ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };
  
  const handleNextImage = () => {
    if (currentImageIndex < listing.images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };
  
  const handleFavoriteToggle = () => {
    toggleFavorite(listing.id);
  };
  
  const handleShare = () => {
    setShareModalVisible(true);
  };

  // ✅ Helper: Generate share URL (moved to avoid hardcoding)
  const getShareUrl = () => {
    return listing?.id ? getListingWebUrl(listing.id) : '';
  };

  const generateShareText = () => {
    // ✅ Validate listing exists
    if (!listing) {
      logger.error('[generateShareText] Listing is null');
      return '';
    }

    // ✅ Validate required fields
    if (!listing.id || !listing.title || !listing.location || !listing.currency) {
      logger.error('[generateShareText] Missing required listing fields:', {
        hasId: !!listing.id,
        hasTitle: !!listing.title,
        hasLocation: !!listing.location,
        hasCurrency: !!listing.currency
      });
      return '';
    }

    const shareUrl = getShareUrl();
    
    // ✅ Safe title access with fallback
    const title = listing.title[language] || listing.title.az || listing.title.en || 'Elan';
    
    // ✅ Safe location access with fallback
    const location = listing.location[language] || listing.location.az || listing.location.en || '';
    
    // Use discounted price if available, otherwise use regular price
    const displayPrice = priceInfo && priceInfo.absoluteSavings >= 1 
      ? `${priceInfo.discountedPrice.toFixed(2)} ${listing.currency} (${language === 'az' ? 'Endirimli qiymət' : 'Цена со скидкой'})`
      : `${listing.price.toFixed(2)} ${listing.currency}`;
    
    return language === 'az' 
      ? `${title}\n\n${displayPrice}\n${location}\n\n${shareUrl}`
      : `${title}\n\n${displayPrice}\n${location}\n\n${shareUrl}`;
  };

  const shareToSocialMedia = async (platform: string) => {
    // ✅ Validate listing
    if (!listing) {
      logger.error('[shareToSocialMedia] Listing is null');
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Elan məlumatları tapılmadı' : 'Информация объявлении не найдена'
      );
      setShareModalVisible(false);
      return;
    }

    // ✅ Set loading state
    setIsSharing(true);

    try {
      const shareText = generateShareText();
      
      // ✅ Validate generated text
      if (!shareText) {
        throw new Error('Failed to generate share text');
      }

      const encodedText = encodeURIComponent(shareText);
      const shareUrl = getShareUrl();
      const encodedUrl = encodeURIComponent(shareUrl);
    
    let url = '';
    
    switch (platform) {
      case 'whatsapp':
        url = `whatsapp://send?text=${encodedText}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
        break;
      case 'instagram':
        // ✅ Instagram doesn't support direct URL sharing, so we'll copy to clipboard
        try {
          await Clipboard.setStringAsync(shareText);
          Alert.alert(
            language === 'az' ? 'Kopyalandı' : 'Скопировано',
            language === 'az' 
              ? 'Mətn panoya kopyalandı. Instagram tətbiqini açın və paylaşın.' 
              : 'Текст скопирован. Откройте Instagram и поделитесь.'
          );
        } catch (clipboardError) {
          logger.error('[shareToSocialMedia] Clipboard error:', clipboardError);
          Alert.alert(
            language === 'az' ? 'Xəta' : 'Ошибка',
            language === 'az' 
              ? 'Panoya kopyalana bilmədi. Lütfən Instagram tətbiqini açın.' 
              : 'Не удалось скопировать. Откройте Instagram.'
          );
        }
        setShareModalVisible(false);
        setIsSharing(false);
        return;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodedText}`;
        break;
      case 'vk':
        url = `https://vk.com/share.php?url=${encodedUrl}&title=${encodeURIComponent(listing.title[language])}&description=${encodeURIComponent(listing.description[language])}`;
        break;
      case 'ok':
        url = `https://connect.ok.ru/offer?url=${encodedUrl}&title=${encodeURIComponent(listing.title[language])}&description=${encodeURIComponent(listing.description[language])}`;
        break;
      case 'tiktok':
        // ✅ TikTok doesn't support direct URL sharing, copy to clipboard
        try {
          await Clipboard.setStringAsync(shareText);
          Alert.alert(
            'TikTok',
            language === 'az' 
              ? 'Mətn kopyalandı. TikTok tətbiqini açın və paylaşın.' 
              : 'Текст скопирован. Откройте TikTok и поделитесь.'
          );
        } catch (clipboardError) {
          logger.error('[shareToSocialMedia] TikTok clipboard error:', clipboardError);
          Alert.alert(
            'TikTok',
            language === 'az' 
              ? 'TikTok tətbiqini açın və məzmunu paylaşın' 
              : 'Откройте приложение TikTok и поделитесь'
          );
        }
        setShareModalVisible(false);
        setIsSharing(false);
        return;
      case 'native':
        // ✅ Use native sharing with better error handling
        try {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(shareUrl, {
              dialogTitle: language === 'az' ? 'Elanı paylaş' : 'Поделиться объявлением',
            });
            logger.debug('[shareToSocialMedia] Native share successful');
          } else {
            logger.warn('[shareToSocialMedia] Native sharing not available');
            Alert.alert(
              language === 'az' ? 'Xəta' : 'Ошибка',
              language === 'az' ? 'Paylaşma funksiyası mövcud deyil' : 'Функция обмена недоступна'
            );
          }
        } catch (nativeShareError) {
          logger.error('[shareToSocialMedia] Native share error:', nativeShareError);
          Alert.alert(
            language === 'az' ? 'Xəta' : 'Ошибка',
            language === 'az' ? 'Paylaşma zamanı xəta baş verdi' : 'Произошла ошибка при попытке поделиться'
          );
        }
        setShareModalVisible(false);
        setIsSharing(false);
        return;
      case 'copy':
        // ✅ Universal clipboard for all platforms
        try {
          await Clipboard.setStringAsync(shareText);
          logger.debug('[shareToSocialMedia] Text copied to clipboard');
          Alert.alert(
            language === 'az' ? 'Kopyalandı' : 'Скопировано',
            language === 'az' ? 'Mətn və link panoya kopyalandı' : 'Текст и ссылка скопированы'
          );
        } catch (clipboardError) {
          logger.error('[shareToSocialMedia] Clipboard error:', clipboardError);
          Alert.alert(
            language === 'az' ? 'Xəta' : 'Ошибка',
            language === 'az' ? 'Panoya kopyalana bilmədi' : 'Не удалось скопировать'
          );
        }
        setShareModalVisible(false);
        setIsSharing(false);
        return;
    }
    
      // ✅ Validate URL before opening
      if (!url) {
        throw new Error('Invalid URL generated');
      }

      logger.debug('[shareToSocialMedia] Opening URL:', url.substring(0, 50) + '...');
      
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
          logger.debug('[shareToSocialMedia] Successfully opened:', platform);
        } else {
          logger.warn('[shareToSocialMedia] URL not supported, trying fallback:', platform);
          // Fallback to web browser
          await Linking.openURL(url);
        }
      } catch (linkingError) {
        logger.error('[shareToSocialMedia] Linking error:', linkingError);
        
        // Provide specific error messages based on platform
        let errorMessage = language === 'az' ? 'Paylaşma zamanı xəta baş verdi' : 'Произошла ошибка при попытке поделиться';
        
        if (platform === 'whatsapp') {
          errorMessage = language === 'az' 
            ? 'WhatsApp tətbiqi quraşdırılmayıb və ya açıla bilmir' 
            : 'WhatsApp не установлен или не может быть открыт';
        } else if (platform === 'telegram') {
          errorMessage = language === 'az' 
            ? 'Telegram tətbiqi quraşdırılmayıb və ya açıla bilmir' 
            : 'Telegram не установлен или не может быть открыт';
        }
        
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          errorMessage
        );
      }
    } catch (error) {
      logger.error('[shareToSocialMedia] General error:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Paylaşma zamanı xəta baş verdi' : 'Произошла ошибка при попытке поделиться'
      );
    } finally {
      // ✅ Always reset loading state
      setIsSharing(false);
    }
    
    setShareModalVisible(false);
  };

  const ShareModal = () => {
    const socialPlatforms = [
      { id: 'whatsapp', name: 'WhatsApp', color: '#25D366', iconComponent: SocialIcons.WhatsApp },
      { id: 'facebook', name: 'Facebook', color: '#1877F2', iconComponent: SocialIcons.Facebook },
      { id: 'instagram', name: 'Instagram', color: '#E4405F', iconComponent: SocialIcons.Instagram },
      { id: 'telegram', name: 'Telegram', color: '#0088CC', iconComponent: SocialIcons.Telegram },
      { id: 'twitter', name: 'Twitter', color: '#1DA1F2', iconComponent: SocialIcons.Twitter },
      { id: 'vk', name: 'VKontakte', color: '#4C75A3', iconComponent: SocialIcons.VKontakte },
      { id: 'ok', name: 'Odnoklassniki', color: '#EE8208', iconComponent: SocialIcons.Odnoklassniki },
      { id: 'tiktok', name: 'TikTok', color: '#000000', iconComponent: SocialIcons.TikTok },
      { id: 'native', name: language === 'az' ? 'Digər' : 'Другие', color: Colors.primary, iconComponent: SocialIcons.Share },
      { id: 'copy', name: language === 'az' ? 'Linki kopyala' : 'Копировать ссылку', color: Colors.textSecondary, iconComponent: SocialIcons.Copy },
    ];

    return (
      <Modal
        visible={shareModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setShareModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.shareModal}>
            <View style={styles.shareHeader}>
              <Text style={styles.shareTitle}>
                {language === 'az' ? 'Paylaş' : 'Поделиться'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShareModalVisible(false)}
              >
                <X size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.shareOptions}>
              {/* ✅ Loading indicator */}
              {isSharing && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                  <Text style={styles.loadingText}>
                    {language === 'az' ? 'Paylaşılır...' : 'Отправка...'}
                  </Text>
                </View>
              )}
              
              <View style={[styles.shareGrid, isSharing && styles.shareGridDisabled]}>
                {socialPlatforms.map((platform) => (
                  <TouchableOpacity
                    key={platform.id}
                    style={styles.shareOption}
                    onPress={() => shareToSocialMedia(platform.id)}
                    disabled={isSharing}
                  >
                    <View style={[styles.shareIconContainer, { backgroundColor: platform.color }]}>
                      <platform.iconComponent size={24} color="white" />
                    </View>
                    <Text style={styles.sharePlatformName}>{platform.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };
  
  const handleContact = () => {
    logger.info('[ListingDetail] handleContact called:', { 
      listingId: listing.id, 
      sellerId: seller?.id,
      isAuthenticated 
    });
    
    if (!isAuthenticated) {
      logger.warn('[ListingDetail] User not authenticated for contact');
      Alert.alert(
        language === 'az' ? 'Giriş tələb olunur' : 'Требуется вход',
        language === 'az' 
          ? 'Satıcı ilə əlaqə saxlamaq üçün hesabınıza daxil olmalısınız' 
          : 'Для связи с продавцом необходимо войти в аккаунт',
        [
          {
            text: language === 'az' ? 'Ləğv et' : 'Отмена',
            style: 'cancel',
          },
          {
            text: language === 'az' ? 'Daxil ol' : 'Войти',
            onPress: () => router.push('/auth/login'),
          },
        ]
      );
      return;
    }
    
    // ✅ Validate seller exists
    if (!seller) {
      logger.error('[ListingDetail] No seller found for listing:', listing.id);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Satıcı məlumatları tapılmadı' : 'Информация о продавце не найдена'
      );
      return;
    }
    
    // Check if seller has hidden phone number
    if (seller?.privacySettings?.hidePhoneNumber) {
      logger.info('[ListingDetail] Seller has hidden phone number, showing in-app call option');
      Alert.alert(
        language === 'az' ? 'Telefon nömrəsi gizlədilmiş' : 'Номер телефона скрыт',
        language === 'az' 
          ? 'Bu istifadəçi telefon nömrəsini gizlədib. Tətbiq üzərindən əlaqə saxlaya bilərsiniz.'
          : 'Этот пользователь скрыл номер телефона. Вы можете связаться через приложение.',
        [
          {
            text: language === 'az' ? 'Səsli zəng' : 'Голосовой звонок',
            onPress: async () => {
              try {
                // ✅ Add currentUser validation
                if (!currentUser?.id) {
                  Alert.alert(
                    language === 'az' ? 'Xəta' : 'Ошибка',
                    language === 'az' ? 'Zəng üçün giriş lazımdır' : 'Требуется вход для звонка'
                  );
                  return;
                }
                const callId = await initiateCall(currentUser.id, seller.id, listing.id, 'voice'); // ✅ Fixed signature
                router.push(`/call/${callId}`);
              } catch (error) {
                logger.error('Failed to initiate call:', error);
              }
            },
          },
          {
            text: language === 'az' ? 'Video zəng' : 'Видеозвонок',
            onPress: async () => {
              try {
                // ✅ Add currentUser validation
                if (!currentUser?.id) {
                  Alert.alert(
                    language === 'az' ? 'Xəta' : 'Ошибка',
                    language === 'az' ? 'Video zəng üçün giriş lazımdır' : 'Требуется вход для видеозвонка'
                  );
                  return;
                }
                const callId = await initiateCall(currentUser.id, seller.id, listing.id, 'video'); // ✅ Fixed signature
                router.push(`/call/${callId}`);
              } catch (error) {
                logger.error('Failed to initiate video call:', error);
              }
            },
          },
          {
            text: language === 'az' ? 'Ləğv et' : 'Отмена',
            style: 'cancel',
          },
        ]
      );
      return;
    }
    
    Alert.alert(
      language === 'az' ? 'Əlaqə' : 'Контакт',
      seller?.phone || '',
      [
        {
          text: language === 'az' ? 'Zəng et' : 'Позвонить',
          onPress: () => {
            if (seller?.phone) {
              Linking.openURL(`tel:${seller.phone}`);
            }
          },
        },
        {
          text: 'WhatsApp',
          onPress: () => {
            if (seller?.phone) {
              const phoneNumber = seller.phone.replace(/[^0-9]/g, '');
              const message = encodeURIComponent(
                language === 'az' 
                  ? `Salam! "${listing.title[language]}" elanınızla maraqlanıram.`
                  : `Здравствуйте! Меня интересует ваше объявление "${listing.title[language]}".`
              );
              Linking.openURL(`whatsapp://send?phone=${phoneNumber}&text=${message}`);
            }
          },
        },
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
        },
      ]
    );
  };
  
  const handleMessage = () => {
    logger.info('[ListingDetail] handleMessage called:', { 
      listingId: listing.id, 
      sellerId: seller?.id,
      isAuthenticated 
    });
    
    if (!isAuthenticated) {
      logger.warn('[ListingDetail] User not authenticated for messaging');
      Alert.alert(
        language === 'az' ? 'Giriş tələb olunur' : 'Требуется вход',
        language === 'az' 
          ? 'Mesaj göndərmək üçün hesabınıza daxil olmalısınız' 
          : 'Для отправки сообщения необходимо войти в аккаунт',
        [
          {
            text: language === 'az' ? 'Ləğv et' : 'Отмена',
            style: 'cancel',
          },
          {
            text: language === 'az' ? 'Daxil ol' : 'Войти',
            onPress: () => router.push('/auth/login'),
          },
        ]
      );
      return;
    }
    
    if (!seller) {
      logger.error('[ListingDetail] No seller found for listing:', listing.id);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Satıcı məlumatları tapılmadı' : 'Информация о продавце не найдена'
      );
      return;
    }
    
    // ✅ Check if seller allows messaging
    if (seller.privacySettings?.onlyAppMessaging === false && seller.privacySettings?.allowDirectContact === false) {
      logger.warn('[ListingDetail] Seller has disabled messaging:', seller.id);
      Alert.alert(
        language === 'az' ? 'Mesaj göndərilə bilməz' : 'Невозможно отправить сообщение',
        language === 'az' 
          ? 'Bu istifadəçi mesajları qəbul etmir' 
          : 'Этот пользователь не принимает сообщения'
      );
      return;
    }
    
    // Navigate to conversation with the seller
    logger.info('[ListingDetail] Navigating to conversation:', seller.id);
    router.push(`/conversation/${seller.id}?listingId=${listing.id}&listingTitle=${encodeURIComponent(listing.title[language])}`);
  };

  // Calculate days remaining until expiration
  const calculateDaysRemaining = () => {
    const now = new Date();
    const expiresAt = new Date(listing.expiresAt);
    const diffTime = Math.abs(expiresAt.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const daysRemaining = calculateDaysRemaining();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: listing.images[currentImageIndex] }}
          style={styles.image}
          contentFit="cover"
        />
        
        {listing.images.length > 1 && (
          <>
            {currentImageIndex > 0 && (
              <TouchableOpacity style={[styles.imageNav, styles.prevButton]} onPress={handlePrevImage}>
                <ChevronLeft size={24} color="white" />
              </TouchableOpacity>
            )}
            
            {currentImageIndex < listing.images.length - 1 && (
              <TouchableOpacity style={[styles.imageNav, styles.nextButton]} onPress={handleNextImage}>
                <ChevronRight size={24} color="white" />
              </TouchableOpacity>
            )}
            
            <View style={styles.pagination}>
              {listing.images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    index === currentImageIndex && styles.activeDot,
                  ]}
                />
              ))}
            </View>
          </>
        )}
        
        <View style={styles.imageActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleFavoriteToggle}>
            <Heart 
              size={20} 
              color="white" 
              fill={isFavorite ? 'white' : 'transparent'} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Share size={20} color="white" />
          </TouchableOpacity>
          
          {seller && (
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => setShowUserActionModal(true)}
            >
              <MoreVertical size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>
        
        {listing.isFeatured && (
          <View style={styles.adTypeBadge}>
            <Text style={styles.adTypeText}>VIP</Text>
          </View>
        )}
        
        {listing.isPremium && !listing.isFeatured && (
          <View style={[styles.adTypeBadge, styles.premiumBadge]}>
            <Text style={styles.adTypeText}>
              {language === 'az' ? 'Premium' : 'Премиум'}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.content}>
        <View style={styles.priceRow}>
          {priceInfo && priceInfo.absoluteSavings >= 1 ? (
            <View style={styles.discountedPriceContainer}>
              <View style={styles.priceWithDiscount}>
                <Text style={styles.discountedPrice}>
                  {priceInfo.discountedPrice} {listing.currency}
                </Text>
                <Text style={styles.originalPrice}>
                  {priceInfo.originalPrice} {listing.currency}
                </Text>
                <View style={styles.discountBadge}>
                  {priceInfo.discountType === 'fixed_amount' ? (
                    <Text style={styles.discountBadgeText}>
                      -{priceInfo.absoluteSavings} {listing.currency}
                    </Text>
                  ) : (
                    <>
                      <Percent size={12} color="white" />
                      <Text style={styles.discountBadgeText}>
                        {Math.round(priceInfo.discountPercentage)}%
                      </Text>
                    </>
                  )}
                </View>
              </View>
              <View style={styles.savingsInfo}>
                <Text style={styles.savingsText}>
                  {language === 'az' ? 'Qənaət: ' : 'Экономия: '}
                  {priceInfo.discountType === 'fixed_amount' 
                    ? `${priceInfo.absoluteSavings} ${listing.currency}`
                    : `${Math.round(priceInfo.discountPercentage)}%`
                  }
                </Text>
              </View>
            </View>
          ) : (
            <Text style={styles.price}>
              {listing.price} {listing.currency}
            </Text>
          )}
          
          {daysRemaining <= 3 && (
            <View style={styles.expirationContainer}>
              <Clock size={16} color={Colors.error} />
              <Text style={styles.expirationText}>
                {language === 'az' 
                  ? `${daysRemaining} gün qalıb` 
                  : `Осталось ${daysRemaining} дн.`}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={styles.title}>{listing.title[language]}</Text>
        
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <MapPin size={16} color={Colors.textSecondary} />
            <Text style={styles.infoText}>{listing.location[language]}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Calendar size={16} color={Colors.textSecondary} />
            <Text style={styles.infoText}>{formatDate(listing.createdAt)}</Text>
          </View>
          
          <View style={styles.infoItem}>
            <Eye size={16} color={Colors.textSecondary} />
            <Text style={styles.infoText}>{listing.views}</Text>
          </View>
        </View>
        
        {(category && subcategory) && (
          <View style={styles.categoryContainer}>
            <Text style={styles.categoryLabel}>
              {language === 'az' ? 'Kateqoriya:' : 'Категория:'}
            </Text>
            <Text style={styles.categoryText}>
              {category.name[language]} / {subcategory.name[language]}
            </Text>
          </View>
        )}
        
        {/* Active Discounts */}
        {activeDiscounts.length > 0 && (
          <View style={styles.discountsSection}>
            <Text style={styles.sectionTitle}>
              {language === 'az' ? 'Aktiv Endirimlər' : 'Активные скидки'}
            </Text>
            {activeDiscounts.map((discount) => (
              <View key={discount.id} style={styles.discountCard}>
                <View style={styles.discountHeader}>
                  <Tag size={16} color={Colors.secondary} />
                  <Text style={styles.discountTitle}>{discount.title}</Text>
                </View>
                <Text style={styles.discountDescription}>{discount.description}</Text>
                <View style={styles.discountDetails}>
                  <Text style={styles.discountValue}>
                    {discount.type === 'percentage' 
                      ? `${discount.value}% ${language === 'az' ? 'endirim' : 'скидка'}`
                      : `${discount.value} ${listing.currency} ${language === 'az' ? 'endirim' : 'скидка'}`
                    }
                  </Text>
                  <CountdownTimer 
                    endDate={discount.endDate} 
                    compact={true}
                    style={styles.discountTimer}
                  />
                </View>
              </View>
            ))}
          </View>
        )}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {language === 'az' ? 'Təsvir' : 'Описание'}
          </Text>
          <Text style={styles.description}>{listing.description[language]}</Text>
        </View>
        
        {seller && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {language === 'az' ? 'Satıcı' : 'Продавец'}
            </Text>
            
            <TouchableOpacity 
              style={styles.sellerContainer}
              onPress={() => router.push(`/profile/${seller.id}`)}
            >
              <Image source={{ uri: seller.avatar }} style={styles.sellerAvatar} />
              
              <View style={styles.sellerInfo}>
                <Text style={styles.sellerName}>{seller.name}</Text>
                <Text style={styles.sellerLocation}>{seller.location[language]}</Text>
                <UserAnalytics user={seller} />
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      <View style={styles.footer}>
        {(listing.contactPreference === 'phone' || listing.contactPreference === 'both') && (
          <TouchableOpacity 
            style={[styles.footerButton, styles.callButton]} 
            onPress={handleContact}
          >
            <Phone size={20} color="white" />
            <Text style={styles.footerButtonText}>
              {language === 'az' ? 'Zəng et' : 'Позвонить'}
            </Text>
          </TouchableOpacity>
        )}
        
        {(listing.contactPreference === 'message' || listing.contactPreference === 'both') && (
          <TouchableOpacity 
            style={[
              styles.footerButton, 
              styles.messageButton,
              listing.contactPreference === 'message' && styles.fullWidthButton
            ]} 
            onPress={handleMessage}
          >
            <MessageCircle size={20} color="white" />
            <Text style={styles.footerButtonText}>
              {language === 'az' ? 'Mesaj yaz' : 'Написать'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      <ShareModal />
      
      {/* User Action Modal */}
      {seller && (
        <UserActionModal
          visible={showUserActionModal}
          onClose={() => setShowUserActionModal(false)}
          user={seller}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  notFoundText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  notFoundSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: width * 0.75,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageNav: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  prevButton: {
    left: 16,
  },
  nextButton: {
    right: 16,
  },
  pagination: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  activeDot: {
    backgroundColor: 'white',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  imageActions: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adTypeBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: Colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  premiumBadge: {
    backgroundColor: Colors.primary,
  },
  adTypeText: {
    color: 'white',
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  expirationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  expirationText: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: '500',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginRight: 4,
  },
  categoryText: {
    fontSize: 14,
    color: Colors.primary,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.text,
  },
  sellerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sellerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  sellerLocation: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  callButton: {
    backgroundColor: Colors.success,
  },
  messageButton: {
    backgroundColor: Colors.primary,
  },
  fullWidthButton: {
    flex: 1,
  },
  footerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  shareModal: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  shareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  shareTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  shareOptions: {
    padding: 20,
  },
  shareGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  shareOption: {
    width: '23%',
    alignItems: 'center',
    marginBottom: 20,
  },
  shareIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  shareIcon: {
    fontSize: 24,
  },
  sharePlatformName: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  shareGridDisabled: {
    opacity: 0.5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  discountedPriceContainer: {
    flex: 1,
  },
  priceWithDiscount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  discountedPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.success,
  },
  originalPrice: {
    fontSize: 18,
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  discountBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  savingsInfo: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  savingsText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  discountsSection: {
    marginTop: 24,
  },
  discountCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
  },
  discountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  discountTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  discountDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  discountDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  discountValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.secondary,
  },
  discountExpiry: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  discountTimer: {
    marginTop: 0,
    marginVertical: 0,
  },
});