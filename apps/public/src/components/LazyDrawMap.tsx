import { ClientOnly } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import type { LngLat } from './DrawMap';

const DrawMap = lazy(() => import('./DrawMap').then((mod) => ({ default: mod.DrawMap })));

function MapPlaceholder({ height = 360 }: { height?: number }) {
  return (
    <div
      style={{ height }}
      className="flex items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-400 dark:border-stone-800 dark:bg-stone-900"
    >
      Loading map...
    </div>
  );
}

export function LazyDrawMap(props: {
  mode: 'point' | 'line';
  points: LngLat[];
  onPointsChange: (points: LngLat[]) => void;
  height?: number;
}) {
  return (
    <ClientOnly fallback={<MapPlaceholder height={props.height} />}>
      <Suspense fallback={<MapPlaceholder height={props.height} />}>
        <DrawMap {...props} />
      </Suspense>
    </ClientOnly>
  );
}
