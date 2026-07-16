/**
 * helpers.ts - General utility functions
 *
 * Why: Centralized string manipulation, formatting, and utility helpers
 */

export const truncateText = (text: string | null | undefined, maxLength = 100): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

export const capitalizeFirst = (str: string | null | undefined): string => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const capitalizeWords = (str: string | null | undefined): string => {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => capitalizeFirst(word))
    .join(' ');
};

export const formatPhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
};

export const generateSlug = (text: string | null | undefined): string => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

export const parseQuery = (queryString: string | null | undefined): Record<string, string> => {
  if (!queryString) return {};
  
  const params = new URLSearchParams(queryString);
  const result: Record<string, string> = {};
  
  for (const [key, value] of params) {
    result[key] = value;
  }
  
  return result;
};

export const buildQuery = (params: Record<string, string | number | boolean | null | undefined> | null | undefined): string => {
  if (!params || typeof params !== 'object') return '';
  
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  
  return searchParams.toString();
};

export const debounce = <T extends (...args: Parameters<T>) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = <T extends (...args: Parameters<T>) => void>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPassword = (password: string, minLength = 8): boolean => {
  if (!password || password.length < minLength) return false;
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasNonalphas = /\W/.test(password);
  
  return hasUpperCase && hasLowerCase && hasNumbers && hasNonalphas;
};

export const extractInitials = (name: string | null | undefined): string => {
  if (!name) return '';
  
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileExtension = (filename: string | null | undefined): string => {
  if (!filename) return '';
  return filename.split('.').pop()?.toLowerCase() ?? '';
};

export const isImageFile = (filename: string | null | undefined): boolean => {
  if (!filename) return false;
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
  return imageExtensions.includes(getFileExtension(filename));
};

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
