import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import {
  Check,
  Circle,
  Star,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useLanguageStore } from '@/store/languageStore';

import { logger } from '@/utils/logger';
interface CreativeEffect {
  id: string;
  name: { az: string; ru: string };
  description: { az: string; ru: string };
  icon: React.ReactNode;
  color: string;
  price: number;
  duration: number; // in days
  type: 'frame';
  frameType:
    | 'frame-green-bold'
    | 'frame-black-bold'
    | 'frame-az-flag'
    | 'frame-blue-bold'
    | 'frame-red-bold';
  isActive?: boolean;
}

const creativeEffects: CreativeEffect[] = [
  {
    id: 'frame-green-bold',
    name: { az: 'Yaşıl qalın çərçivə', ru: 'Зелёная толстая рамка' },
    description: { az: 'Diqqətçəkən qalın yaşıl çərçivə', ru: 'Внимательная толстая зелёная рамка' },
    icon: <Circle size={24} color="#22C55E" />,
    color: '#22C55E',
    price: 0.5,
    duration: 7,
    type: 'frame',
    frameType: 'frame-green-bold',
  },
  {
    id: 'frame-black-bold',
    name: { az: 'Qara qalın çərçivə', ru: 'Чёрная толстая рамка' },
    description: { az: 'Minimal və güclü vurğu üçün', ru: 'Минимально и выразительно' },
    icon: <Circle size={24} color="#111827" />,
    color: '#111827',
    price: 0.5,
    duration: 7,
    type: 'frame',
    frameType: 'frame-black-bold',
  },
  {
    id: 'frame-blue-bold',
    name: { az: 'Mavi qalın çərçivə', ru: 'Синяя толстая рамка' },
    description: { az: 'Təmiz və modern görünüş', ru: 'Чистый и современный вид' },
    icon: <Circle size={24} color="#3B82F6" />,
    color: '#3B82F6',
    price: 0.5,
    duration: 7,
    type: 'frame',
    frameType: 'frame-blue-bold',
  },
  {
    id: 'frame-red-bold',
    name: { az: 'Qırmızı qalın çərçivə', ru: 'Красная толстая рамка' },
    description: { az: 'Güclü vurğu üçün', ru: 'Для сильного акцента' },
    icon: <Circle size={24} color="#EF4444" />,
    color: '#EF4444',
    price: 0.5,
    duration: 7,
    type: 'frame',
    frameType: 'frame-red-bold',
  },
  {
    id: 'frame-az-flag',
    name: { az: 'Azərbaycan bayrağı çərçivəsi', ru: 'Рамка флага Азербайджана' },
    description: { az: 'Mavi-Qırmızı-Yaşıl üçrəngli çərçivə', ru: 'Трёхцветная рамка: синий-красный-зелёный' },
    icon: <Star size={24} color="#0EA5E9" />,
    color: '#0EA5E9',
    price: 0.9,
    duration: 14,
    type: 'frame',
    frameType: 'frame-az-flag',
  },
];

interface CreativeEffectsSectionProps {
  onSelectEffect: (effect: CreativeEffect) => void;
  selectedEffects: CreativeEffect[];
  title: string;
}

const EffectPreview = ({ effect }: { effect: CreativeEffect }) => {
  const azFlagRing = useMemo(() => (
    <View pointerEvents="none" style={styles.flagRing}>
      <LinearGradient
        colors={['#00A3E0', '#ED2939', '#3F9C35']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.flagGradient}
      />
    </View>
  ), []);

  const getStyle = () => {
    switch (effect.frameType) {
      case 'frame-az-flag':
        return { borderWidth: 0 };
      default:
        return {
          borderWidth: 4,
          borderColor: effect.color,
          shadowColor: effect.color,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 3,
        } as const;
    }
  };

  return (
    <View style={styles.effectPreviewContainer}>
      <View testID={`effect-icon-${effect.id}`} style={[styles.effectIcon, { backgroundColor: effect.color + '20' }, getStyle()]}>
        {effect.icon}
      </View>
      {effect.frameType === 'frame-az-flag' && azFlagRing}
    </View>
  );
};

export default function CreativeEffectsSection({ onSelectEffect, selectedEffects, title }: CreativeEffectsSectionProps) {
  const { language } = useLanguageStore();

  const isEffectSelected = (effect: CreativeEffect) => {
    return selectedEffects.some(selected => selected.id === effect.id);
  };

  // Validate effect before selection
  const handleEffectPress = (effect: CreativeEffect) => {
    // ===== VALIDATION START =====

    // 1. Check if effect is valid
    if (!effect || !effect.id) {
      logger.error('[CreativeEffects] Invalid effect:', effect);
      return;
    }

    // 2. Check price
    if (!effect.price || typeof effect.price !== 'number' || effect.price <= 0) {
      logger.error('[CreativeEffects] Invalid effect price:', effect.price);
      return;
    }

    // 3. Check duration
    if (!effect.duration || typeof effect.duration !== 'number' || effect.duration <= 0) {
      logger.error('[CreativeEffects] Invalid effect duration:', effect.duration);
      return;
    }

    // ===== VALIDATION END =====

    logger.debug('[CreativeEffects] Effect card pressed:', effect.id);
    logger.debug('[CreativeEffects] Effect name:', effect.name);
    logger.debug('[CreativeEffects] Effect price:', effect.price);
    logger.debug('[CreativeEffects] Is currently selected:', isEffectSelected(effect));
    logger.debug('[CreativeEffects] Calling onSelectEffect...');

    try {
      onSelectEffect(effect);
      logger.debug('[CreativeEffects] onSelectEffect called successfully');
    } catch (error) {
      logger.error('[CreativeEffects] Error calling onSelectEffect:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text testID="effects-section-title" style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionDescription}>
        {language === 'az'
          ? 'Elanınızı daha cəlbedici etmək üçün kreativ effektlər əlavə edin'
          : 'Добавьте креативные эффекты, чтобы сделать ваше объявление более привлекательным'
        }
      </Text>

      <View style={styles.effectsGrid}>
        {creativeEffects.map((effect) => {
          const isSelected = isEffectSelected(effect);

          return (
            <TouchableOpacity
              testID={`effect-card-${effect.id}`}
              key={effect.id}
              style={[
                styles.effectCard,
                isSelected && { borderColor: effect.color, borderWidth: 2 },
              ]}
              onPress={() => handleEffectPress(effect)}
              activeOpacity={0.7}
            >
              <View style={styles.effectHeader}>
                <EffectPreview effect={effect} />
                {isSelected && (
                  <View style={[styles.selectedIndicator, { backgroundColor: effect.color }]}>
                    <Check size={14} color="white" />
                  </View>
                )}
              </View>

              <Text style={styles.effectName}>
                {effect.name[language as keyof typeof effect.name]}
              </Text>

              <Text style={styles.effectDescription}>
                {effect.description[language as keyof typeof effect.description]}
              </Text>

              <View style={styles.effectDetails}>
                <Text style={styles.effectPrice}>
                  {effect.price} AZN
                </Text>
                <Text style={styles.effectDuration}>
                  {effect.duration} {language === 'az' ? 'gün' : 'дней'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedEffects.length > 0 && (
        <View style={styles.selectedEffectsContainer}>
          <Text style={styles.selectedTitle}>
            {language === 'az' ? 'Seçilmiş Effektlər:' : 'Выбранные эффекты:'} ({selectedEffects.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectedEffects}>
            {selectedEffects.map((effect) => (
              <View key={effect.id} style={[styles.selectedEffect, { borderColor: effect.color }]}>
                <EffectPreview effect={effect} />
                <Text style={styles.selectedEffectName} numberOfLines={2}>
                  {effect.name[language as keyof typeof effect.name]}
                </Text>
                <View style={styles.selectedEffectDetails}>
                  <Text style={styles.selectedEffectPrice}>
                    {effect.price.toFixed(2)} AZN
                  </Text>
                  <Text style={styles.selectedEffectDuration}>
                    {effect.duration}d
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.totalContainer}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>
                {language === 'az' ? 'Ümumi:' : 'Итого:'}
              </Text>
              <Text style={styles.totalText}>
                {selectedEffects.reduce((sum, effect) => sum + effect.price, 0).toFixed(2)} AZN
              </Text>
            </View>
            <Text style={styles.totalDuration}>
              {language === 'az' ? 'Müddət:' : 'Длительность:'} {Math.max(...selectedEffects.map(e => e.duration))} {language === 'az' ? 'gün' : 'дней'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text || '#1F2937',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.textSecondary || '#6B7280',
    lineHeight: 20,
    marginBottom: 16,
  },
  effectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  effectCard: {
    width: '48%',
    backgroundColor: Colors.card || '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border || '#E5E7EB',
    minHeight: 140,
  },
  effectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  effectIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    width: 48,
    height: 48,
    borderRadius: 24,
    zIndex: 1,
  },
  flagGradient: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: 'transparent',
  },
  frameDecoration: {
    position: 'absolute',
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 8,
    padding: 1,
  },
  selectedIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  effectName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text || '#1F2937',
    marginBottom: 4,
  },
  effectDescription: {
    fontSize: 12,
    color: Colors.textSecondary || '#6B7280',
    lineHeight: 16,
    marginBottom: 8,
    flex: 1,
  },
  effectDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  effectPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary || '#0E7490',
  },
  effectDuration: {
    fontSize: 12,
    color: Colors.textSecondary || '#6B7280',
  },
  selectedEffectsContainer: {
    backgroundColor: Colors.card || '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text || '#1F2937',
    marginBottom: 12,
  },
  selectedEffects: {
    marginBottom: 12,
  },
  selectedEffect: {
    backgroundColor: Colors.background || '#F9FAFB',
    borderRadius: 8,
    padding: 8,
    marginRight: 8,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 80,
  },
  selectedEffectIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  selectedEffectName: {
    fontSize: 10,
    fontWeight: '500',
    color: Colors.text || '#1F2937',
    textAlign: 'center',
    marginBottom: 2,
  },
  selectedEffectPrice: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.primary || '#0E7490',
  },
  selectedEffectDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  selectedEffectDuration: {
    fontSize: 9,
    color: Colors.textSecondary || '#6B7280',
    fontWeight: '500',
  },
  totalContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border || '#E5E7EB',
    paddingTop: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text || '#1F2937',
  },
  totalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary || '#0E7490',
  },
  totalDuration: {
    fontSize: 12,
    color: Colors.textSecondary || '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  particle: {
    position: 'absolute',
    zIndex: 5,
  },
  confettiPiece: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  bubble: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
  effectPreviewContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
});

export { CreativeEffect };
