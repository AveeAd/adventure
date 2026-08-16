import type {
  AdventurePageDetail,
  AdventurePageSummary,
  ListResponse,
  Spot,
  Trail,
  TripReportSummary,
} from '@adventure/api-types';
import { useQuery } from '@tanstack/react-query';

import { authGet } from '@/lib/auth-fetch';
import { isConnected } from '@/lib/offline/connectivity';
import { getOfflinePage, getOfflineSpots, getOfflineTrails, isStale, saveOfflineAdventure } from '@/lib/offline/store';

// search?.trim() decides trending vs. search, mirroring apps/public's
// routes/index.tsx (trending fetch vs. debounced /adventure-pages/search).
// Search results aren't offline-cached - only a specific adventure page a
// user opened and downloaded is (see useAdventurePage below).
export function useAdventurePages(search?: string) {
  const trimmed = search?.trim();
  return useQuery({
    queryKey: ['adventure-pages', trimmed ?? 'trending'],
    queryFn: () =>
      trimmed
        ? authGet<ListResponse<AdventurePageSummary>>(
            `/adventure-pages/search?q=${encodeURIComponent(trimmed)}&pageSize=20`,
          )
        : authGet<ListResponse<AdventurePageSummary>>('/adventure-pages?sort=trending&pageSize=15'),
  });
}

// Cache-first when a local copy exists (see MOBILE_PLAN.md Phase 3): serves
// the offline copy immediately if present and not stale, falls back to it
// on a failed fetch (no connection), and silently re-syncs a standing
// download whenever a fresh fetch succeeds - all without screens knowing
// the difference, since they already call this hook unmodified.
export function useAdventurePage(slug: string) {
  return useQuery({
    queryKey: ['adventure-page', slug],
    queryFn: async (): Promise<AdventurePageDetail> => {
      const local = await getOfflinePage(slug);
      const online = await isConnected();
      if (local?.status === 'downloaded' && (!online || !isStale(local.downloadedAt))) {
        return local.payload;
      }
      try {
        const fresh = await authGet<AdventurePageDetail>(`/adventure-pages/slug/${slug}`);
        if (local?.status === 'downloaded') {
          const [trails, spots] = await Promise.all([
            authGet<Trail[]>(`/adventure-pages/${fresh.id}/trails`),
            authGet<Spot[]>(`/adventure-pages/${fresh.id}/spots`),
          ]);
          await saveOfflineAdventure(fresh, trails, spots);
        }
        return fresh;
      } catch (err) {
        if (local?.status === 'downloaded') return local.payload;
        throw err;
      }
    },
  });
}

export function useTrails(pageId: string | undefined) {
  return useQuery({
    queryKey: ['adventure-page-trails', pageId],
    queryFn: async (): Promise<Trail[]> => {
      const online = await isConnected();
      if (!online) {
        const local = await getOfflineTrails(pageId!);
        if (local.length) return local;
      }
      try {
        return await authGet<Trail[]>(`/adventure-pages/${pageId}/trails`);
      } catch (err) {
        const local = await getOfflineTrails(pageId!);
        if (local.length) return local;
        throw err;
      }
    },
    enabled: !!pageId,
  });
}

export function useSpots(pageId: string | undefined) {
  return useQuery({
    queryKey: ['adventure-page-spots', pageId],
    queryFn: async (): Promise<Spot[]> => {
      const online = await isConnected();
      if (!online) {
        const local = await getOfflineSpots(pageId!);
        if (local.length) return local;
      }
      try {
        return await authGet<Spot[]>(`/adventure-pages/${pageId}/spots`);
      } catch (err) {
        const local = await getOfflineSpots(pageId!);
        if (local.length) return local;
        throw err;
      }
    },
    enabled: !!pageId,
  });
}

export function useTripReports(pageId: string | undefined) {
  return useQuery({
    queryKey: ['adventure-page-trip-reports', pageId],
    queryFn: () =>
      authGet<ListResponse<TripReportSummary>>(`/adventure-pages/${pageId}/trip-reports?pageSize=50`),
    enabled: !!pageId,
  });
}
