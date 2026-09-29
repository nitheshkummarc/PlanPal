/**
 * helpers.ts - API error messages, price formatting and cross-page refresh signals.
 */

import axios from 'axios';

/** The user-facing message of an API error ({ success: false, error: "..." }). */
export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
    if (!error.response) return 'Unable to reach the server. Please try again.';
  }
  return fallback;
};

/** HTTP status of an API error, if the server answered. */
export const getApiErrorStatus = (error: unknown): number | undefined =>
  axios.isAxiosError(error) ? error.response?.status : undefined;

// --- Cross-page refresh ---------------------------------------------------------------
// Pages that show events or notifications reload when data changes elsewhere: in the
// same tab through a window event, in other tabs through the 'storage' event.

const createSignal = (key: string) => ({
  notify: (): void => {
    window.dispatchEvent(new CustomEvent(key));
    try {
      localStorage.setItem(key, Date.now().toString());
    } catch {
      // Storage unavailable (e.g. private mode): other tabs will not refresh
    }
  },
  subscribe: (callback: () => void): (() => void) => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key) callback();
    };
    window.addEventListener(key, callback);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(key, callback);
      window.removeEventListener('storage', handleStorage);
    };
  },
});

const eventsSignal = createSignal('eventUpdated');
const notificationsSignal = createSignal('notificationsUpdated');

/** Tell every open page that events changed (created, edited, joined, left, deleted). */
export const notifyEventsChanged = eventsSignal.notify;
/** Run callback whenever events change. Returns an unsubscribe function for useEffect. */
export const onEventsChanged = eventsSignal.subscribe;
/** Tell the notification bell and page that notifications changed. */
export const notifyNotificationsChanged = notificationsSignal.notify;
export const onNotificationsChanged = notificationsSignal.subscribe;

// --- Prices ---------------------------------------------------------------------------

export const formatCurrency = (amount: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);

/** 'Free' for free events, otherwise the price in rupees. */
export const formatPrice = (event: { is_paid: boolean; price: number | null }): string =>
  event.is_paid && event.price !== null ? formatCurrency(event.price) : 'Free';
