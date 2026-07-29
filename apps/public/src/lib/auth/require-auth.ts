import { useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { checkAuth } from './session';

const POST_LOGIN_REDIRECT_KEY = 'postLoginRedirect';

export function rememberPostLoginRedirect(path: string): void {
  sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, path);
}

export function consumePostLoginRedirect(): string {
  const path = sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY) ?? '/';
  sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
  return path;
}

// Auth-gated pages (create/edit forms) are SSR'd with no server-side
// knowledge of the visitor's session (the access token only ever lives in
// browser memory - see PUBLIC_PAGES.md's SSR/personalization note), so the
// guard runs client-side after hydration and redirects to /login if needed.
export function useRequireAuth(currentPath: string): 'checking' | 'authenticated' {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'checking' | 'authenticated'>('checking');

  useEffect(() => {
    let cancelled = false;
    checkAuth().then((authenticated) => {
      if (cancelled) return;
      if (authenticated) {
        setStatus('authenticated');
      } else {
        rememberPostLoginRedirect(currentPath);
        navigate({ to: '/login' });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [currentPath, navigate]);

  return status;
}
