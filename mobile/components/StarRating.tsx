import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { useThemeStore } from '@/store/themeStore';
import { getColors } from '@/constants/colors';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  showHalfStars?: boolean;
}

export default function StarRating({
  rating,
  maxRating = 5,
  size = 16,
  onRatingChange,
  readonly = true,
  showHalfStars = true,
}: StarRatingProps) {
  const { themeMode, colorTheme } = useThemeStore();
  const colors = getColors(themeMode, colorTheme);

  const handleStarPress = (starIndex: number) => {
    if (readonly || !onRatingChange) return;
    onRatingChange(starIndex + 1);
  };

  const renderStar = (index: number) => {
    const starRating = index + 1;
    const isFullStar = rating >= starRating;
    const isHalfStar = showHalfStars && rating >= starRating - 0.5 && rating < starRating;

    let fillColor = 'transparent';
    let strokeColor = colors.textSecondary;

    if (isFullStar) {
      fillColor = '#FFD700';
      strokeColor = '#FFD700';
    } else if (isHalfStar) {
      fillColor = 'transparent';
      strokeColor = '#FFD700';
    }

    return (
      <TouchableOpacity
        key={index}
        onPress={() => handleStarPress(index)}
        disabled={readonly}
        style={styles.starContainer}
      >
        <Star
          size={size}
          color={strokeColor}
          fill={fillColor}
        />
        {isHalfStar && (
          <View style={[styles.halfStarOverlay, { width: size / 2, height: size }]}>
            <Star
              size={size}
              color="#FFD700"
              fill="#FFD700"
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: maxRating }, (_, index) => renderStar(index))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starContainer: {
    marginRight: 2,
    position: 'relative',
  },
  halfStarOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    height: '100%',
    overflow: 'hidden',
  },
});
