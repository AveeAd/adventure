import type {
  ClubDetail,
  ClubJoinRequest,
  ClubSummary,
  DecideClubJoinRequestRequest,
  ListResponse,
  ThreadSummary,
} from '@adventure/api-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authDelete, authGet, authPatch, authPost } from '@/lib/auth-fetch';

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

// Public clubs only - throws (403) if the club is PRIVATE, see
// useRequestClubJoin for that path instead.
export function useJoinClub(clubId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authPost<ClubDetail>(`/clubs/${clubId}/members`),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['club', clubId] });
    },
  });
}

export function useLeaveClub(clubId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authDelete(`/clubs/${clubId}/members`),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['club', clubId] });
    },
  });
}

// Private clubs - files a pending ClubMember row (the request "is" the
// row, see CLAUDE.md's Clubs section), no body.
export function useRequestClubJoin(clubId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authPost<{ success: true }>(`/clubs/${clubId}/join-requests`),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['club', clubId] });
    },
  });
}

export function useClubJoinRequests(clubId: string) {
  return useQuery({
    queryKey: ['club-join-requests', clubId],
    queryFn: () => authGet<ClubJoinRequest[]>(`/clubs/${clubId}/join-requests`),
  });
}

export function useDecideJoinRequest(clubId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, decision }: { requestId: string } & DecideClubJoinRequestRequest) =>
      authPatch<ClubJoinRequest>(`/clubs/${clubId}/join-requests/${requestId}`, { decision }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['club-join-requests', clubId] });
      queryClient.invalidateQueries({ queryKey: ['club', clubId] });
    },
  });
}
