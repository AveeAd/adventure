import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { GlassEdgeHighlight } from '@/components/GlassEdgeHighlight';
import { GlassPill } from '@/components/GlassPill';
import { GlassSpecular } from '@/components/GlassSpecular';
import { BLUR_METHOD, GLYPH_SHADOW, useActiveBlurTarget, useGlassTokens } from '@/lib/glass';
import { useActivityTypes } from '@/lib/resources/master-data';
import { getActiveSessionId } from '@/lib/recording/store';
import { startRecording } from '@/lib/recording/recorder';
import { TAB_BAR_HEIGHT, TAB_BAR_MARGIN } from '@/lib/tab-bar';

type Step = 'closed' | 'actions' | 'activityForm';
const SHEET_TRAVEL = 420;
const DIAL_SPACING = 60;

// Map-tab-only speed dial (see MOBILE_PLAN.md discussion) sitting
// bottom-left, mirroring MapLocateButton's bottom-right placement. Rendered
// from (tabs)/_layout.tsx (gated to the Map route), not from the Map
// screen itself - the floating tab bar is mounted by the Tabs navigator as
// a sibling of screen content and stacks above it, so an overlay rendered
// inside the screen (as this originally was) shows up behind the tab bar;
// living at the same layout level as FloatingHeader, which already floats
// above everything correctly, fixes that. Only exposes actions with no
// page-context dependency up front:
// Activity/Track recording is genuinely global (ActivityTrack.adventurePageId
// is optional, SetNull), but Spot creation is hard-scoped to exactly one
// AdventurePage in the schema, so that action routes through a page picker
// (spots/pick-page.tsx) rather than pretending to be a one-tap action.
//
// The 'actions' menu renders as a speed-dial: small floating pill buttons
// that pop up above the FAB itself (Animated, not RN's <Modal>), dismissed
// by a transparent full-screen backdrop Pressable. The activity-type
// picker (the 'activityForm' step, reached once "record activity" is
// tapped with no session already running) still needs its own real
// bottom sheet rather than a speed-dial item, since it's a scrollable list
// + submit button, not a single tap target - and it can't be RN's <Modal>
// either. Two real bugs pushed that design: on the Map tab specifically
// (the one tab with no Screen/SafeAreaView wrapper), <Modal> silently
// fails to render on Android - onPress fires and state updates, but no
// Dialog window ever appears (confirmed via dumpsys - no window created);
// and Select.tsx's own picker is itself <Modal>-backed, so nesting it
// inside this sheet would hit the same bug one level deeper - the
// activity-type list is a plain inline row list here instead, not a
// nested Select.
export function RecordFAB() {
  const { t } = useTranslation('tracks');
  const router = useRouter();
  const tokens = useGlassTokens();
  const blurTarget = useActiveBlurTarget();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('closed');
  const [activityTypeId, setActivityTypeId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const { data: activityTypes } = useActivityTypes();

  const [translateY] = useState(() => new Animated.Value(SHEET_TRAVEL));
  const [backdropOpacity] = useState(() => new Animated.Value(0));
  const [dialAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (step === 'actions') {
      getActiveSessionId().then((id) => setHasActiveSession(!!id));
      dialAnim.setValue(0);
      Animated.spring(dialAnim, { toValue: 1, useNativeDriver: true, friction: 8, tension: 80 }).start();
    } else if (step === 'activityForm') {
      translateY.setValue(SHEET_TRAVEL);
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 240, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
    // translateY/backdropOpacity/dialAnim are stable refs - only `step` should retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const bottomOffset = insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_MARGIN * 2 + 12;

  const closeDial = (after?: () => void) => {
    Animated.timing(dialAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setStep('closed');
      after?.();
    });
  };

  const requestClose = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: SHEET_TRAVEL, duration: 180, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep('closed');
      setActivityTypeId(null);
      setError(null);
      setStarting(false);
    });
  };

  const goAddSpot = () => {
    closeDial(() => router.push('/pick-page?kind=spot'));
  };

  const goAddTrail = () => {
    closeDial(() => router.push('/pick-page?kind=trail'));
  };

  const onPressActivity = () => {
    if (hasActiveSession) {
      closeDial(() => router.push('/tracks/record'));
    } else {
      dialAnim.setValue(0);
      setStep('activityForm');
    }
  };

  const handleStart = async () => {
    if (!activityTypeId) return;
    setStarting(true);
    setError(null);
    try {
      await startRecording({ activityTypeId });
      setStep('closed');
      router.push('/tracks/record');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('newRecording.startError'));
      setStarting(false);
    }
  };

  const dialActions = [
    { key: 'spot', icon: 'location' as const, label: t('fab.addSpot'), onPress: goAddSpot },
    {
      key: 'activity',
      icon: 'footsteps' as const,
      label: hasActiveSession ? t('fab.resumeActivity') : t('fab.recordActivity'),
      onPress: onPressActivity,
    },
    { key: 'trail', icon: 'trail-sign' as const, label: t('fab.addTrail'), onPress: goAddTrail },
  ];

  return (
    <>
      {step === 'actions' ? (
        <Pressable
          className="absolute inset-0"
          onPress={() => closeDial()}
          accessibilityLabel={t('fab.close')}
        />
      ) : null}

      {step === 'actions'
        ? dialActions.map((action, i) => (
            <Animated.View
              key={action.key}
              className="absolute left-4"
              style={{
                bottom: bottomOffset + (i + 1) * DIAL_SPACING,
                opacity: dialAnim,
                transform: [
                  { scale: dialAnim },
                  {
                    translateY: dialAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
                  },
                ],
              }}
            >
              <GlassPill>
                <Pressable
                  onPress={action.onPress}
                  className="flex-row items-center gap-2 px-3 py-2.5 active:opacity-70"
                  hitSlop={8}
                >
                  <Ionicons name={action.icon} size={20} color={tokens.iconActive} style={GLYPH_SHADOW} />
                  <Text className="text-sm font-medium text-primary-900 dark:text-primary-100">
                    {action.label}
                  </Text>
                </Pressable>
              </GlassPill>
            </Animated.View>
          ))
        : null}

      <GlassPill className="absolute left-4" style={{ bottom: bottomOffset }}>
        <Pressable
          onPress={() => (step === 'actions' ? closeDial() : setStep('actions'))}
          className="p-3 active:opacity-70"
          hitSlop={20}
        >
          <Animated.View
            style={{
              transform: [
                {
                  rotate: dialAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }),
                },
              ],
            }}
          >
            <Ionicons name="add" size={22} color={tokens.iconActive} style={GLYPH_SHADOW} />
          </Animated.View>
        </Pressable>
      </GlassPill>

      {step === 'activityForm' ? (
        <View className="absolute inset-0">
          <Animated.View style={{ flex: 1, opacity: backdropOpacity }}>
            <Pressable className="flex-1 bg-black/40" onPress={requestClose} />
          </Animated.View>

          <Animated.View
            className="absolute inset-x-0 bottom-0 rounded-t-2xl p-4 pb-8"
            style={[
              tokens.shadowStyle,
              { paddingBottom: insets.bottom + 16, transform: [{ translateY }] },
            ]}
          >
            <View className="absolute inset-0 overflow-hidden rounded-t-2xl" style={StyleSheet.absoluteFill}>
              {/* Blurs whichever screen currently has focus (activeBlurTarget,
                  see glass.ts) - on the Map tab that's the live map itself
                  (index.tsx registers it directly, and its TextureView mode
                  makes it snapshot-capturable, see AdventureMap.tsx). Falls
                  back to "none" until a target has registered. */}
              <BlurView
                intensity={45}
                tint={tokens.blurTint}
                blurMethod={blurTarget ? BLUR_METHOD : 'none'}
                blurTarget={blurTarget ?? undefined}
                style={StyleSheet.absoluteFill}
              />
              <LinearGradient
                colors={[tokens.bg1, tokens.bg2]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <GlassSpecular />
              <GlassEdgeHighlight />
            </View>
            <View className="mb-3 h-1 w-10 self-center rounded-full bg-stone-300 dark:bg-primary-700" />

            <View className="gap-3">
              <Text className="text-lg font-semibold text-primary-900 dark:text-primary-100">
                {t('newRecording.title')}
              </Text>
              <Text className="text-sm font-medium text-stone-500 dark:text-stone-400">
                {t('newRecording.activityTypeLabel')}
              </Text>
              <View className="gap-1">
                {(activityTypes?.data ?? []).map((option) => {
                  const selected = option.id === activityTypeId;
                  return (
                    <Pressable
                      key={option.id}
                      onPress={() => setActivityTypeId(option.id)}
                      className={`flex-row items-center justify-between rounded-lg border-[1.5px] px-3 py-2.5 ${
                        selected
                          ? 'border-primary-600 bg-primary-50 dark:bg-primary-900'
                          : 'border-stone-200 dark:border-primary-800'
                      }`}
                    >
                      <Text
                        className={
                          selected
                            ? 'font-semibold text-primary-700 dark:text-primary-300'
                            : 'text-primary-900 dark:text-primary-100'
                        }
                      >
                        {option.name}
                      </Text>
                      {selected ? (
                        <Ionicons name="checkmark-circle" size={18} color={tokens.iconActive} />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
              {error ? <Text className="text-sm text-red-600 dark:text-red-400">{error}</Text> : null}
              <Pressable
                onPress={handleStart}
                disabled={!activityTypeId || starting}
                className={`flex-row items-center justify-center gap-2 rounded-lg bg-primary-700 py-3 ${
                  !activityTypeId || starting ? 'opacity-50' : 'active:opacity-80'
                }`}
              >
                {starting ? <ActivityIndicator size="small" color="#fff" /> : null}
                <Text className="font-semibold text-white">
                  {starting ? t('newRecording.starting') : t('newRecording.startButton')}
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      ) : null}
    </>
  );
}
