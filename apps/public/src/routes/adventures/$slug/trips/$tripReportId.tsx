import { Link, createFileRoute, notFound } from '@tanstack/react-router';
import { ArrowLeft, Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiUrl } from '../../../../lib/auth/api';
import { authDelete, authPost } from '../../../../lib/auth/auth-fetch';
import { checkAuth } from '../../../../lib/auth/session';
import { formatCurrency, formatDate, formatDateTime } from '../../../../lib/format';
import { Avatar } from '../../../../components/Avatar';
import { Button } from '../../../../components/Button';
import { Card } from '../../../../components/Card';
import { Container } from '../../../../components/Container';
import { Textarea } from '../../../../components/FormField';
import { MarkdownContent } from '../../../../components/MarkdownContent';

interface TripReportDetail {
  id: string;
  title: string | null;
  description: string | null;
  content: string | null;
  dateCompleted: string;
  durationDays: number | null;
  actualCostAmount: number | null;
  currency: string;
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
  parentCommentId: string | null;
  replies: CommentItem[];
}

function countComments(comments: CommentItem[]): number {
  return comments.reduce((total, comment) => total + 1 + countComments(comment.replies), 0);
}

export const Route = createFileRoute('/adventures/$slug/trips/$tripReportId')({
  loader: async ({ params }) => {
    const reportRes = await fetch(apiUrl(`/trip-reports/${params.tripReportId}`));
    if (reportRes.status === 404) {
      throw notFound();
    }
    if (!reportRes.ok) {
      throw new Error('Failed to load story');
    }
    const report: TripReportDetail = await reportRes.json();

    const commentsRes = await fetch(apiUrl(`/trip-reports/${params.tripReportId}/comments`));
    const comments: CommentItem[] = commentsRes.ok ? await commentsRes.json() : [];

    return { slug: params.slug, report, comments };
  },
  component: TripReportPage,
  head: ({ loaderData }) => ({
    meta: loaderData ? [{ title: loaderData.report.title ?? 'Story' }] : [],
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
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth().then(setSignedIn);
  }, []);

  function insertComment(comment: CommentItem) {
    if (!comment.parentCommentId) {
      setComments((current) => [...current, comment]);
      return;
    }
    const parentId = comment.parentCommentId;
    function addReply(list: CommentItem[]): CommentItem[] {
      return list.map((existing) =>
        existing.id === parentId
          ? { ...existing, replies: [...existing.replies, comment] }
          : { ...existing, replies: addReply(existing.replies) },
      );
    }
    setComments((current) => addReply(current));
  }

  async function postComment(content: string, parentCommentId?: string) {
    const comment = await authPost<Omit<CommentItem, 'replies'>>(`/trip-reports/${report.id}/comments`, {
      content,
      parentCommentId,
    });
    insertComment({ ...comment, replies: [] });
  }

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
      await postComment(commentText);
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
        {report.title ?? 'Story'}
      </h1>
      <div className="mt-2 flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
        <Avatar label={report.authorId} size="sm" />
        <Link to="/users/$id" params={{ id: report.authorId }} className="hover:text-primary-700 dark:hover:text-primary-400">
          Contributor
        </Link>
        <span>·</span>
        <span>{formatDate(report.dateCompleted)}</span>
        {report.durationDays ? <span>· {report.durationDays} days</span> : null}
        {report.actualCostAmount ? (
          <span>
            · {formatCurrency(report.actualCostAmount, report.currency)}
          </span>
        ) : null}
      </div>

      {report.description && (
        <p className="mt-4 whitespace-pre-wrap text-lg text-stone-700 dark:text-stone-300">{report.description}</p>
      )}

      {report.content && (
        <div className="mt-4">
          <MarkdownContent content={report.content} />
        </div>
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
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
          Comments ({countComments(comments)})
        </h2>
        <ul className="mt-3 flex flex-col gap-3">
          {comments.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              signedIn={signedIn}
              replyingToId={replyingToId}
              setReplyingToId={setReplyingToId}
              onReply={postComment}
            />
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

function CommentThread({
  comment,
  signedIn,
  replyingToId,
  setReplyingToId,
  onReply,
  depth = 0,
}: {
  comment: CommentItem;
  signedIn: boolean;
  replyingToId: string | null;
  setReplyingToId: (id: string | null) => void;
  onReply: (content: string, parentCommentId?: string) => Promise<void>;
  depth?: number;
}) {
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isReplying = replyingToId === comment.id;

  async function handleReplySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onReply(replyText, comment.id);
      setReplyText('');
      setReplyingToId(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li className={depth > 0 ? 'ml-6 border-l border-stone-200 pl-4 dark:border-stone-700' : ''}>
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Avatar label={comment.authorId} size="sm" />
          <span className="text-xs text-stone-500 dark:text-stone-400">
            {formatDateTime(comment.createdAt)}
          </span>
        </div>
        <p className="mt-2 text-sm text-stone-700 dark:text-stone-300">{comment.content}</p>
        {signedIn && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setReplyingToId(isReplying ? null : comment.id)}
          >
            Reply
          </Button>
        )}
        {isReplying && (
          <form onSubmit={handleReplySubmit} className="mt-3 flex flex-col gap-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              required
              rows={2}
              placeholder="Write a reply..."
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={submitting || !replyText.trim()}>
                {submitting ? 'Posting...' : 'Post reply'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setReplyingToId(null)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>

      {comment.replies.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3">
          {comment.replies.map((reply) => (
            <CommentThread
              key={reply.id}
              comment={reply}
              signedIn={signedIn}
              replyingToId={replyingToId}
              setReplyingToId={setReplyingToId}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
