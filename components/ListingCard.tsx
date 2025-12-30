import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, TextInput, Animated, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Heart, Clock, Trash2, TrendingUp, Eye, Calendar, MessageCircle, X, Send, Zap, Percent, Tag, Gift, Star, Flame } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Listing } from '@/types/listing';
import { useLanguageStore } from '@/store/languageStore';
import { useUserStore } from '@/store/userStore';
import { useListingStore } from '@/store/listingStore';
import { useThemeStore } from '@/store/themeStore';
import { useMessageStore } from '@/store/messageStore';
import { useDiscountStore } from '@/store/discountStore';
import { getColors } from '@/constants/colors';
import CountdownTimer from '@/components/CountdownTimer';
import type { Language } from '@/store/languageStore';
import { trpcClient } from '@/lib/trpc';
import { logger } from '@/utils/logger';

// User cache for performance
const userCache = new Map<string, any>();

// Stable, top-level modal component to avoid remounts while typing
interface MessageModalProps {
  visible: boolean;
  onClose: () => void;
  messageText: string;
  onChangeMessageText: (text: string) => void;
  onSend: () => void;
  isSending: boolean;
  listing: Listing;
  language: Language;
  colors: Record<string, string>;
  seller: any;
}

const MessageModal = React.memo(function MessageModal({
  visible,
  onClose,
  messageText,
  onChangeMessageText,
  onSend,
  isSending,
  listing,
  language,
  colors,
  seller,
}: MessageModalProps) {

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.messageModal, { backgroundColor: colors.card }]}>
            <View style={styles.messageModalHeader}>
              <View style={styles.sellerInfo}>
                {seller && (
                  <>
                    <Image source={{ uri: seller.avatar }} style={styles.sellerAvatar} />
                    <View>
                      <Text style={[styles.sellerName, { color: colors.text }]}>{seller.name}</Text>
                      <Text style={[styles.listingTitle, { color: colors.textSecondary }]} numberOfLines={1}>
                        {listing.title[language]}
                      </Text>
                    </View>
                  </>
                )}
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <X size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.messageInputContainer}>
              <TextInput
                style={[
                  styles.messageInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={messageText}
                onChangeText={onChangeMessageText}
                placeholder={language === 'az' ? 'Mesajınızı yazın...' : 'Напишите ваше сообщение...'}
                placeholderTextColor={colors.textSecondary}
                multiline
                scrollEnabled
                maxLength={500}
                textAlignVertical="top"
                autoFocus
              />
              <Text style={[styles.characterCount, { color: colors.textSecondary }]}>
                {messageText.length}/500
              </Text>
            </View>

            <View style={styles.messageModalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={onClose}
              >
                <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                  {language === 'az' ? 'Ləğv et' : 'Отмена'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  {
                    backgroundColor:
                    messageText.trim() && !isSending ? colors.primary : colors.textSecondary,
                  },
                ]}
                onPress={onSend}
                disabled={!messageText.trim() || isSending}
              >
                <Send size={16} color="white" />
                <Text style={styles.sendButtonText}>
                  {isSending
                    ? (language === 'az' ? 'Göndərilir...' : 'Отправка...')
                    : (language === 'az' ? 'Göndər' : 'Отправить')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

interface ListingCardProps {
  listing: Listing;
  showDeleteButton?: boolean;
  showPromoteButton?: boolean;
  onDelete?: (listingId: string) => void;
  onPromote?: (listingId: string) => void;
}


const ListingCard = React.memo(function ListingCard({
  listing,
  showDeleteButton = false,
  showPromoteButton = false,
  onDelete,
  onPromote,
}: ListingCardProps) {
  const router = useRouter();
  const { language } = useLanguageStore();
  const { favorites, toggleFavorite, currentUser, isAuthenticated } = useUserStore();
  const { deleteListing } = useListingStore();
  const { themeMode, colorTheme, fontSize, showPriceInTitle, compactMode } = useThemeStore();
  const { getOrCreateConversation, addMessage } = useMessageStore();
  const { getActiveDiscountsForListing, getActiveCampaignsForListing } = useDiscountStore();

  // State for seller
  const [seller, setSeller] = useState<any>(null);

  // Load seller data
  useEffect(() => {
    const loadSeller = async () => {
      if (!listing.userId) return;
      
      // Check cache first
      if (userCache.has(listing.userId)) {
        setSeller(userCache.get(listing.userId));
        return;
      }

      try {
        const userData = await trpcClient.user.getUser.query({ id: listing.userId });
        userCache.set(listing.userId, userData);
        setSeller(userData);
      } catch (error) {
        logger.error('[ListingCard] Failed to load seller:', error);
      }
    };

    loadSeller();
  }, [listing.userId]);

  // Memoize expensive calculations
  const colors = useMemo(() => getColors(themeMode, colorTheme), [themeMode, colorTheme]);
  const isFavorite = useMemo(() => favorites.includes(listing.id), [favorites, listing.id]);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const fireAnim = useRef(new Animated.Value(0)).current;
  const frameBlinkAnim = useRef(new Animated.Value(1)).current;
  const frameGlowAnim = useRef(new Animated.Value(0)).current;

  // Get active discounts and campaigns - memoized to prevent infinite re-renders
  const activeDiscounts = useMemo(() => getActiveDiscountsForListing(listing.id), [listing.id, getActiveDiscountsForListing]);
  const activeCampaigns = useMemo(() => getActiveCampaignsForListing(listing.id), [listing.id, getActiveCampaignsForListing]);
  const hasActivePromotion = useMemo(() =>
    activeDiscounts.length > 0 ||
    activeCampaigns.length > 0 ||
    listing.hasDiscount ||
    (listing.promotionEndDate ? new Date(listing.promotionEndDate).getTime() > Date.now() : false),
  [activeDiscounts.length, activeCampaigns.length, listing.hasDiscount, listing.promotionEndDate],
  );

  // Memoize the earliest end date calculation to prevent infinite re-renders
  const promotionEndDate = useMemo(() => {
    const candidates: number[] = [];
    const nowTs = Date.now();

    // Check active discounts
    if (activeDiscounts.length > 0) {
      for (const discount of activeDiscounts) {
        const d = new Date(discount.endDate);
        const t = d.getTime();
        if (!isNaN(t) && t > nowTs) {
          candidates.push(t);
        }
      }
    }

    // Check active campaigns
    if (activeCampaigns.length > 0) {
      for (const campaign of activeCampaigns) {
        const d = new Date(campaign.endDate);
        const t = d.getTime();
        if (!isNaN(t) && t > nowTs) {
          candidates.push(t);
        }
      }
    }

    // Check listing discount
    if (listing.hasDiscount && listing.discountEndDate) {
      const d = new Date(listing.discountEndDate);
      const t = d.getTime();
      if (!isNaN(t) && t > nowTs) {
        candidates.push(t);
      }
    }

    // Check listing promotion
    if (listing.promotionEndDate) {
      const d = new Date(listing.promotionEndDate);
      const t = d.getTime();
      if (!isNaN(t) && t > nowTs) {
        candidates.push(t);
      }
    }

    if (candidates.length === 0) return null;
    const minTs = Math.min(...candidates);
    return new Date(minTs);
  }, [activeDiscounts, activeCampaigns, listing.hasDiscount, listing.discountEndDate, listing.promotionEndDate]);

  // Get active creative effects
  const activeCreativeEffects = useMemo(() => {
    return listing.creativeEffects?.filter(effect => {
      const now = new Date();
      const endDate = new Date(effect.endDate);
      return effect.isActive && now < endDate;
    }) || [];
  }, [listing.creativeEffects]);

  const hasCreativeEffects = useMemo(() => activeCreativeEffects.length > 0, [activeCreativeEffects.length]);

  // Calculate discounted price - memoized to prevent recalculation on every render
  const priceInfo = useMemo(() => {
    let originalPrice = listing.originalPrice ?? listing.price;
    let discountedPrice = listing.price;
    let discountPercentage = 0;
    let discountType: 'percentage' | 'fixed_amount' = 'percentage';
    let discountValue = 0;

    // Check for active store/campaign discounts first
    if (activeDiscounts.length > 0) {
      const discount = activeDiscounts[0];
      discountType = discount.type === 'buy_x_get_y' ? 'percentage' : discount.type as 'percentage' | 'fixed_amount';
      discountValue = discount.value;

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
      } else if (typeof listing.discountPercentage === 'number' && listing.discountPercentage < 1 && listing.discountPercentage > 0) {
        // This looks like a calculated percentage from a fixed amount discount
        // Try to derive the original fixed amount
        if (listing.originalPrice && listing.originalPrice > listing.price) {
          discountType = 'fixed_amount';
          discountValue = Math.round(listing.originalPrice - listing.price);
          originalPrice = listing.originalPrice;
          discountedPrice = listing.price;
          discountPercentage = listing.discountPercentage;
        } else {
          // Fallback to percentage
          discountPercentage = listing.discountPercentage;
          discountType = 'percentage';
          discountValue = listing.discountPercentage;
        }
      }
    }

    const absoluteSavings = Math.max(0, originalPrice - discountedPrice);

    const result = {
      discountedPrice: Math.round(discountedPrice),
      originalPrice: Math.round(originalPrice),
      discountPercentage,
      discountType,
      discountValue: Math.round(discountValue),
      absoluteSavings: Math.round(absoluteSavings),
    } as const;

    return result;
  }, [activeDiscounts, listing.hasDiscount, listing.price, listing.originalPrice, listing.discountPercentage, listing.id]);

  // Start animations for promotions and creative effects
  useEffect(() => {
    let pulseAnimation: Animated.CompositeAnimation | null = null;
    let rotateAnimation: Animated.CompositeAnimation | null = null;
    let glowAnimation: Animated.CompositeAnimation | null = null;
    let sparkleAnimation: Animated.CompositeAnimation | null = null;
    let fireAnimation: Animated.CompositeAnimation | null = null;
    let frameBlinkAnimation: Animated.CompositeAnimation | null = null;
    let frameGlowAnimation: Animated.CompositeAnimation | null = null;

    if (hasActivePromotion || hasCreativeEffects) {
      // Pulse animation
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseAnimation.start();

      // Rotation animation for campaign badges
      if (activeCampaigns.length > 0) {
        rotateAnimation = Animated.loop(
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
        );
        rotateAnimation.start();
      }

      // Glow animation
      glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: false,
          }),
        ]),
      );
      glowAnimation.start();

      // Creative effects animations
      if (hasCreativeEffects) {
        // Sparkle animation
        if (activeCreativeEffects.some(e => e.type === 'sparkle')) {
          sparkleAnimation = Animated.loop(
            Animated.sequence([
              Animated.timing(sparkleAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
              }),
              Animated.timing(sparkleAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
              }),
            ]),
          );
          sparkleAnimation.start();
        }

        // Fire animation
        if (activeCreativeEffects.some(e => e.type === 'fire')) {
          fireAnimation = Animated.loop(
            Animated.sequence([
              Animated.timing(fireAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
              }),
              Animated.timing(fireAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
              }),
            ]),
          );
          fireAnimation.start();
        }

        // Frame effects animations
        if (activeCreativeEffects.some(e => e.type === 'frame')) {
          const frameEffect = activeCreativeEffects.find(e => e.type === 'frame');

          if (frameEffect?.id === 'frame-blinking') {
            // Blinking frame animation
            frameBlinkAnimation = Animated.loop(
              Animated.sequence([
                Animated.timing(frameBlinkAnim, {
                  toValue: 0.3,
                  duration: 500,
                  useNativeDriver: false,
                }),
                Animated.timing(frameBlinkAnim, {
                  toValue: 1,
                  duration: 500,
                  useNativeDriver: false,
                }),
              ]),
            );
            frameBlinkAnimation.start();
          }

          if (frameEffect?.id === 'frame-glowing' || frameEffect?.id === 'frame-neon') {
            // Glowing frame animation
            frameGlowAnimation = Animated.loop(
              Animated.sequence([
                Animated.timing(frameGlowAnim, {
                  toValue: 1,
                  duration: 1200,
                  useNativeDriver: false,
                }),
                Animated.timing(frameGlowAnim, {
                  toValue: 0,
                  duration: 1200,
                  useNativeDriver: false,
                }),
              ]),
            );
            frameGlowAnimation.start();
          }
        }
      }
    }

    return () => {
      // Clean up animations
      pulseAnimation?.stop();
      rotateAnimation?.stop();
      glowAnimation?.stop();
      sparkleAnimation?.stop();
      fireAnimation?.stop();
      frameBlinkAnimation?.stop();
      frameGlowAnimation?.stop();

      // Reset animation values
      pulseAnim.setValue(1);
      rotateAnim.setValue(0);
      glowAnim.setValue(0);
      sparkleAnim.setValue(0);
      fireAnim.setValue(0);
      frameBlinkAnim.setValue(1);
      frameGlowAnim.setValue(0);
    };
  }, [hasActivePromotion, hasCreativeEffects, activeCreativeEffects, activeCampaigns.length, pulseAnim, rotateAnim, glowAnim, sparkleAnim, fireAnim, frameBlinkAnim, frameGlowAnim]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return language === 'az' ? 'Bu gün' : 'Сегодня';
    } else if (diffDays === 1) {
      return language === 'az' ? 'Dünən' : 'Вчера';
    } else {
      return diffDays + (language === 'az' ? ' gün əvvəl' : ' дней назад');
    }
  };

  const handlePress = useCallback(() => {
    if (__DEV__) {
      logger.debug(`[ListingCard] Navigating to listing ${listing.id}`);
    }
    router.push(`/listing/${listing.id}`);
  }, [listing.id, router]);

  const handleFavoritePress = useCallback((e: any) => {
    e.stopPropagation();
    toggleFavorite(listing.id);
  }, [listing.id, toggleFavorite]);

  const handleDeletePress = useCallback((e: any) => {
    e.stopPropagation();
    Alert.alert(
      language === 'az' ? 'Elanı sil' : 'Удалить объявление',
      language === 'az'
        ? 'Bu elanı silmək istədiyinizə əminsiniz?'
        : 'Вы уверены, что хотите удалить это объявление?',
      [
        {
          text: language === 'az' ? 'Ləğv et' : 'Отмена',
          style: 'cancel',
        },
        {
          text: language === 'az' ? 'Sil' : 'Удалить',
          style: 'destructive',
          onPress: () => {
            if (onDelete) {
              onDelete(listing.id);
            } else {
              deleteListing(listing.id);
            }
          },
        },
      ],
    );
  }, [language, onDelete, deleteListing, listing.id]);

  const handlePromotePress = useCallback((e: any) => {
    e.stopPropagation();
    if (onPromote) {
      onPromote(listing.id);
    }
  }, [onPromote, listing.id]);

  // Calculate days remaining until expiration
  const calculateDaysRemaining = () => {
    const now = new Date();
    const expiresAt = new Date(listing.expiresAt);
    const diffTime = Math.abs(expiresAt.getTime() - now.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  };

  const daysRemaining = calculateDaysRemaining();

  const handleMessagePress = useCallback((e: any) => {
    e.stopPropagation();

    if (!isAuthenticated) {
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
        ],
      );
      return;
    }

    if (currentUser?.id === listing.userId) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Öz elanınıza mesaj göndərə bilməzsiniz' : 'Вы не можете отправить сообщение на свое объявление',
      );
      return;
    }

    setShowMessageModal(true);
    setMessageText(
      language === 'az'
        ? `Salam! "${listing.title[language]}" elanınızla maraqlanıram.`
        : `Здравствуйте! Меня интересует ваше объявление "${listing.title[language]}".`,
    );
  }, [isAuthenticated, currentUser, listing.userId, listing.title, language, router]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentUser) return;

    setIsSending(true);

    try {
      const conversationId = getOrCreateConversation([currentUser.id, listing.userId], listing.id);

      const newMessage = {
        id: Date.now().toString(),
        senderId: currentUser.id,
        receiverId: listing.userId,
        listingId: listing.id,
        text: messageText.trim(),
        type: 'text' as const,
        createdAt: new Date().toISOString(),
        isRead: false,
        isDelivered: true,
      };

      addMessage(conversationId, newMessage);

      setShowMessageModal(false);
      setMessageText('');

      Alert.alert(
        language === 'az' ? 'Uğurlu!' : 'Успешно!',
        language === 'az' ? 'Mesajınız göndərildi' : 'Ваше сообщение отправлено',
        [
          {
            text: language === 'az' ? 'Söhbətə get' : 'Перейти к чату',
            onPress: () => router.push(`/conversation/${conversationId}`),
          },
          {
            text: 'OK',
            style: 'cancel',
          },
        ],
      );
    } catch (error) {
      logger.error('Failed to send message:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Mesaj göndərilmədi' : 'Сообщение не отправлено',
      );
    } finally {
      setIsSending(false);
    }
  };

  // inline MessageModal removed in favor of top-level MessageModal component

  // Get creative effect styling
  const getCreativeEffectStyle = () => {
    if (!hasCreativeEffects) return {};

    const primaryEffect = activeCreativeEffects[0];
    const effectColor = primaryEffect.color;

    switch (primaryEffect.type) {
      case 'glow':
        return {
          shadowColor: effectColor,
          shadowOpacity: 0.4,
          shadowRadius: 15,
          elevation: 10,
        };
      case 'rainbow':
        return {
          borderWidth: 3,
          borderColor: effectColor,
          shadowColor: effectColor,
          shadowOpacity: 0.3,
          shadowRadius: 12,
          elevation: 8,
        };
      case 'fire':
      case 'sparkle':
        return {
          borderWidth: 2,
          borderColor: effectColor,
          shadowColor: effectColor,
          shadowOpacity: 0.3,
          shadowRadius: 10,
          elevation: 6,
        };
      case 'frame':
        return {
          borderWidth: 4,
          borderColor: effectColor,
          shadowColor: effectColor,
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 10,
        };
      default:
        return {
          shadowColor: effectColor,
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 4,
        };
    }
  };

  const getFrameOverlayStyle = () => {
    if (!hasCreativeEffects) return null;

    const frameEffect = activeCreativeEffects.find(e => e.type === 'frame');
    if (!frameEffect) return null;

    const baseStyle = {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 12,
      pointerEvents: 'none' as const,
    };

    if (frameEffect.id === 'frame-az-flag') {
      return baseStyle;
    }

    return {
      ...baseStyle,
      borderWidth: 4,
      borderColor: frameEffect.color,
    };
  };

  const renderFrameEffect = () => {
    if (!hasCreativeEffects) return null;

    const frameEffect = activeCreativeEffects.find(e => e.type === 'frame');
    if (!frameEffect) return null;

    if (frameEffect.id === 'frame-az-flag') {
      return (
        <View style={getFrameOverlayStyle()}>
          <LinearGradient
            colors={['#00A3E0', '#ED2939', '#3F9C35']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              borderRadius: 12,
            }}
          />
          <View style={{
            position: 'absolute',
            top: 4,
            left: 4,
            right: 4,
            bottom: 4,
            backgroundColor: colors.card,
            borderRadius: 10,
          }} />
        </View>
      );
    }

    return <Animated.View style={getFrameOverlayStyle()} />;
  };

  const cardStyle = hasActivePromotion || hasCreativeEffects ? [
    styles.card,
    {
      backgroundColor: colors.card,
      borderWidth: hasActivePromotion ? 2 : (hasCreativeEffects ? 1 : 0),
      borderColor: hasActivePromotion ? '#FF4444' : (hasCreativeEffects ? activeCreativeEffects[0]?.color : 'transparent'),
      shadowColor: hasActivePromotion ? '#FF4444' : (hasCreativeEffects ? activeCreativeEffects[0]?.color : '#000'),
      shadowOpacity: hasActivePromotion ? 0.2 : (hasCreativeEffects ? 0.3 : 0.05),
      shadowRadius: hasActivePromotion ? 12 : (hasCreativeEffects ? 10 : 8),
      elevation: hasActivePromotion ? 8 : (hasCreativeEffects ? 6 : 2),
      ...getCreativeEffectStyle(),
    },
  ] : [styles.card, { backgroundColor: colors.card }];

  return (
    <Animated.View style={cardStyle} testID="listing-card">
      {/* Frame effect overlay */}
      {hasCreativeEffects && activeCreativeEffects.some(e => e.type === 'frame') && renderFrameEffect()}
      <TouchableOpacity style={styles.cardTouchable} onPress={handlePress}>
        <View style={[styles.imageContainer, { aspectRatio: compactMode ? 1 : 4/3 }]}>
          <Image
            source={{ uri: listing.images[0] }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            priority="high"
            testID="listing-image"
          />
          <View style={styles.actionButtons}>
            {showDeleteButton && currentUser?.id === listing.userId && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDeletePress}
              >
                <Trash2 size={16} color="white" />
              </TouchableOpacity>
            )}
            {showPromoteButton && currentUser?.id === listing.userId && !listing.isFeatured && !listing.isPremium && !listing.isVip && (
              <TouchableOpacity
                style={[styles.actionButton, styles.promoteButton]}
                onPress={handlePromotePress}
              >
                <TrendingUp size={16} color="white" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={handleFavoritePress}
            >
              <Heart
                size={20}
                color={isFavorite ? colors.error : 'white'}
                fill={isFavorite ? colors.error : 'transparent'}
              />
            </TouchableOpacity>
          </View>
          {listing.isVip && (
            <View style={[styles.featuredBadge, { backgroundColor: '#FFD700' }]}>
              <Text style={styles.featuredText}>VIP</Text>
            </View>
          )}
          {listing.isFeatured && !listing.isVip && (
            <View style={[styles.featuredBadge, { backgroundColor: colors.warning || '#F59E0B' }]}>
              <Text style={styles.featuredText}>
                {language === 'az' ? 'Önə çəkilmiş' : 'Выделено'}
              </Text>
            </View>
          )}
          {listing.isPremium && !listing.isFeatured && !listing.isVip && (
            <View style={[styles.featuredBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.featuredText}>
                {language === 'az' ? 'Premium' : 'Премиум'}
              </Text>
            </View>
          )}

          {/* Discount Badge */}
          {(listing.hasDiscount || activeDiscounts.length > 0) && priceInfo.absoluteSavings >= 1 && (
            <Animated.View
              style={[
                styles.discountBadge,
                {
                  backgroundColor: '#FF4444',
                  transform: [{ scale: pulseAnim }],
                  shadowColor: '#FF4444',
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                  elevation: 8,
                },
              ]}
            >
              {priceInfo.discountType === 'fixed_amount' && priceInfo.absoluteSavings >= 1 ? (
                <Text style={styles.discountText}>
                -{priceInfo.absoluteSavings} {listing.currency}
                </Text>
              ) : (
                <>
                  <Percent size={12} color="white" />
                  <Text style={styles.discountText}>
                    {Math.round(priceInfo.discountPercentage)}%
                  </Text>
                </>
              )}
            </Animated.View>
          )}

          {/* Campaign Badge */}
          {activeCampaigns.length > 0 && (
            <Animated.View
              style={[
                styles.campaignBadge,
                {
                  backgroundColor: activeCampaigns[0].type === 'flash_sale' ? '#FF6B35' :
                    activeCampaigns[0].type === 'seasonal' ? '#4ECDC4' :
                      activeCampaigns[0].type === 'clearance' ? '#45B7D1' :
                        activeCampaigns[0].type === 'bundle' ? '#96CEB4' : '#FFEAA7',
                  transform: [
                    {
                      rotate: rotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    },
                  ],
                },
              ]}
            >
              {activeCampaigns[0].type === 'flash_sale' && <Zap size={10} color="white" />}
              {activeCampaigns[0].type === 'seasonal' && <Star size={10} color="white" />}
              {activeCampaigns[0].type === 'clearance' && <Tag size={10} color="white" />}
              {activeCampaigns[0].type === 'bundle' && <Gift size={10} color="white" />}
              {activeCampaigns[0].type === 'loyalty' && <Flame size={10} color="white" />}
            </Animated.View>
          )}

          {/* Special Promotion Ribbon */}
          {hasActivePromotion && (
            <View style={styles.promotionRibbon}>
              <View style={[styles.ribbonContent, { backgroundColor: '#FF4444' }]}>
                <Text style={styles.ribbonText}>
                  {activeCampaigns.length > 0
                    ? (language === 'az' ? 'Kampaniya' : 'Акция')
                    : (language === 'az' ? 'Endirim' : 'Скидка')
                  }
                </Text>
              </View>
              <View style={[styles.ribbonTail, { borderTopColor: '#CC3333' }]} />
            </View>
          )}

          {/* Timer Bar for Promotions */}
          {hasActivePromotion && promotionEndDate && (
            <View style={styles.timerBarContainer}>
              <CountdownTimer
                endDate={promotionEndDate.toISOString()}
                compact={true}
                style={styles.timerBar}
                key={`timer-${listing.id}-${promotionEndDate.getTime()}`}
              />
            </View>
          )}

          {/* Custom Timer Bar for Discounts */}
          {listing.timerBarEnabled && listing.timerBarEndDate && listing.timerBarTitle && (
            <View style={[
              styles.customTimerBarContainer,
              { borderColor: listing.timerBarColor || '#FF6B6B' },
            ]}>
              <View style={styles.customTimerBarHeader}>
                <Clock size={14} color={listing.timerBarColor || '#FF6B6B'} />
                <Text style={[
                  styles.customTimerBarTitle,
                  { color: listing.timerBarColor || '#FF6B6B' },
                ]}>
                  {listing.timerBarTitle}
                </Text>
              </View>
              <CountdownTimer
                endDate={listing.timerBarEndDate}
                compact={false}
                style={[
                  styles.customTimerBarContent,
                  { backgroundColor: `${listing.timerBarColor || '#FF6B6B'}15` },
                ]}
                key={`discount-timer-${listing.id}-${listing.timerBarEndDate}`}
              />
            </View>
          )}

          {/* Creative Effects Badges */}
          {hasCreativeEffects && (
            <View style={styles.creativeEffectsContainer}>
              {activeCreativeEffects.slice(0, 3).map((effect, index) => {
                const getEffectIcon = () => {
                  switch (effect.type) {
                    case 'glow':
                      return <Star size={12} color="white" />;
                    case 'sparkle':
                      return <Zap size={12} color="white" />;
                    case 'pulse':
                      return <Heart size={12} color="white" />;
                    case 'rainbow':
                      return <Star size={12} color="white" />;
                    case 'fire':
                      return <Flame size={12} color="white" />;
                    case 'star':
                      return <Star size={12} color="white" />;
                    case 'frame':
                    // Different icons for different frame types
                      if (effect.id === 'frame-floral') return <Heart size={12} color="white" />;
                      if (effect.id === 'frame-glowing') return <Zap size={12} color="white" />;
                      if (effect.id === 'frame-blinking') return <Star size={12} color="white" />;
                      if (effect.id === 'frame-diamond') return <Star size={12} color="white" />;
                      if (effect.id === 'frame-golden') return <Star size={12} color="white" />;
                      if (effect.id === 'frame-neon') return <Zap size={12} color="white" />;
                      return <Star size={12} color="white" />;
                    default:
                      return <Star size={12} color="white" />;
                  }
                };

                const getAnimationStyle = () => {
                  switch (effect.type) {
                    case 'sparkle':
                      return {
                        transform: [{
                          scale: sparkleAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.8, 1.2],
                          }),
                        }],
                      };
                    case 'pulse':
                      return {
                        transform: [{ scale: pulseAnim }],
                      };
                    case 'fire':
                      return {
                        transform: [{
                          translateY: fireAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, -3],
                          }),
                        }],
                      };
                    case 'glow':
                      return {
                        opacity: glowAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.7, 1],
                        }),
                      };
                    case 'frame':
                    // Frame-specific animations
                      if (effect.id === 'frame-blinking') {
                        return {
                          opacity: frameBlinkAnim,
                        };
                      }
                      if (effect.id === 'frame-glowing' || effect.id === 'frame-neon') {
                        return {
                          opacity: frameGlowAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.6, 1],
                          }),
                          transform: [{
                            scale: frameGlowAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [1, 1.1],
                            }),
                          }],
                        };
                      }
                      return {
                        transform: [{ scale: pulseAnim }],
                      };
                    default:
                      return {};
                  }
                };

                return (
                  <Animated.View
                    key={effect.id}
                    style={[
                      styles.creativeEffectBadge,
                      {
                        backgroundColor: effect.color,
                        left: 8 + (index * 28),
                        top: 70 + (index * 8),
                      },
                      getAnimationStyle(),
                    ]}
                  >
                    {getEffectIcon()}
                  </Animated.View>
                );
              })}

              {/* Effect count indicator if more than 3 */}
              {activeCreativeEffects.length > 3 && (
                <View style={[
                  styles.effectCountBadge,
                  {
                    left: 8 + (3 * 28),
                    top: 70 + (3 * 8),
                  },
                ]}>
                  <Text style={styles.effectCountText}>
                  +{activeCreativeEffects.length - 3}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        <View style={styles.content}>
          {/* Price with discount styling */}
          <View style={styles.priceContainer}>
            {(listing.hasDiscount || activeDiscounts.length > 0) && (priceInfo.absoluteSavings >= 1 || priceInfo.discountPercentage > 0) ? (
              <>
                <Text style={[styles.originalPrice, { color: colors.textSecondary, fontSize: fontSize === 'small' ? 12 : fontSize === 'large' ? 16 : 14 }]}>
                  {priceInfo.originalPrice} {listing.currency}
                </Text>
                <Animated.Text style={[
                  styles.discountedPrice,
                  {
                    color: '#FF4444',
                    fontSize: fontSize === 'small' ? 14 : fontSize === 'large' ? 18 : 16,
                    transform: [{ scale: pulseAnim }],
                  },
                ]}>
                  {priceInfo.discountedPrice} {listing.currency}
                </Animated.Text>
                <View style={styles.savingsContainer}>
                  <Text style={[styles.savingsText, { color: '#22C55E', fontSize: fontSize === 'small' ? 10 : fontSize === 'large' ? 14 : 12 }]}>
                    {priceInfo.discountType === 'fixed_amount' && priceInfo.absoluteSavings >= 1
                      ? `${language === 'az' ? 'Qənaət: -' : 'Экономия: -'}${priceInfo.absoluteSavings} ${listing.currency}`
                      : `${language === 'az' ? 'Qənaət: ' : 'Экономия: '}${Math.round(priceInfo.discountPercentage)}%`
                    }
                  </Text>
                </View>
              </>
            ) : (
              <Text style={[styles.price, { color: colors.text, fontSize: fontSize === 'small' ? 14 : fontSize === 'large' ? 18 : 16 }]}>
                {listing.price} {listing.currency}
              </Text>
            )}
          </View>
          <Text style={[styles.title, { color: colors.text, fontSize: fontSize === 'small' ? 12 : fontSize === 'large' ? 16 : 14 }]} numberOfLines={compactMode ? 1 : 2}>
            {showPriceInTitle ? `${listing.price} ${listing.currency} - ${listing.title[language]}` : listing.title[language]}
          </Text>
          <Text style={[styles.location, { color: colors.textSecondary, fontSize: fontSize === 'small' ? 10 : fontSize === 'large' ? 14 : 12 }]} numberOfLines={1}>
            {listing.location[language]}
          </Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Eye size={fontSize === 'small' ? 12 : fontSize === 'large' ? 16 : 14} color={colors.textSecondary} />
              <Text style={[styles.statText, { color: colors.textSecondary, fontSize: fontSize === 'small' ? 10 : fontSize === 'large' ? 14 : 12 }]}>{listing.views}</Text>
            </View>
            <View style={styles.statItem}>
              <Calendar size={fontSize === 'small' ? 12 : fontSize === 'large' ? 16 : 14} color={colors.textSecondary} />
              <Text style={[styles.statText, { color: colors.textSecondary, fontSize: fontSize === 'small' ? 10 : fontSize === 'large' ? 14 : 12 }]}>{formatDate(listing.createdAt)}</Text>
            </View>
          </View>
          {daysRemaining <= 3 && (
            <View style={styles.expirationContainer}>
              <Clock size={fontSize === 'small' ? 10 : fontSize === 'large' ? 14 : 12} color={colors.error} />
              <Text style={[styles.expirationText, { color: colors.error, fontSize: fontSize === 'small' ? 10 : fontSize === 'large' ? 14 : 12 }]}>
                {daysRemaining} {language === 'az' ? 'gün' : 'дн.'}
              </Text>
            </View>
          )}

          {/* Message Button */}
          {currentUser?.id !== listing.userId && (
            <TouchableOpacity
              style={[
                styles.messageButton,
                {
                  backgroundColor: colors.primary,
                  width: compactMode ? 28 : 32,
                  height: compactMode ? 28 : 32,
                  borderRadius: compactMode ? 14 : 16,
                },
              ]}
              onPress={handleMessagePress}
              testID="message-button"
            >
              <MessageCircle size={compactMode ? 14 : 16} color="white" />
            </TouchableOpacity>
          )}
        </View>

      </TouchableOpacity>

      <MessageModal
        visible={showMessageModal}
        onClose={() => setShowMessageModal(false)}
        messageText={messageText}
        onChangeMessageText={setMessageText}
        onSend={handleSendMessage}
        isSending={isSending}
        listing={listing}
        language={language}
        colors={colors}
        seller={seller}
      />
    </Animated.View>
  );
});

export default ListingCard;

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTouchable: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  actionButtons: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: 'rgba(220, 38, 38, 0.8)',
  },
  promoteButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.8)',
  },
  favoriteButton: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  featuredText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  content: {
    padding: 8,
  },
  price: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  title: {
    marginBottom: 4,
  },
  location: {
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    // Dynamic styling applied inline
  },
  expirationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expirationText: {
    // Dynamic styling applied inline
  },
  messageButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messageModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  messageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  listingTitle: {
    fontSize: 14,
    maxWidth: 200,
  },
  closeButton: {
    padding: 4,
  },
  messageInputContainer: {
    marginBottom: 20,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 100,
    maxHeight: 160,
    fontSize: 16,
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
  },
  messageModalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Discount and Campaign Styles
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 2,
  },
  discountText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  campaignBadge: {
    position: 'absolute',
    top: 40,
    left: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promotionRibbon: {
    position: 'absolute',
    top: 0,
    right: -10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ribbonContent: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  ribbonText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  ribbonTail: {
    width: 0,
    height: 0,
    borderTopWidth: 15,
    borderBottomWidth: 15,
    borderLeftWidth: 10,
    borderTopColor: '#FF4444',
    borderBottomColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  priceContainer: {
    marginBottom: 4,
  },
  originalPrice: {
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  discountedPrice: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  savingsContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  savingsText: {
    fontWeight: '600',
  },
  // Creative Effects Styles
  creativeEffectsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  creativeEffectBadge: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  effectCountBadge: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  effectCountText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Timer Bar Styles
  timerBarContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    zIndex: 10,
  },
  timerBar: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FF4500',
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  customTimerBarContainer: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 2,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  customTimerBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  customTimerBarTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  customTimerBarContent: {
    borderRadius: 6,
    padding: 6,
  },
});
