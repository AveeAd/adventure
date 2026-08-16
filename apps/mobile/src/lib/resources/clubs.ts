import type { ClubDetail, ClubSummary, ListResponse, ThreadSummary } from '@adventure/api-types';
import { useQuery } from '@tanstack/react-query';

import { authGet } from '@/lib/auth-fetch';

export function useClubs(search?: string, sort: 'newest' | 'active' | 'members' = 'members') {
  const params = new URLSearchParams({ pageSize: '50', sort });
  if (search?.trim()) params.set('search', search.trim());

  return useQuery({
    queryKey: ['clubs', search ?? '', sort],
    queryFn: () => authGet<ListResponse<ClubSummary>>(`/clubs?${params.toString()}`),
  });
}

export function useClub(id: string) {
  return useQuery({
    queryKey: ['club', id],
    queryFn: () => authGet<ClubDetail>(`/clubs/${id}`),
  });
}

export function useClubThreads(clubId: string) {
  return useQuery({
    queryKey: ['club-threads', clubId],
    queryFn: () => authGet<ListResponse<ThreadSummary>>(`/clubs/${clubId}/threads?pageSize=50`),
  });
}
