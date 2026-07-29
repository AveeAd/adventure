import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { apiUrl } from '../../../lib/auth/api';
import { authPost } from '../../../lib/auth/auth-fetch';
import { useRequireAuth } from '../../../lib/auth/require-auth';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { Container } from '../../../components/Container';
import { Field, Input, Textarea } from '../../../components/FormField';

interface AdventurePageForEdit {
  id: string;
  slug: string;
  title: string;
  currentRevision: { content: string } | null;
}

export const Route = createFileRoute('/adventures/$slug/edit')({
  loader: async ({ params }) => {
    const res = await fetch(apiUrl(`/adventure-pages/slug/${params.slug}`));
    if (res.status === 404) {
      throw notFound();
    }
    if (!res.ok) {
      throw new Error('Failed to load adventure page');
    }
    const page: AdventurePageForEdit = await res.json();
    return { page };
  },
  component: EditAdventurePage,
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: `Edit ${loaderData.page.title}` }] : [],
  }),
});

function EditAdventurePage() {
  const { page } = Route.useLoaderData();
  const authStatus = useRequireAuth(`/adventures/${page.slug}/edit`);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (authStatus === 'checking') {
    return (
      <Container>
        <p className="text-stone-500 dark:text-stone-400">Checking sign-in...</p>
      </Container>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      await authPost(`/adventure-pages/${page.id}/revisions`, {
        content: formData.get('content'),
        editSummary: formData.get('editSummary') || undefined,
        isSafetyCriticalEdit: formData.get('isSafetyCriticalEdit') === 'on',
      });
      navigate({ to: '/adventures/$slug', params: { slug: page.slug } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit revision');
      setSubmitting(false);
    }
  }

  return (
    <Container>
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">Edit {page.title}</h1>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label="Content (Markdown)">
            <Textarea
              name="content"
              required
              rows={16}
              defaultValue={page.currentRevision?.content ?? ''}
              className="font-mono text-sm"
            />
          </Field>
          <Field label="Edit summary" hint="A short note describing what changed">
            <Input name="editSummary" />
          </Field>
          <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
            <input name="isSafetyCriticalEdit" type="checkbox" className="h-4 w-4 rounded border-stone-300" />
            This edit changes safety-critical information (resets verification to "needs review")
          </label>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" disabled={submitting} className="self-start">
            {submitting ? 'Submitting...' : 'Submit revision'}
          </Button>
        </form>
      </Card>
    </Container>
  );
}
