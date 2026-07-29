import { Link, createFileRoute, notFound } from '@tanstack/react-router';
import { ArrowLeft, Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiUrl } from '../../../../lib/auth/api';
import { authDelete, authPost } from '../../../../lib/auth/auth-fetch';
import { checkAuth } from '../../../../lib/auth/session';
import { Avatar } from '../../../../components/Avatar';
import { Button } from '../../../../components/Button';
import { Card } from '../../../../components/Card';
import { Container } from '../../../../components/Container';
import { Textarea } from '../../../../components/FormField';

interface TripReportDetail {
  id: string;
  title: string | null;
  description: string | null;
  dateCompleted: string;
  durationDays: number | null;
  actualCostAmount: number | null;
  authorId: string;
  kudosCount: number;
  commentCount: number;
  kudosByMe: boolean;
}

interface CommentItem {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export const Route = createFileRoute('/adventures/$slug/trips/$tripReportId')({
  loader: async ({ params }) => {
    const reportRes = await fetch(apiUrl(`/trip-reports/${params.tripReportId}`));
    if (reportRes.status === 404) {
      throw notFound();
    }
    if (!reportRes.ok) {
      throw new Error('Failed to load trip report');
    }
    const report: TripReportDetail = await reportRes.json();

    const commentsRes = await fetch(apiUrl(`/trip-reports/${params.tripReportId}/comments`));
    const comments: CommentItem[] = commentsRes.ok ? await commentsRes.json() : [];

    return { slug: params.slug, report, comments };
  },
  component: TripReportPage,
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: loaderData.report.title ?? 'Trip report' }] : [],
  }),
});

function TripReportPage() {
  const { slug, report, comments: initialComments } = Route.useLoaderData();
  const [comments, setComments] = useState(initialComments);
  const [kudosCount, setKudosCount] = useState(report.kudosCount);
  const [kudosGiven, setKudosGiven] = useState(report.kudosByMe);
  const [signedIn, setSignedIn] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAuth().then(setSignedIn);
  }, []);

  async function toggleKudos() {
    try {
      if (kudosGiven) {
        await authDelete(`/trip-reports/${report.id}/kudos`);
        setKudosCount((count) => count - 1);
      } else {
        await authPost(`/trip-reports/${report.id}/kudos`);
        setKudosCount((count) => count + 1);
      }
      setKudosGiven((given) => !given);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update kudos');
    }
  }

  async function handleComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const comment = await authPost<CommentItem>(`/trip-reports/${report.id}/comments`, { content: commentText });
      setComments((current) => [...current, comment]);
      setCommentText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container>
      <Link
        to="/adventures/$slug"
        params={{ slug }}
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-primary-700 dark:text-stone-400 dark:hover:text-primary-400"
      >
        <ArrowLeft className="h-4 w-4" /> Back to adventure page
      </Link>

      <h1 className="mt-3 text-2xl font-semibold text-stone-900 dark:text-stone-50">
        {report.title ?? 'Trip report'}
      </h1>
      <div className="mt-2 flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
        <Avatar label={report.authorId} size="sm" />
        <Link to="/users/$id" params={{ id: report.authorId }} className="hover:text-primary-700 dark:hover:text-primary-400">
          Contributor
        </Link>
        <span>·</span>
        <span>{new Date(report.dateCompleted).toLocaleDateString()}</span>
        {report.durationDays ? <span>· {report.durationDays} days</span> : null}
        {report.actualCostAmount ? <span>· NPR {report.actualCostAmount}</span> : null}
      </div>

      {report.description && (
        <p className="mt-4 whitespace-pre-wrap text-stone-700 dark:text-stone-300">{report.description}</p>
      )}

      <div className="mt-4">
        {signedIn ? (
          <Button variant={kudosGiven ? 'accent' : 'secondary'} size="sm" onClick={toggleKudos}>
            <Heart className="h-4 w-4" fill={kudosGiven ? 'currentColor' : 'none'} />
            {kudosGiven ? 'Kudos given' : 'Give kudos'} ({kudosCount})
          </Button>
        ) : (
          <span className="flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
            <Heart className="h-4 w-4" /> {kudosCount} kudos
          </span>
        )}
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Comments ({comments.length})</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {comments.map((comment) => (
            <li key={comment.id}>
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <Avatar label={comment.authorId} size="sm" />
                  <span className="text-xs text-stone-500 dark:text-stone-400">
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 text-sm text-stone-700 dark:text-stone-300">{comment.content}</p>
              </Card>
            </li>
          ))}
        </ul>

        {signedIn && (
          <form onSubmit={handleComment} className="mt-4 flex flex-col gap-3">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              required
              rows={3}
              placeholder="Add a comment..."
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <Button type="submit" disabled={submitting || !commentText.trim()} className="self-start">
              {submitting ? 'Posting...' : 'Post comment'}
            </Button>
          </form>
        )}
      </section>
    </Container>
  );
}
