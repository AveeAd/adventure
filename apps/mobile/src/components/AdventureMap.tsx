import type { Spot, Trail } from '@adventure/api-types';
import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import { View } from 'react-native';

import { boundsForGeometry } from '@/lib/map/bbox';

// Free, no-API-key hosted vector tile style - matches the repo's existing
// "free, no API key" map ethos (CLAUDE.md locks OSM raster tiles for the
// same reason on the web app). Self-hosted PMTiles + offline packs are
// deferred to a later phase once that archive exists (MOBILE_PLAN.md Phase 3).
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

function trailsToFeatureCollection(trails: Trail[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: trails.map((trail) => ({
      type: 'Feature',
      geometry: trail.geometry,
      properties: { id: trail.id, name: trail.name },
    })),
  };
}

function spotsToFeatureCollection(spots: Spot[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: spots.map((spot) => ({
      type: 'Feature',
      geometry: spot.geometry,
      properties: { id: spot.id, name: spot.name },
    })),
  };
}

export function AdventureMap({ trails, spots }: { trails: Trail[]; spots: Spot[] }) {
  const bounds = boundsForGeometry(trails, spots);

  return (
    <View style={{ flex: 1 }}>
      <Map mapStyle={STYLE_URL} style={{ flex: 1 }}>
        <Camera initialViewState={bounds ? { bounds } : { center: [84.124, 28.3949], zoom: 6 }} />

        {trails.length ? (
          <GeoJSONSource id="trails" data={trailsToFeatureCollection(trails)}>
            <Layer
              type="line"
              source="trails"
              paint={{ 'line-color': '#2f6b4f', 'line-width': 3 }}
            />
          </GeoJSONSource>
        ) : null}

        {spots.length ? (
          <GeoJSONSource id="spots" data={spotsToFeatureCollection(spots)}>
            <Layer
              type="circle"
              source="spots"
              paint={{ 'circle-color': '#c1633c', 'circle-radius': 6 }}
            />
          </GeoJSONSource>
        ) : null}
      </Map>
    </View>
  );
}
