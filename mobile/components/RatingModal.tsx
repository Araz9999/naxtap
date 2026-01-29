import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { X, Shield, AlertTriangle } from 'lucide-react-native';
import { useLanguageStore } from '@/store/languageStore';
import { useThemeStore } from '@/store/themeStore';
import { useRatingStore } from '@/store/ratingStore';
import { useUserStore } from '@/store/userStore';
import { getColors } from '@/constants/colors';
import StarRating from './StarRating';

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  targetId: string;
  targetType: 'store' | 'user';
  targetName: string;
  onSubmit: (rating: number, comment?: string) => void;
}

export default function RatingModal({
  visible,
  onClose,
  targetId,
  targetType,
  targetName,
  onSubmit,
}: RatingModalProps) {
  const { language } = useLanguageStore();
  const { themeMode, colorTheme } = useThemeStore();
  const { validateRating } = useRatingStore();
  const { currentUser } = useUserStore();
  const colors = getColors(themeMode, colorTheme);

  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [validation, setValidation] = useState<{ canRate: boolean; reason?: string } | null>(null);

  useEffect(() => {
    if (visible && currentUser) {
      const validationResult = validateRating(currentUser.id, targetId, targetType);
      setValidation(validationResult);
    }
  }, [visible, currentUser, targetId, targetType, validateRating]);

  const handleSubmit = async () => {
    if (!currentUser) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az'
          ? 'Reyting vermək üçün daxil olun'
          : 'Войдите, чтобы оставить отзыв',
      );
      return;
    }

    if (rating === 0) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az'
          ? 'Zəhmət olmasa reyting seçin'
          : 'Пожалуйста, выберите рейтинг',
      );
      return;
    }

    if (validation && !validation.canRate) {
      Alert.alert(
        language === 'az' ? 'Reyting verilə bilməz' : 'Нельзя оставить отзыв',
        validation.reason || 'Unknown error',
      );
      return;
    }

    try {
      await onSubmit(rating, comment.trim() || undefined);
      setRating(0);
      setComment('');
      onClose();
    } catch (error) {
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  };

  const handleClose = () => {
    setRating(0);
    setComment('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {language === 'az' ? 'Reyting verin' : 'Оставить отзыв'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.targetName, { color: colors.text }]}>
              {targetName}
            </Text>

            {validation && !validation.canRate && (
              <View style={[styles.warningContainer, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
                <AlertTriangle size={20} color={colors.error} />
                <Text style={[styles.warningText, { color: colors.error }]}>
                  {validation.reason}
                </Text>
              </View>
            )}

            {validation && validation.canRate && (
              <View style={[styles.infoContainer, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
                <Shield size={16} color={colors.primary} />
                <Text style={[styles.infoText, { color: colors.primary }]}>
                  {language === 'az'
                    ? 'Saxta reytinglərin qarşısını almaq üçün hər hədəfə yalnız 1 dəfə reyting verə bilərsiniz'
                    : 'Для предотвращения фальшивых отзывов можно оставить только 1 отзыв на цель'
                  }
                </Text>
              </View>
            )}

            <View style={styles.ratingSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === 'az' ? 'Reytinqiniz:' : 'Ваша оценка:'}
              </Text>
              <View style={styles.starsContainer}>
                <StarRating
                  rating={rating}
                  size={32}
                  readonly={false}
                  onRatingChange={setRating}
                  showHalfStars={false}
                />
              </View>
              {rating > 0 && (
                <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
                  {rating} / 5 {language === 'az' ? 'ulduz' : 'звезд'}
                </Text>
              )}
            </View>

            <View style={styles.commentSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {language === 'az' ? 'Şərh (ixtiyari):' : 'Комментарий (необязательно):'}
              </Text>
              <TextInput
                style={[
                  styles.commentInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder={
                  language === 'az'
                    ? 'Təcrübənizi paylaşın...'
                    : 'Поделитесь своим опытом...'
                }
                placeholderTextColor={colors.textSecondary}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={[styles.characterCount, { color: colors.textSecondary }]}>
                {comment.length}/500
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={handleClose}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>
                {language === 'az' ? 'Ləğv et' : 'Отмена'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                { backgroundColor: colors.primary },
                rating === 0 && { opacity: 0.5 },
              ]}
              onPress={handleSubmit}
              disabled={rating === 0}
            >
              <Text style={[styles.buttonText, { color: 'white' }]}>
                {language === 'az' ? 'Göndər' : 'Отправить'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  targetName: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  starsContainer: {
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 14,
  },
  commentSection: {
    marginBottom: 20,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    marginBottom: 8,
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  submitButton: {
    // backgroundColor applied dynamically
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
});
