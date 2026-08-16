import type { Spot, Trail } from '@adventure/api-types';

// [west, south, east, north] - matches maplibre-react-native's LngLatBounds.
export type LngLatBounds = [number, number, number, number];

// ~2km buffer at Nepal's latitude range (roughly 0.018 deg ≈ 2km). Shared
// by the map's initial camera bounds now and the deferred offline-pack
// bbox download later (see MOBILE_PLAN.md Phase 3 plan) - one function,
// not duplicated between "what the map shows" and "what gets downloaded."
const BUFFER_DEGREES = 0.02;

export function boundsForGeometry(trails: Trail[], spots: Spot[]): LngLatBounds | null {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  for (const trail of trails) {
    for (const [lng, lat] of trail.geometry.coordinates) {
      west = Math.min(west, lng);
      east = Math.max(east, lng);
      south = Math.min(south, lat);
      north = Math.max(north, lat);
    }
  }
  for (const spot of spots) {
    const [lng, lat] = spot.geometry.coordinates;
    west = Math.min(west, lng);
    east = Math.max(east, lng);
    south = Math.min(south, lat);
    north = Math.max(north, lat);
  }

  if (!Number.isFinite(west) || !Number.isFinite(south)) {
    return null;
  }

  return [west - BUFFER_DEGREES, south - BUFFER_DEGREES, east + BUFFER_DEGREES, north + BUFFER_DEGREES];
}
