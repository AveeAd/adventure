import type { Spot, Trail } from '@adventure/api-types';
import {
  Camera,
  GeoJSONSource,
  Layer,
  LocationManager,
  Map,
  UserLocation,
  type CameraRef,
} from '@maplibre/maplibre-react-native';
import type { Ref } from 'react';
import { useEffect } from 'react';
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

export function AdventureMap({
  trails,
  spots,
  cameraRef,
  showUserLocation = false,
}: {
  trails: Trail[];
  spots: Spot[];
  // Optional imperative handle onto the underlying Camera - only the
  // standalone Map tab uses this (to fly to the user's location on focus,
  // see (tabs)/index.tsx), the per-adventure-page map screen has no need
  // to drive the camera from outside this component.
  cameraRef?: Ref<CameraRef>;
  // Renders MapLibre's own "blue dot" location puck - opt-in, same
  // reasoning as cameraRef: only the Map tab wants a live "you are here"
  // marker, the per-adventure-page map is about the page's own trails/spots,
  // not the viewer's position.
  showUserLocation?: boolean;
}) {
  const bounds = boundsForGeometry(trails, spots);

  // <UserLocation>'s addListener -> NativeLocationModule.start() assumes
  // the OS permission is already granted rather than requesting it itself -
  // our own expo-location request (Map tab's fly-to-camera effect,
  // (tabs)/index.tsx) triggers the same OS-level permission dialog, but
  // that's a separate JS module from MapLibre's own native location code,
  // and start() can race ahead of it on a cold app start with permission
  // not yet granted, silently never receiving a fix even after the user
  // accepts. Calling MapLibre's own requestPermissions() here keeps its
  // native module in the loop regardless of what else requested first -
  // it's safe to call again if permission's already granted (resolves
  // immediately true on both platforms).
  useEffect(() => {
    if (showUserLocation) {
      LocationManager.requestPermissions();
    }
  }, [showUserLocation]);

  return (
    <View style={{ flex: 1 }}>
      <Map mapStyle={STYLE_URL} style={{ flex: 1 }}>
        <Camera ref={cameraRef} initialViewState={bounds ? { bounds } : { center: [84.124, 28.3949], zoom: 6 }} />
        {showUserLocation ? <UserLocation animated accuracy /> : null}

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
