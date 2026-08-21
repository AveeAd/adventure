import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, Text, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/Badge';
import { Card } from '@/components/Card';
import { ElevationProfile } from '@/components/ElevationProfile';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { FloatingMenu, FloatingMenuItem } from '@/components/FloatingMenu';
import { GlassPill } from '@/components/GlassPill';
import { LoadingState } from '@/components/LoadingState';
import { Markdown } from '@/components/Markdown';
import { PhotoLightbox } from '@/components/PhotoLightbox';
import { Screen } from '@/components/Screen';
import { GLYPH_SHADOW, useGlassTokens } from '@/lib/glass';
import { HEADER_MARGIN } from '@/lib/header';
import {
  useAdventurePage,
  useSpots,
  useToggleLike,
  useToggleVisit,
  useTrails,
  useTripReports,
} from '@/lib/resources/adventure-pages';
import { useDeleteOfflineAdventure, useDownloadAdventure, useOfflineStatus } from '@/lib/resources/offline';

function formatDuration(t: (key: string, opts?: Record<string, unknown>) => string, minDays: number | null, maxDays: number | null) {
  if (!minDays && !maxDays) return null;
  if (minDays === maxDays) return t('detail.durationDays', { count: minDays ?? 0 });
  return t('detail.durationRange', { minDays: minDays ?? '?', maxDays: maxDays ?? '?' });
}

// Ported from apps/public's own InfoItem (routes/adventures/$slug/index.tsx)
// - icon + small label + bold value, stacked. ~48% width so two sit side
// by side in the "At a glance" grid's flex-wrap row without a real CSS
// grid (RN has no grid-template-columns equivalent worth reaching for
// here).
function InfoItem({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-start gap-2" style={{ width: '47%' }}>
      <Ionicons name={icon} size={16} color="#3d7d5b" style={{ marginTop: 2 }} />
      <View className="flex-1">
        <Text className="text-xs text-stone-500 dark:text-stone-400">{label}</Text>
        <Text className="text-sm font-medium text-stone-800 dark:text-stone-200">{value}</Text>
      </View>
    </View>
  );
}

// Height of the bottom Like/Been-here pill row + margin + a little
// breathing room - same role as lib/tab-bar.ts's TAB_BAR_CLEARANCE, just
// local to this screen since it's the only one with this particular
// floating pair (not shared like the (tabs) group's own bottom bar).
const BOTTOM_ACTIONS_MARGIN = 16;
const BOTTOM_ACTIONS_CLEARANCE = 44 + BOTTOM_ACTIONS_MARGIN * 2 + 16;

export default function AdventureDetail() {
  const { t } = useTranslation('adventurePage');
  const { t: tc } = useTranslation('common');
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const dark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const tokens = useGlassTokens();
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { data: page, isLoading, isError, refetch, isRefetching } = useAdventurePage(slug);
  const { data: trails, refetch: refetchTrails } = useTrails(page?.id);
  const { data: spots, refetch: refetchSpots } = useSpots(page?.id);
  const { data: tripReports, refetch: refetchTripReports } = useTripReports(page?.id);
  const toggleLike = useToggleLike(page?.id ?? '', slug);
  const toggleVisit = useToggleVisit(page?.id ?? '', slug);
  const { data: offlineStatus } = useOfflineStatus(slug);
  const downloadOffline = useDownloadAdventure(slug);
  const removeOffline = useDeleteOfflineAdventure(slug);

  if (isLoading) return <LoadingState />;
  if (isError || !page) return <ErrorState onRetry={() => refetch()} />;

  const cover = page.media[0];
  const duration = formatDuration(t, page.durationMinDays, page.durationMaxDays);

  // Mirrors OfflineDownloadButton.tsx's own state branches, inlined here
  // instead of reusing that component - it renders a full Button, which
  // doesn't match a floating menu item's look, and this needs the same
  // download/downloaded/error states as a single FloatingMenuItem instead.
  const offlineItem = downloadOffline.isPending
    ? { icon: 'cloud-download-outline' as const, label: tc('offline.downloading'), onPress: () => {}, loading: true }
    : offlineStatus === 'downloaded'
      ? { icon: 'cloud-done' as const, label: tc('offline.downloadedRemove'), onPress: () => removeOffline.mutate(), loading: false }
      : downloadOffline.isError
        ? { icon: 'alert-circle' as const, label: tc('offline.failedRetry'), onPress: () => downloadOffline.mutate(), loading: false }
        : { icon: 'cloud-download-outline' as const, label: tc('offline.download'), onPress: () => downloadOffline.mutate(), loading: false };

  return (
    <Screen
      scroll
      className="px-0 py-0"
      contentContainerClassName="gap-4"
      contentContainerStyle={{ paddingBottom: BOTTOM_ACTIONS_CLEARANCE }}
      edges={cover ? ['bottom', 'left', 'right'] : undefined}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={() => {
            refetch();
            refetchTrails();
            refetchSpots();
            refetchTripReports();
          }}
        />
      }
    >
      {/* Right-only floating pill (unlike (tabs)/_layout.tsx's FloatingHeader,
          which pairs a logo pill with this same nav pill - this screen has
          no logo/branding need, just the menu trigger and, alongside it,
          the offline-download pill) that opens FloatingMenu below it: the
          admin actions this screen used to scatter across three section
          headers (Edit, Add/Edit Trail, Add Spot, Share Trip Report), now
          one tap away, each rendered as its own labeled floating pill
          rather than one boxed dropdown panel. Download for offline moved
          out to its own standalone pill, left of the menu trigger - it's a
          state a viewer wants to see and toggle at a glance (downloaded/
          downloading/failed), not an action worth burying a tap deeper in
          a menu the way the other four still are. */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: insets.top + HEADER_MARGIN,
          right: HEADER_MARGIN,
          flexDirection: 'row',
          gap: 10,
          zIndex: 10,
        }}
      >
        <GlassPill>
          <Pressable
            onPress={offlineItem.onPress}
            disabled={offlineItem.loading}
            className={`p-3 ${offlineItem.loading ? 'opacity-50' : 'active:opacity-70'}`}
            accessibilityLabel={offlineItem.label}
            hitSlop={4}
          >
            {offlineItem.loading ? (
              <ActivityIndicator size="small" color={tokens.iconActive} />
            ) : (
              <Ionicons name={offlineItem.icon} size={20} color={tokens.iconActive} style={GLYPH_SHADOW} />
            )}
          </Pressable>
        </GlassPill>
        <GlassPill className="p-1.5">
          <Pressable
            onPress={() => setMenuOpen(true)}
            className="rounded-full p-2 active:opacity-70"
            accessibilityLabel={t('detail.menu')}
            hitSlop={4}
          >
            <Ionicons name="ellipsis-horizontal" size={20} color={tokens.iconActive} style={GLYPH_SHADOW} />
          </Pressable>
        </GlassPill>
      </View>
      <FloatingMenu visible={menuOpen} onClose={() => setMenuOpen(false)}>
        <FloatingMenuItem
          icon="create-outline"
          label={t('detail.edit')}
          onPress={() => {
            setMenuOpen(false);
            router.push(`/adventures/${slug}/edit`);
          }}
        />
        <FloatingMenuItem
          icon="trail-sign-outline"
          label={trails?.length ? t('detail.editTrail') : t('detail.addTrail')}
          onPress={() => {
            setMenuOpen(false);
            router.push(`/adventures/${slug}/trails/new`);
          }}
        />
        <FloatingMenuItem
          icon="location-outline"
          label={t('detail.addSpot')}
          onPress={() => {
            setMenuOpen(false);
            router.push(`/adventures/${slug}/spots/new`);
          }}
        />
        <FloatingMenuItem
          icon="share-social-outline"
          label={t('detail.shareTripReport')}
          onPress={() => {
            setMenuOpen(false);
            router.push(`/adventures/${slug}/trips/new`);
          }}
        />
      </FloatingMenu>

      {/* Two independent floating pills, bottom-center, above everything
          this screen scrolls - the social actions (Like/Been-here) get
          the same "always reachable, not buried in content" treatment the
          top-right menu already gives the admin actions, since both are
          things a viewer wants to hit from anywhere on the page, not just
          while scrolled to where they used to live inline. */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          bottom: insets.bottom + BOTTOM_ACTIONS_MARGIN,
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 10,
          zIndex: 10,
        }}
      >
        <Pressable onPress={(e) => e.stopPropagation()}>
          <GlassPill>
            <Pressable
              onPress={() => toggleLike.mutate(page.likedByMe)}
              disabled={toggleLike.isPending}
              className={`p-3 ${toggleLike.isPending ? 'opacity-50' : 'active:opacity-70'}`}
              accessibilityLabel={page.likedByMe ? t('detail.liked') : t('detail.like')}
            >
              <Ionicons
                name={page.likedByMe ? 'heart' : 'heart-outline'}
                size={20}
                color={page.likedByMe ? '#c1633c' : tokens.iconActive}
                style={GLYPH_SHADOW}
              />
            </Pressable>
          </GlassPill>
        </Pressable>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <GlassPill>
            <Pressable
              onPress={() => toggleVisit.mutate(page.visitedByMe)}
              disabled={toggleVisit.isPending}
              className={`p-3 ${toggleVisit.isPending ? 'opacity-50' : 'active:opacity-70'}`}
              accessibilityLabel={page.visitedByMe ? t('detail.beenHere') : t('detail.markBeenHere')}
            >
              <Ionicons
                name={page.visitedByMe ? 'footsteps' : 'footsteps-outline'}
                size={20}
                color={page.visitedByMe ? '#2f6b4f' : tokens.iconActive}
                style={GLYPH_SHADOW}
              />
            </Pressable>
          </GlassPill>
        </Pressable>
      </View>

      {cover ? (
        // Edge-to-edge hero, bleeding under the status bar too (Screen's
        // `edges` prop above omits 'top' from SafeAreaView whenever there's
        // a cover to bleed under it) - mirrors apps/public's own hero
        // treatment (routes/adventures/$slug/index.tsx: `-mt-24` full-bleed
        // image + `bg-gradient-to-b from-transparent to-stone-50` overlay),
        // achieved by skipping the top safe-area inset entirely instead of
        // a negative margin undoing it.
        <View style={{ width: '100%', height: 280 }}>
          <Image source={{ uri: cover.largeUrl ?? cover.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          {/* A dark scrim, not the page's own bg color, behind the title -
              the fade below transitions to primary-200 in light mode
              (`#b9d7c3`), and the title sits at bottom-0 which is exactly
              the lightest point of that fade - white text there had almost
              no contrast (this is what "text is not visible" was). A scrim
              is theme-independent on purpose: it's reading against a photo,
              not the app's own surface, so it stays dark in both modes. */}
          <LinearGradient
            colors={['transparent', 'rgba(0, 0, 0, 0.45)', 'rgba(0, 0, 0, 0.88)']}
            locations={[0, 0.5, 1]}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 160 }}
          />
          {/* Fades the last sliver of the hero into GradientMesh's own wash
              tone, not a flat stone-50/950 - Screen's SafeAreaView
              background is only a fallback color GradientMesh fully
              covers, so stone read as a visible mismatch against the
              actual green mesh behind it. primary-200/primary-950 match
              the mesh's own top-left stop (GradientMesh.tsx's washColors),
              the closest single flat color to what's actually behind the
              hero at this point on the page. Kept short (24px) and below
              the scrim above so it doesn't fight the text's contrast the
              way covering the whole 140px in this color did. */}
          <LinearGradient
            colors={['transparent', dark ? '#0d1f17' : '#b9d7c3']}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 24 }}
          />
          {/* Title/summary moved off the page and onto the hero itself,
              like a classic photo-banner header - white text + a real drop
              shadow (not GLYPH_SHADOW's white halo, which would vanish
              against light photo areas) for legibility against whatever's
              underneath, same reasoning apps/public's own hero text
              treatment already follows. */}
          <View className="absolute inset-x-0 bottom-0 gap-1.5 p-4">
            <Text
              className="text-2xl font-bold text-white"
              style={{ textShadowColor: 'rgba(0, 0, 0, 0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 }}
            >
              {page.title}
            </Text>
            {page.summary ? (
              <Text
                className="text-sm text-white/90"
                style={{ textShadowColor: 'rgba(0, 0, 0, 0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 }}
                numberOfLines={2}
              >
                {page.summary}
              </Text>
            ) : null}
            <View className="flex-row flex-wrap gap-1.5">
              {page.activityType ? <Badge glass>{page.activityType.name}</Badge> : null}
              {page.difficultyLevel ? (
                <Badge glass tone="warning">
                  {page.difficultyLevel.name}
                </Badge>
              ) : null}
              {!page.approvedRevision ? (
                <Badge glass tone="warning">
                  {t('detail.unapproved')}
                </Badge>
              ) : null}
              {page.tags.map(({ tag }) => (
                <Badge key={tag.id} glass tone="neutral">
                  {tag.name}
                </Badge>
              ))}
            </View>
          </View>
        </View>
      ) : null}

      <View className={`gap-4 px-4 pb-4 ${cover ? '' : 'pt-4'}`}>
        {/* Every section on this page as its own glass panel, rather than
            plain text sitting directly on the page background - the inner
            trail/spot/trip-report rows drop their own `glass` prop and use
            Card's plain matte surface instead, so a glass section doesn't
            nest another blurred glass layer inside itself. */}
        <Card glass className="gap-3 p-4">
          {/* No cover means no banner overlay to carry the title/summary
              instead - shown here as a fallback so they're never dropped
              entirely. */}
          {!cover ? (
            <>
              <Text className="text-2xl font-bold text-primary-900 dark:text-primary-100">{page.title}</Text>
              {page.summary ? (
                <Text className="text-sm text-stone-600 dark:text-stone-400">{page.summary}</Text>
              ) : null}
              <View className="flex-row flex-wrap gap-1.5">
                {page.activityType ? <Badge>{page.activityType.name}</Badge> : null}
                {page.difficultyLevel ? <Badge tone="warning">{page.difficultyLevel.name}</Badge> : null}
                {!page.approvedRevision ? <Badge tone="warning">{t('detail.unapproved')}</Badge> : null}
                {page.districts.map((d) => (
                  <Badge key={d.district.name} tone="neutral">
                    {d.district.name}
                  </Badge>
                ))}
                {page.seasons.map((s) => (
                  <Badge key={s.season.name} tone="success">
                    {s.season.name}
                  </Badge>
                ))}
                {page.tags.map(({ tag }) => (
                  <Badge key={tag.id} tone="neutral">
                    {tag.name}
                  </Badge>
                ))}
              </View>
            </>
          ) : null}

          {/* Ported from apps/public's own InfoItem grid (routes/adventures/
              $slug/index.tsx) - icon + label + value, 2 per row, each item
              conditional on the data actually being present. Districts/
              seasons already show as badges on the hero now, but repeating
              them here as plain text (not another badge) is still useful -
              the hero badges are a quick tag scan, this is the fuller
              "here's everything about this page" reference block. */}
          <View className="gap-3 border-t border-primary-100 pt-3 dark:border-primary-800">
            <Text className="text-base font-semibold text-primary-900 dark:text-primary-100">
              {t('detail.atAGlance')}
            </Text>
            <View className="flex-row flex-wrap gap-x-4 gap-y-3">
              {duration ? (
                <InfoItem icon="time-outline" label={t('detail.durationLabel')} value={duration} />
              ) : null}
              {page.maxAltitudeMeters ? (
                <InfoItem
                  icon="trending-up-outline"
                  label={t('detail.maxAltitudeLabel')}
                  value={t('detail.altitudeValue', { meters: page.maxAltitudeMeters })}
                />
              ) : null}
              {page.districts.length ? (
                <InfoItem
                  icon="location-outline"
                  label={t('detail.districtsLabel')}
                  value={page.districts.map((d) => d.district.name).join(', ')}
                />
              ) : null}
              {page.seasons.length ? (
                <InfoItem
                  icon="calendar-outline"
                  label={t('detail.bestSeasonsLabel')}
                  value={page.seasons.map((s) => s.season.name).join(', ')}
                />
              ) : null}
              <InfoItem
                icon="people-outline"
                label={t('detail.contributorsLabel')}
                value={String(page.contributorIds.length)}
              />
            </View>
          </View>
        </Card>

        {page.approvedRevision?.content ? (
          <Card glass className="gap-3 p-4">
            <Markdown>{page.approvedRevision.content}</Markdown>
          </Card>
        ) : null}

        {page.media.length ? (
          <Card glass className="gap-3 p-4">
            <Text className="text-lg font-semibold text-primary-900 dark:text-primary-100">
              {t('detail.photos')}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {page.media.map((item, index) => (
                <Pressable
                  key={item.url + index}
                  onPress={() => setLightboxIndex(index)}
                  className="overflow-hidden rounded-lg active:opacity-70"
                  style={{ width: '31.5%', aspectRatio: 1 }}
                  accessibilityLabel={t('detail.viewPhoto')}
                >
                  <Image
                    source={{ uri: item.smallUrl ?? item.mediumUrl ?? item.url }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                </Pressable>
              ))}
            </View>
          </Card>
        ) : null}

        <Card glass className="gap-3 p-4">
          <Text className="text-lg font-semibold text-primary-900 dark:text-primary-100">
            {t('detail.trailsAndSpots')}
          </Text>
          {trails?.length || spots?.length ? (
            <View className="gap-2">
              {trails?.map((trail) => (
                <Card key={trail.id} className="p-3">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="font-medium text-primary-900 dark:text-primary-100">
                        {trail.name ?? t('detail.unnamedTrail')}
                      </Text>
                      <Text className="text-sm text-stone-600 dark:text-stone-400">
                        {trail.distanceMeters ? `${(trail.distanceMeters / 1000).toFixed(1)} km` : null}
                        {trail.ascentMeters ? ` · +${Math.round(trail.ascentMeters)}m` : null}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => router.push(`/adventures/${slug}/map`)}
                      className="rounded-full p-2 active:opacity-70"
                      accessibilityLabel={t('detail.viewMap')}
                      hitSlop={4}
                    >
                      <Ionicons name="map-outline" size={20} color={tokens.iconActive} />
                    </Pressable>
                  </View>
                  {trail.elevationSamples && trail.elevationSamples.length > 1 ? (
                    <View className="mt-3 border-t border-stone-100 pt-3 dark:border-stone-800">
                      <ElevationProfile
                        samples={trail.elevationSamples}
                        ascentMeters={trail.ascentMeters}
                        descentMeters={trail.descentMeters}
                        height={140}
                      />
                    </View>
                  ) : null}
                </Card>
              ))}
              {spots?.map((spot) => (
                <Card key={spot.id} className="p-3">
                  <Text className="font-medium text-primary-900 dark:text-primary-100">{spot.name}</Text>
                  <Text className="text-sm text-stone-600 dark:text-stone-400">
                    {spot.spotTypeName}
                    {spot.elevationMeters ? ` · ${spot.elevationMeters}m` : null}
                  </Text>
                </Card>
              ))}
            </View>
          ) : (
            <EmptyState>{t('detail.emptyTrailsAndSpots')}</EmptyState>
          )}
        </Card>

        <Card glass className="gap-3 p-4">
          <Text className="text-lg font-semibold text-primary-900 dark:text-primary-100">
            {t('detail.tripReports')}
          </Text>
          {tripReports?.data.length ? (
            <View className="gap-2">
              {tripReports.data.map((report) => (
                <Link key={report.id} href={`/adventures/${slug}/trips/${report.id}`} asChild>
                  <Card className="p-3" onPress={() => {}}>
                    <Text className="font-medium text-primary-900 dark:text-primary-100">
                      {report.title}
                    </Text>
                    <Text className="text-sm text-stone-600 dark:text-stone-400">
                      {new Date(report.dateCompleted).toLocaleDateString()} · {t('detail.kudosCount', { count: report.kudosCount })}
                    </Text>
                  </Card>
                </Link>
              ))}
            </View>
          ) : (
            <EmptyState>{t('detail.emptyTripReports')}</EmptyState>
          )}
        </Card>
      </View>
      {lightboxIndex !== null ? (
        <PhotoLightbox
          photos={page.media}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </Screen>
  );
}
