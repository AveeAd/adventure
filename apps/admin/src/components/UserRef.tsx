import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_URL } from '../auth/auth-provider';

// Mirrors apps/public's UserRef - resolves a bare userId (editorId,
// resolvedById on a revision) into a display name, linked to the admin
// user resource. MILESTONE_3.md §9.1's admin "approvers column".
export function UserRef({ userId }: { userId: string }) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/v1/users/${userId}/profile`)
      .then((res) => (res.ok ? res.json() : null))
      .then((profile: { displayName: string } | null) => {
        if (!cancelled) setName(profile?.displayName ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return <Link to={`/users/edit/${userId}`}>{name ?? `${userId.slice(0, 8)}…`}</Link>;
}
