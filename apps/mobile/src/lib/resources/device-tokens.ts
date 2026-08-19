import type { DevicePlatform, RegisterDeviceTokenRequest, UnregisterDeviceTokenRequest } from '@adventure/api-types';
import { useMutation } from '@tanstack/react-query';

import { authDelete, authPost } from '@/lib/auth-fetch';

export function useRegisterDeviceToken() {
  return useMutation({
    mutationFn: (body: { token: string; platform: DevicePlatform }) =>
      authPost<void>('/device-tokens', body satisfies RegisterDeviceTokenRequest),
  });
}

export function useUnregisterDeviceToken() {
  return useMutation({
    mutationFn: (token: string) => authDelete<void>('/device-tokens', { token } satisfies UnregisterDeviceTokenRequest),
  });
}
