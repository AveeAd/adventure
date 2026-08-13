import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

// Every variant is an outline button - transparent fill, a thick saturated
// border, blur behind it, brightening slightly on hover. No neon glow (a
// few earlier iterations tried and dropped it); the border alone carries
// the variant's color and emphasis.
const variantClasses: Record<Variant, string> = {
  primary:
    'bg-transparent border-[3px] border-primary-400 text-primary-700 backdrop-blur-lg hover:border-primary-300 disabled:opacity-50 dark:text-primary-300',
  accent:
    'bg-transparent border-[3px] border-accent-400 text-accent-700 backdrop-blur-lg hover:border-accent-300 disabled:opacity-50 dark:text-accent-300',
  secondary:
    'bg-transparent border-[3px] border-stone-300 text-stone-800 backdrop-blur-lg hover:border-primary-400/70 disabled:text-stone-400 dark:border-stone-600 dark:text-stone-100 dark:hover:border-primary-400/50',
  ghost:
    'bg-transparent border-[3px] border-primary-300/50 text-primary-700 backdrop-blur-lg hover:border-primary-400 disabled:opacity-50 dark:border-primary-400/30 dark:text-primary-300 dark:hover:border-primary-400',
  danger:
    'bg-transparent border-[3px] border-red-400 text-red-700 backdrop-blur-lg hover:border-red-300 disabled:opacity-50 dark:text-red-400',
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
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
}
