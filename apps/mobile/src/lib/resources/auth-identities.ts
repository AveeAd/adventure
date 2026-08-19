import type { AuthIdentitiesResponse } from '@adventure/api-types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authGet } from '@/lib/auth-fetch';
import { linkAppleIdentity } from '@/lib/auth/session';

export function useAuthIdentities() {
  return useQuery({
    queryKey: ['auth-identities'],
    queryFn: () => authGet<AuthIdentitiesResponse>('/auth/identities'),
  });
}

export function useLinkAppleIdentity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (identityToken: string) => linkAppleIdentity(identityToken),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['auth-identities'] });
    },
  });
}
