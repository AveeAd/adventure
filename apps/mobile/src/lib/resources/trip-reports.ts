import type {
  CreateCommentRequest,
  CreateTripReportRequest,
  TripReportComment,
  TripReportDetail,
} from '@adventure/api-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authDelete, authGet, authPost } from '@/lib/auth-fetch';

export function useTripReport(id: string) {
  return useQuery({
    queryKey: ['trip-report', id],
    queryFn: () => authGet<TripReportDetail>(`/trip-reports/${id}`),
  });
}

export function useTripReportComments(id: string) {
  return useQuery({
    queryKey: ['trip-report-comments', id],
    queryFn: () => authGet<TripReportComment[]>(`/trip-reports/${id}/comments`),
  });
}

// POST/DELETE both return { kudosCount }, not just success - toggled from
// the caller's current kudosByMe state.
export function useTripReportKudos(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (given: boolean) =>
      given
        ? authDelete<{ kudosCount: number }>(`/trip-reports/${id}/kudos`)
        : authPost<{ kudosCount: number }>(`/trip-reports/${id}/kudos`),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-report', id] });
    },
  });
}

export function useCreateComment(tripReportId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateCommentRequest) =>
      authPost<TripReportComment>(`/trip-reports/${tripReportId}/comments`, body),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['trip-report-comments', tripReportId] });
      queryClient.invalidateQueries({ queryKey: ['trip-report', tripReportId] });
    },
  });
}

export function useCreateTripReport(pageId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateTripReportRequest) =>
      authPost<TripReportDetail>(`/adventure-pages/${pageId}/trip-reports`, body),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['adventure-page-trip-reports', pageId] });
    },
  });
}
