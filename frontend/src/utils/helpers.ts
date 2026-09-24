/**
 * helpers.ts - General utility functions
 *
 * Why: Shared helpers for API errors, price formatting, and cross-page refresh
 */

import axios from 'axios';

/**
 * Extract the user-facing message from an API error.
 * The backend always returns errors as { success: false, error: "..." }.
 */
export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
    if (!error.response) return 'Unable to reach the server. Please try again.';
  }
  return fallback;
};

// --- Cross-page refresh ---------------------------------------------------------
// After an event is created/edited/joined/left/deleted, pages that show events
// (Dashboard, Calendar) reload. Same tab: a window event. Other open tabs: the
// browser's 'storage' event, fired when we write the localStorage key.

const EVENTS_CHANGED = 'eventUpdated';

/** Tell every open page (this tab and other tabs) that events changed. */
export const notifyEventsChanged = (): void => {
  window.dispatchEvent(new CustomEvent(EVENTS_CHANGED));
  try {
    localStorage.setItem(EVENTS_CHANGED, Date.now().toString());
  } catch {
    // Storage unavailable (e.g. private mode): other tabs just won't auto-refresh
  }
};

/** Run callback whenever events change. Returns an unsubscribe function for useEffect. */
export const onEventsChanged = (callback: () => void): (() => void) => {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === EVENTS_CHANGED) callback();
  };
  window.addEventListener(EVENTS_CHANGED, callback);
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener(EVENTS_CHANGED, callback);
    window.removeEventListener('storage', handleStorage);
  };
};

// --- Price formatting -------------------------------------------------------------

// Currency formatting for Indian Rupees
export const formatCurrency = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined) return '₹0';

  const numericAmount = parseFloat(String(amount));
  if (isNaN(numericAmount)) return '₹0';

  // Format with Indian rupee symbol and proper thousand separators
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(numericAmount);
};

// Format price for display (shorter version)
export const formatPrice = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined || amount === 0) return 'Free';
  return formatCurrency(amount);
};
