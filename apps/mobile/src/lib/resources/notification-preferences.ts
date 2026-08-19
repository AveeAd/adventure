import type { NotificationPreferences, UpdateNotificationPreferencesRequest } from '@adventure/api-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authGet, authPatch } from '@/lib/auth-fetch';

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => authGet<NotificationPreferences>('/notification-preferences'),
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateNotificationPreferencesRequest) =>
      authPatch<NotificationPreferences>('/notification-preferences', patch),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });
}
