import { useSyncExternalStore } from 'react';
import type { Role } from './auth-provider';

let role: Role | null = null;
const listeners = new Set<() => void>();

// Cached alongside tokenStore during authProvider.check() - the
// accessControlProvider's `can()` needs the viewer's role synchronously
// (Refine calls it on every render pass for menu/button visibility), so it
// can't re-fetch /auth/me itself. MILESTONE_3.md §2.1's moderator
// restrictions are enforced here on the UI side; the API re-enforces every
// one of them independently via @Roles.
export const roleStore = {
  get: () => role,
  set: (next: Role | null) => {
    role = next;
    listeners.forEach((listener) => listener());
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

// role becomes known asynchronously (after authProvider.check() resolves),
// so App.tsx needs to re-render once it lands in order to add/remove the
// admin-only resources (moderator-applications, system-settings) from the
// Sider menu - a plain roleStore.get() read at render time would only ever
// see the pre-login null.
export function useRole(): Role | null {
  return useSyncExternalStore(roleStore.subscribe, roleStore.get);
}
