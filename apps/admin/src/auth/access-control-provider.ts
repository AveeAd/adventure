import type { AccessControlProvider } from '@refinedev/core';
import { roleStore } from './role-store';

// MILESTONE_3.md §2.1: what a MODERATOR may not do, translated into
// Refine's access-control model (resource + action). ADMIN is unrestricted.
// Every one of these is re-enforced independently by the API's @Roles
// decorators - this only keeps the UI from offering an action that would
// 403, per §9.2's read-vs-restricted admin login split.
const ADMIN_ONLY_RESOURCES = new Set(['system-settings', 'moderator-applications']);

const MASTER_DATA_AND_LOCATION_RESOURCES = new Set([
  'activity-types',
  'difficulty-levels',
  'seasons',
  'languages',
  'spot-types',
  'tags',
  'countries',
  'provinces',
  'districts',
  'municipalities',
]);

const WRITE_ACTIONS = new Set(['create', 'edit', 'delete']);

export const accessControlProvider: AccessControlProvider = {
  can: async ({ resource, action }) => {
    if (roleStore.get() === 'ADMIN') {
      return { can: true };
    }

    if (resource && ADMIN_ONLY_RESOURCES.has(resource)) {
      return { can: false, reason: 'Admin only' };
    }
    if (resource === 'users' && action === 'edit') {
      return { can: false, reason: 'Admin only' };
    }
    if (resource && MASTER_DATA_AND_LOCATION_RESOURCES.has(resource) && WRITE_ACTIONS.has(action)) {
      return { can: false, reason: 'Admin only' };
    }
    // §2.1: "override the licence gate on restricted-district guide
    // profiles ... stays admin-only" - unlike the page/trail/spot
    // verification-status endpoints, which moderators may use.
    if (resource === 'guide-profiles' && action === 'verify') {
      return { can: false, reason: 'Admin only' };
    }

    return { can: true };
  },
  options: {
    buttons: { enableAccessControl: true, hideIfUnauthorized: true },
  },
};
