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
    <div className="mt-6 grid grid-cols-1 gap-4 lg:h-[32rem] lg:grid-cols-[18rem_1fr]">
      <div className="order-2 flex flex-col overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800 lg:order-1 lg:overflow-y-auto">
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
      <div className="order-1 h-64 lg:order-2 lg:h-full">{map}</div>
    </div>
  );
}
