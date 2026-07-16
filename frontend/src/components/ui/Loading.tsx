import React from 'react';

type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

const LoadingSpinner = ({ size = 'md', className = "" }: LoadingSpinnerProps) => {
  const sizeClasses: Record<SpinnerSize, string> = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-primary-600 ${sizeClasses[size]} ${className}`}></div>
  );
};

interface LoadingPageProps {
  message?: string;
}

const LoadingPage = ({ message = "Loading..." }: LoadingPageProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <LoadingSpinner size="xl" className="mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400 text-lg">{message}</p>
      </div>
    </div>
  );
};

interface LoadingCardProps {
  className?: string;
}

const LoadingCard = ({ className = "" }: LoadingCardProps) => {
  return (
    <div className={`card animate-pulse ${className}`}>
      <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-t-lg"></div>
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-16"></div>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20"></div>
        </div>
      </div>
    </div>
  );
};

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: string;
  children: React.ReactNode;
}

const LoadingButton = ({ children, loading, disabled, className = "", ...props }: LoadingButtonProps) => {
  return (
    <button
      {...props}
      disabled={loading || disabled}
      className={`relative ${className} ${loading ? 'cursor-not-allowed' : ''}`}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size="sm" />
        </div>
      )}
      <span className={loading ? 'opacity-0' : 'opacity-100'}>
        {children}
      </span>
    </button>
  );
};

// Named exports
export { LoadingSpinner, LoadingPage, LoadingCard, LoadingButton };

// Default export - full Loading object with all components
const Loading = {
  Spinner: LoadingSpinner,
  Page: LoadingPage,
  Card: LoadingCard,
  Button: LoadingButton
};

export default Loading;
