import { useState, useCallback } from 'react';

export interface LoadingState {
  isLoading: boolean;
  error: string | null;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  executeAsync: <T>(asyncFn: () => Promise<T>) => Promise<T | null>;
  reset: () => void;
}

/**
 * Hook for managing loading states with error handling
 * @param initialLoading - Initial loading state (default: false)
 * @returns LoadingState object with loading, error state and utility functions
 */
export const useLoadingState = (initialLoading: boolean = false): LoadingState => {
  const [isLoading, setIsLoading] = useState(initialLoading);
  const [error, setError] = useState<string | null>(null);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
    if (loading && error) {
      setError(null); // Clear error when starting new operation
    }
  }, [error]);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  const executeAsync = useCallback(async <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
    try {
      setLoading(true);
      const result = await asyncFn();
      setLoading(false);
      return result;
    } catch (err) {
      setLoading(false);
      const errorMessage = err instanceof Error ? err.message : 'Bir hata oluştu';
      setError(errorMessage);
      return null;
    }
  }, [setLoading]);

  return {
    isLoading,
    error,
    setLoading,
    setError,
    executeAsync,
    reset,
  };
};

/**
 * Hook for managing multiple loading states
 * Useful when you have multiple async operations in the same component
 */
export const useMultipleLoadingStates = () => {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const setLoading = useCallback((key: string, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [key]: loading }));
    if (loading && errors[key]) {
      setErrors(prev => ({ ...prev, [key]: null }));
    }
  }, [errors]);

  const setError = useCallback((key: string, error: string | null) => {
    setErrors(prev => ({ ...prev, [key]: error }));
  }, []);

  const executeAsync = useCallback(async <T>(
    key: string, 
    asyncFn: () => Promise<T>
  ): Promise<T | null> => {
    try {
      setLoading(key, true);
      const result = await asyncFn();
      setLoading(key, false);
      return result;
    } catch (err) {
      setLoading(key, false);
      const errorMessage = err instanceof Error ? err.message : 'Bir hata oluştu';
      setError(key, errorMessage);
      return null;
    }
  }, [setLoading, setError]);

  const isLoading = useCallback((key: string) => loadingStates[key] || false, [loadingStates]);
  const getError = useCallback((key: string) => errors[key] || null, [errors]);
  const hasAnyLoading = useCallback(() => Object.values(loadingStates).some(Boolean), [loadingStates]);

  const reset = useCallback((key?: string) => {
    if (key) {
      setLoadingStates(prev => ({ ...prev, [key]: false }));
      setErrors(prev => ({ ...prev, [key]: null }));
    } else {
      setLoadingStates({});
      setErrors({});
    }
  }, []);

  return {
    isLoading,
    getError,
    hasAnyLoading,
    setLoading,
    setError,
    executeAsync,
    reset,
  };
};