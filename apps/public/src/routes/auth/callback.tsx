import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
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
      navigate({ to: '/' });
    }
  }, [done, navigate]);

  return <main style={{ textAlign: 'center', paddingTop: '20vh' }}>Signing in...</main>;
}
