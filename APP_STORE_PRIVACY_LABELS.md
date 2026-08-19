# App Store / Play Store privacy form reference

Reference answers for App Store Connect's "App Privacy" (Nutrition Label) questionnaire and Google Play Console's "Data safety" form, derived from what `apps/mobile` actually collects (audited against the codebase, not guessed) as of 2026-08-19. These are filled in by hand in each console's UI — this file exists so the answers are traceable back to real code instead of reconstructed from memory at submission time, and so they can be re-audited if the app's data collection changes.

**Both forms change their exact wording/categories periodically — verify current category names against Apple's/Google's own docs before submitting, don't just copy this table blindly.** The underlying facts below (what's collected, whether it's linked to identity, whether it's shared) are the part worth trusting; the exact form-field labels may have drifted.

Full narrative version of all of this: [`docs/privacy.md`](docs/privacy.md).

## Summary facts that apply to every data type below

- **No advertising, no data brokers, no selling data.** Apple's "Data Used to Track You" section: **None**. No App Tracking Transparency prompt needed.
- **No third-party analytics SDK.** Only Sentry (crash/diagnostics — see below).
- Data is shared with exactly three outside parties, all as service providers acting on our behalf, not for their own purposes: **Google/Apple** (auth handshake only), **Expo** (push token relay), **Sentry** (crash diagnostics).

## Data types collected

| Data type | Collected? | Linked to identity? | Purpose | Source in code |
|---|---|---|---|---|
| Email address | Yes | Yes | Account creation/functionality | `AuthIdentity`/`User.email`, via Google/Apple sign-in |
| Name | Yes | Yes | Account/profile display | `Profile.name`, from Google profile or Apple's one-time `fullName` |
| Precise location | Yes | Yes | App functionality (GPS hike recording) | `ActivityTrack.samples`, `expo-location` foreground+background |
| Photos | Yes | Yes | User-submitted content (trip report/page media) | `Media`/`TripReportMedia`, via `expo-image-picker` |
| Other user-generated content | Yes | Yes | The product itself (wiki edits, trip reports, comments, threads) | `PageRevision`, `TripReport`, `Comment`, `Thread`, etc. |
| User ID | Yes | Yes | Account functionality | internal UUID |
| Device ID / push token | Yes | Yes | Push notification delivery | `DeviceToken.token`, Expo push token |
| Crash data / diagnostics | Yes | **No** — not linked to account by us (no `Sentry.setUser()` call anywhere in the app) | Bug fixing | `apps/mobile/src/lib/sentry.ts` |
| Precise/coarse location for ads, tracking, or analytics | No | — | — | — |
| Contacts, calendar, health/fitness (beyond location), financial info, browsing history, search history, purchase history | No | — | — | — |

## Apple App Privacy (App Store Connect) — category-by-category

- **Contact Info → Email Address, Name**: Collected, linked to user, used for App Functionality. Not used for tracking.
- **Location → Precise Location**: Collected, linked to user, used for App Functionality only.
- **User Content → Photos or Videos, Other User Content**: Collected, linked to user, used for App Functionality.
- **Identifiers → User ID, Device ID**: Collected, linked to user, used for App Functionality.
- **Diagnostics → Crash Data, Performance Data**: Collected, **not linked** to user, used for App Functionality (bug fixing).
- Every other category (Health & Fitness, Financial Info, Browsing History, Search History, Purchases, Contacts, Sensitive Info, Usage Data beyond the above): **not collected**.
- **Data Used to Track You**: None.

## Google Play Data Safety form

- **Does your app collect or share any of the required user data types?** Yes.
- **Location → approximate location**: not collected separately (only precise, during an explicit recording action). **Precise location**: collected, not shared with third parties for their own purposes, used for App functionality. User can request data deletion (in-app account deletion). Collection is not required to use the app's read-only browsing features — only to record a hike.
- **Personal info → Name, Email address**: collected, used for Account management, not shared.
- **Photos and videos → Photos**: collected, used for App functionality, not shared beyond being publicly displayed as content the user chose to publish.
- **App activity → Other user-generated content**: collected (wiki edits, trip reports, comments), used for App functionality.
- **App info and performance → Crash logs, Diagnostics**: collected, not linked to a user identity, used for App functionality (bug fixing).
- **Device or other IDs**: collected (push token), used for App functionality (notifications), not shared.
- Everything else in Play's data type list (Financial info, Health and fitness, Messages, Web browsing, App interactions/ads-related data, Device or other identifiers beyond the push token): **not collected**.
- **Is all of the user data collected by your app encrypted in transit?** Yes (HTTPS/TLS to the API; access tokens in memory only, refresh tokens in `expo-secure-store`).
- **Do you provide a way for users to request that their data is deleted?** Yes — in-app account deletion (`DELETE /users/me`), described in `docs/privacy.md`.

## Open items before either form can actually be submitted

- Both forms need a live, publicly reachable privacy policy URL — that's `docs/privacy.md`, published via the existing GitHub Pages setup (`docs/_config.yml`). Confirm the exact published URL once Pages is enabled/verified for this repo.
- Both need a support/contact email in the store listing itself, separate from the privacy policy's own contact line — use the same `CONTACT_EMAIL`-sourced address (`app.contactEmail` `SystemSetting`, currently seeded from the `.env` `CONTACT_EMAIL` var) for consistency.
- Apple's App Privacy section is filled in App Store Connect once an app record exists there, which needs the (separately tracked, not-yet-started) EAS Build/Submit work and a paid Apple Developer account first.
