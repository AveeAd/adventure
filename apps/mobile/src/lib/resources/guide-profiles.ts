import type { GuideProfile, ListResponse } from '@adventure/api-types';
import { useQuery } from '@tanstack/react-query';

import { authGet } from '@/lib/auth-fetch';

export interface GuideFilters {
  activityTypeId?: string;
  districtId?: string;
  languageId?: string;
}

export function useGuideProfiles(filters: GuideFilters = {}) {
  const params = new URLSearchParams({ pageSize: '50' });
  if (filters.activityTypeId) params.set('activityTypeId', filters.activityTypeId);
  if (filters.districtId) params.set('districtId', filters.districtId);
  if (filters.languageId) params.set('languageId', filters.languageId);

  return useQuery({
    queryKey: ['guide-profiles', filters],
    queryFn: () => authGet<ListResponse<GuideProfile>>(`/guide-profiles?${params.toString()}`),
  });
}

export function useGuideProfile(id: string) {
  return useQuery({
    queryKey: ['guide-profile', id],
    queryFn: () => authGet<GuideProfile>(`/guide-profiles/${id}`),
  });
}
