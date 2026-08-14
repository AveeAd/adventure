import type { ReactNode } from 'react';

// Every page uses the same max width (matching the header/Discover page)
// so container width stays consistent across the app.
export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <main className={`mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 ${className}`}>{children}</main>;
}
