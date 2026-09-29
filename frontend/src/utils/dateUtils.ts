/**
 * dateUtils.ts - Date formatting and conversion.
 *
 * The API sends and receives UTC ISO timestamps ('...Z'). Everything shown to the
 * user, and every "day" the user picks, is in the viewer's local timezone.
 */

export const formatDate = (date: string | Date, options: Intl.DateTimeFormatOptions = {}): string => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', ...options });
};

export const formatTime = (date: string | Date, options: Intl.DateTimeFormatOptions = {}): string => {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', ...options });
};

export const formatDistanceToNow = (date: string | Date): string => {
  if (!date) return '';
  const diffInMs = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diffInMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
};

const pad = (n: number): string => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' of a date in the local timezone (for grouping events by calendar day). */
export const localDateKey = (date: string | Date): string => {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Value for a datetime-local input ('YYYY-MM-DDTHH:mm') in the local timezone. */
export const toLocalInputValue = (date: string | Date): string => {
  const d = new Date(date);
  return `${localDateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** UTC ISO timestamp for a datetime-local input value (which is local time). */
export const localInputToISO = (value: string): string => new Date(value).toISOString();

/** First instant of a local day ('YYYY-MM-DD' from a date input) as a UTC ISO timestamp. */
export const localDayStartISO = (day: string): string => {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date).toISOString();
};

/** Last instant of a local day as a UTC ISO timestamp (for inclusive upper bounds). */
export const localDayEndISO = (day: string): string => {
  const [year, month, date] = day.split('-').map(Number);
  return new Date(year, month - 1, date, 23, 59, 59, 999).toISOString();
};
