import { Link, createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiUrl } from '../../lib/auth/api';
import i18n from '../../lib/i18n';
import { authFetch, authPost } from '../../lib/auth/auth-fetch';
import { fetchCurrentUser } from '../../lib/auth/session';
import { useRequireAuth } from '../../lib/auth/require-auth';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Container } from '../../components/Container';
import { Textarea } from '../../components/FormField';

// MILESTONE_3.md §9.1: "Account page surfaces the moderator application
// form at level 25." 25 is the documented default for moderator.minGuideLevel
// (see apps/api/src/settings/settings.constants.ts) - there's no public read
// of SystemSetting (admin-only, §6/§2.1), so this mirrors how the review
// queue page already hardcodes level 10 rather than querying it.
const MODERATOR_MIN_GUIDE_LEVEL = 25;

interface PublicProfile {
  id: string;
  displayName: string;
  guideLevel: number;
}

interface ModeratorApplication {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote: string | null;
}

export const Route = createFileRoute('/account/')({
  component: AccountPage,
  head: () => ({ meta: [{ title: i18n.t('account:account.pageTitle') }] }),
});

function AccountPage() {
  const authStatus = useRequireAuth('/account');
  const { t } = useTranslation(['account', 'common']);
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | 'loading' | null>('loading');
  const [application, setApplication] = useState<ModeratorApplication | null | 'loading'>('loading');

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    fetchCurrentUser().then((user) => {
      if (!user) return;
      setUserId(user.userId);
      setRole(user.role);
      fetch(apiUrl(`/users/${user.userId}/profile`))
        .then(async (res) => setProfile(res.ok ? await res.json() : null))
        .catch(() => setProfile(null));
      authFetch('/moderator-applications/mine').then(async (res) => {
        setApplication(res.ok ? await res.json() : null);
      });
    });
  }, [authStatus]);

  if (authStatus === 'checking') {
    return (
      <Container>
        <p className="text-stone-500 dark:text-stone-400">{t('common:actions.loading')}</p>
      </Container>
    );
  }

  return (
    <Container>
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{t('account.heading')}</h1>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        {userId && (
          <Link
            to="/users/$id"
            params={{ id: userId }}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            {t('account.viewPublicProfile')}
          </Link>
        )}
        <Link
          to="/account/guide-profile"
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          {t('account.editGuideProfile')}
        </Link>
      </div>

      {role && role !== 'USER' && (
        <Card className="mt-8 p-6">
          <p className="text-stone-700 dark:text-stone-300">{t('account.alreadyStaff', { role })}</p>
        </Card>
      )}

      {role === 'USER' && profile !== 'loading' && profile && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">{t('account.moderatorHeading')}</h2>
          {profile.guideLevel < MODERATOR_MIN_GUIDE_LEVEL ? (
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">
              {t('account.moderatorLevelGate', { level: MODERATOR_MIN_GUIDE_LEVEL })}
            </p>
          ) : application === 'loading' ? (
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">{t('common:actions.loading')}</p>
          ) : application && application.status === 'PENDING' ? (
            <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">{t('account.applicationPending')}</p>
          ) : application && application.status === 'REJECTED' ? (
            <div className="mt-2">
              <p className="text-sm text-stone-500 dark:text-stone-400">{t('account.applicationRejected')}</p>
              {application.reviewNote && (
                <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{application.reviewNote}</p>
              )}
              <ModeratorApplicationForm onSubmitted={setApplication} />
            </div>
          ) : (
            <ModeratorApplicationForm onSubmitted={setApplication} />
          )}
        </div>
      )}
    </Container>
  );
}

function ModeratorApplicationForm({ onSubmitted }: { onSubmitted: (application: ModeratorApplication) => void }) {
  const { t } = useTranslation('account');
  const [statement, setStatement] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await authPost<ModeratorApplication>('/moderator-applications', { statement });
      onSubmitted(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('account.applicationError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="mt-3 p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-stone-500 dark:text-stone-400">{t('account.moderatorStatementHint')}</p>
        <Textarea
          name="statement"
          rows={4}
          minLength={20}
          required
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button type="submit" disabled={submitting} className="self-start">
          {submitting ? t('account.applying') : t('account.applyForModeration')}
        </Button>
      </form>
    </Card>
  );
}
