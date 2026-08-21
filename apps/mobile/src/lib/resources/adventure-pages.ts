import type {
  AdventurePageDetail,
  AdventurePageSummary,
  CreateAdventurePageRequest,
  CreateSpotRequest,
  CreateTrailRequest,
  ListResponse,
  PageRevisionSummary,
  Spot,
  SubmitRevisionRequest,
  Trail,
  TripReportSummary,
  UpdateSpotRequest,
  UpdateTrailRequest,
} from '@adventure/api-types';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authDelete, authGet, authPatch, authPost } from '@/lib/auth-fetch';
import { isConnected } from '@/lib/offline/connectivity';
import { getOfflinePage, getOfflineSpots, getOfflineTrails, isStale, saveOfflineAdventure } from '@/lib/offline/store';

const TRENDING_PAGE_SIZE = 15;

// Trending, paginated - backs Discover's infinite-scroll list
// ((tabs)/discover.tsx). Not offline-cached (search results weren't
// either, back when this hook also covered search) - only a specific
// adventure page a user opened and downloaded is (see useAdventurePage
// below). getNextPageParam compares against the API's own `total`/`page`/
// `pageSize` (ListResponse) rather than trusting `data.length < pageSize`,
// since the latter breaks if the server ever changes its own page size.
export function useAdventurePagesInfinite() {
  return useInfiniteQuery({
    queryKey: ['adventure-pages', 'trending'],
    queryFn: ({ pageParam }) =>
      authGet<ListResponse<AdventurePageSummary>>(
        `/adventure-pages?sort=trending&pageSize=${TRENDING_PAGE_SIZE}&page=${pageParam}`,
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.total ? lastPage.page + 1 : undefined,
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

// A generous box around Nepal, fetched once rather than re-queried per
// viewport pan/zoom - mirrors apps/public/src/routes/index.tsx's own
// NEPAL_BBOX approach (the bbox endpoints only support a rectangle, not a
// country polygon, so this is the same deliberate approximation). Backs the
// standalone Map tab (app/(tabs)/map.tsx), which has no single adventure
// page to scope trails/spots to the way adventures/[slug]/map.tsx does.
const NEPAL_BBOX = { minLng: 79.5, minLat: 26.0, maxLng: 88.5, maxLat: 30.5 };

export function useTrailsBbox() {
  const params = new URLSearchParams({
    minLng: String(NEPAL_BBOX.minLng),
    minLat: String(NEPAL_BBOX.minLat),
    maxLng: String(NEPAL_BBOX.maxLng),
    maxLat: String(NEPAL_BBOX.maxLat),
  });
  return useQuery({
    queryKey: ['trails-bbox', 'nepal'],
    queryFn: () => authGet<Trail[]>(`/trails/bbox?${params}`),
  });
}

export function useSpotsBbox() {
  const params = new URLSearchParams({
    minLng: String(NEPAL_BBOX.minLng),
    minLat: String(NEPAL_BBOX.minLat),
    maxLng: String(NEPAL_BBOX.maxLng),
    maxLat: String(NEPAL_BBOX.maxLat),
  });
  return useQuery({
    queryKey: ['spots-bbox', 'nepal'],
    queryFn: () => authGet<Spot[]>(`/spots/bbox?${params}`),
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

// `id` is the page's own id (what the API route needs); `slug` is the
// query key useAdventurePage is cached under - both are needed since the
// two don't share a key space.
export function useToggleLike(id: string, slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (liked: boolean) =>
      liked
        ? authDelete<{ likeCount: number }>(`/adventure-pages/${id}/likes`)
        : authPost<{ likeCount: number }>(`/adventure-pages/${id}/likes`),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['adventure-page', slug] });
    },
  });
}

export function useToggleVisit(id: string, slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (visited: boolean) =>
      visited
        ? authDelete(`/adventure-pages/${id}/visits`)
        : authPost(`/adventure-pages/${id}/visits`),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['adventure-page', slug] });
    },
  });
}

export function useCreateAdventurePage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAdventurePageRequest) =>
      authPost<AdventurePageDetail>('/adventure-pages', body),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['adventure-pages'] });
    },
  });
}

export function useSubmitPageRevision(pageId: string, slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: SubmitRevisionRequest) =>
      authPost<PageRevisionSummary>(`/adventure-pages/${pageId}/revisions`, body),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['adventure-page', slug] });
    },
  });
}

export function useCreateTrail(pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTrailRequest) => authPost<Trail>(`/adventure-pages/${pageId}/trails`, body),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['adventure-page-trails', pageId] });
    },
  });
}

export function useUpdateTrail(trailId: string, pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateTrailRequest) => authPatch<Trail>(`/trails/${trailId}`, body),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['adventure-page-trails', pageId] });
    },
  });
}

export function useCreateSpot(pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateSpotRequest) => authPost<Spot>(`/adventure-pages/${pageId}/spots`, body),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['adventure-page-spots', pageId] });
    },
  });
}

export function useUpdateSpot(spotId: string, pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateSpotRequest) => authPatch<Spot>(`/spots/${spotId}`, body),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['adventure-page-spots', pageId] });
    },
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
