import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useEffect } from 'react';
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
  return (
    <div style={{ height }} className="overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800">
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
      </MapContainer>
    </div>
  );
}

export default AdventureMap;
