import { useQuery } from '@tanstack/react-query';

import { authGet } from '@/lib/auth-fetch';

// Ported from apps/public/src/components/UserRef.tsx: nothing in the API
// joins a display name onto an authorId/userId reference, so every screen
// that shows one resolves it via this endpoint. React Query gives this a
// cross-component cache by userId for free, which the web version (a bare
// useEffect fetch per mount) doesn't have.
export function useUserRef(userId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['user-ref', userId],
    queryFn: () => authGet<{ displayName: string; avatarUrl: string | null }>(`/users/${userId}/profile`),
    staleTime: 5 * 60_000,
    enabled: (options?.enabled ?? true) && !!userId,
  });
}
