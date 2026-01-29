import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Colors from '@/constants/colors';

interface LoadingSkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

/**
 * Loading Skeleton Component
 * Animated placeholder while content is loading
 */
export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 8,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

/**
 * Card Skeleton - Pre-made skeleton for card layouts
 */
export const CardSkeleton: React.FC = () => {
  return (
    <View style={styles.cardContainer}>
      <LoadingSkeleton height={200} borderRadius={12} style={styles.image} />
      <View style={styles.content}>
        <LoadingSkeleton width="80%" height={24} style={styles.title} />
        <LoadingSkeleton width="60%" height={16} style={styles.subtitle} />
        <View style={styles.footer}>
          <LoadingSkeleton width={80} height={32} borderRadius={8} />
          <LoadingSkeleton width={100} height={20} />
        </View>
      </View>
    </View>
  );
};

/**
 * List Item Skeleton
 */
export const ListItemSkeleton: React.FC = () => {
  return (
    <View style={styles.listItem}>
      <LoadingSkeleton width={48} height={48} borderRadius={24} />
      <View style={styles.listContent}>
        <LoadingSkeleton width="70%" height={18} style={{ marginBottom: 8 }} />
        <LoadingSkeleton width="50%" height={14} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: Colors.border || '#E5E7EB',
  },
  cardContainer: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    marginBottom: 0,
  },
  content: {
    padding: 16,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
    marginBottom: 8,
  },
  listContent: {
    flex: 1,
    marginLeft: 12,
  },
});

export default LoadingSkeleton;
