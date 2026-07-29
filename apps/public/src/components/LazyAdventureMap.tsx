import { ClientOnly } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import type { MapSpot, MapTrail } from './AdventureMap';

// leaflet touches `window` at module scope, which crashes during SSR - defer
// the import itself to the client via React.lazy, not just the render
const AdventureMap = lazy(() => import('./AdventureMap'));

function MapPlaceholder({ height = 320 }: { height?: number }) {
  return (
    <div
      style={{ height }}
      className="flex items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-400 dark:border-stone-800 dark:bg-stone-900"
    >
      Loading map...
    </div>
  );
}

export function LazyAdventureMap(props: { trails: MapTrail[]; spots: MapSpot[]; height?: number; zoom?: number }) {
  return (
    <ClientOnly fallback={<MapPlaceholder height={props.height} />}>
      <Suspense fallback={<MapPlaceholder height={props.height} />}>
        <AdventureMap {...props} />
      </Suspense>
    </ClientOnly>
  );
}
