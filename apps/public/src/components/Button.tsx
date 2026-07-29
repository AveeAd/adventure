import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 disabled:bg-primary-300 dark:bg-primary-500 dark:hover:bg-primary-600',
  accent: 'bg-accent-500 text-white hover:bg-accent-600 disabled:bg-accent-200',
  secondary:
    'border border-stone-300 text-stone-800 hover:bg-stone-100 disabled:text-stone-400 dark:border-stone-600 dark:text-stone-100 dark:hover:bg-stone-800',
  ghost: 'text-primary-700 hover:bg-primary-50 disabled:text-stone-400 dark:text-primary-300 dark:hover:bg-stone-800',
  danger: 'border border-red-300 text-red-700 hover:bg-red-50 disabled:text-red-300 dark:border-red-800 dark:text-red-400',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
}
