import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

// "Neon glass": a translucent fill inside a double concentric outline (an
// outer border on the element plus an inset `before:` pseudo-element ring),
// both glowing, one solid hue per variant - modeled on a traced neon-sign
// frame rather than a flat single border with a glow behind it.
const variantClasses: Record<Variant, string> = {
  primary:
    "relative border-2 border-primary-400 bg-primary-500/15 text-primary-700 shadow-[0_0_6px_rgba(92,154,118,0.55)] backdrop-blur-lg before:pointer-events-none before:absolute before:inset-[3px] before:rounded-[inherit] before:border before:border-primary-400/70 before:shadow-[0_0_5px_rgba(92,154,118,0.45)] before:content-[''] hover:border-primary-300 hover:bg-primary-500/25 hover:shadow-[0_0_11px_rgba(92,154,118,0.85)] hover:before:border-primary-300/80 hover:before:shadow-[0_0_8px_rgba(92,154,118,0.7)] disabled:opacity-50 disabled:shadow-none disabled:before:shadow-none dark:bg-primary-400/10 dark:text-primary-300 dark:hover:bg-primary-400/20",
  accent:
    "relative border-2 border-accent-400 bg-accent-500/15 text-accent-700 shadow-[0_0_6px_rgba(221,124,79,0.55)] backdrop-blur-lg before:pointer-events-none before:absolute before:inset-[3px] before:rounded-[inherit] before:border before:border-accent-400/70 before:shadow-[0_0_5px_rgba(221,124,79,0.45)] before:content-[''] hover:border-accent-300 hover:bg-accent-500/25 hover:shadow-[0_0_11px_rgba(221,124,79,0.85)] hover:before:border-accent-300/80 hover:before:shadow-[0_0_8px_rgba(221,124,79,0.7)] disabled:opacity-50 disabled:shadow-none disabled:before:shadow-none dark:bg-accent-400/10 dark:text-accent-300 dark:hover:bg-accent-400/20",
  secondary:
    'border border-stone-300 text-stone-800 backdrop-blur-lg hover:border-primary-400/70 hover:bg-primary-500/10 hover:shadow-[0_0_7px_rgba(61,125,91,0.35)] disabled:text-stone-400 disabled:hover:shadow-none dark:border-stone-600 dark:text-stone-100 dark:hover:border-primary-400/50 dark:hover:bg-primary-400/10 dark:hover:shadow-[0_0_7px_rgba(92,154,118,0.4)]',
  ghost:
    'text-primary-700 hover:bg-primary-50 hover:shadow-[0_0_5px_rgba(61,125,91,0.3)] disabled:text-stone-400 disabled:hover:shadow-none dark:text-primary-300 dark:hover:bg-stone-800 dark:hover:shadow-[0_0_5px_rgba(92,154,118,0.35)]',
  danger:
    "relative border-2 border-red-400 bg-red-500/10 text-red-700 shadow-[0_0_6px_rgba(248,113,113,0.5)] backdrop-blur-lg before:pointer-events-none before:absolute before:inset-[3px] before:rounded-[inherit] before:border before:border-red-400/70 before:shadow-[0_0_5px_rgba(248,113,113,0.4)] before:content-[''] hover:border-red-300 hover:bg-red-500/20 hover:shadow-[0_0_11px_rgba(248,113,113,0.8)] hover:before:border-red-300/80 hover:before:shadow-[0_0_8px_rgba(248,113,113,0.65)] disabled:opacity-50 disabled:shadow-none disabled:before:shadow-none dark:bg-red-400/10 dark:text-red-400 dark:hover:bg-red-400/20",
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
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
}
