import { createFileRoute, notFound, useNavigate } from '@tanstack/react-router';
import { ImagePlus } from 'lucide-react';
import { useRef, useState } from 'react';
import { apiUrl } from '../../../lib/auth/api';
import { authPost, authUpload } from '../../../lib/auth/auth-fetch';
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
  const [content, setContent] = useState(page.currentRevision?.content ?? '');
  const [uploadingImage, setUploadingImage] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  if (authStatus === 'checking') {
    return (
      <Container>
        <p className="text-stone-500 dark:text-stone-400">Checking sign-in...</p>
      </Container>
    );
  }

  async function handleInsertImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadingImage(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { url } = await authUpload<{ url: string }>('/uploads/images', formData);
      const textarea = contentRef.current;
      const markdown = `![](${url})`;
      if (textarea) {
        const start = textarea.selectionStart ?? content.length;
        const end = textarea.selectionEnd ?? content.length;
        const next = content.slice(0, start) + markdown + content.slice(end);
        setContent(next);
        requestAnimationFrame(() => {
          textarea.focus();
          const cursor = start + markdown.length;
          textarea.setSelectionRange(cursor, cursor);
        });
      } else {
        setContent((prev) => prev + markdown);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);

    try {
      await authPost(`/adventure-pages/${page.id}/revisions`, {
        content,
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
            <div className="mb-2">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleInsertImage}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={uploadingImage}
                onClick={() => imageInputRef.current?.click()}
              >
                <ImagePlus className="h-3.5 w-3.5" />
                {uploadingImage ? 'Uploading...' : 'Insert image'}
              </Button>
            </div>
            <Textarea
              ref={contentRef}
              required
              rows={16}
              value={content}
              onChange={(e) => setContent(e.target.value)}
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
