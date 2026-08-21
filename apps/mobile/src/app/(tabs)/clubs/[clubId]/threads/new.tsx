import type { ThreadTag } from '@adventure/api-types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { AttachmentOption } from '@/components/AttachmentPicker';
import { AttachmentPicker } from '@/components/AttachmentPicker';
import { Button } from '@/components/Button';
import { Field, TextArea } from '@/components/FormField';
import { Screen } from '@/components/Screen';
import { Select } from '@/components/Select';
import { useCreateThread } from '@/lib/resources/threads';
import { HEADER_CLEARANCE } from '@/lib/header';
import { TAB_BAR_CLEARANCE } from '@/lib/tab-bar';

const TAG_IDS: ThreadTag[] = ['DISCUSSION', 'TRIP_SHARE', 'QUESTION', 'ANNOUNCEMENT', 'RANDOM'];

export default function NewThread() {
  const { t } = useTranslation('threads');
  const TAG_OPTIONS: { id: ThreadTag; label: string }[] = TAG_IDS.map((id) => ({
    id,
    label: t(`newThread.tags.${id}`),
  }));
  const { clubId } = useLocalSearchParams<{ clubId: string }>();
  const router = useRouter();
  const createThread = useCreateThread(clubId);
  const [content, setContent] = useState('');
  const [tag, setTag] = useState<ThreadTag>('DISCUSSION');
  const [tripReport, setTripReport] = useState<AttachmentOption | null>(null);
  const [trail, setTrail] = useState<AttachmentOption | null>(null);
  const [spot, setSpot] = useState<AttachmentOption | null>(null);
  const [adventurePage, setAdventurePage] = useState<AttachmentOption | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setError(null);
    try {
      const thread = await createThread.mutateAsync({
        content: content.trim(),
        tag,
        tripReportId: tripReport?.id,
        trailId: trail?.id,
        spotId: spot?.id,
        adventurePageId: adventurePage?.id,
      });
      router.replace(`/clubs/${clubId}/threads/${thread.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('newThread.postError'));
    }
  };

  return (
    <Screen
      contentContainerClassName="gap-4 px-4 pb-4"
      contentContainerStyle={{ paddingTop: HEADER_CLEARANCE, paddingBottom: TAB_BAR_CLEARANCE }}
    >
      <Text className="text-2xl font-bold text-primary-900 dark:text-primary-100">{t('newThread.title')}</Text>
      <Select
        label={t('newThread.tagLabel')}
        value={tag}
        options={TAG_OPTIONS}
        onChange={(id) => setTag(id as ThreadTag)}
      />
      <Field label={t('newThread.contentLabel')}>
        <TextArea
          value={content}
          onChangeText={setContent}
          placeholder={t('newThread.contentPlaceholder')}
          numberOfLines={6}
        />
      </Field>
      <Field label={t('newThread.attachmentsLabel')}>
        <AttachmentPicker type="tripReport" label={t('newThread.attachments.tripReport')} value={tripReport} onChange={setTripReport} />
        <AttachmentPicker type="trail" label={t('newThread.attachments.trail')} value={trail} onChange={setTrail} />
        <AttachmentPicker type="spot" label={t('newThread.attachments.spot')} value={spot} onChange={setSpot} />
        <AttachmentPicker type="adventurePage" label={t('newThread.attachments.adventurePage')} value={adventurePage} onChange={setAdventurePage} />
      </Field>
      {error ? <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text> : null}
      <Button disabled={createThread.isPending || !content.trim()} onPress={handleSubmit}>
        {createThread.isPending ? t('newThread.posting') : t('newThread.postButton')}
      </Button>
    </Screen>
  );
}
