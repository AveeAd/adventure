import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Field, TextArea, TextInput } from '@/components/FormField';
import { Screen } from '@/components/Screen';
import { Select } from '@/components/Select';
import { authPost } from '@/lib/auth-fetch';
import { useAdventurePage } from '@/lib/resources/adventure-pages';
import { listSessions, type RecordingSession } from '@/lib/recording/store';
import { useCreateTripReport } from '@/lib/resources/trip-reports';
import { pickAndUploadImage } from '@/lib/upload';

const CURRENCIES = [
  { id: 'NPR', label: 'NPR' },
  { id: 'USD', label: 'USD' },
  { id: 'EUR', label: 'EUR' },
  { id: 'INR', label: 'INR' },
];

export default function NewTripReport() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { data: page } = useAdventurePage(slug);
  const createTripReport = useCreateTripReport(page?.id ?? '');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dateCompleted, setDateCompleted] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [cost, setCost] = useState('');
  const [currency, setCurrency] = useState<string | null>(null);
  const [photos, setPhotos] = useState<{ url: string }[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [ownTracks, setOwnTracks] = useState<RecordingSession[]>([]);
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      listSessions().then((sessions) => setOwnTracks(sessions.filter((s) => s.serverId)));
    }, []),
  );

  const handleAddPhoto = async (source: 'camera' | 'library') => {
    setUploadingPhoto(true);
    setError(null);
    try {
      const uploaded = await pickAndUploadImage(source);
      if (uploaded) {
        setPhotos((prev) => [...prev, { url: uploaded.url }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload photo.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const toggleTrack = (id: string) => {
    setSelectedTrackIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    if (!dateCompleted.trim()) {
      setError('Date completed is required (YYYY-MM-DD).');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const report = await createTripReport.mutateAsync({
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        dateCompleted: dateCompleted.trim(),
        durationDays: durationDays.trim() ? Number(durationDays.trim()) : undefined,
        actualCostAmount: cost.trim() ? Number(cost.trim()) : undefined,
        currency: currency as 'NPR' | 'USD' | 'EUR' | 'INR' | undefined,
        activityTrackIds: selectedTrackIds.length ? selectedTrackIds.map((id) => ownTracks.find((t) => t.id === id)!.serverId!) : undefined,
      });

      for (const photo of photos) {
        // Sequential, not Promise.all - keeps ordering deterministic and
        // avoids hammering the API with a burst of concurrent uploads.
        await authPost(`/trip-reports/${report.id}/media`, { url: photo.url });
      }

      router.replace(`/adventures/${slug}/trips/${report.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create trip report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen contentContainerClassName="gap-4 px-4 py-4">
      <Text className="text-2xl font-bold text-primary-900 dark:text-primary-100">Share a trip report</Text>

      <Field label="Title">
        <TextInput value={title} onChangeText={setTitle} placeholder="Trip title" />
      </Field>
      <Field label="Description">
        <TextArea value={description} onChangeText={setDescription} placeholder="How did it go?" />
      </Field>
      <Field label="Date completed (YYYY-MM-DD)">
        <TextInput value={dateCompleted} onChangeText={setDateCompleted} placeholder="2026-05-01" />
      </Field>
      <Field label="Duration (days)">
        <TextInput value={durationDays} onChangeText={setDurationDays} keyboardType="numeric" />
      </Field>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Field label="Cost">
            <TextInput value={cost} onChangeText={setCost} keyboardType="numeric" />
          </Field>
        </View>
        <View className="flex-1">
          <Select label="Currency" value={currency} options={CURRENCIES} onChange={setCurrency} />
        </View>
      </View>

      {ownTracks.length ? (
        <View className="gap-1.5">
          <Text className="text-sm font-medium text-primary-900 dark:text-primary-100">Attach your activity tracks</Text>
          {ownTracks.map((track) => (
            <Pressable key={track.id} onPress={() => toggleTrack(track.id)} className="flex-row items-center gap-2">
              <Text
                className={
                  selectedTrackIds.includes(track.id)
                    ? 'text-sm font-semibold text-primary-700 dark:text-primary-300'
                    : 'text-sm text-stone-600 dark:text-stone-400'
                }
              >
                {selectedTrackIds.includes(track.id) ? '☑' : '☐'} {track.name ?? 'Untitled recording'}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View className="gap-1.5">
        <Text className="text-sm font-medium text-primary-900 dark:text-primary-100">Photos</Text>
        <View className="flex-row flex-wrap gap-2">
          {photos.map((photo, index) => (
            <Image key={index} source={{ uri: photo.url }} style={{ width: 80, height: 80, borderRadius: 8 }} contentFit="cover" />
          ))}
        </View>
        <View className="flex-row gap-2">
          <Button size="sm" variant="secondary" disabled={uploadingPhoto} onPress={() => handleAddPhoto('camera')}>
            Take photo
          </Button>
          <Button size="sm" variant="secondary" disabled={uploadingPhoto} onPress={() => handleAddPhoto('library')}>
            Choose photo
          </Button>
        </View>
      </View>

      {error ? <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text> : null}
      <Button disabled={submitting} onPress={handleSubmit}>
        {submitting ? 'Sharing…' : 'Share trip report'}
      </Button>
    </Screen>
  );
}
