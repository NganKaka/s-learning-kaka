/**
 * Standardized async data fetching hook.
 * Eliminates the repeated `useEffect` + cancelled pattern across 80+ locations.
 */
import { useCallback, useEffect, useState } from 'react';
import type { AsyncState } from '../types/common';

export function useAsyncData<T>(
  asyncFn: () => Promise<T | null>,
  deps: unknown[] = [],
  options: { initialLoading?: boolean } = {},
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: options.initialLoading ?? true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await asyncFn();
        if (!cancelled) {
          setState({ data: result, loading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

/**
 * Helper to create an async state setter with common patterns.
 */
export function useAsyncState<T>() {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setData(null);
    setLoading(true);
    setError(null);
  }, []);

  const fetch = useCallback(async (fn: () => Promise<T>) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, setData, setLoading, setError, reset, fetch };
}
