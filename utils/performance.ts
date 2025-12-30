/**
 * Performance Optimization Utilities
 * @module utils/performance
 *
 * Provides utilities for optimizing React Native app performance:
 * - Memoization helpers
 * - Debouncing and throttling
 * - Image optimization
 * - List rendering optimization
 */

import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { InteractionManager, Platform } from 'react-native';

/**
 * Custom hook for debouncing values
 * Useful for search inputs, API calls, etc.
 *
 * @example
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 * useEffect(() => {
 *   searchAPI(debouncedSearchTerm);
 * }, [debouncedSearchTerm]);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Custom hook for throttling callbacks
 * Limits function execution rate
 *
 * @example
 * const throttledScroll = useThrottle(handleScroll, 200);
 * <ScrollView onScroll={throttledScroll} />
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
): T {
  const lastRan = useRef(Date.now());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(
    ((...args) => {
      const now = Date.now();
      const timeSinceLastRan = now - lastRan.current;

      if (timeSinceLastRan >= delay) {
        callback(...args);
        lastRan.current = now;
      } else {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          callback(...args);
          lastRan.current = Date.now();
        }, delay - timeSinceLastRan);
      }
    }) as T,
    [callback, delay],
  );
}

/**
 * Defer execution until after interactions complete
 * Prevents UI jank during animations/gestures
 *
 * @example
 * runAfterInteractions(() => {
 *   expensiveOperation();
 * });
 */
export function runAfterInteractions(callback: () => void): void {
  InteractionManager.runAfterInteractions(() => {
    callback();
  });
}

/**
 * Memoize expensive computations
 * Returns cached result if inputs haven't changed
 *
 * @example
 * const expensiveResult = useMemoizedCallback(
 *   () => complexCalculation(data),
 *   [data]
 * );
 */
export function useMemoizedCallback<T>(
  factory: () => T,
  deps: React.DependencyList,
): T {
  return useMemo(factory, deps);
}

/**
 * Optimize image loading for lists
 * Provides optimal image dimensions based on device
 */
export const ImageOptimization = {
  /**
   * Get optimized image dimensions for thumbnail
   */
  getThumbnailSize: (): { width: number; height: number } => {
    const scale = Platform.OS === 'android' ? 2 : 3;
    return {
      width: 150 * scale,
      height: 150 * scale,
    };
  },

  /**
   * Get optimized image dimensions for full screen
   */
  getFullScreenSize: (): { width: number; height: number } => {
    const scale = Platform.OS === 'android' ? 2 : 3;
    return {
      width: 1080 * scale,
      height: 1920 * scale,
    };
  },

  /**
   * Compress image quality for upload
   */
  getCompressionQuality: (): number => {
    return Platform.OS === 'android' ? 0.7 : 0.8;
  },
};

/**
 * Optimize FlatList rendering
 * Provides optimal configuration for large lists
 */
export const ListOptimization = {
  /**
   * Get optimized FlatList props
   */
  getOptimizedListProps: () => ({
    // Rendering optimizations
    removeClippedSubviews: true, // Unmount offscreen items (Android)
    maxToRenderPerBatch: 10, // Reduce initial render time
    updateCellsBatchingPeriod: 50, // Batch updates
    initialNumToRender: 10, // Initial items to render
    windowSize: 10, // Number of screenfuls to render

    // Performance optimizations
    getItemLayout: (data: any, index: number) => ({
      length: 100, // Estimated item height
      offset: 100 * index,
      index,
    }),

    // Key extraction
    keyExtractor: (item: any, index: number) =>
      item.id || `item-${index}`,
  }),

  /**
   * Check if item should be virtualized
   */
  shouldVirtualizeItem: (itemCount: number): boolean => {
    return itemCount > 50; // Virtualize for large lists
  },
};

/**
 * Memory optimization utilities
 */
export const MemoryOptimization = {
  /**
   * Clear image cache
   */
  clearImageCache: async (): Promise<void> => {
    // Implementation depends on image library
    // For expo-image:
    // await Image.clearCache();
  },

  /**
   * Check memory pressure
   */
  isLowMemory: (): boolean => {
    // Platform-specific memory checks
    return false; // Implement based on device specs
  },

  /**
   * Cleanup unused resources
   */
  cleanup: (): void => {
    // Clear caches, remove listeners, etc.
    if (global.gc) {
      global.gc(); // Force garbage collection (dev only)
    }
  },
};

/**
 * Performance monitoring
 */
export class PerformanceMonitor {
  private static marks = new Map<string, number>();

  /**
   * Start performance measurement
   */
  static start(label: string): void {
    this.marks.set(label, Date.now());
  }

  /**
   * End performance measurement and log duration
   */
  static end(label: string): number {
    const startTime = this.marks.get(label);
    if (!startTime) {
      console.warn(`No start mark found for ${label}`);
      return 0;
    }

    const duration = Date.now() - startTime;
    console.log(`⏱️ ${label}: ${duration}ms`);
    this.marks.delete(label);
    return duration;
  }

  /**
   * Measure function execution time
   */
  static async measure<T>(
    label: string,
    fn: () => T | Promise<T>,
  ): Promise<T> {
    this.start(label);
    try {
      const result = await Promise.resolve(fn());
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }
}

/**
 * Bundle size optimization utilities
 */
export const BundleOptimization = {
  /**
   * Lazy load heavy modules
   */
  lazyImport: <T>(
    importFn: () => Promise<{ default: T }>,
  ): (() => Promise<T>) => {
    let module: T | null = null;

    return async () => {
      if (!module) {
        const imported = await importFn();
        module = imported.default;
      }
      return module;
    };
  },

  /**
   * Check if feature should be loaded
   */
  shouldLoadFeature: (featureName: string): boolean => {
    // Implement feature flags logic
    return true;
  },
};

/**
 * React Native specific optimizations
 */
export const ReactNativeOptimization = {
  /**
   * Optimize ScrollView performance
   */
  getScrollViewProps: () => ({
    scrollEventThrottle: 16, // 60 FPS
    bounces: true,
    showsVerticalScrollIndicator: Platform.OS === 'ios',
    overScrollMode: 'never', // Android
  }),

  /**
   * Optimize TextInput performance
   */
  getTextInputProps: () => ({
    autoCorrect: false,
    spellCheck: false,
    autoCapitalize: 'none',
    keyboardType: 'default' as const,
  }),
};

export default {
  useDebounce,
  useThrottle,
  runAfterInteractions,
  useMemoizedCallback,
  ImageOptimization,
  ListOptimization,
  MemoryOptimization,
  PerformanceMonitor,
  BundleOptimization,
  ReactNativeOptimization,
};
