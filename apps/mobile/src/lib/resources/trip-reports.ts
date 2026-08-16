import type { TripReportComment, TripReportDetail } from '@adventure/api-types';
import { useQuery } from '@tanstack/react-query';

import { authGet } from '@/lib/auth-fetch';

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
