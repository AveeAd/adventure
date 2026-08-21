import { createFileRoute, useLoaderData } from '@tanstack/react-router';

import { Container } from '../components/Container';
import { buildMeta } from '../lib/seo';

// Same content as docs/privacy.md (published separately via GitHub Pages
// for the App/Play Store listing forms, which want a URL independent of
// the product's own domain) - kept here too so the actual product links to
// its own privacy policy rather than sending users off-site for it. Kept
// in sync by hand; there's no shared source between the two copies.
// Unlike login/account/edit routes, this is deliberately indexed (no
// noindex) - a privacy policy is exactly the kind of page that should turn
// up in search.
export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
  head: () =>
    buildMeta({
      title: 'Privacy Policy',
      description: "What Hipppie collects, why, and what control you have over it.",
      path: '/privacy',
    }),
});

function PrivacyPage() {
  const { appConfig } = useLoaderData({ from: '__root__' });
  const contactEmail = appConfig.contactEmail || 'contact us';

  return (
    <Container>
      {/* Same prose recipe as MarkdownContent.tsx: max-w-none cancels the
          Tailwind Typography plugin's own internal max-width (a `.prose`
          rule, not a max-w-* utility - stacking a narrower max-w-* utility
          alongside it would fight it at equal specificity), leaving
          Container's own max-w-5xl as the only width constraint - same
          width every other content page on the site uses. */}
      <div className="prose prose-stone dark:prose-invert prose-headings:font-semibold prose-a:text-primary-700 dark:prose-a:text-primary-400 max-w-none">
        <h1>Privacy Policy</h1>
        <p>
          <strong>Last updated: 2026-08-19</strong>
        </p>

        <p>
          {appConfig.name} ("the app", "the site", "we") is a non-commercial, community-built map, wiki, and
          activity log for Nepal. It's run by a small team of contributors, not a company, and it doesn't sell
          anything or run ads. This policy explains what data the app and website collect, why, and what control
          you have over it.
        </p>

        <p>
          This policy covers both the mobile app (iOS/Android) and this website. It does not cover third-party
          sites you may link to from adventure pages, trip reports, or guide profiles.
        </p>

        <h2>What we collect</h2>

        <h3>Account information</h3>
        <p>
          When you sign in with Google or Sign in with Apple, we receive your email address and (usually only on
          your very first sign-in) your name from that provider. We store this to create and identify your
          account. Apple's "Hide My Email" is supported — if you use it, we only ever see the private relay
          address, never your real one.
        </p>
        <p>We don't support email/password accounts, so we never see or store a password.</p>

        <h3>Location</h3>
        <p>
          If you record a hike or route using the mobile app's GPS recording feature, we collect your precise
          device location (including while the app is in the background) for the duration of that recording. This
          is the core purpose of the recording feature — we don't collect location at any other time.
        </p>
        <p>
          Recordings are private by default and visible only to you unless you choose to promote one to a public
          trail or attach it to a trip report. If you do promote a recording to a public trail, exact timestamps
          are stripped from the geometry before it becomes public — a raw timestamp trail would reveal exactly
          when you were at a given spot, which we don't think belongs on a public, anonymous map.
        </p>

        <h3>Photos</h3>
        <p>
          If you upload a photo — to a trip report, an adventure page, or elsewhere — we store that image on our
          servers so it can be displayed as part of the content you're contributing.
        </p>

        <h3>Content you create</h3>
        <p>
          Adventure page edits, trail/spot edits, trip reports, comments, thread posts, club posts, and similar
          contributions are stored and, in most cases, shown publicly (some — like private club threads — are only
          visible to that club's members). This is user-generated content, not something we passively collect
          about you; you choose to publish it.
        </p>

        <h3>Push notifications</h3>
        <p>
          If you enable push notifications on the mobile app, we store a device-specific push token (via
          Apple/Google's push services, proxied through Expo's push service) so we can deliver notifications to
          your device. This token is deleted the moment you disable notifications or sign out, or automatically if
          the provider tells us your device is no longer reachable. You can turn any category of notification on
          or off from the app's Account tab.
        </p>

        <h3>Crash and diagnostic data</h3>
        <p>
          The mobile app uses Sentry to catch crashes and performance issues so we can fix bugs. This data (stack
          traces, device/OS info) is not linked to your account or identity by us — we never send your name,
          email, or user ID to Sentry.
        </p>

        <h3>What we don't do</h3>
        <ul>
          <li>We don't run ads and don't use your data for advertising.</li>
          <li>We don't sell your data, to anyone, ever.</li>
          <li>We don't track you across other apps or websites.</li>
          <li>We don't collect data from anyone we know to be a child.</li>
        </ul>

        <h2>Who we share data with</h2>
        <ul>
          <li>
            <strong>Google / Apple</strong> — only to authenticate you when you sign in; we don't share anything
            back to them beyond the standard OAuth/Sign-in-with-Apple handshake.
          </li>
          <li>
            <strong>Expo</strong> (the toolchain the mobile app is built on) — relays push notifications to
            Apple's and Google's push services on our behalf. It sees your device's push token, not your account
            details.
          </li>
          <li>
            <strong>Sentry</strong> — receives crash/diagnostic data as described above, not linked to your
            identity.
          </li>
          <li>
            <strong>Our hosting provider</strong> — hosts the servers and database everything above lives on.
          </li>
        </ul>
        <p>We don't share your data with anyone else.</p>

        <h2>Deleting your data</h2>
        <p>You can delete your account at any time from the mobile app's Account tab ("Delete account"). When you do:</p>
        <ul>
          <li>Your login sessions, push notification tokens, and connected sign-in accounts (Google/Apple) are deleted outright.</li>
          <li>Your recorded GPS tracks (activity tracks) are deleted outright — these are personal data with no reason to outlive your account.</li>
          <li>Your profile name and email are anonymized (replaced with a generic "[deleted user]" identity).</li>
          <li>
            Content you contributed and that other people's content links to or references — adventure page edits,
            trip reports, comments — stays in place, now attributed to "[deleted user]" rather than being deleted,
            the same way a Wikipedia edit isn't erased when an editor leaves. We think silently deleting content
            that's woven into a page's history (and that other people may be relying on) would do more harm than
            good.
          </li>
        </ul>
        <p>
          If you'd rather we handle a deletion request manually, or you have any other question about your data,
          contact us at {contactEmail}.
        </p>

        <h2>Children's privacy</h2>
        <p>
          {appConfig.name} isn't directed at children, and we don't knowingly collect data from anyone under 13
          (or the relevant minimum age in your country). If you believe a child has created an account, contact us
          and we'll delete it.
        </p>

        <h2>Changes to this policy</h2>
        <p>
          If this policy changes in a meaningful way, we'll update the date at the top of this page. Continuing to
          use the app after a change means you accept the updated policy.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about this policy or your data: <strong>{contactEmail}</strong>
        </p>
      </div>
    </Container>
  );
}
