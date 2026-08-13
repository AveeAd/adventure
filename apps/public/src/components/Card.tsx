import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  glass = false,
}: {
  children: ReactNode;
  className?: string;
  glass?: boolean;
}) {
  const surface = glass
    ? 'glass-1 backdrop-blur-lg border-[color:var(--glass-border)]'
    : 'border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900';
  return <div className={`rounded-xl border shadow-sm ${surface} ${className}`}>{children}</div>;
}
