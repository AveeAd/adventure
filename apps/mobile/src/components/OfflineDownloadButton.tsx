import { useTranslation } from 'react-i18next';

import { useDeleteOfflineAdventure, useDownloadAdventure, useOfflineStatus } from '@/lib/resources/offline';
import { Button } from './Button';

// "Download for offline" gesture (MOBILE_PLAN.md Phase 3) - states: not
// downloaded / downloading / downloaded / failed. No "stale" UI state yet;
// staleness is handled silently inside useAdventurePage's query function.
export function OfflineDownloadButton({ slug }: { slug: string }) {
  const { t } = useTranslation('common');
  const { data: status } = useOfflineStatus(slug);
  const download = useDownloadAdventure(slug);
  const remove = useDeleteOfflineAdventure(slug);

  if (download.isPending) {
    return (
      <Button size="sm" variant="secondary" disabled>
        {t('offline.downloading')}
      </Button>
    );
  }

  if (status === 'downloaded') {
    return (
      <Button size="sm" variant="accent" onPress={() => remove.mutate()}>
        {t('offline.downloadedRemove')}
      </Button>
    );
  }

  if (download.isError) {
    return (
      <Button size="sm" variant="danger" onPress={() => download.mutate()}>
        {t('offline.failedRetry')}
      </Button>
    );
  }

  return (
    <Button size="sm" variant="secondary" onPress={() => download.mutate()}>
      {t('offline.download')}
    </Button>
  );
}
