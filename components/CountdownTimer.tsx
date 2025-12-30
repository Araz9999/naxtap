import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Keyboard,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Timer, Edit3 } from 'lucide-react-native';

import { useLanguageStore } from '@/store/languageStore';

import { logger } from '@/utils/logger';
interface CountdownTimerProps {
  endDate?: Date | string | number | { toISOString: () => string };
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  title?: string;
  onTimeChange?: (endDate: Date) => void;
  editable?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface ManualTimeInput {
  days: string;
  hours: string;
  minutes: string;
}

export default function CountdownTimer({
  endDate,
  style,
  compact = false,
  title,
  onTimeChange,
  editable = false,
}: CountdownTimerProps) {
  const { language } = useLanguageStore();
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [manualTime, setManualTime] = useState<ManualTimeInput>({ days: '0', hours: '0', minutes: '0' });

  const normalizeToDate = (value?: Date | string | number | { toISOString: () => string }): Date => {
    try {
      if (value === undefined || value === null) {
        return new Date(Date.now() + 24 * 60 * 60 * 1000);
      }
      if (value instanceof Date) {
        const time = value.getTime();
        if (isNaN(time)) {
          return new Date(Date.now() + 24 * 60 * 60 * 1000);
        }
        return new Date(time);
      }
      if (typeof value === 'object' && 'toISOString' in value) {
        const isoString = value.toISOString();
        const parsed = new Date(isoString);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
        return new Date(Date.now() + 24 * 60 * 60 * 1000);
      }
      if (typeof value === 'number') {
        // Treat small numbers as hours-from-now for custom inputs (e.g. 6 => 6 hours)
        if (Math.abs(value) <= 1000) {
          return new Date(Date.now() + value * 60 * 60 * 1000);
        }
        // Seconds vs milliseconds
        const isSeconds = Math.abs(value) < 1_000_000_000_000;
        const ts = isSeconds ? value * 1000 : value;
        const d = new Date(ts);
        return isNaN(d.getTime()) ? new Date(Date.now() + 24 * 60 * 60 * 1000) : d;
      }
      if (typeof value === 'string') {
        // Handle common local formats without timezone to avoid UTC shift
        const trimmed = value.trim();
        const localMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
        if (localMatch) {
          const y = parseInt(localMatch[1], 10);
          const m = parseInt(localMatch[2], 10) - 1;
          const d = parseInt(localMatch[3], 10);
          const hh = parseInt(localMatch[4], 10);
          const mm = parseInt(localMatch[5], 10);
          const ss = localMatch[6] ? parseInt(localMatch[6], 10) : 0;
          return new Date(y, m, d, hh, mm, ss, 0);
        }
        // ISO or other parseable strings
        const parsed = new Date(trimmed);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
        return new Date(Date.now() + 24 * 60 * 60 * 1000);
      }
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    } catch (e) {
      logger.error('[CountdownTimer] Error normalizing date:', e);
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  };

  // Use useMemo to normalize endDate and avoid unnecessary re-renders
  const currentEndDate = useMemo(() => normalizeToDate(endDate), [endDate]);

  const initialDurationMs = useRef<number>(0);
  const pulseAnim = useMemo(() => new Animated.Value(1), []);

  // Update initial duration when endDate changes
  useEffect(() => {
    const ms = currentEndDate.getTime() - Date.now();
    initialDurationMs.current = ms > 0 ? ms : 1000;
    logger.debug('[CountdownTimer] initialDurationMs set to', initialDurationMs.current, 'ms remaining:', ms);
  }, [currentEndDate]);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const endTs = currentEndDate?.getTime?.();
      if (!endTs || isNaN(endTs)) {
        logger.debug('[CountdownTimer] Invalid endTs, marking expired');
        setIsExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const distance = Math.max(0, endTs - now);
      if (distance <= 0) {
        setIsExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      setTimeLeft({ days, hours, minutes, seconds });
      setIsExpired(false);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [currentEndDate]);

  useEffect(() => {
    // ✅ Type-safe animation reference
    let animationRef: Animated.CompositeAnimation | null = null;
    let isActive = true;

    const pulse = () => {
      if (!isActive) return;

      try {
        animationRef = Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]);

        animationRef.start((result) => {
          // ✅ Check finished property
          if (result.finished && !isExpired && isActive) {
            pulse();
          }
        });
      } catch (error) {
        logger.error('[CountdownTimer] Animation error:', error);
      }
    };

    if (!isExpired) {
      pulse();
    }

    return () => {
      isActive = false;
      try {
        if (animationRef) {
          animationRef.stop();
          animationRef = null;  // ✅ Clear reference
        }
        // ✅ Reset animation value
        pulseAnim.setValue(1);
      } catch (error) {
        logger.error('[CountdownTimer] Cleanup error:', error);
      }
    };
  }, [isExpired, pulseAnim]);

  const handleManualTimeSet = useCallback(() => {
    try {
      // ✅ Parse and validate inputs
      const daysStr = manualTime.days.trim();
      const hoursStr = manualTime.hours.trim();
      const minutesStr = manualTime.minutes.trim();

      // ✅ Check if inputs are provided
      if (!daysStr && !hoursStr && !minutesStr) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Vaxt daxil edin' : 'Введите время',
        );
        return;
      }

      const days = parseInt(daysStr, 10) || 0;
      const hours = parseInt(hoursStr, 10) || 0;
      const minutes = parseInt(minutesStr, 10) || 0;

      // ✅ Comprehensive validation
      if (isNaN(days) || isNaN(hours) || isNaN(minutes)) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Yanlış rəqəmlər' : 'Неверные числа',
        );
        return;
      }

      // ✅ Range validation
      if (days < 0 || days > 365) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Gün 0-365 arasında olmalıdır' : 'Дни должны быть от 0 до 365',
        );
        return;
      }

      if (hours < 0 || hours > 23) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Saat 0-23 arasında olmalıdır' : 'Часы должны быть от 0 до 23',
        );
        return;
      }

      if (minutes < 0 || minutes > 59) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Dəqiqə 0-59 arasında olmalıdır' : 'Минуты должны быть от 0 до 59',
        );
        return;
      }

      // ✅ Check if time is zero
      if (days === 0 && hours === 0 && minutes === 0) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Vaxt 0-dan böyük olmalıdır' : 'Время должно быть больше 0',
        );
        return;
      }

      // ✅ Calculate total milliseconds
      const totalMilliseconds =
        (days * 24 * 60 * 60 * 1000) +
        (hours * 60 * 60 * 1000) +
        (minutes * 60 * 1000);

      // ✅ Check for overflow (max 1 year)
      const MAX_DURATION_MS = 365 * 24 * 60 * 60 * 1000;
      if (totalMilliseconds > MAX_DURATION_MS) {
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Maksimum müddət 365 gündür' : 'Максимальный срок 365 дней',
        );
        return;
      }

      const newEndDate = new Date(Date.now() + totalMilliseconds);

      // ✅ Validate the created date
      if (isNaN(newEndDate.getTime())) {
        logger.error('[CountdownTimer] Invalid date created');
        Alert.alert(
          language === 'az' ? 'Xəta' : 'Ошибка',
          language === 'az' ? 'Tarix yaradıla bilmədi' : 'Не удалось создать дату',
        );
        return;
      }

      logger.debug('[CountdownTimer] Manual time set:', {
        days, hours, minutes,
        totalMs: totalMilliseconds,
        newEndDate: newEndDate.toISOString(),
        currentTime: new Date().toISOString(),
      });

      initialDurationMs.current = totalMilliseconds > 0 ? totalMilliseconds : 1000;
      setShowManualInput(false);
      setIsExpired(false);

      if (onTimeChange) {
        onTimeChange(newEndDate);
      }
    } catch (error) {
      logger.error('[CountdownTimer] Error setting manual time:', error);
      Alert.alert(
        language === 'az' ? 'Xəta' : 'Ошибка',
        language === 'az' ? 'Vaxt təyin edilərkən xəta' : 'Ошибка при установке времени',
      );
    }
  } ,([]));

  const openManualInput = useCallback(() => {
    try {
      const now = Date.now();
      const endTs = currentEndDate.getTime();

      // ✅ Validate endDate
      if (isNaN(endTs)) {
        logger.error('[CountdownTimer] Invalid endDate in openManualInput');
        // Set default to 1 day
        setManualTime({
          days: '1',
          hours: '0',
          minutes: '0',
        });
        setShowManualInput(true);
        return;
      }

      const distance = Math.max(0, endTs - now);

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

      // ✅ Ensure values are within valid ranges
      setManualTime({
        days: Math.min(365, Math.max(0, days)).toString(),
        hours: Math.min(23, Math.max(0, hours)).toString(),
        minutes: Math.min(59, Math.max(0, minutes)).toString(),
      });

      setShowManualInput(true);
      logger.debug('[CountdownTimer] Manual input opened:', { days, hours, minutes });
    } catch (error) {
      logger.error('[CountdownTimer] Error opening manual input:', error);
      // Set default values on error
      setManualTime({
        days: '1',
        hours: '0',
        minutes: '0',
      });
      setShowManualInput(true);
    }
  } ,([]));

  const renderManualInputModal = () => (
    <Modal
      visible={showManualInput}
      transparent
      animationType="slide"
      onRequestClose={() => {
        Keyboard.dismiss();
        setShowManualInput(false);
      }}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => { // Fix: Expected 2 arguments, but got 1.
          Keyboard.dismiss();
          setShowManualInput(false);
        }}
      >
        <TouchableOpacity
          style={styles.modalContent}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={styles.modalTitle}>
            {language === 'az' ? 'Vaxt Təyin Et' : 'Установить время'}
          </Text>

          <View style={styles.timeInputContainer}>
            <View style={styles.timeInputGroup}>
              <Text style={styles.timeInputLabel}>
                {language === 'az' ? 'Gün' : 'Дни'}
              </Text>
              <TextInput
                style={styles.timeInput}
                value={manualTime.days}
                onChangeText={(text) => {
                  // ✅ Filter to allow only digits
                  const filtered = text.replace(/[^0-9]/g, '');
                  // ✅ Limit to 3 digits (max 365)
                  const limited = filtered.substring(0, 3);
                  setManualTime(prev => ({ ...prev, days: limited }));
                }}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                maxLength={3}
                returnKeyType="next"
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.timeInputGroup}>
              <Text style={styles.timeInputLabel}>
                {language === 'az' ? 'Saat' : 'Часы'}
              </Text>
              <TextInput
                style={styles.timeInput}
                value={manualTime.hours}
                onChangeText={(text) => {
                  // ✅ Filter to allow only digits
                  const filtered = text.replace(/[^0-9]/g, '');
                  // ✅ Limit to 2 digits (max 23)
                  const limited = filtered.substring(0, 2);
                  setManualTime(prev => ({ ...prev, hours: limited }));
                }}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                maxLength={2}
                returnKeyType="next"
                blurOnSubmit={false}
              />
            </View>

            <View style={styles.timeInputGroup}>
              <Text style={styles.timeInputLabel}>
                {language === 'az' ? 'Dəqiqə' : 'Минуты'}
              </Text>
              <TextInput
                style={styles.timeInput}
                value={manualTime.minutes}
                onChangeText={(text) => {
                  // ✅ Filter to allow only digits
                  const filtered = text.replace(/[^0-9]/g, '');
                  // ✅ Limit to 2 digits (max 59)
                  const limited = filtered.substring(0, 2);
                  setManualTime(prev => ({ ...prev, minutes: limited }));
                }}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#9CA3AF"
                maxLength={2}
                returnKeyType="done"
                onSubmitEditing={handleManualTimeSet}
              />
            </View>
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowManualInput(false)}
            >
              <Text style={styles.cancelButtonText}>
                {language === 'az' ? 'Ləğv et' : 'Отмена'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.confirmButton]}
              onPress={handleManualTimeSet}
            >
              <Text style={styles.confirmButtonText}>
                {language === 'az' ? 'Təyin et' : 'Установить'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  if (isExpired) {
    return (
      <>
        <View style={[styles.container, styles.expiredContainer, style]} testID="countdown-expired">
          <View style={styles.expiredContent}>
            <Text style={styles.expiredText}>
              {language === 'az' ? 'Müddət Bitdi!' : 'Время истекло!'}
            </Text>
            {editable && (
              <TouchableOpacity style={styles.editButton} onPress={openManualInput}>
                <Edit3 size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        {renderManualInputModal()}
      </>
    );
  }

  if (compact) {
    return (
      <>
        <Animated.View style={[styles.compactContainer, style, { transform: [{ scale: pulseAnim }] }]} testID="countdown-compact">
          <Timer size={12} color="#FF4500" />
          <Text style={styles.compactText}>
            {timeLeft.days > 0 ? `${timeLeft.days}${language === 'az' ? 'g' : 'д'} ` : ''}
            {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
          </Text>
          {editable && (
            <TouchableOpacity style={styles.compactEditButton} onPress={openManualInput}>
              <Edit3 size={10} color="#FF4500" />
            </TouchableOpacity>
          )}
        </Animated.View>
        {renderManualInputModal()}
      </>
    );
  }

  return (
    <>
      <Animated.View style={[styles.container, style, { transform: [{ scale: pulseAnim }] }]} testID="countdown-full">
        <View style={styles.header}>
          <Timer size={16} color="#FF4500" />
          <Text style={styles.title}>
            {title || (language === 'az' ? 'Təcili Satış!' : 'Срочная продажа!')}
          </Text>
          {editable && (
            <TouchableOpacity style={styles.editButton} onPress={openManualInput}>
              <Edit3 size={16} color="#FF4500" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.timeContainer}>
          {timeLeft.days > 0 && (
            <View style={styles.timeUnit}>
              <Text style={styles.timeValue}>{timeLeft.days}</Text>
              <Text style={styles.timeLabel}>{language === 'az' ? 'Gün' : 'Дней'}</Text>
            </View>
          )}

          <View style={styles.timeUnit}>
            <Text style={styles.timeValue}>{String(timeLeft.hours).padStart(2, '0')}</Text>
            <Text style={styles.timeLabel}>{language === 'az' ? 'Saat' : 'Часов'}</Text>
          </View>

          <Text style={styles.separator}>:</Text>

          <View style={styles.timeUnit}>
            <Text style={styles.timeValue}>{String(timeLeft.minutes).padStart(2, '0')}</Text>
            <Text style={styles.timeLabel}>{language === 'az' ? 'Dəq' : 'Мин'}</Text>
          </View>

          <Text style={styles.separator}>:</Text>

          <View style={styles.timeUnit}>
            <Text style={styles.timeValue}>{String(timeLeft.seconds).padStart(2, '0')}</Text>
            <Text style={styles.timeLabel}>{language === 'az' ? 'San' : 'Сек'}</Text>
          </View>
        </View>

        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${(() => {
                  try {
                    // ✅ Get current time
                    const now = Date.now();

                    // ✅ Get end timestamp
                    const endTs = currentEndDate?.getTime?.();
                    if (!endTs || isNaN(endTs)) {
                      return 100; // Fully expired if invalid
                    }

                    // ✅ Calculate remaining time
                    const remaining = Math.max(0, endTs - now);

                    // ✅ Get initial duration
                    let base = initialDurationMs.current;

                    // ✅ Validate base duration
                    if (typeof base !== 'number' || isNaN(base) || base <= 0) {
                      // Fallback: use remaining time as base
                      base = remaining > 0 ? remaining : 1000;
                    }

                    // ✅ If expired, return 100%
                    if (remaining <= 0) {
                      return 100;
                    }

                    // ✅ Calculate progress percentage (elapsed / total)
                    const elapsed = base - remaining;
                    const percentage = (elapsed / base) * 100;

                    // ✅ Clamp between 0 and 100
                    return Math.max(0, Math.min(100, percentage));
                  } catch (error) {
                    logger.error('[CountdownTimer] Progress calculation error:', error);
                    return 0;
                  }
                })()}%`,
              },
            ]}
          />
        </View>
      </Animated.View>
      {renderManualInputModal()}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 69, 0, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FF4500',
    marginVertical: 4,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 69, 0, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#FF4500',
  },
  expiredContainer: {
    backgroundColor: 'rgba(156, 163, 175, 0.1)',
    borderColor: '#9CA3AF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF4500',
    marginLeft: 4,
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  timeUnit: {
    alignItems: 'center',
    marginHorizontal: 4,
  },
  timeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF4500',
  },
  timeLabel: {
    fontSize: 10,
    color: '#FF4500',
    marginTop: 2,
  },
  separator: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF4500',
    marginHorizontal: 2,
  },
  compactText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FF4500',
    marginLeft: 4,
  },
  expiredText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 69, 0, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF4500',
    borderRadius: 2,
  },
  expiredContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  editButton: {
    padding: 4,
  },
  compactEditButton: {
    padding: 2,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
  },
  timeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  timeInputGroup: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  timeInputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    width: '100%',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  confirmButton: {
    backgroundColor: '#FF4500',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
