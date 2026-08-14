import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../lib/auth/api';
import { Input } from './FormField';

type AttachmentType = 'tripReport' | 'trail' | 'spot' | 'adventurePage';

const SEARCH_PATH: Record<AttachmentType, string> = {
  tripReport: '/trip-reports/search',
  trail: '/trails/search',
  spot: '/spots/search',
  adventurePage: '/adventure-pages/search',
};

interface Option {
  id: string;
  label: string;
  // Only populated for type="adventurePage" - lets a caller route to
  // /adventures/$slug/... (e.g. the flat trip-groups list's "start a
  // group" picker) without a second lookup.
  slug?: string;
}

// adventure-pages/search is the pre-existing paginated {data:[...]} search
// endpoint; the other three are minimal id+title/name arrays added for this
// picker (no general search service exists in this repo - see THREAD_PLAN.md).
async function search(type: AttachmentType, q: string): Promise<Option[]> {
  const res = await fetch(apiUrl(`${SEARCH_PATH[type]}?q=${encodeURIComponent(q)}`));
  if (!res.ok) return [];
  const body = await res.json();
  const rows: Array<{ id: string; title?: string | null; name?: string | null; slug?: string }> =
    type === 'adventurePage' ? body.data : body;
  return rows.map((row) => ({ id: row.id, label: row.title ?? row.name ?? row.id, slug: row.slug }));
}

// Search-as-you-type combobox for the club-thread composer's four optional
// attachments (TripReport/Trail/Spot/AdventurePage) - no existing picker
// pattern to reuse in this app, built from scratch per THREAD_PLAN.md.
export function AttachmentPicker({
  type,
  label,
  value,
  onChange,
}: {
  type: AttachmentType;
  label: string;
  value: Option | null;
  onChange: (value: Option | null) => void;
}) {
  const { t } = useTranslation('threads');
  const [query, setQuery] = useState('');
  const [options, setOptions] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setOptions([]);
      return;
    }
    const handle = setTimeout(() => {
      search(type, query.trim()).then(setOptions);
    }, 250);
    return () => clearTimeout(handle);
  }, [type, query]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900">
        <span className="text-stone-700 dark:text-stone-300">
          {label}: <span className="font-medium">{value.label}</span>
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-stone-400 hover:text-red-600 dark:hover:text-red-400"
          aria-label={t('attachmentPicker.remove')}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={t('attachmentPicker.searchPlaceholder', { label })}
      />
      {open && options.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-stone-200 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-900">
          {options.map((option) => (
            <li key={option.id}>
              <button
                type="button"
                // Without this, the input's onBlur fires first (on
                // mousedown) and races its own setTimeout-delayed close
                // against this click's onChange - losing the race closes
                // the list before the selection registers. Blocking the
                // blur here keeps focus on the input until the click (and
                // its onChange) has already run.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(option);
                  setQuery('');
                  setOptions([]);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export type { AttachmentType, Option as AttachmentOption };
