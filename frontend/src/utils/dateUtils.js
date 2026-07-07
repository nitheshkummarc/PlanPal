export const formatDate = (date, options = {}) => {
  if (!date) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };
  
  return new Date(date).toLocaleDateString('en-US', defaultOptions);
};

export const formatDateTime = (date, options = {}) => {
  if (!date) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };
  
  return new Date(date).toLocaleDateString('en-US', defaultOptions);
};

export const formatTime = (date, options = {}) => {
  if (!date) return '';
  
  const defaultOptions = {
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };
  
  return new Date(date).toLocaleTimeString('en-US', defaultOptions);
};

export const isToday = (date) => {
  const today = new Date();
  const compareDate = new Date(date);
  
  return (
    today.getDate() === compareDate.getDate() &&
    today.getMonth() === compareDate.getMonth() &&
    today.getFullYear() === compareDate.getFullYear()
  );
};

export const isTomorrow = (date) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const compareDate = new Date(date);
  
  return (
    tomorrow.getDate() === compareDate.getDate() &&
    tomorrow.getMonth() === compareDate.getMonth() &&
    tomorrow.getFullYear() === compareDate.getFullYear()
  );
};

export const isThisWeek = (date) => {
  const now = new Date();
  const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
  const weekEnd = new Date(now.setDate(now.getDate() - now.getDay() + 6));
  const compareDate = new Date(date);
  
  return compareDate >= weekStart && compareDate <= weekEnd;
};

export const getRelativeTime = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const compareDate = new Date(date);
  const diffInMs = compareDate - now;
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
  
  if (isToday(date)) {
    return 'Today';
  } else if (isTomorrow(date)) {
    return 'Tomorrow';
  } else if (diffInDays > 0 && diffInDays <= 7) {
    return `In ${diffInDays} days`;
  } else if (diffInDays < 0 && diffInDays >= -7) {
    return `${Math.abs(diffInDays)} days ago`;
  } else {
    return formatDate(date);
  }
};

export const getDaysUntil = (date) => {
  if (!date) return 0;
  
  const now = new Date();
  const compareDate = new Date(date);
  const diffInMs = compareDate - now;
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
  
  return diffInDays;
};

export const isEventSoon = (date, threshold = 3) => {
  const daysUntil = getDaysUntil(date);
  return daysUntil >= 0 && daysUntil <= threshold;
};

export const formatDistanceToNow = (date) => {
  if (!date) return '';
  
  const now = new Date();
  const compareDate = new Date(date);
  const diffInMs = now - compareDate;
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

export const sortByDate = (items, dateKey = 'date', ascending = true) => {
  return items.sort((a, b) => {
    const dateA = new Date(a[dateKey]);
    const dateB = new Date(b[dateKey]);
    
    return ascending ? dateA - dateB : dateB - dateA;
  });
};
