const PALETTE = [
  'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200',
  'bg-accent-100 text-accent-800 dark:bg-accent-900 dark:text-accent-200',
  'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
];

function paletteFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

const SIZE_CLASSES = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-16 w-16 text-xl',
};

export function Avatar({ label, size = 'md' }: { label: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = label
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  const sizeClasses = SIZE_CLASSES[size];

  return (
    <span
      className={`inline-flex flex-shrink-0 items-center justify-center rounded-full font-semibold ${sizeClasses} ${paletteFor(label)}`}
    >
      {initials || '?'}
    </span>
  );
}
