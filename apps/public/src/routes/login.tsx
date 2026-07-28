import { createFileRoute } from '@tanstack/react-router';
import { API_URL } from '../lib/auth/api';

export const Route = createFileRoute('/login')({
  component: LoginPage,
  head: () => ({ meta: [{ title: 'Sign in' }] }),
});

function LoginPage() {
  const signIn = () => {
    const redirectUrl = window.location.origin;
    window.location.href = `${API_URL}/api/v1/auth/google?redirectUrl=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <main style={{ display: 'flex', justifyContent: 'center', paddingTop: '20vh' }}>
      <div style={{ textAlign: 'center' }}>
        <h1>Sign in</h1>
        <button type="button" onClick={signIn}>
          Sign in with Google
        </button>
      </div>
    </main>
  );
}
