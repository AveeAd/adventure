import type { CreateThreadReplyRequest, CreateThreadRequest, ThreadDetail, ThreadReply, ThreadSummary } from '@adventure/api-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authGet, authPost } from '@/lib/auth-fetch';

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

export function useCreateThreadReply(threadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateThreadReplyRequest) =>
      authPost<ThreadReply>(`/threads/${threadId}/replies`, body),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['thread-replies', threadId] });
      queryClient.invalidateQueries({ queryKey: ['thread', threadId] });
    },
  });
}

export function useCreateThread(clubId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateThreadRequest) =>
      authPost<ThreadSummary>(`/clubs/${clubId}/threads`, body),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['club-threads', clubId] });
    },
  });
}
