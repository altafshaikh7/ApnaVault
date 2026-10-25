import { useState, useCallback } from 'react';
import { ApiException } from '../types/api.js';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiException | null;
}

export function useApi<T, P extends unknown[] = []>(
  apiFn: (...args: P) => Promise<T>
) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: P): Promise<T | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const result = await apiFn(...args);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (err: unknown) {
        const apiError =
          err instanceof ApiException
            ? err
            : new ApiException(err instanceof Error ? err.message : 'Unknown error');
        setState({ data: null, loading: false, error: apiError });
        return null;
      }
    },
    [apiFn]
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}
