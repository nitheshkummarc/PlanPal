/**
 * useApi.ts - Hooks for API calls, pagination and debouncing.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { getApiErrorMessage } from '../utils/helpers';

interface UseApiReturn<TArgs extends unknown[], TResult> {
  data: TResult | null;
  loading: boolean;
  error: string | null;
  execute: (...args: TArgs) => Promise<TResult>;
  reset: () => void;
}

/**
 * Wraps an API function with data/loading/error state. Only the most recent call
 * updates the state, so a slow earlier response cannot overwrite a newer one
 * (e.g. when the search text changes while a request is in flight).
 */
export const useApi = <TArgs extends unknown[], TResult>(
  apiFunction: (...args: TArgs) => Promise<TResult>,
  { showErrorToast = true }: { showErrorToast?: boolean } = {}
): UseApiReturn<TArgs, TResult> => {
  const [data, setData] = useState<TResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestCall = useRef(0);
  const apiRef = useRef(apiFunction);
  apiRef.current = apiFunction;

  const execute = useCallback(async (...args: TArgs): Promise<TResult> => {
    const call = ++latestCall.current;
    setLoading(true);
    setError(null);
    try {
      const result = await apiRef.current(...args);
      if (call === latestCall.current) setData(result);
      return result;
    } catch (err) {
      if (call === latestCall.current) {
        const message = getApiErrorMessage(err, 'Something went wrong');
        setError(message);
        if (showErrorToast) toast.error(message);
      }
      throw err;
    } finally {
      if (call === latestCall.current) setLoading(false);
    }
  }, [showErrorToast]);

  const reset = useCallback(() => {
    latestCall.current += 1;  // ignore responses still in flight
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
};

interface UsePaginationReturn {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  setTotal: (total: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  reset: () => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export const usePagination = (initialLimit = 10): UsePaginationReturn => {
  const [requestedPage, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const totalPages = Math.max(Math.ceil(total / initialLimit), 1);
  // If the total shrinks (e.g. items deleted on the last page), stay within range
  const page = Math.min(requestedPage, totalPages);

  const reset = useCallback(() => setPage(1), []);

  return {
    page,
    limit: initialLimit,
    total,
    totalPages,
    setTotal,
    nextPage: () => setPage(Math.min(page + 1, totalPages)),
    prevPage: () => setPage(Math.max(page - 1, 1)),
    reset,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};
