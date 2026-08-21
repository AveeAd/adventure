import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../lib/i18n';
import { authDelete } from '../../lib/auth/auth-fetch';
import { tokenStore } from '../../lib/auth/token-store';
import { useRequireAuth } from '../../lib/auth/require-auth';
import { buildMeta } from '../../lib/seo';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Container } from '../../components/Container';

// Web counterpart to apps/mobile's Account-tab delete flow
// (UsersService.deleteOwnAccount / DELETE /users/me) - added so account
// deletion is reachable from a URL without installing the app, per Play
// Store's Data Safety requirement for an account-deletion method that
// doesn't require the app itself. Same endpoint, same server-side
// behavior (hard-deletes sessions/push tokens/connected identities/
// activity tracks, anonymizes the profile, leaves contributed content
// attributed to "[deleted user]") - this page is just a second UI onto it.
export const Route = createFileRoute('/account/delete')({
  component: DeleteAccountPage,
  head: () =>
    buildMeta({
      title: i18n.t('account:deleteAccount.pageTitle'),
      description: i18n.t('account:deleteAccount.pageDescription'),
      path: '/account/delete',
      noindex: true,
    }),
});

function DeleteAccountPage() {
  const authStatus = useRequireAuth('/account/delete');
  const { t } = useTranslation(['account', 'common']);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setDeleting(true);
    try {
      await authDelete('/users/me');
      // The server already clears the refresh cookie on delete (see
      // UsersController.deleteOwnAccount) - only the in-memory access
      // token needs clearing client-side, same as logout() does.
      tokenStore.set(null);
      setDone(true);
    } catch {
      setError(t('deleteAccount.error'));
    } finally {
      setDeleting(false);
    }
  }

  if (authStatus === 'checking') {
    return (
      <Container>
        <p className="text-stone-500 dark:text-stone-400">{t('common:actions.loading')}</p>
      </Container>
    );
  }

  if (done) {
    return (
      <Container>
        <Card className="mt-6 p-6">
          <p className="text-stone-700 dark:text-stone-300">{t('deleteAccount.done')}</p>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-50">{t('deleteAccount.heading')}</h1>

      <Card className="mt-6 p-6">
        <p className="text-stone-700 dark:text-stone-300">{t('deleteAccount.warning')}</p>

        {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="mt-6 flex gap-2">
          {!confirming ? (
            <Button variant="danger" onClick={() => setConfirming(true)}>
              {t('deleteAccount.confirmButton')}
            </Button>
          ) : (
            <>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? t('deleteAccount.deleting') : t('deleteAccount.confirmButton')}
              </Button>
              <Button variant="secondary" onClick={() => setConfirming(false)} disabled={deleting}>
                {t('deleteAccount.cancelButton')}
              </Button>
            </>
          )}
        </div>
      </Card>
    </Container>
  );
}
