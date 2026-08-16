import type { AdventurePageDetail, Spot, Trail } from '@adventure/api-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authGet } from '@/lib/auth-fetch';
import { deleteOfflineAdventure, getOfflinePage, saveOfflineAdventure } from '@/lib/offline/store';

export function useOfflineStatus(slug: string) {
  return useQuery({
    queryKey: ['offline-status', slug],
    queryFn: async () => {
      const local = await getOfflinePage(slug);
      return local?.status ?? null;
    },
  });
}

// Fetches the full detail + trails + spots and writes all three offline
// tables in one go - the "Download for offline" gesture's mutation.
export function useDownloadAdventure(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const page = await authGet<AdventurePageDetail>(`/adventure-pages/slug/${slug}`);
      const [trails, spots] = await Promise.all([
        authGet<Trail[]>(`/adventure-pages/${page.id}/trails`),
        authGet<Spot[]>(`/adventure-pages/${page.id}/spots`),
      ]);
      await saveOfflineAdventure(page, trails, spots);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['offline-status', slug] });
    },
  });
}

export function useDeleteOfflineAdventure(slug: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const local = await getOfflinePage(slug);
      if (local) {
        await deleteOfflineAdventure(local.payload.id);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['offline-status', slug] });
    },
  });
}
