/**
 * useApi.ts - Custom React hooks for API calls, pagination, debouncing, and localStorage
 *
 * Why: Reusable hooks that abstract common patterns across the app
 */

import { useState, useEffect, useCallback, type DependencyList } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import type { ApiError } from '../types/api';

// --- useApi ---

interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (...args: any[]) => Promise<T>;
  reset: () => void;
}

export const useApi = <T>(
  apiFunction: (...args: any[]) => Promise<T>,
  dependencies: DependencyList = []
): UseApiReturn<T> => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (...args: any[]): Promise<T> => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiFunction(...args);
      setData(result);
      return result;
    } catch (err: unknown) {
      let errorMessage = 'An error occurred';
      if (axios.isAxiosError(err)) {
        errorMessage = (err.response?.data as ApiError | undefined)?.error ?? err.message;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
};

// --- usePagination ---

interface UsePaginationReturn {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  setPage: (page: number) => void;
  setLimit: React.Dispatch<React.SetStateAction<number>>;
  setTotal: React.Dispatch<React.SetStateAction<number>>;
  nextPage: () => void;
  prevPage: () => void;
  reset: () => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export const usePagination = (initialPage = 1, initialLimit = 10): UsePaginationReturn => {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [total, setTotal] = useState(0);

  const totalPages = Math.ceil(total / limit);

  const goToPage = (newPage: number): void => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const nextPage = (): void => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  const prevPage = (): void => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const reset = (): void => {
    setPage(1);
    setTotal(0);
  };

  return {
    page,
    limit,
    total,
    totalPages,
    setPage: goToPage,
    setLimit,
    setTotal,
    nextPage,
    prevPage,
    reset,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

// --- useDebounce ---

export const useDebounce = <T>(value: T, delay: number): T => {
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
};

// --- useLocalStorage ---

export const useLocalStorage = <T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((prev: T) => T)): void => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue];
};
