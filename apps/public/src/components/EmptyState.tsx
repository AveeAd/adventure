import type { ReactNode } from 'react';

export function EmptyState({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-stone-300 px-6 py-10 text-center text-stone-500 dark:border-stone-700 dark:text-stone-400">
      {icon}
      <p className="text-sm">{children}</p>
    </div>
  );
}
