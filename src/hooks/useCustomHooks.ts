/**
 * Custom Wagmi & TanStack Query Hooks
 * Location: src/hooks/useCustomHooks.ts
 * 
 * Utility hooks for common Web3 and data fetching patterns
 */

import { useCallback, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAccount, useNetwork } from 'wagmi';
import { ethers } from 'ethers';

/**
 * Hook to validate Ethereum address
 */
export function useIsValidAddress(address: string | undefined) {
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (!address) {
      setIsValid(false);
      return;
    }
    setIsValid(ethers.isAddress(address));
  }, [address]);

  return isValid;
}

/**
 * Hook to format Ethereum numbers with proper decimals
 */
export function useFormatNumber(value: string | number | undefined, decimals = 2) {
  const formatted = useCallback(() => {
    if (!value) return '0';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  }, [value, decimals]);

  return formatted();
}

/**
 * Hook to track transaction status in real-time
 */
export function useTransactionStatus(txHash: string | undefined) {
  const { chain } = useNetwork();

  return useQuery({
    queryKey: ['transaction-status', txHash],
    queryFn: async () => {
      if (!txHash) return null;
      const response = await fetch(`/api/transactions/${txHash}/status`);
      if (!response.ok) throw new Error('Failed to fetch transaction status');
      return response.json();
    },
    enabled: !!txHash,
    refetchInterval: 3000, // Poll every 3 seconds
  });
}

/**
 * Hook to manage local form state with validation
 */
export function useFormState<T extends Record<string, any>>(
  initialState: T,
  onSubmit: (data: T) => Promise<any>
) {
  const [formData, setFormData] = useState<T>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback(
    (field: keyof T, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear error on change
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setIsSubmitting(true);
      try {
        await onSubmit(formData);
      } catch (error: any) {
        setErrors((prev) => ({
          ...prev,
          submit: error.message || 'Submission failed',
        }));
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, onSubmit]
  );

  const reset = useCallback(() => {
    setFormData(initialState);
    setErrors({});
  }, [initialState]);

  return {
    formData,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    reset,
    setFormData,
    setErrors,
  };
}

/**
 * Hook to debounce a value
 */
export function useDebouncedValue<T>(value: T, delayMs = 300) {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}

/**
 * Hook to track async operation state
 */
export function useAsync<T, E = string>(
  asyncFunction: () => Promise<T>,
  immediate = true
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<E | null>(null);
  const [isLoading, setIsLoading] = useState(immediate);

  const execute = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await asyncFunction();
      setData(response);
      return response;
    } catch (err) {
      setError(err as E);
    } finally {
      setIsLoading(false);
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { execute, data, error, isLoading };
}

/**
 * Hook to fetch paginated data
 */
export function usePaginatedQuery<T>(
  queryKey: string[],
  fetchFn: (page: number, limit: number) => Promise<T[]>,
  limit = 10
) {
  const [page, setPage] = useState(1);

  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: [...queryKey, page, limit],
    queryFn: () => fetchFn(page, limit),
  });

  const nextPage = useCallback(() => setPage((p) => p + 1), []);
  const prevPage = useCallback(
    () => setPage((p) => Math.max(1, p - 1)),
    []
  );
  const goToPage = useCallback((p: number) => setPage(p), []);

  return {
    data,
    isLoading,
    error,
    page,
    nextPage,
    prevPage,
    goToPage,
    hasMore: data.length === limit,
  };
}

/**
 * Hook to track scroll position
 */
export function useScrollPosition() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return scrollY;
}

/**
 * Hook to manage local storage
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch {
        console.error('Failed to save to localStorage', key);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue] as const;
}

/**
 * Hook to mock user permission checks
 */
export function useCanAccess(permission: string) {
  const { address } = useAccount();

  return useQuery({
    queryKey: ['user-permission', address, permission],
    queryFn: async () => {
      const response = await fetch(`/api/auth/permission/${permission}`);
      if (!response.ok) throw new Error('Failed to check permission');
      return response.json();
    },
    enabled: !!address,
  });
}

/**
 * Hook to handle API errors consistently
 */
export function useApiError() {
  const handleError = useCallback((error: any) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      console.error('Unauthorized - redirect to login');
      return 'Please log in to continue';
    }
    if (error.response?.status === 403) {
      return 'You do not have permission for this action';
    }
    if (error.response?.status === 404) {
      return 'Resource not found';
    }
    if (error.response?.status === 500) {
      return 'Server error - please try again later';
    }
    return error.message || 'An error occurred';
  }, []);

  return { handleError };
}

/**
 * Hook to track page visibility
 */
export function usePageVisibility() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return isVisible;
}

export default {
  useIsValidAddress,
  useFormatNumber,
  useTransactionStatus,
  useFormState,
  useDebouncedValue,
  useAsync,
  usePaginatedQuery,
  useScrollPosition,
  useLocalStorage,
  useCanAccess,
  useApiError,
  usePageVisibility,
};
