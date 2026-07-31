import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useEffect } from 'react';
import { GeoJSON, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const NEPAL_CENTER: [number, number] = [28.3949, 84.124];

function toLayer(geometry: GeoJSON.Geometry) {
  return geometry.type === 'Point' ? L.marker([geometry.coordinates[1], geometry.coordinates[0]]) : L.geoJSON(geometry);
}

function FitBounds({ from, to }: { from: GeoJSON.Geometry; to: GeoJSON.Geometry }) {
  const map = useMap();

  useEffect(() => {
    const group = L.featureGroup([toLayer(from), toLayer(to)]);
    map.fitBounds(group.getBounds(), { padding: [24, 24], maxZoom: 15 });
  }, [map, from, to]);

  return null;
}

// Old geometry muted/dashed, new solid - the revision-diff overlay
// GEODATA_HISTORY.md calls for. Feeds AdventureMap's styling convention
// (pine-green solid) but this is its own small component since AdventureMap
// renders lists of same-styled trails/spots, not an old/new pair.
export function GeodataDiffMap({ from, to, height = 320 }: { from: GeoJSON.Geometry; to: GeoJSON.Geometry; height?: number }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800" style={{ height }}>
      <MapContainer center={NEPAL_CENTER} zoom={7} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {from.type === 'Point' ? (
          <Marker position={[from.coordinates[1], from.coordinates[0]]} opacity={0.5} />
        ) : (
          <GeoJSON data={from} pathOptions={{ color: '#94a3b8', weight: 3, dashArray: '6 6' }} />
        )}
        {to.type === 'Point' ? (
          <Marker position={[to.coordinates[1], to.coordinates[0]]} />
        ) : (
          <GeoJSON data={to} pathOptions={{ color: '#2f6b4f', weight: 4 }} />
        )}
        <FitBounds from={from} to={to} />
      </MapContainer>
    </div>
  );
}

export default GeodataDiffMap;
