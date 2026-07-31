import { ClientOnly } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

const GeodataDiffMap = lazy(() => import('./GeodataDiffMap'));

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

export function LazyGeodataDiffMap(props: { from: GeoJSON.Geometry; to: GeoJSON.Geometry; height?: number }) {
  return (
    <ClientOnly fallback={<MapPlaceholder height={props.height} />}>
      <Suspense fallback={<MapPlaceholder height={props.height} />}>
        <GeodataDiffMap {...props} />
      </Suspense>
    </ClientOnly>
  );
}
