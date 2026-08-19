import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { Field, TextArea, TextInput } from '@/components/FormField';
import { LoadingState } from '@/components/LoadingState';
import { Screen } from '@/components/Screen';
import { useAdventurePage, useSubmitPageRevision } from '@/lib/resources/adventure-pages';
import { pickAndUploadImage } from '@/lib/upload';

// Content-only editor, matching apps/public's adventures/$slug/edit.tsx
// scope exactly - title/activityType/etc. stay create-only in this app too
// (no PATCH-metadata form exists on web either, see recon).
export default function EditAdventurePage() {
  const { t } = useTranslation('adventurePage');
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { data: page, isLoading, isError, refetch } = useAdventurePage(slug);
  const submitRevision = useSubmitPageRevision(page?.id ?? '', slug);

  const [content, setContent] = useState(page?.approvedRevision?.content ?? '');
  const [initialized, setInitialized] = useState(false);
  const [editSummary, setEditSummary] = useState('');
  const [isSafetyCriticalEdit, setIsSafetyCriticalEdit] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectionRef = useRef({ start: 0, end: 0 });

  if (isLoading) return <LoadingState />;
  if (isError || !page) return <ErrorState onRetry={() => refetch()} />;

  if (!initialized) {
    setContent(page.approvedRevision?.content ?? '');
    setInitialized(true);
  }

  const handleInsertImage = async (source: 'camera' | 'library') => {
    setUploadingImage(true);
    setError(null);
    try {
      const uploaded = await pickAndUploadImage(source);
      if (uploaded) {
        const { start, end } = selectionRef.current;
        const markdown = `![](${uploaded.url})`;
        setContent((prev) => prev.slice(0, start) + markdown + prev.slice(end));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('edit.uploadError'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError(t('edit.contentRequiredError'));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitRevision.mutateAsync({
        content: content.trim(),
        editSummary: editSummary.trim() || undefined,
        isSafetyCriticalEdit,
      });
      router.replace(`/adventures/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('edit.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen contentContainerClassName="gap-4 px-4 py-4">
      <Text className="text-2xl font-bold text-primary-900 dark:text-primary-100">{t('edit.title')}</Text>
      <Text className="text-sm text-stone-600 dark:text-stone-400">{t('edit.subtitle')}</Text>

      <View className="flex-row gap-2">
        <Button size="sm" variant="secondary" disabled={uploadingImage} onPress={() => handleInsertImage('camera')}>
          {t('edit.insertPhotoCamera')}
        </Button>
        <Button size="sm" variant="secondary" disabled={uploadingImage} onPress={() => handleInsertImage('library')}>
          {t('edit.insertPhotoLibrary')}
        </Button>
      </View>

      <Field label={t('edit.contentLabel')}>
        <TextArea
          value={content}
          onChangeText={setContent}
          onSelectionChange={(e) => {
            selectionRef.current = e.nativeEvent.selection;
          }}
          numberOfLines={12}
        />
      </Field>

      <Field label={t('edit.editSummaryLabel')}>
        <TextInput value={editSummary} onChangeText={setEditSummary} placeholder={t('edit.editSummaryPlaceholder')} />
      </Field>

      <Pressable onPress={() => setIsSafetyCriticalEdit((v) => !v)} className="flex-row items-center gap-2">
        <Text className="text-sm text-primary-900 dark:text-primary-100">
          {isSafetyCriticalEdit ? '☑' : '☐'} {t('edit.safetyCriticalLabel')}
        </Text>
      </Pressable>

      {error ? <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text> : null}
      <Button disabled={submitting} onPress={handleSubmit}>
        {submitting ? t('edit.submitting') : t('edit.submitButton')}
      </Button>
    </Screen>
  );
}
