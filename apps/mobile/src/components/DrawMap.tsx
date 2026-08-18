import type { PressEvent } from '@maplibre/maplibre-react-native';
import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import type { NativeSyntheticEvent } from 'react-native';
import { View } from 'react-native';

import { Button } from '@/components/Button';
import type { LngLatBounds } from '@/lib/map/bbox';

// Same free/no-API-key style as AdventureMap.tsx.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

type LngLat = [number, number];

// RN equivalent of apps/public/src/components/DrawMap.tsx - hand-rolled
// tap-to-add-point interaction (no drawing library, same as the web
// version). `points` stays in GeoJSON [lng, lat] order end-to-end;
// MapLibre's own press event already reports lngLat in that order (unlike
// Leaflet, which needed a swap at the render boundary), so no coordinate
// translation is needed anywhere in this component.
export function DrawMap({
  points,
  onPointsChange,
  mode,
  center,
}: {
  points: LngLat[];
  onPointsChange: (points: LngLat[]) => void;
  mode: 'point' | 'line';
  center?: LngLat;
}) {
  const handlePress = (event: NativeSyntheticEvent<PressEvent>) => {
    const { lngLat } = event.nativeEvent;
    if (mode === 'point') {
      onPointsChange([lngLat]);
    } else {
      onPointsChange([...points, lngLat]);
    }
  };

  const bounds = points.length ? boundsForPoints(points) : null;

  const pointsFeatureCollection: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: points.map((coordinates) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates },
      properties: {},
    })),
  };

  const lineFeatureCollection: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features:
      mode === 'line' && points.length >= 2
        ? [{ type: 'Feature', geometry: { type: 'LineString', coordinates: points }, properties: {} }]
        : [],
  };

  return (
    <View className="flex-1">
      <Map mapStyle={STYLE_URL} style={{ flex: 1 }} onPress={handlePress}>
        <Camera
          initialViewState={bounds ? { bounds } : { center: center ?? [84.124, 28.3949], zoom: 6 }}
        />

        {points.length ? (
          <>
            <GeoJSONSource id="draw-points" data={pointsFeatureCollection}>
              <Layer
                type="circle"
                source="draw-points"
                paint={{ 'circle-color': '#c1633c', 'circle-radius': 6 }}
              />
            </GeoJSONSource>
            {mode === 'line' ? (
              <GeoJSONSource id="draw-line" data={lineFeatureCollection}>
                <Layer
                  type="line"
                  source="draw-line"
                  paint={{ 'line-color': '#2f6b4f', 'line-width': 3 }}
                />
              </GeoJSONSource>
            ) : null}
          </>
        ) : null}
      </Map>

      <View className="flex-row justify-center gap-3 bg-white p-3 dark:bg-primary-950">
        <Button
          variant="secondary"
          size="sm"
          disabled={!points.length}
          onPress={() => onPointsChange(points.slice(0, -1))}
        >
          Undo point
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!points.length}
          onPress={() => onPointsChange([])}
        >
          Clear
        </Button>
      </View>
    </View>
  );
}

function boundsForPoints(points: LngLat[]): LngLatBounds | null {
  if (!points.length) return null;
  const lngs = points.map((p) => p[0]);
  const lats = points.map((p) => p[1]);
  return [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)];
}
