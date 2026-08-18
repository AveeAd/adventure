import type { ListResponse, MasterDataOption } from '@adventure/api-types';
import { useQuery } from '@tanstack/react-query';

import { authGet } from '@/lib/auth-fetch';

// Filter-option lists for the Guides screen, mirroring apps/public's
// guides/index.tsx fetches. Generic CRUD list endpoints, public GET.
function useMasterDataOptions(path: string) {
  return useQuery({
    queryKey: ['master-data', path],
    queryFn: () => authGet<ListResponse<MasterDataOption>>(`/${path}?pageSize=200`),
    staleTime: 10 * 60_000,
  });
}

export const useActivityTypes = () => useMasterDataOptions('activity-types');
export const useDistricts = () => useMasterDataOptions('districts');
export const useLanguages = () => useMasterDataOptions('languages');
export const useDifficultyLevels = () => useMasterDataOptions('difficulty-levels');
export const useSeasons = () => useMasterDataOptions('seasons');
export const useTags = () => useMasterDataOptions('tags');
export const useSpotTypes = () => useMasterDataOptions('spot-types');
