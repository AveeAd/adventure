import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { MapContainer, Marker, Polyline, TileLayer, useMapEvents } from 'react-leaflet';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const NEPAL_CENTER: [number, number] = [28.3949, 84.124];

function ClickCapture({ onMapClick }: { onMapClick: (lng: number, lat: number) => void }) {
  useMapEvents({
    click: (event) => onMapClick(event.latlng.lng, event.latlng.lat),
  });
  return null;
}

// [lng, lat] pairs (GeoJSON coordinate order) - the API's geometry columns
// are GeoJSON, so the form keeps points in that order end to end
export type LngLat = [number, number];

export function DrawMap({
  mode,
  points,
  onPointsChange,
  height = 360,
}: {
  mode: 'point' | 'line';
  points: LngLat[];
  onPointsChange: (points: LngLat[]) => void;
  height?: number;
}) {
  return (
    <div style={{ height }} className="overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800">
      <MapContainer center={NEPAL_CENTER} zoom={7} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickCapture
          onMapClick={(lng, lat) => {
            if (mode === 'point') {
              onPointsChange([[lng, lat]]);
            } else {
              onPointsChange([...points, [lng, lat]]);
            }
          }}
        />
        {mode === 'point' &&
          points[0] && <Marker position={[points[0][1], points[0][0]]} />}
        {mode === 'line' && points.length > 0 && (
          <Polyline positions={points.map(([lng, lat]) => [lat, lng])} pathOptions={{ color: '#2f6b4f', weight: 4 }} />
        )}
      </MapContainer>
    </div>
  );
}
