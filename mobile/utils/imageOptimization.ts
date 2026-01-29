/**
 * Image Optimization Utilities
 * Provides helpers for optimizing image loading and performance
 */

import { Image } from 'expo-image';

import { logger } from '@/utils/logger';
/**
 * Preload images to improve performance
 */
export async function preloadImages(imageUris: string[]): Promise<void> {
  try {
    await Promise.all(
      imageUris.map((uri) =>
        Image.prefetch(uri, {
          cachePolicy: 'memory-disk',
        }),
      ),
    );
  } catch (error) {
    if (__DEV__) {
      logger.warn('Failed to preload some images:', error);
    }
  }
}

/**
 * Get optimized image source based on device capabilities
 */
export function getOptimizedImageSource(
  uri: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
  },
): { uri: string; width?: number; height?: number } {
  // For remote images, you could add query parameters for image optimization services
  // Example: Cloudinary, Imgix, etc.
  const { width, height, quality = 80 } = options || {};

  // If using an image CDN, append optimization parameters
  // This is a placeholder - adjust based on your CDN
  if (uri.includes('cdn.') || uri.includes('cloudinary.')) {
    const params = new URLSearchParams();
    if (width) params.append('w', width.toString());
    if (height) params.append('h', height.toString());
    params.append('q', quality.toString());

    const separator = uri.includes('?') ? '&' : '?';
    return {
      uri: `${uri}${separator}${params.toString()}`,
      width,
      height,
    };
  }

  return { uri, width, height };
}

/**
 * Image cache configuration for expo-image
 */
export const imageConfig = {
  // Use memory-disk caching for better performance
  cachePolicy: 'memory-disk' as const,

  // Fade in animation duration (ms)
  transition: 200,

  // Priority for loading
  priority: 'normal' as const,

  // Placeholder while loading
  placeholder: undefined,

  // Content fit
  contentFit: 'cover' as const,
};

/**
 * Optimized image props for listing images
 */
export const listingImageProps = {
  cachePolicy: 'memory-disk' as const,
  transition: 200,
  priority: 'high' as const,
  contentFit: 'cover' as const,
  recyclingKey: undefined, // Set this for list items
};

/**
 * Optimized image props for avatar images
 */
export const avatarImageProps = {
  cachePolicy: 'memory-disk' as const,
  transition: 100,
  priority: 'normal' as const,
  contentFit: 'cover' as const,
};

/**
 * Clear image cache if needed (for memory management)
 */
export async function clearImageCache(): Promise<void> {
  try {
    await Image.clearMemoryCache();
    await Image.clearDiskCache();
  } catch (error) {
    if (__DEV__) {
      logger.error('Failed to clear image cache:', error);
    }
  }
}

/**
 * Get cache size for monitoring
 */
export async function getCacheSize(): Promise<{ memory: number; disk: number }> {
  // expo-image doesn't provide this directly; return placeholders.
  // (Old try/catch was flagged as unreachable because the try block can't throw.)
  return { memory: 0, disk: 0 };
}
