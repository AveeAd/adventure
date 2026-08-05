import { Link, createFileRoute, notFound } from '@tanstack/react-router';
import { ArrowLeft, Heart, Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../../../lib/auth/api';
import { authDelete, authFetch, authPatch, authPost } from '../../../../lib/auth/auth-fetch';
import { checkAuth, fetchCurrentUser } from '../../../../lib/auth/session';
import { formatCurrency, formatDate, formatDateTime } from '../../../../lib/format';
import { Avatar } from '../../../../components/Avatar';
import { Button } from '../../../../components/Button';
import { Card } from '../../../../components/Card';
import { Container } from '../../../../components/Container';
import { Textarea, Input, Field, Select } from '../../../../components/FormField';
import { MarkdownContent } from '../../../../components/MarkdownContent';
import { MultiSelectChips, selectedChipValues } from '../../../../components/MultiSelectChips';
import { ReportButton } from '../../../../components/ReportButton';

interface AttachedTrack {
  id: string;
  name: string | null;
  distanceMeters: number | null;
  startedAt: string;
}

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
  activityTracks: AttachedTrack[];
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
  const { slug, report: loadedReport, comments: initialComments } = Route.useLoaderData();
  const { t } = useTranslation(['tripReports', 'common']);
  const [report, setReport] = useState(loadedReport);
  const [comments, setComments] = useState(initialComments);
  const [kudosCount, setKudosCount] = useState(report.kudosCount);
  const [kudosGiven, setKudosGiven] = useState(report.kudosByMe);
  const [signedIn, setSignedIn] = useState(false);
  const [isAuthor, setIsAuthor] = useState(false);
  const [editing, setEditing] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth().then(setSignedIn);
    fetchCurrentUser().then((user) => setIsAuthor(!!user && user.userId === report.authorId));
  }, [report.authorId]);

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
      setError(err instanceof Error ? err.message : t('errors.failedToUpdateKudos'));
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
      setError(err instanceof Error ? err.message : t('errors.failedToPostComment'));
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
        <ArrowLeft className="h-4 w-4" /> {t('backToPage')}
      </Link>

      <h1 className="mt-3 text-2xl font-semibold text-stone-900 dark:text-stone-50">
        {report.title ?? t('fallbackTitle')}
      </h1>
      <div className="mt-2 flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
        <Avatar label={report.authorId} size="sm" />
        <Link to="/users/$id" params={{ id: report.authorId }} className="hover:text-primary-700 dark:hover:text-primary-400">
          {t('contributor')}
        </Link>
        <span>·</span>
        <span>{formatDate(report.dateCompleted)}</span>
        {report.durationDays ? <span>{t('durationSuffix', { days: report.durationDays })}</span> : null}
        {report.actualCostAmount ? (
          <span>
            · {formatCurrency(report.actualCostAmount, report.currency)}
          </span>
        ) : null}
      </div>

      {editing ? (
        <EditStoryForm
          report={report}
          onDone={(updated) => {
            setReport(updated);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <>
          {report.description && (
            <p className="mt-4 whitespace-pre-wrap text-lg text-stone-700 dark:text-stone-300">{report.description}</p>
          )}

          {report.content && (
            <div className="mt-4">
              <MarkdownContent content={report.content} />
            </div>
          )}

          {report.activityTracks.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {report.activityTracks.map((track) => (
                <span
                  key={track.id}
                  className="rounded-full border border-stone-300 px-3 py-1 text-sm text-stone-700 dark:border-stone-700 dark:text-stone-300"
                >
                  {track.name ?? formatDate(track.startedAt)}
                  {track.distanceMeters ? ` · ${(track.distanceMeters / 1000).toFixed(1)}km` : null}
                </span>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {signedIn ? (
              <Button variant={kudosGiven ? 'accent' : 'secondary'} size="sm" onClick={toggleKudos}>
                <Heart className="h-4 w-4" fill={kudosGiven ? 'currentColor' : 'none'} />
                {kudosGiven ? t('kudosGiven') : t('giveKudos')} ({kudosCount})
              </Button>
            ) : (
              <span className="flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400">
                <Heart className="h-4 w-4" /> {t('kudosCount', { count: kudosCount })}
              </span>
            )}
            {isAuthor && (
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5" /> {t('common:actions.edit')}
              </Button>
            )}
            <ReportButton targetType="TRIP_REPORT" targetId={report.id} />
          </div>
        </>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
          {t('comments', { count: countComments(comments) })}
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
              placeholder={t('commentPlaceholder')}
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            <Button type="submit" disabled={submitting || !commentText.trim()} className="self-start">
              {submitting ? t('posting') : t('postComment')}
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
  const { t } = useTranslation('tripReports');
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
        <div className="mt-2 flex items-center gap-2">
          {signedIn && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingToId(isReplying ? null : comment.id)}
            >
              {t('reply')}
            </Button>
          )}
          <ReportButton targetType="COMMENT" targetId={comment.id} />
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

interface MyTrackOption {
  id: string;
  name: string | null;
  distanceMeters: number | null;
  startedAt: string;
}

function trackOption(track: MyTrackOption): { id: string; name: string } {
  const distanceKm = track.distanceMeters ? `${(track.distanceMeters / 1000).toFixed(1)}km` : null;
  const label = [track.name ?? formatDate(track.startedAt), distanceKm].filter(Boolean).join(' · ');
  return { id: track.id, name: label };
}

function EditStoryForm({
  report,
  onDone,
  onCancel,
}: {
  report: TripReportDetail;
  onDone: (updated: TripReportDetail) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation(['tripReports', 'common']);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myTracks, setMyTracks] = useState<MyTrackOption[]>([]);

  useEffect(() => {
    authFetch('/me/activity-tracks')
      .then((res) => (res.ok ? res.json() : []))
      .then((tracks: MyTrackOption[]) => {
        // The author's own tracks plus any already attached (in case one was
        // attached by an admin editing on the author's behalf).
        const known = new Map(tracks.map((track) => [track.id, track]));
        for (const attached of report.activityTracks) {
          if (!known.has(attached.id)) {
            known.set(attached.id, attached);
          }
        }
        setMyTracks([...known.values()]);
      })
      .catch(() => setMyTracks(report.activityTracks));
  }, [report.activityTracks]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);
    try {
      const trackIds = selectedChipValues(event.currentTarget, 'activityTrackIds');
      const updated = await authPatch<Partial<TripReportDetail>>(`/trip-reports/${report.id}`, {
        title: formData.get('title') || undefined,
        description: formData.get('description') || undefined,
        content: formData.get('content') || undefined,
        dateCompleted: formData.get('dateCompleted'),
        durationDays: formData.get('durationDays') ? Number(formData.get('durationDays')) : undefined,
        actualCostAmount: formData.get('actualCostAmount') ? Number(formData.get('actualCostAmount')) : undefined,
        currency: formData.get('actualCostAmount') ? formData.get('currency') : undefined,
        activityTrackIds: trackIds,
      });
      onDone({
        ...report,
        ...updated,
        activityTracks: myTracks.filter((track) => trackIds.includes(track.id)),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errors.failedToSaveStory'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="mt-6 w-full p-6">
      <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">{t('common:actions.edit')}</h2>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-5">
        <Field label={t('fields.title', { ns: 'adventurePage' })}>
          <Input name="title" defaultValue={report.title ?? ''} />
        </Field>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label={t('dateCompleted')}>
            <Input name="dateCompleted" type="date" required defaultValue={report.dateCompleted.slice(0, 10)} />
          </Field>
          <Field label={t('durationDays')}>
            <Input name="durationDays" type="number" min={0} defaultValue={report.durationDays ?? ''} />
          </Field>
          <Field label={t('actualCost')}>
            <Input name="actualCostAmount" type="number" min={0} defaultValue={report.actualCostAmount ?? ''} />
          </Field>
          <Field label={t('currency')}>
            <Select name="currency" defaultValue={report.currency}>
              <option value="NPR">NPR</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="INR">INR</option>
            </Select>
          </Field>
        </div>
        <Field label={t('fields.summary', { ns: 'adventurePage' })}>
          <Textarea name="description" rows={2} defaultValue={report.description ?? ''} />
        </Field>
        <Field label={t('stories.yourStory', { ns: 'adventurePage' })}>
          <Textarea name="content" rows={14} className="font-mono text-sm" defaultValue={report.content ?? ''} />
        </Field>
        {myTracks.length > 0 && (
          <Field label={t('stories.attachTracks', { ns: 'adventurePage' })} hint={t('stories.attachTracksHint', { ns: 'adventurePage' })}>
            <MultiSelectChips
              name="activityTrackIds"
              options={myTracks.map(trackOption)}
              defaultValue={report.activityTracks.map((track) => track.id)}
            />
          </Field>
        )}
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" variant="accent" disabled={submitting}>
            {submitting ? t('common:actions.saving') : t('common:actions.save')}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('common:actions.cancel')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
