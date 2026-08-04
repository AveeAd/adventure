import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { apiUrl } from '../lib/auth/api';

// Resolves a bare userId (all the API gives us on a revision/vote - editorId,
// resolvedById) into a display name, for the approvers column added in
// MILESTONE_3.md §9.1. One fetch per distinct id shown; fine at this site's
// scale (mirrors the existing "score/merge in JS" tolerance elsewhere).
export function UserRef({ userId, className }: { userId: string; className?: string }) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl(`/users/${userId}/profile`))
      .then((res) => (res.ok ? res.json() : null))
      .then((profile: { displayName: string } | null) => {
        if (!cancelled) setName(profile?.displayName ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <Link
      to="/users/$id"
      params={{ id: userId }}
      className={className ?? 'text-primary-700 hover:underline dark:text-primary-400'}
    >
      {name ?? `${userId.slice(0, 8)}…`}
    </Link>
  );
}
