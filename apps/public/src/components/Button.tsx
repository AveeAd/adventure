import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

// "Neon glass": a single crisp saturated border with a *layered* glow -
// several stacked box-shadow rings at increasing blur radius, the standard
// CSS technique for a convincing lit-neon look (a single blur value reads
// as a soft flat halo; real neon light falls off in graduated steps). A
// double-ring outline was tried and dropped - at real button sizes (~36px
// tall) a 3px gap between two blurred rings was imperceptible, it just
// read as one thick fuzzy border rather than two distinct lines.
const variantClasses: Record<Variant, string> = {
  primary:
    'bg-transparent border-2 border-primary-400 text-primary-700 !shadow-[0_0_2px_rgba(92,154,118,0.9),0_0_6px_rgba(92,154,118,0.7),0_0_14px_rgba(92,154,118,0.5),0_0_26px_rgba(92,154,118,0.3)] backdrop-blur-lg hover:border-primary-300 hover:!shadow-[0_0_3px_rgba(92,154,118,1),0_0_9px_rgba(92,154,118,0.85),0_0_20px_rgba(92,154,118,0.65),0_0_36px_rgba(92,154,118,0.4)] disabled:opacity-50 disabled:!shadow-none dark:text-primary-300',
  accent:
    'bg-transparent border-2 border-accent-400 text-accent-700 !shadow-[0_0_2px_rgba(221,124,79,0.9),0_0_6px_rgba(221,124,79,0.7),0_0_14px_rgba(221,124,79,0.5),0_0_26px_rgba(221,124,79,0.3)] backdrop-blur-lg hover:border-accent-300 hover:!shadow-[0_0_3px_rgba(221,124,79,1),0_0_9px_rgba(221,124,79,0.85),0_0_20px_rgba(221,124,79,0.65),0_0_36px_rgba(221,124,79,0.4)] disabled:opacity-50 disabled:!shadow-none dark:text-accent-300',
  secondary:
    'bg-transparent border border-stone-300 text-stone-800 backdrop-blur-lg hover:border-primary-400/70 hover:!shadow-[0_0_7px_rgba(61,125,91,0.35)] disabled:text-stone-400 disabled:hover:!shadow-none dark:border-stone-600 dark:text-stone-100 dark:hover:border-primary-400/50 dark:hover:!shadow-[0_0_7px_rgba(92,154,118,0.4)]',
  ghost:
    'text-primary-700 hover:bg-primary-50 hover:shadow-[0_0_5px_rgba(61,125,91,0.3)] disabled:text-stone-400 disabled:hover:shadow-none dark:text-primary-300 dark:hover:bg-stone-800 dark:hover:shadow-[0_0_5px_rgba(92,154,118,0.35)]',
  danger:
    'bg-transparent border-2 border-red-400 text-red-700 !shadow-[0_0_2px_rgba(248,113,113,0.85),0_0_6px_rgba(248,113,113,0.65),0_0_14px_rgba(248,113,113,0.45),0_0_26px_rgba(248,113,113,0.3)] backdrop-blur-lg hover:border-red-300 hover:!shadow-[0_0_3px_rgba(248,113,113,1),0_0_9px_rgba(248,113,113,0.8),0_0_20px_rgba(248,113,113,0.6),0_0_36px_rgba(248,113,113,0.35)] disabled:opacity-50 disabled:!shadow-none dark:text-red-400',
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
