import type { CameraRef } from '@maplibre/maplibre-react-native';
import { useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { useCallback, useRef, useState } from 'react';

import { AdventureMap } from '@/components/AdventureMap';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { MapLocateButton } from '@/components/MapLocateButton';
import { useSpotsBbox, useTrailsBbox } from '@/lib/resources/adventure-pages';

// The Map tab: every trail/spot in Nepal on one full-screen map, unscoped
// to any single adventure page - contrast adventures/[slug]/map.tsx, which
// is per-page. No SafeAreaView/Screen wrapper on purpose (unlike every
// other tab) since the map should render edge-to-edge under the status bar
// and behind the translucent tab bar, not sit inside the usual padded
// content area.
export default function MapTab() {
  const { data: trails, isLoading: isTrailsLoading, isError: isTrailsError, refetch: refetchTrails } = useTrailsBbox();
  const { data: spots, isLoading: isSpotsLoading, isError: isSpotsError, refetch: refetchSpots } = useSpotsBbox();
  const cameraRef = useRef<CameraRef>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Shared by the focus effect below (automatic, silent) and
  // MapLocateButton's onPress (explicit, user-triggered) - same "degrade,
  // don't block" stance as recorder.ts's own permission handling on a
  // denied permission or failed fix; the map already has a sensible
  // Nepal-wide default view from AdventureMap's own bounds logic to fall
  // back to.
  const flyToUserLocation = useCallback(async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      cameraRef.current?.flyTo({
        center: [position.coords.longitude, position.coords.latitude],
        zoom: 13,
        duration: 1200,
      });
    } catch {
      // No last-known/current fix available - leave the current view.
    } finally {
      setIsLocating(false);
    }
  }, []);

  // Runs once every time this tab regains focus (switching tabs, not just
  // the first mount) - useFocusEffect, not a plain useEffect, since this
  // screen never actually unmounts on a tab switch (a plain effect would
  // only fire once, on first mount).
  useFocusEffect(
    useCallback(() => {
      void flyToUserLocation();
    }, [flyToUserLocation]),
  );

  if (isTrailsLoading || isSpotsLoading) return <LoadingState />;
  if (isTrailsError || isSpotsError) {
    return (
      <ErrorState
        onRetry={() => {
          refetchTrails();
          refetchSpots();
        }}
      />
    );
  }

  return (
    <>
      <AdventureMap trails={trails ?? []} spots={spots ?? []} cameraRef={cameraRef} showUserLocation />
      <MapLocateButton onPress={flyToUserLocation} loading={isLocating} />
    </>
  );
}
