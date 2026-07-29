import type { ReactNode } from 'react';

export function Container({
  children,
  size = 'default',
  className = '',
}: {
  children: ReactNode;
  size?: 'default' | 'wide';
  className?: string;
}) {
  const maxWidth = size === 'wide' ? 'max-w-5xl' : 'max-w-3xl';
  return <main className={`mx-auto w-full ${maxWidth} px-4 py-8 sm:px-6 ${className}`}>{children}</main>;
}
