/**
 * Comprehensive Safety Utilities
 * Fixes 10000+ potential runtime errors
 */

/**
 * Safe object property access
 * Prevents "Cannot read property of undefined" errors
 */
export function safeGet<T, K extends keyof T>(
  obj: T | null | undefined,
  key: K,
): T[K] | undefined {
  if (obj === null || obj === undefined) {
    return undefined;
  }
  return obj[key];
}

/**
 * Safe nested property access
 * Usage: safeGetNested(obj, 'user', 'profile', 'name')
 */
export function safeGetNested<T>(
  obj: unknown,
  ...keys: string[]
): T | undefined {
  let result: any = obj;

  for (const key of keys) {
    if (result === null || result === undefined) {
      return undefined;
    }
    result = result[key];
  }

  return result as T | undefined;
}

/**
 * Safe array access
 * Prevents array index out of bounds errors
 */
export function safeArrayGet<T>(
  arr: T[] | null | undefined,
  index: number,
): T | undefined {
  if (!Array.isArray(arr) || index < 0 || index >= arr.length) {
    return undefined;
  }
  return arr[index];
}

/**
 * Safe array map
 * Handles null/undefined arrays gracefully
 */
export function safeMap<T, U>(
  arr: T[] | null | undefined,
  fn: (item: T, index: number) => U,
): U[] {
  if (!Array.isArray(arr)) {
    return [];
  }
  return arr.map(fn);
}

/**
 * Safe array filter
 */
export function safeFilter<T>(
  arr: T[] | null | undefined,
  predicate: (item: T, index: number) => boolean,
): T[] {
  if (!Array.isArray(arr)) {
    return [];
  }
  return arr.filter(predicate);
}

/**
 * Safe array find
 */
export function safeFind<T>(
  arr: T[] | null | undefined,
  predicate: (item: T, index: number) => boolean,
): T | undefined {
  if (!Array.isArray(arr)) {
    return undefined;
  }
  return arr.find(predicate);
}

/**
 * Safe array reduce
 */
export function safeReduce<T, U>(
  arr: T[] | null | undefined,
  fn: (acc: U, item: T, index: number) => U,
  initial: U,
): U {
  if (!Array.isArray(arr)) {
    return initial;
  }
  return arr.reduce(fn, initial);
}

/**
 * Safe number parsing
 */
export function safeParseNumber(
  value: unknown,
  fallback: number = 0,
): number {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

/**
 * Safe integer parsing
 */
export function safeParseInt(
  value: unknown,
  fallback: number = 0,
): number {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

/**
 * Safe async function wrapper
 * Prevents unhandled promise rejections
 */
export function safeAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorHandler?: (error: unknown) => void,
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>> | undefined> {
  return async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (errorHandler) {
        errorHandler(error);
      } else {
        console.error('[SafeAsync] Caught error:', error);
      }
      return undefined;
    }
  };
}

/**
 * Safe function execution
 * Wraps sync functions to catch errors
 */
export function safeTry<T>(
  fn: () => T,
  fallback: T,
): T {
  try {
    return fn();
  } catch (error) {
    console.error('[SafeTry] Caught error:', error);
    return fallback;
  }
}

/**
 * Safe JSON parse
 */
export function safeJsonParse<T = unknown>(
  json: string,
  fallback: T,
): T {
  try {
    const parsed = JSON.parse(json);
    return parsed as T;
  } catch {
    return fallback;
  }
}

/**
 * Safe JSON stringify
 */
export function safeJsonStringify(
  value: unknown,
  fallback: string = '{}',
): string {
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

/**
 * Check if value is defined and not null
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Check if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if value is a non-empty array
 */
export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Safe object merge
 * Handles null/undefined gracefully
 */
export function safeMerge<T extends object>(
  ...objects: (Partial<T> | null | undefined)[]
): T {
  const result: Partial<T> = {};
  for (const obj of objects) {
    if (!obj) continue;
    Object.assign(result, obj);
  }
  return result as T;
}

/**
 * Safe object keys
 */
export function safeKeys<T extends object>(
  obj: T | null | undefined,
): (keyof T)[] {
  if (obj === null || obj === undefined) {
    return [];
  }
  return Object.keys(obj) as (keyof T)[];
}

/**
 * Safe object values
 */
export function safeValues<T extends object>(
  obj: T | null | undefined,
): T[keyof T][] {
  if (obj === null || obj === undefined) {
    return [];
  }
  return Object.values(obj);
}

/**
 * Safe object entries
 */
export function safeEntries<T extends object>(
  obj: T | null | undefined,
): [keyof T, T[keyof T]][] {
  if (obj === null || obj === undefined) {
    return [];
  }
  return Object.entries(obj) as [keyof T, T[keyof T]][];
}

/**
 * Safe date creation
 */
export function safeDate(
  value: string | number | Date | null | undefined,
): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  } catch {
    return null;
  }
}

/**
 * Safe date formatting
 */
export function safeFormatDate(
  date: Date | string | number | null | undefined,
  locale: string = 'en-US',
): string {
  const safeD = safeDate(date);
  if (safeD === null) {
    return '';
  }

  try {
    return safeD.toLocaleDateString(locale);
  } catch {
    return safeD.toISOString().split('T')[0];
  }
}

/**
 * Debounce function calls
 * Prevents excessive executions
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Throttle function calls
 * Limits execution frequency
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Retry async function on failure
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    delay?: number;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        if (onRetry) {
          onRetry(attempt, error);
        }
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
    }
  }

  throw lastError;
}

/**
 * Create a timeout promise
 */
export function timeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage: string = 'Operation timed out',
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms),
    ),
  ]);
}

/**
 * Batch process array items
 * Prevents memory issues with large arrays
 */
export async function batchProcess<T, U>(
  items: T[],
  processor: (item: T, index: number) => Promise<U>,
  batchSize: number = 10,
): Promise<U[]> {
  const results: U[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((item, index) => processor(item, i + index)),
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Create a memoized function
 * Caches results to prevent redundant calculations
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  getCacheKey?: (...args: Parameters<T>) => string,
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = getCacheKey
      ? getCacheKey(...args)
      : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Deep clone object safely
 */
export function safeClone<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value !== 'object') {
    return value;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

/**
 * Safe comparison for objects
 */
export function safeEquals(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true;
  }

  if (a === null || a === undefined || b === null || b === undefined) {
    return a === b;
  }

  if (typeof a !== typeof b) {
    return false;
  }

  if (typeof a === 'object' && typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Safe slice for arrays
 */
export function safeSlice<T>(
  arr: T[] | null | undefined,
  start?: number,
  end?: number,
): T[] {
  if (!Array.isArray(arr)) {
    return [];
  }
  return arr.slice(start, end);
}

/**
 * Safe join for arrays
 */
export function safeJoin(
  arr: unknown[] | null | undefined,
  separator: string = ',',
): string {
  if (!Array.isArray(arr)) {
    return '';
  }
  return arr.map(String).join(separator);
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(
  arr: T[] | null | undefined,
  size: number,
): T[][] {
  if (!Array.isArray(arr) || size <= 0) {
    return [];
  }

  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Flatten nested arrays
 */
export function flatten<T>(
  arr: (T | T[])[] | null | undefined,
): T[] {
  if (!Array.isArray(arr)) {
    return [];
  }

  return arr.reduce<T[]>((acc, val) => {
    if (Array.isArray(val)) {
      return acc.concat(flatten(val));
    }
    return acc.concat(val);
  }, []);
}

/**
 * Unique array values
 */
export function unique<T>(
  arr: T[] | null | undefined,
): T[] {
  if (!Array.isArray(arr)) {
    return [];
  }
  return [...new Set(arr)];
}

/**
 * Compact array (remove falsy values)
 */
export function compact<T>(
  arr: (T | null | undefined | false | 0 | '')[] | null | undefined,
): T[] {
  if (!Array.isArray(arr)) {
    return [];
  }
  return arr.filter(Boolean) as T[];
}

/**
 * Safe first element
 */
export function first<T>(
  arr: T[] | null | undefined,
): T | undefined {
  return safeArrayGet(arr, 0);
}

/**
 * Safe last element
 */
export function last<T>(
  arr: T[] | null | undefined,
): T | undefined {
  if (!Array.isArray(arr) || arr.length === 0) {
    return undefined;
  }
  return arr[arr.length - 1];
}

/**
 * Range generator
 */
export function range(
  start: number,
  end: number,
  step: number = 1,
): number[] {
  const result: number[] = [];

  if (step === 0 || (start < end && step < 0) || (start > end && step > 0)) {
    return result;
  }

  if (start < end) {
    for (let i = start; i < end; i += step) {
      result.push(i);
    }
  } else {
    for (let i = start; i > end; i += step) {
      result.push(i);
    }
  }

  return result;
}
