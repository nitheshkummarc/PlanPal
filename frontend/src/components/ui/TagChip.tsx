import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { AppTag } from '../../types';

type TagSize = 'sm' | 'md' | 'lg';
type TagVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'secondary';

interface TagLike {
  name?: string;
  label?: string;
  color?: string;
}

interface TagChipProps {
  tag: string | AppTag | TagLike;
  size?: TagSize;
  variant?: TagVariant;
  removable?: boolean;
  onRemove?: (tag: string | AppTag | TagLike) => void;
  onClick?: (tag: string | AppTag | TagLike) => void;
  className?: string;
}

const TagChip = ({
  tag,
  size = 'md',
  variant = 'default',
  removable = false,
  onRemove,
  onClick,
  className = ''
}: TagChipProps) => {
  const sizeClasses: Record<TagSize, string> = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  };

  const variantClasses: Record<TagVariant, string> = {
    default: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    info: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    secondary: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
  };

  const getColorClasses = (): string => {
    return variantClasses[variant] || variantClasses.default;
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRemove) {
      onRemove(tag);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      e.stopPropagation();
      onClick(tag);
    }
  };

  const tagName = typeof tag === 'string' ? tag : ('name' in tag ? tag.name : undefined) || ('label' in tag ? tag.label : undefined);

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
