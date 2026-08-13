import { useState, type ReactNode } from 'react';
import { ChevronUp } from 'lucide-react';

export function MapHeroLayout({
  map,
  sidebar,
  expandLabel,
  collapseLabel,
}: {
  map: ReactNode;
  sidebar: ReactNode;
  expandLabel: string;
  collapseLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="h-64 overflow-hidden rounded-xl border border-stone-200 sm:h-96 dark:border-stone-800">{map}</div>
      <div className="flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-white/10 backdrop-blur-lg dark:border-stone-800 dark:bg-stone-900/10">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="flex items-center justify-center gap-1.5 border-b border-stone-200 bg-stone-50 py-2 text-sm font-medium text-stone-600 lg:hidden dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
        >
          <ChevronUp className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          {expanded ? collapseLabel : expandLabel}
        </button>
        <div
          className={`overflow-y-auto transition-[max-height] duration-300 ${expanded ? 'max-h-[70vh]' : 'max-h-56'} lg:!max-h-none lg:overflow-visible`}
        >
          {sidebar}
        </div>
      </div>
    </div>
  );
}
