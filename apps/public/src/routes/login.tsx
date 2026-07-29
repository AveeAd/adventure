import { createFileRoute } from '@tanstack/react-router';
import { Mountain } from 'lucide-react';
import { API_URL } from '../lib/auth/api';
import { Card } from '../components/Card';

export const Route = createFileRoute('/login')({
  component: LoginPage,
  head: () => ({ meta: [{ title: 'Sign in' }] }),
});

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.9-2.26 5.36-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24 24 0 0 0 0 21.56l7.98-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.9l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function LoginPage() {
  const signIn = () => {
    const redirectUrl = window.location.origin;
    window.location.href = `${API_URL}/api/v1/auth/google?redirectUrl=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-gradient-to-br from-primary-50 via-stone-50 to-accent-50 px-4 dark:from-primary-950/40 dark:via-stone-950 dark:to-accent-950/40">
      <Card className="w-full max-w-sm p-8 text-center">
        <Mountain className="mx-auto h-10 w-10 text-primary-600 dark:text-primary-400" strokeWidth={2.5} />
        <h1 className="mt-3 text-xl font-semibold text-stone-900 dark:text-stone-50">Sign in to Adventure Nepal</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Contribute pages, log trips, and connect with guides.
        </p>
        <button
          type="button"
          onClick={signIn}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 shadow-sm hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
        >
          <GoogleIcon />
          Sign in with Google
        </button>
      </Card>
    </main>
  );
}
