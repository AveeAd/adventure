import { Link, createFileRoute, notFound } from '@tanstack/react-router';
import { ArrowLeft, MessageSquare, Pin } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../../../../lib/auth/api';
import { authPost } from '../../../../../lib/auth/auth-fetch';
import { checkAuth } from '../../../../../lib/auth/session';
import { formatDateTime } from '../../../../../lib/format';
import i18n from '../../../../../lib/i18n';
import { buildMeta } from '../../../../../lib/seo';
import { Avatar } from '../../../../../components/Avatar';
import { Badge } from '../../../../../components/Badge';
import { Button } from '../../../../../components/Button';
import { Card } from '../../../../../components/Card';
import { Container } from '../../../../../components/Container';
import { Textarea } from '../../../../../components/FormField';
import { MarkdownContent } from '../../../../../components/MarkdownContent';
import { ReportButton } from '../../../../../components/ReportButton';

interface ThreadAttachment {
  id: string;
  title?: string | null;
  name?: string | null;
  slug?: string;
}

interface ThreadDetail {
  id: string;
  clubId: string;
  content: string;
  tag: string;
  isPinned: boolean;
  authorId: string;
  authorName: string;
  createdAt: string;
  replyCount: number;
  tripReport: ThreadAttachment | null;
  trail: ThreadAttachment | null;
  spot: ThreadAttachment | null;
  adventurePage: ThreadAttachment | null;
}

interface ReplyItem {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  parentReplyId: string | null;
  replies: ReplyItem[];
}

function countReplies(replies: ReplyItem[]): number {
  return replies.reduce((total, reply) => total + 1 + countReplies(reply.replies), 0);
}

export const Route = createFileRoute('/clubs/$clubId/threads/$threadId/')({
  loader: async ({ params }) => {
    const threadRes = await fetch(apiUrl(`/threads/${params.threadId}`));
    if (threadRes.status === 404) {
      throw notFound();
    }
    if (!threadRes.ok) {
      throw new Error('Failed to load thread');
    }
    const thread: ThreadDetail = await threadRes.json();

    const repliesRes = await fetch(apiUrl(`/threads/${params.threadId}/replies`));
    const replies: ReplyItem[] = repliesRes.ok ? await repliesRes.json() : [];

    return { clubId: params.clubId, thread, replies };
  },
  component: ThreadDetailPage,
  // Thread content is user-generated/ephemeral, not a canonical content
  // page - noindex, follow so links inside it (attached page/trail/spot)
  // still get crawled.
  head: ({ loaderData, params }) =>
    buildMeta({
      title: loaderData?.thread.content.slice(0, 60) ?? i18n.t('common:appName'),
      description: i18n.t('common:tagline'),
      path: `/clubs/${params.clubId}/threads/${params.threadId}`,
      noindex: true,
    }),
});

function ThreadDetailPage() {
  const { clubId, thread, replies: initialReplies } = Route.useLoaderData();
  const { t } = useTranslation(['threads', 'common']);
  const [replies, setReplies] = useState(initialReplies);
  const [signedIn, setSignedIn] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAuth().then(setSignedIn);
  }, []);

  function insertReply(reply: ReplyItem) {
    if (!reply.parentReplyId) {
      setReplies((current) => [...current, reply]);
      return;
    }
    const parentId = reply.parentReplyId;
    function addReply(list: ReplyItem[]): ReplyItem[] {
      return list.map((existing) =>
        existing.id === parentId
          ? { ...existing, replies: [...existing.replies, reply] }
          : { ...existing, replies: addReply(existing.replies) },
      );
    }
    setReplies((current) => addReply(current));
  }

  async function postReply(content: string, parentReplyId?: string) {
    const reply = await authPost<Omit<ReplyItem, 'replies'>>(`/threads/${thread.id}/replies`, {
      content,
      parentReplyId,
    });
    insertReply({ ...reply, replies: [] });
  }

  async function handleReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await postReply(replyText);
      setReplyText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToPostReply'));
    } finally {
      setSubmitting(false);
    }
  }

  const attachments = [
    thread.tripReport && { label: thread.tripReport.title ?? t('untitledTripReport') },
    thread.trail && { label: thread.trail.name ?? t('unnamedTrail') },
    thread.spot && { label: thread.spot.name },
    thread.adventurePage && { label: thread.adventurePage.title, to: thread.adventurePage.slug },
  ].filter((a): a is { label: string; to?: string } => Boolean(a));

  return (
    <Container>
      <Link
        to="/clubs/$clubId"
        params={{ clubId }}
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-primary-700 dark:text-stone-400 dark:hover:text-primary-400"
      >
        <ArrowLeft className="h-4 w-4" /> {t('backToClub')}
      </Link>

      <div className="mt-3 flex items-center gap-2">
        {thread.isPinned && <Pin className="h-4 w-4 text-primary-700 dark:text-primary-400" />}
        <Badge tone="neutral">{t(`tags.${thread.tag}`)}</Badge>
      </div>

      <div className="mt-2 flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
        <Avatar label={thread.authorName} size="sm" />
        <Link
          to="/users/$id"
          params={{ id: thread.authorId }}
          className="hover:text-primary-700 dark:hover:text-primary-400"
        >
          {thread.authorName}
        </Link>
        <span>·</span>
        <span>{formatDateTime(thread.createdAt)}</span>
      </div>

      <div className="mt-4">
        <MarkdownContent content={thread.content} />
      </div>

      {attachments.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {attachments.map((a, i) => (
            <Badge key={i} tone="neutral">
              {a.label}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-4">
        <ReportButton targetType="THREAD" targetId={thread.id} />
      </div>

      <section className="mt-10">
        <h2 className="flex items-center gap-1.5 text-lg font-semibold text-stone-900 dark:text-stone-50">
          <MessageSquare className="h-4 w-4" /> {t('repliesHeading', { count: countReplies(replies) })}
        </h2>
        <ul className="mt-3 flex flex-col gap-3">
          {replies.map((reply) => (
            <ReplyThread
              key={reply.id}
              reply={reply}
              signedIn={signedIn}
              replyingToId={replyingToId}
              setReplyingToId={setReplyingToId}
              onReply={postReply}
            />
          ))}
        </ul>

        {signedIn && (
          <form onSubmit={handleReply} className="mt-4 flex flex-col gap-3">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              required
              rows={3}
              placeholder={t('replyPlaceholder')}
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <Button type="submit" disabled={submitting || !replyText.trim()} className="self-start">
              {submitting ? t('posting') : t('postReply')}
            </Button>
          </form>
        )}
      </section>
    </Container>
  );
}

function ReplyThread({
  reply,
  signedIn,
  replyingToId,
  setReplyingToId,
  onReply,
  depth = 0,
}: {
  reply: ReplyItem;
  signedIn: boolean;
  replyingToId: string | null;
  setReplyingToId: (id: string | null) => void;
  onReply: (content: string, parentReplyId?: string) => Promise<void>;
  depth?: number;
}) {
  const { t } = useTranslation('threads');
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isReplying = replyingToId === reply.id;

  async function handleReplySubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onReply(replyText, reply.id);
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
          <Avatar label={reply.authorId} size="sm" />
          <span className="text-xs text-stone-500 dark:text-stone-400">{formatDateTime(reply.createdAt)}</span>
        </div>
        <p className="mt-2 text-sm text-stone-700 dark:text-stone-300">{reply.content}</p>
        <div className="mt-2 flex items-center gap-2">
          {signedIn && (
            <Button variant="ghost" size="sm" onClick={() => setReplyingToId(isReplying ? null : reply.id)}>
              {t('reply')}
            </Button>
          )}
          <ReportButton targetType="THREAD_REPLY" targetId={reply.id} />
        </div>
        {isReplying && (
          <form onSubmit={handleReplySubmit} className="mt-3 flex flex-col gap-2">
            <Textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              required
              rows={2}
              placeholder={t('replyPlaceholder')}
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={submitting || !replyText.trim()}>
                {submitting ? t('posting') : t('postReply')}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setReplyingToId(null)}>
                {t('cancel')}
              </Button>
            </div>
          </form>
        )}
      </Card>

      {reply.replies.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3">
          {reply.replies.map((child) => (
            <ReplyThread
              key={child.id}
              reply={child}
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
