import { type ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          'inline-flex items-center justify-center font-medium rounded-xl transition-all active:scale-95',
          {
            'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 disabled:bg-green-300':
              variant === 'primary',
            'bg-gray-100 text-gray-800 hover:bg-gray-200 active:bg-gray-300 disabled:bg-gray-50':
              variant === 'secondary',
            'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 disabled:bg-red-300':
              variant === 'danger',
            'bg-transparent text-gray-700 hover:bg-gray-100': variant === 'ghost',
            'text-sm px-3 py-2 gap-1.5': size === 'sm',
            'text-sm px-4 py-2.5 gap-2': size === 'md',
            'text-base px-5 py-3 gap-2': size === 'lg',
            'opacity-60 cursor-not-allowed': disabled || loading,
          },
          className
        )}
        {...props}
      >
        {loading && (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
