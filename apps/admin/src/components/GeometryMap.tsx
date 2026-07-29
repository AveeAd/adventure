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

function FitToGeometry({ geometry }: { geometry: GeoJSON.Geometry }) {
  const map = useMap();

  useEffect(() => {
    const layer = geometry.type === 'Point' ? L.marker([geometry.coordinates[1], geometry.coordinates[0]]) : L.geoJSON(geometry);
    const bounds = 'getBounds' in layer ? layer.getBounds() : L.latLngBounds([layer.getLatLng(), layer.getLatLng()]);
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
  }, [map, geometry]);

  return null;
}

export function GeometryMap({ geometry, height = 240 }: { geometry: GeoJSON.Geometry; height?: number }) {
  return (
    <div style={{ height }}>
      <MapContainer center={[28.3949, 84.124]} zoom={7} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geometry.type === 'Point' ? (
          <Marker position={[geometry.coordinates[1], geometry.coordinates[0]]} />
        ) : (
          <GeoJSON data={geometry} pathOptions={{ color: '#2f6b4f', weight: 4 }} />
        )}
        <FitToGeometry geometry={geometry} />
      </MapContainer>
    </div>
  );
}
