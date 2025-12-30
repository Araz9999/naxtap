/**
 * React-specific Safety Utilities
 * Fixes React hooks and component safety issues
 */

import { useRef, useEffect, useCallback, DependencyList, useState } from 'react';

/**
 * Safe state update
 * Prevents updates on unmounted components
 */
export function useSafeState() {
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return useCallback(<T>(setState: (value: T) => void, value: T) => {
    if (isMounted.current) {
      setState(value);
    }
  }, []);
}

/**
 * Safe async effect
 * Prevents memory leaks from async operations
 */
export function useSafeAsyncEffect(
  effect: (isCancelled: () => boolean) => void | Promise<void>,
  deps?: DependencyList,
) {
  useEffect(() => {
    let cancelled = false;

    const isCancelled = () => cancelled;

    Promise.resolve(effect(isCancelled)).catch((error) => {
      if (!cancelled) {
        console.error('[SafeAsyncEffect] Error:', error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, deps);
}

/**
 * Safe callback that won't be called if component unmounts
 */
export function useSafeCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: DependencyList,
): T {
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return useCallback(
    ((...args) => {
      if (isMounted.current) {
        return callback(...args);
      }
    }) as T,
    deps,
  );
}

/**
 * Debounced callback hook
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: DependencyList,
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    ((...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [delay, ...deps],
  );
}

/**
 * Throttled callback hook
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  limit: number,
  deps: DependencyList,
): T {
  const inThrottle = useRef(false);

  return useCallback(
    ((...args) => {
      if (!inThrottle.current) {
        callback(...args);
        inThrottle.current = true;
        setTimeout(() => {
          inThrottle.current = false;
        }, limit);
      }
    }) as T,
    [limit, ...deps],
  );
}

/**
 * Previous value hook
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/**
 * Safe interval hook
 */
export function useSafeInterval(
  callback: () => void,
  delay: number | null,
) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) {
      return;
    }

    const id = setInterval(() => {
      savedCallback.current();
    }, delay);

    return () => clearInterval(id);
  }, [delay]);
}

/**
 * Safe timeout hook
 */
export function useSafeTimeout(
  callback: () => void,
  delay: number | null,
) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) {
      return;
    }

    const id = setTimeout(() => {
      savedCallback.current();
    }, delay);

    return () => clearTimeout(id);
  }, [delay]);
}

/**
 * Component mount status hook
 */
export function useIsMounted(): () => boolean {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return useCallback(() => isMounted.current, []);
}

/**
 * Force update hook
 */
export function useForceUpdate(): () => void {
  const [, updateState] = useState<object>();
  return useCallback(() => updateState({}), []);
}

/**
 * Safe ref value hook
 */
export function useSafeRef<T>(initialValue: T) {
  const ref = useRef<T>(initialValue);
  const isMounted = useIsMounted();

  const setValue = useCallback((value: T) => {
    if (isMounted()) {
      ref.current = value;
    }
  }, [isMounted]);

  return [ref, setValue] as const;
}

/**
 * Cleanup effect hook
 */
export function useCleanup(cleanup: () => void) {
  useEffect(() => {
    return cleanup;
  }, []);
}

/**
 * One-time effect
 */
export function useOnce(effect: () => void | (() => void)) {
  const hasRun = useRef(false);

  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      return effect();
    }
  }, []);
}
