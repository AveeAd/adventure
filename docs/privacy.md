---
title: Privacy Policy
---

# Privacy Policy

**Last updated: 2026-08-19**

Hipppie ("the app", "the site", "we") is a non-commercial, community-built map, wiki, and activity log for Nepal. It's run by a small team of contributors, not a company, and it doesn't sell anything or run ads. This policy explains what data the app and website collect, why, and what control you have over it.

This policy covers the `apps/mobile` app (iOS/Android) and the `apps/public` website. It does not cover third-party sites you may link to from adventure pages, trip reports, or guide profiles.

## What we collect

### Account information

When you sign in with Google or Sign in with Apple, we receive your email address and (usually only on your very first sign-in) your name from that provider. We store this to create and identify your account. Apple's "Hide My Email" is supported — if you use it, we only ever see the private relay address, never your real one.

We don't support email/password accounts, so we never see or store a password.

### Location

If you record a hike or route using the app's GPS recording feature, we collect your precise device location (including while the app is in the background) for the duration of that recording. This is the core purpose of the recording feature — we don't collect location at any other time.

Recordings are private by default and visible only to you unless you choose to promote one to a public trail or attach it to a trip report. If you do promote a recording to a public trail, exact timestamps are stripped from the geometry before it becomes public — a raw timestamp trail would reveal exactly when you were at a given spot, which we don't think belongs on a public, anonymous map.

### Photos

If you upload a photo — to a trip report, an adventure page, or elsewhere — we store that image on our servers so it can be displayed as part of the content you're contributing.

### Content you create

Adventure page edits, trail/spot edits, trip reports, comments, thread posts, club posts, and similar contributions are stored and, in most cases, shown publicly (some — like private club threads — are only visible to that club's members). This is user-generated content, not something we passively collect about you; you choose to publish it.

### Push notifications

If you enable push notifications, we store a device-specific push token (via Apple/Google's push services, proxied through Expo's push service) so we can deliver notifications to your device. This token is deleted the moment you disable notifications or sign out, or automatically if the provider tells us your device is no longer reachable. You can turn any category of notification on or off from the app's Account tab.

### Crash and diagnostic data

The mobile app uses Sentry to catch crashes and performance issues so we can fix bugs. This data (stack traces, device/OS info) is not linked to your account or identity by us — we never send your name, email, or user ID to Sentry.

### What we don't do

- We don't run ads and don't use your data for advertising.
- We don't sell your data, to anyone, ever.
- We don't track you across other apps or websites.
- We don't collect data from anyone we know to be a child.

## Who we share data with

- **Google / Apple** — only to authenticate you when you sign in; we don't share anything back to them beyond the standard OAuth/Sign-in-with-Apple handshake.
- **Expo** (the toolchain the mobile app is built on) — relays push notifications to Apple's and Google's push services on our behalf. It sees your device's push token, not your account details.
- **Sentry** — receives crash/diagnostic data as described above, not linked to your identity.
- **Our hosting provider** — hosts the servers and database everything above lives on.

We don't share your data with anyone else.

## Deleting your data

You can delete your account at any time from the mobile app's Account tab (`Delete account`). When you do:

- Your login sessions, push notification tokens, and connected sign-in accounts (Google/Apple) are deleted outright.
- Your recorded GPS tracks (activity tracks) are deleted outright — these are personal data with no reason to outlive your account.
- Your profile name and email are anonymized (replaced with a generic "[deleted user]" identity).
- Content you contributed and that other people's content links to or references — adventure page edits, trip reports, comments — stays in place, now attributed to "[deleted user]" rather than being deleted, the same way a Wikipedia edit isn't erased when an editor leaves. We think silently deleting content that's woven into a page's history (and that other people may be relying on) would do more harm than good.

If you'd rather we handle a deletion request manually, or you have any other question about your data, contact us at {{ site.contact_email }}.

## Children's privacy

Hipppie isn't directed at children, and we don't knowingly collect data from anyone under 13 (or the relevant minimum age in your country). If you believe a child has created an account, contact us and we'll delete it.

## Changes to this policy

If this policy changes in a meaningful way, we'll update the date at the top of this page. Continuing to use the app after a change means you accept the updated policy.

## Contact

Questions about this policy or your data: **{{ site.contact_email }}**
