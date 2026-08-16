import type { ThreadDetail, ThreadReply } from '@adventure/api-types';
import { useQuery } from '@tanstack/react-query';

import { authGet } from '@/lib/auth-fetch';

export function useThread(id: string) {
  return useQuery({
    queryKey: ['thread', id],
    queryFn: () => authGet<ThreadDetail>(`/threads/${id}`),
  });
}

export function useThreadReplies(id: string) {
  return useQuery({
    queryKey: ['thread-replies', id],
    queryFn: () => authGet<ThreadReply[]>(`/threads/${id}/replies`),
  });
}
