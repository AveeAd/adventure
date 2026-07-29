import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useEffect, useState } from 'react';
import { GeoJSON, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';

// react-leaflet's bundled default marker icon URLs break under Vite - point
// them at the actual bundled asset URLs instead (a well-known Leaflet+bundler gotcha)
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const NEPAL_CENTER: [number, number] = [28.3949, 84.124];

export interface MapTrail {
  id: string;
  name: string | null;
  geometry: GeoJSON.LineString;
  verificationStatus: string;
  pageSlug?: string;
  pageTitle?: string;
}

export interface MapSpot {
  id: string;
  name: string;
  spotTypeName?: string;
  geometry: GeoJSON.Point;
  verificationStatus: string;
  pageSlug?: string;
  pageTitle?: string;
}

function FitBounds({ trails, spots }: { trails: MapTrail[]; spots: MapSpot[] }) {
  const map = useMap();

  useEffect(() => {
    const layers: L.Layer[] = [
      ...trails.map((t) => L.geoJSON(t.geometry)),
      ...spots.map((s) => L.marker([s.geometry.coordinates[1], s.geometry.coordinates[0]])),
    ];
    if (layers.length === 0) return;
    const group = L.featureGroup(layers);
    map.fitBounds(group.getBounds(), { padding: [24, 24], maxZoom: 15 });
  }, [map, trails, spots]);

  return null;
}

// leaflet sizes its canvas from the container's dimensions at mount time, so
// toggling fullscreen (which resizes the container via CSS) needs an explicit
// invalidateSize or the map stays clipped to its old size
function InvalidateSizeOnChange({ dependency }: { dependency: unknown }) {
  const map = useMap();

  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 0);
    return () => window.clearTimeout(id);
  }, [map, dependency]);

  return null;
}

function FullscreenToggle({ isFullscreen, onToggle }: { isFullscreen: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isFullscreen ? 'Exit fullscreen' : 'View fullscreen'}
      className="absolute right-2 top-2 z-[1000] rounded-lg border border-stone-200 bg-white/90 p-2 text-stone-600 shadow-sm hover:bg-white dark:border-stone-700 dark:bg-stone-900/90 dark:text-stone-300 dark:hover:bg-stone-900"
    >
      {isFullscreen ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 9 4 4m0 0v4m0-4h4m6 6 5-5m0 0v4m0-4h-4M9 15l-5 5m0 0v-4m0 4h4m6-6 5 5m0 0v-4m0 4h-4" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4h4M20 8V4h-4M4 16v4h4m12-4v4h-4" />
        </svg>
      )}
    </button>
  );
}

export function AdventureMap({
  trails,
  spots,
  height = 320,
  zoom = 7,
}: {
  trails: MapTrail[];
  spots: MapSpot[];
  height?: number;
  zoom?: number;
}) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen]);

  return (
    <div
      style={isFullscreen ? undefined : { height }}
      className={
        isFullscreen
          ? 'fixed inset-0 z-[1000]'
          : 'relative overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800'
      }
    >
      <FullscreenToggle isFullscreen={isFullscreen} onToggle={() => setIsFullscreen((v) => !v)} />
      <MapContainer center={NEPAL_CENTER} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {trails.map((trail) => (
          <GeoJSON key={trail.id} data={trail.geometry} pathOptions={{ color: '#2f6b4f', weight: 4 }}>
            <Popup>
              <strong>{trail.name ?? 'Trail'}</strong>
              {trail.pageSlug && trail.pageTitle && (
                <>
                  <br />
                  <a href={`/adventures/${trail.pageSlug}`}>{trail.pageTitle}</a>
                </>
              )}
            </Popup>
          </GeoJSON>
        ))}
        {spots.map((spot) => (
          <Marker key={spot.id} position={[spot.geometry.coordinates[1], spot.geometry.coordinates[0]]}>
            <Popup>
              <strong>{spot.name}</strong>
              {spot.spotTypeName && (
                <>
                  <br />
                  {spot.spotTypeName}
                </>
              )}
              {spot.pageSlug && spot.pageTitle && (
                <>
                  <br />
                  <a href={`/adventures/${spot.pageSlug}`}>{spot.pageTitle}</a>
                </>
              )}
            </Popup>
          </Marker>
        ))}
        <FitBounds trails={trails} spots={spots} />
        <InvalidateSizeOnChange dependency={isFullscreen} />
      </MapContainer>
    </div>
  );
}

export default AdventureMap;
