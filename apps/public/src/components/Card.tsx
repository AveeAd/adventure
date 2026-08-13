import type { MouseEvent, ReactNode } from 'react';

export function Card({
  children,
  className = '',
  glass = false,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  glass?: boolean;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
}) {
  const surface = glass
    ? 'bg-white/10 backdrop-blur-lg border-[color:var(--glass-border)] dark:bg-stone-900/10'
    : 'border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900';
  return (
    <div className={`rounded-xl border shadow-sm ${surface} ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}
