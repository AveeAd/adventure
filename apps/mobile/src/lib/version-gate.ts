import { useEffect, useState } from 'react';
import { apiUrl, CLIENT_VERSION } from './api';

type GateStatus = 'checking' | 'ok' | 'blocked';

// Mirrors MinVersionMiddleware's compare on the API side (apps/api/src/settings/min-version.middleware.ts) -
// keep the two in sync if the comparison rules ever change.
function compareVersions(a: string, b: string): number | null {
  const parse = (v: string) => {
    const parts = v.trim().split('.').map(Number);
    return parts.every((n) => Number.isInteger(n) && n >= 0) ? parts : null;
  };
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return null;
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// Set by checkUpgradeRequired() the moment any API call comes back 426 -
// covers the case where mobile.minVersion is bumped while the app is
// already running, not just the cold-start check below. A module-level
// flag (not React state) so it survives outside whichever component
// happens to be mounted when the 426 arrives.
let forcedBlock: { minVersion: string } | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((fn) => fn());
}

// Call after any authFetch/raw fetch response - a no-op unless the API
// actually rejected the client version (see MinVersionMiddleware).
export async function checkUpgradeRequired(res: Response): Promise<void> {
  if (res.status !== 426 || forcedBlock) {
    return;
  }
  let minVersion = '0.0.0';
  try {
    const body = await res.clone().json();
    if (typeof body?.minVersion === 'string') {
      minVersion = body.minVersion;
    }
  } catch {
    // Non-JSON 426 (shouldn't happen, MinVersionMiddleware always sends
    // JSON) - block anyway with an unknown target version.
  }
  forcedBlock = { minVersion };
  notify();
}

async function fetchMinVersion(): Promise<string | null> {
  try {
    const res = await fetch(apiUrl('/settings/public'));
    if (!res.ok) {
      return null;
    }
    const rows: { key: string; value: string }[] = await res.json();
    return rows.find((row) => row.key === 'mobile.minVersion')?.value ?? null;
  } catch {
    // Offline/unreachable API on cold start - fail open, same reasoning as
    // MinVersionMiddleware failing open on an unparseable version: a
    // connectivity problem shouldn't be mistaken for a stale-client block.
    return null;
  }
}

// Gates the whole app: 'checking' while the initial min-version lookup is
// in flight (splash stays up), 'blocked' if the current build is below
// mobile.minVersion (server-checked on mount, client-checked again below
// as a fast path) or a live 426 arrived mid-session, 'ok' otherwise.
export function useVersionGate(): { status: GateStatus; minVersion: string | null } {
  const [state, setState] = useState<{ status: GateStatus; minVersion: string | null }>(
    forcedBlock ? { status: 'blocked', minVersion: forcedBlock.minVersion } : { status: 'checking', minVersion: null },
  );

  useEffect(() => {
    if (forcedBlock) {
      return undefined;
    }

    let cancelled = false;
    fetchMinVersion().then((minVersion) => {
      if (cancelled || forcedBlock) {
        return;
      }
      if (minVersion) {
        const cmp = compareVersions(CLIENT_VERSION, minVersion);
        if (cmp !== null && cmp < 0) {
          setState({ status: 'blocked', minVersion });
          return;
        }
      }
      setState({ status: 'ok', minVersion });
    });

    const onForcedBlock = () => {
      if (forcedBlock) {
        setState({ status: 'blocked', minVersion: forcedBlock.minVersion });
      }
    };
    listeners.add(onForcedBlock);

    return () => {
      cancelled = true;
      listeners.delete(onForcedBlock);
    };
  }, []);

  return state;
}
