import { QueryClient } from '@tanstack/react-query';

// Phase 2's data-fetching layer - apps/public has no equivalent to mirror
// (its TanStack Start route loaders are SSR-specific and don't apply to
// RN), so this is a fresh addition rather than a ported pattern.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
});
