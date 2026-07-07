import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const TagChip = ({ 
  tag, 
  size = 'md', 
  variant = 'default', 
  removable = false, 
  onRemove,
  onClick,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  const variantClasses = {
    default: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    info: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    secondary: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  };

  const getColorClasses = () => {
    if (tag?.color) {
      // If tag has a specific color, use it
      return `bg-${tag.color}-100 text-${tag.color}-800 dark:bg-${tag.color}-900 dark:text-${tag.color}-200`;
    }
    return variantClasses[variant] || variantClasses.default;
  };

  const handleRemove = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRemove) {
      onRemove(tag);
    }
  };

  const handleClick = (e) => {
    if (onClick) {
      e.preventDefault();
      e.stopPropagation();
      onClick(tag);
    }
  };

  const tagName = typeof tag === 'string' ? tag : tag?.name || tag?.label;

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${sizeClasses[size]}
        ${getColorClasses()}
        ${onClick ? 'cursor-pointer hover:opacity-80' : ''}
        ${className}
      `}
      onClick={handleClick}
    >
      <span className="truncate max-w-32">{tagName}</span>
      {removable && onRemove && (
        <button
          onClick={handleRemove}
          className="inline-flex items-center justify-center hover:bg-black hover:bg-opacity-10 rounded-full transition-colors"
          aria-label={`Remove ${tagName}`}
        >
          <XMarkIcon className="h-3 w-3" />
        </button>
      )}
    </span>
  );
};

export default TagChip;
