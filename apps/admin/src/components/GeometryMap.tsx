import { FullscreenExitOutlined, FullscreenOutlined } from '@ant-design/icons';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { Button } from 'antd';
import { useEffect, useState } from 'react';
import { GeoJSON, MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function toLayer(geometry: GeoJSON.Geometry): L.Layer {
  return geometry.type === 'Point' ? L.marker([geometry.coordinates[1], geometry.coordinates[0]]) : L.geoJSON(geometry);
}

function toBounds(layer: L.Layer): L.LatLngBounds {
  return 'getBounds' in layer
    ? (layer as L.GeoJSON).getBounds()
    : L.latLngBounds([(layer as L.Marker).getLatLng(), (layer as L.Marker).getLatLng()]);
}

function FitToGeometry({ geometry, compareGeometry }: { geometry: GeoJSON.Geometry; compareGeometry?: GeoJSON.Geometry }) {
  const map = useMap();

  useEffect(() => {
    const bounds = toBounds(toLayer(geometry));
    if (compareGeometry) {
      bounds.extend(toBounds(toLayer(compareGeometry)));
    }
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 14 });
  }, [map, geometry, compareGeometry]);

  return null;
}

// leaflet sizes its canvas from the container's dimensions at mount time, so
// toggling fullscreen (which resizes the container via CSS) needs an explicit
// invalidateSize or the map stays clipped to its old size - mirrors
// apps/public/src/components/AdventureMap.tsx's InvalidateSizeOnChange.
function InvalidateSizeOnChange({ dependency }: { dependency: unknown }) {
  const map = useMap();

  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 0);
    return () => window.clearTimeout(id);
  }, [map, dependency]);

  return null;
}

// apps/admin has no Tailwind (see CLAUDE.md - antd + ConfigProvider tokens
// instead), so positioning here is plain inline styles, not utility classes.
// compareGeometry (optional) renders muted/dashed alongside geometry solid -
// the revision-diff overlay GEODATA_HISTORY.md calls for, reusing this
// component rather than building a second map component.
export function GeometryMap({
  geometry,
  compareGeometry,
  height = 240,
}: {
  geometry: GeoJSON.Geometry;
  compareGeometry?: GeoJSON.Geometry;
  height?: number;
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
      style={
        isFullscreen
          ? { position: 'fixed', inset: 0, zIndex: 1000 }
          : { height, position: 'relative' }
      }
    >
      <Button
        type="default"
        size="small"
        onClick={() => setIsFullscreen((v) => !v)}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'View fullscreen'}
        icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
        style={{ position: 'absolute', right: 8, top: 8, zIndex: 1000 }}
      />
      <MapContainer center={[28.3949, 84.124]} zoom={7} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {compareGeometry && (
          compareGeometry.type === 'Point' ? (
            <Marker position={[compareGeometry.coordinates[1], compareGeometry.coordinates[0]]} opacity={0.5} />
          ) : (
            <GeoJSON data={compareGeometry} pathOptions={{ color: '#94a3b8', weight: 3, dashArray: '6 6' }} />
          )
        )}
        {geometry.type === 'Point' ? (
          <Marker position={[geometry.coordinates[1], geometry.coordinates[0]]} />
        ) : (
          <GeoJSON data={geometry} pathOptions={{ color: '#2f6b4f', weight: 4 }} />
        )}
        <FitToGeometry geometry={geometry} compareGeometry={compareGeometry} />
        <InvalidateSizeOnChange dependency={isFullscreen} />
      </MapContainer>
    </div>
  );
}
