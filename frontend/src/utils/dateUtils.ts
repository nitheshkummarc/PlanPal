/**
 * dateUtils.ts - Date formatting utilities
 *
 * Why: Centralized date handling for consistent display across the app.
 * The API sends UTC ISO timestamps ('...Z'); these helpers display them in the
 * viewer's local timezone.
 */

export const formatDate = (date: string | Date, options: Intl.DateTimeFormatOptions = {}): string => {
  if (!date) return '';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };

  return new Date(date).toLocaleDateString('en-US', defaultOptions);
};

export const formatTime = (date: string | Date, options: Intl.DateTimeFormatOptions = {}): string => {
  if (!date) return '';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };

  return new Date(date).toLocaleTimeString('en-US', defaultOptions);
};

export const formatDistanceToNow = (date: string | Date): string => {
  if (!date) return '';

  const now = new Date();
  const compareDate = new Date(date);
  const diffInMs = now.getTime() - compareDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    return formatDate(date);
  }
};
