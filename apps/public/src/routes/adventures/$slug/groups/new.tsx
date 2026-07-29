import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { apiUrl } from '../../../../lib/auth/api';
import { authPost } from '../../../../lib/auth/auth-fetch';
import { useRequireAuth } from '../../../../lib/auth/require-auth';
import { Button } from '../../../../components/Button';
import { Card } from '../../../../components/Card';
import { Container } from '../../../../components/Container';
import { Field, Input, Textarea } from '../../../../components/FormField';

export const Route = createFileRoute('/adventures/$slug/groups/new')({
  loader: async ({ params }) => {
    const pageRes = await fetch(apiUrl(`/adventure-pages/slug/${params.slug}`));
    if (pageRes.status === 404) {
      throw notFound();
    }
    if (!pageRes.ok) {
      throw new Error('Failed to load adventure page');
    }
    const page: { id: string; title: string } = await pageRes.json();
    return { page };
  },
  component: NewTripGroupPage,
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: `Start a trip group for ${loaderData.page.title}` }] : [],
  }),
});

function NewTripGroupPage() {
  const { page } = Route.useLoaderData();
  const { slug } = Route.useParams();
  const authStatus = useRequireAuth(`/adventures/${slug}/groups/new`);
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
      const group = await authPost<{ id: string }>(`/adventure-pages/${page.id}/trip-groups`, {
        title: formData.get('title'),
        description: formData.get('description') || undefined,
        dateStart: formData.get('dateStart'),
        dateEnd: formData.get('dateEnd'),
      });
      navigate({ to: '/adventures/$slug/groups/$groupId', params: { slug, groupId: group.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trip group');
      setSubmitting(false);
    }
  }

  return (
    <Container>
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">
        Start a trip group for {page.title}
      </h1>
      <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
        You'll be the organizer. Anyone can join once it's posted.
      </p>

      <Card className="mt-6 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label="Title">
            <Input name="title" required placeholder="e.g. Autumn ABC group" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Start date">
              <Input name="dateStart" type="date" required />
            </Field>
            <Field label="End date">
              <Input name="dateEnd" type="date" required />
            </Field>
          </div>
          <Field label="Description" hint="Optional">
            <Textarea name="description" rows={4} />
          </Field>
          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <Button type="submit" disabled={submitting} className="self-start">
            {submitting ? 'Creating...' : 'Start group'}
          </Button>
        </form>
      </Card>
    </Container>
  );
}
