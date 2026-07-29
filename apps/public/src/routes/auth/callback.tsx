import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Mountain } from 'lucide-react';
import { useEffect, useState } from 'react';
import { consumePostLoginRedirect } from '../../lib/auth/require-auth';
import { tokenStore } from '../../lib/auth/token-store';

export const Route = createFileRoute('/auth/callback')({
  component: AuthCallbackPage,
  head: () => ({ meta: [{ title: 'Signing in...' }] }),
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const accessToken = params.get('access_token');
    if (accessToken) {
      tokenStore.set(accessToken);
    }
    // strip the token out of the URL/history - it must never linger there
    window.history.replaceState(null, '', window.location.pathname);
    setDone(true);
  }, []);

  useEffect(() => {
    if (done) {
      // destination is an arbitrary in-app path we stored ourselves before
      // leaving for Google sign-in, not one of the router's known literal
      // routes, so it can't be typed against the generated route union
      navigate({ to: consumePostLoginRedirect() as never });
    }
  }, [done, navigate]);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center gap-3 text-stone-500 dark:text-stone-400">
      <Mountain className="h-8 w-8 animate-pulse text-primary-600 dark:text-primary-400" strokeWidth={2.5} />
      <p>Signing in...</p>
    </main>
  );
}
