import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  onClick,
}: ButtonProps): ReactNode {
  const baseClasses = 'font-semibold rounded-lg transition-colors duration-200';

  const variantClasses = {
    primary: 'bg-white text-blue-600 hover:bg-gray-100',
    secondary: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-white text-white hover:bg-white hover:text-blue-600',
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-2',
    lg: 'px-8 py-3',
  };

  return (
    <button
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
