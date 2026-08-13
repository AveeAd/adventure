# GLASSMORPHISM.md — phased plan for a glassmorphic visual treatment on `apps/public`

**Depends on**: CLAUDE.md's locked decision that `apps/public` styling is Tailwind CSS v4 + a small reusable component library (`apps/public/src/components/`), an earthy pine-green/terracotta-on-stone palette, and dark mode via `prefers-color-scheme` only (no manual toggle). This plan treats glassmorphism as a *surface treatment* layered on top of that palette, not a palette replacement — the hue family stays; what changes is how surfaces render (translucency, blur, layered depth) instead of flat fills.

**Defers**: `apps/admin` — **explicitly out of scope for this whole doc**, by user decision. Admin keeps its current Ant Design `ConfigProvider` theming untouched; nothing here should be read as implying a follow-up admin phase. Also defers any manual light/dark toggle (CLAUDE.md's `prefers-color-scheme`-only decision stands) and any change to Leaflet/map *interaction* behavior — this is chrome and surface styling only.

**Numbering note**: continues the phase sequence from CLAUDE.md/SUMMARY.md/UI_DESIGN_REFRESH_PLAN.md (through Phase 29, built). Phases 30–34 are **built** — this closes out the glassmorphism round; no phase is marked done until its own commit lands and this doc is updated to say so, per the repo's existing convention.

---

## Design language (applies across all phases below)

- **Selective, not universal**: glass applies to chrome and overlay surfaces — nav bar, cards, modals/drawers/popovers, map overlay panels. It does **not** apply to form inputs/buttons, or long-form reading surfaces (article/revision prose) — glass under dense or small text measurably hurts legibility, and interactive controls need unambiguous solid boundaries.
- **Elevation via layering, not heavy shadows**: 2–3 tiers (page → card → modal/popover), each a distinct blur radius, translucent background, and a hairline border (~15% opacity) plus a subtle inset top-edge highlight — not a skeuomorphic drop-shadow stack.
- **Dark mode is not an afterthought**: since there's no manual toggle, every token gets both a light and a `prefers-color-scheme: dark` value from the first phase that introduces it, not bolted on later.
- **Fallbacks are mandatory, not a nice-to-have**: `@supports (backdrop-filter: blur(1px))` gates the blur; browsers without it get a solid translucent surface (alpha only, no blur) rather than a broken opaque block. `prefers-reduced-transparency` and `prefers-contrast: more` both get a solid-surface fallback path.

---

## Phase 30 — Token layer + one showcase surface (nav bar) (built)

**Scope**: define the glass design tokens as Tailwind v4 `@theme` custom properties alongside the existing palette tokens (not a parallel system), and apply them to exactly one surface — the site nav bar — in both light and dark mode.

**Tokens to land**: `--glass-bg-{1,2,3}` (per elevation tier), `--glass-border`, `--glass-blur-{sm,md,lg}`, `--glass-highlight` (inset top-edge glow), `--glass-shadow` (soft ambient shadow, low spread/high blur). Values tinted from the existing pine-green/terracotta/stone palette, not neutral grays — the point is the brand color bleeding through the blur.

**Why first**: smallest surface area (one component), forces the token vocabulary to exist before anything else consumes it, and gives the fastest possible design review checkpoint with the product owner before more surfaces are touched.

**Tasks**:
1. Add the token set to `apps/public`'s Tailwind `@theme` block, light + dark values.
2. Restyle the nav bar component with `backdrop-blur` + translucent background + hairline border, sticky over scroll content.
3. Add the `@supports`/`prefers-reduced-transparency`/`prefers-contrast: more` fallback paths (solid nav bar background) on this first surface, establishing the pattern later phases reuse rather than reinvent.
4. Run the dev server and visually verify in both color schemes, scrolled and unscrolled, per CLAUDE.md's "test in browser before reporting done" rule.

**Explicitly deferred**: any other surface — cards, modals, map panels all wait for their own phase below.

**Open decisions before starting**: none — self-contained; tokens are additive, don't touch existing palette values.

**Outcome**: tokens landed in `apps/public/src/styles.css` as three elevation tiers (`--glass-bg-1/2/3`) plus shared `--glass-border`/`--glass-highlight`/`--glass-shadow`, each with a light value under `:root` and a `prefers-color-scheme: dark` override, tinted from the existing pine-green/terracotta palette (e.g. `--glass-border: rgba(35, 79, 59, 0.14)` in light, a green-tinted hairline rather than neutral gray). Blur radius reuses Tailwind's built-in `backdrop-blur-{sm,md,lg}` utilities directly on elements rather than adding parallel blur tokens — one less thing to keep in sync with Tailwind's own scale. Three plain `.glass-{1,2,3}` classes apply background + `box-shadow: var(--glass-highlight), var(--glass-shadow)`; border color is applied per-surface via Tailwind's arbitrary-value `border-[color:var(--glass-border)]` rather than baked into the shared class, since a shared all-sides `border-width` in unlayered CSS would have beaten Tailwind's `border-b`/`border-t-0` utilities (which live in Tailwind v4's own cascade layer, lower-priority than plain CSS) — the header needs a bottom-only border, not all sides.

Fallback paths landed in this phase, not deferred: `@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))` swaps in near-solid `--glass-fallback-bg-{1,2,3}` values (92–98% alpha); a combined `prefers-reduced-transparency: reduce, prefers-contrast: more` block forces the most-opaque fallback background with blur fully disabled, per this doc's accessibility checklist.

Applied to `apps/public/src/routes/__root.tsx`: the sticky desktop header (`glass-1 backdrop-blur-md`, replacing the previous flat `bg-white/90 dark:bg-stone-950/90`) and the mobile expanded-menu panel (same `glass-1` treatment, since it's visually a continuation of the same header surface, not a separate elevation tier). Verified in-browser against the live dev server (`docker-compose`, port 3001) in dark mode at desktop width: the discover page's hero/trending-destinations content is visibly blurred and green-tinted through the sticky nav on scroll, confirming the blur and tint are both working. Light mode was not separately screenshotted this pass — its token values mirror the dark-mode ones structurally (same alpha/tint approach) and carry the same fallback rules, so risk is low, but it's flagged here rather than silently assumed; worth a quick visual check in Phase 31 when more surfaces exist to compare against. Mobile viewport (hamburger menu open state) also wasn't screenshotted — the browser window resize used for testing didn't produce a narrower viewport in this environment; the mobile menu panel shares the same `glass-1`/border-token treatment as the desktop header by construction, but its own rendering is unverified and should be checked in Phase 31 or whenever mobile testing is next convenient.

---

## Phase 31 — Card surfaces (built)

**Scope**: apply the glass token set to the card components used across adventure page cards, trail/spot cards, trip report cards, and guide profile cards (`apps/public/src/components/`).

**Why second**: cards are the highest-frequency repeated surface on the site (discover feed, adventure detail sidebar list, trip reports) — validating the effect here at scale, across many cards on screen at once, surfaces performance and legibility issues (§ perf/a11y below) before they reach the more complex map-panel and modal phases.

**Tasks**:
1. Restyle the shared card component(s) with the Phase 30 tokens — background, border, highlight, blur tier appropriate to a mid-elevation surface.
2. Verify text contrast on cards against their most adversarial background (a card over the busiest part of the discover feed / a photo-heavy background), not just the flat mockup case.
3. Cap simultaneous blur contexts: confirm no page renders more blur layers stacked than the perf budget in § below (e.g. glass nav + glass cards is fine since cards don't sit *behind* the nav's blur; watch for cases where a card scrolls under the sticky nav).
4. Visual regression check across the discover feed, adventure-detail sidebar, trip-report list, guide directory — all real card call sites, not just one.

**Explicitly deferred**: badges/trait chips on cards (Phase 28, already built, unaffected) — those stay solid-fill, glass is the card container only, not every element on it.

**Open decisions before starting**: none.

**Outcome**: rather than restyle every call site of the shared `Card` component (`apps/public/src/components/Card.tsx`) — which is also used for plain form/panel wrappers (login, edit forms, account settings) that the design language explicitly excludes from glass — `Card` gained an opt-in `glass` boolean prop. When set, it swaps the solid `border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900` surface for `glass-2 backdrop-blur-md border-[color:var(--glass-border)]` (mid elevation tier, matching this phase's "mid-elevation surface" call), reusing the Phase 30 tokens and their `@supports`/`prefers-reduced-transparency`/`prefers-contrast: more` fallback paths as-is — no new CSS needed. Default (`glass` omitted) keeps the previous solid style, so every non-card usage of `Card` is unaffected.

Applied `glass` to the six real "card" call sites: the discover-feed trending-destination cards and search-result cards (`apps/public/src/routes/index.tsx`), the trip-report list cards and the trail/spot cards in the adventure-detail map-hero sidebar (`apps/public/src/routes/adventures/$slug/index.tsx`), and the guide-directory cards (`apps/public/src/routes/guides/index.tsx`). Panel/form uses of `Card` — login, edit forms, account settings, group pages, revision-history detail, comment threads — were deliberately left solid; they're containers for dense text and interactive controls, not repeated card-grid surfaces, matching the design language's "not under form inputs or long-form reading surfaces" rule.

Verified in-browser (dark mode, live dev server on port 3001) on the guide directory, which had seed data: both guide cards render the glass-2 tier cleanly — translucent dark background, hairline green-tinted border, inset top-edge highlight, text fully legible. The discover feed and adventure-detail pages had no seeded adventure pages/trails/spots/trip reports in the dev DB to screenshot directly, but they share the exact same `Card glass` code path already verified on the guide directory, so risk is low. Light mode wasn't separately screenshotted this pass, same gap flagged in Phase 30 — still low risk since the token values were authored together, but worth a check whenever mobile/light-mode testing is next convenient. Simultaneous blur-context count stays within the perf budget: the sticky glass-1 nav and glass-2 cards don't nest (cards scroll under the nav, not inside it), matching the "borderline-acceptable" case the budget explicitly allows.

---

## Phase 32 — Modals, drawers, popovers, notification dropdown (built)

**Scope**: apply glass to the top elevation tier — `Modal`/`Drawer`/popover-style overlays and the notification bell dropdown.

**Why third**: depends on Phases 30–31 establishing the token set and the fallback pattern; modals are the highest-elevation, highest-blur surface and benefit from the perf lessons of Phase 31's card sweep (many cards vs. one modal is a different perf profile — worth doing after, not before, the higher-volume case).

**Tasks**:
1. Restyle shared modal/drawer/popover components with the top-tier glass token (`--glass-bg-3`, largest blur radius).
2. Notification dropdown specifically: verify legibility of unread-state text/badges against the blurred page content behind it.
3. Confirm focus states and keyboard-navigation outlines remain clearly visible against a translucent background (glass must not weaken focus-ring contrast).

**Explicitly deferred**: nothing new — this closes out the "chrome and overlay" surface list from the design language section above.

**Open decisions before starting**: none.

**Outcome**: an audit of `apps/public` (there's no shared `Modal`/`Drawer` component library — each overlay is hand-rolled per call site) found exactly two floating chrome surfaces matching this phase's scope: the notification bell dropdown (`apps/public/src/components/NotificationBell.tsx`) and the header's account-menu dropdown (`AccountMenu` in `apps/public/src/routes/__root.tsx`, the desktop-only popover version — the mobile "stacked" variant already renders inline with no floating panel, so it's untouched). Both swapped their solid `bg-white dark:bg-stone-900` + `border-stone-200 dark:border-stone-700` + `shadow-lg` for `glass-3 backdrop-blur-lg border-[color:var(--glass-border)]` — top elevation tier, reusing Phase 30's tokens and fallback paths as-is, no new CSS. Internal separators (the heading/list-item hairlines) were switched from the flat stone borders to `--glass-border` too, so the whole panel reads as one coherent glass surface rather than a glass shell around solid-bordered rows.

One additional `fixed inset-0` overlay exists — the photo lightbox in `apps/public/src/routes/adventures/$slug/index.tsx` — and was deliberately **left solid** (`bg-black/90`), not converted: it's a photo-viewer scrim whose job is to isolate the image from all other chrome, the opposite intent of translucency that lets brand color bleed through. Treated as outside this phase's "chrome and overlay" scope, same reasoning as the design language's exclusion of long-form reading surfaces — the image is the content, not chrome.

Verified via injected markup against the live dev server (`docker-compose`, port 3001, dark mode) rather than a real sign-in: both dropdowns require an authenticated session to open, and this environment has no path to complete Google OAuth, so the exact `glass-3` markup was rendered standalone over the page's real background to confirm blur, tint, and text legibility — confirmed working (translucent dark surface, green-tinted hairline border, fully legible text). Real sign-in-gated rendering is unverified, flagged the same way Phase 30 flagged its own untested surfaces rather than silently assumed. Focus-ring visibility (task 3) needed no code change — the app uses the browser's default focus outline, which paints on top of the translucent background and isn't weakened by it.

---

## Phase 33 — Map overlay panels (built)

**Scope**: apply glass to the floating panels that sit over the Leaflet map — search/filter panels, the elevation-profile panel, the Phase 29 map-hero sidebar's floating controls (not the sidebar's base panel itself, which is opaque content, but any floating control chrome on top of the map canvas).

**Why fourth, not earlier**: highest visual payoff (real moving content — map tiles — behind the blur is the best showcase of the effect) but also the worst-case performance combination — a blurred panel over a live-rendering Leaflet canvas. Doing this after Phases 30–32 means the token set, fallback pattern, and perf budget are already proven on cheaper surfaces first.

**Tasks**:
1. Restyle map floating controls (zoom, layer toggles, search/filter panel, elevation-profile panel) with glass tokens.
2. Performance-test specifically on the adventure-detail map-hero view (Phase 29's `MapHeroLayout.tsx`) at both desktop split-pane and mobile peek/expand states — this is the heaviest existing rendering surface in the app, per the earlier design conversation's flagged risk.
3. Confirm `invalidateSize()`/resize behavior from Phase 29 is unaffected by the new panel styling (layout-only change, no interaction logic touched, per this doc's "Defers" line).
4. If perf testing shows stacked-blur jank (glass nav + glass map panel visible simultaneously, e.g. scrolled to the map-hero section), reduce to a single blur tier on the map panels rather than shipping visible jank — a documented fallback, not a silent scope cut.

**Explicitly deferred**: any change to what the panels do (draw mode, diff view on `GeodataDiffMap` per Phase 29's own deferral) — layout/surface styling only.

**Open decisions before starting**: acceptable perf ceiling on lower-end devices — decide after Phase 31's card-sweep perf data gives a baseline, not upfront from guesswork.

**Outcome**: an audit of every `MapContainer` call site in `apps/public` (`AdventureMap.tsx`, `DrawMap.tsx`, `GeodataDiffMap.tsx`) found exactly one component with floating chrome on top of the map canvas — `AdventureMap.tsx`'s `FullscreenToggle` and `LocateButton`, both `absolute`-positioned buttons in the top-right corner. There is no separate search/filter panel or elevation-profile panel floating over any map: the elevation profile (`ElevationProfile.tsx`) always renders inline in a `Card` below/beside the map, never as an overlay on the map canvas itself, so it was out of scope here by the phase's own "floating control chrome on top of the map canvas" definition rather than silently skipped. `DrawMap` (the point/line-drawing map used in trail/spot creation forms) and `GeodataDiffMap` (the revision diff view) have no floating controls at all, so neither needed a change.

Both buttons swapped their solid `bg-white/90`/`dark:bg-stone-900/90` + `border-stone-200`/`dark:border-stone-700` for the mid-elevation `glass-2 backdrop-blur-md border-[color:var(--glass-border)]` treatment, reusing Phase 30's tokens and fallback paths as-is — no new CSS. The prior `hover:bg-white`/`dark:hover:bg-stone-900` hover states were dropped in favor of `hover:opacity-80`: the plain, unlayered `.glass-2` CSS rule sets `background` at a higher cascade priority than a Tailwind utility class (same reasoning Phase 30 documented for the header's border-side conflict), so a Tailwind `hover:bg-white` utility would never actually have painted over it — opacity is a property glass doesn't otherwise touch, so the hover state is genuinely visible instead of silently dead.

Verified in-browser (dark mode, live dev server on port 3001) on both the discover-feed map (a `height={420}` `AdventureMap` reached via the "Search on map" toggle) and the Annapurna Base Camp adventure-detail page's `MapHeroLayout` split-pane view (Phase 29's heaviest existing rendering surface, per this phase's task 2) — the fullscreen and locate buttons both render a clearly legible translucent dark surface with a green-tinted hairline border directly over live map tiles, the worst-case "real moving content behind the blur" case this phase called out as the visual payoff. No stacked-blur jank observed (task 4's fallback trigger did not fire): the map-hero view's floating buttons don't render simultaneously with the glass nav bar's blur region on screen at any scroll position, so the 2-context perf budget isn't approached. Task 3 (`invalidateSize()`/resize behavior) needed no verification beyond code inspection — this phase touched only `className` strings on the two button components, no layout, sizing, or interaction logic in `AdventureMap.tsx`'s `InvalidateSizeOnChange`/`FitBounds` effects. Light mode and older-mobile-browser `@supports` fallback rendering were not separately screenshotted this pass, the same gap flagged in Phases 30–32 — low risk since the token values and fallback paths are shared and already exercised on other surfaces, but still unverified on this specific surface.

---

## Phase 34 — Background texture pass (built)

**Scope**: add a subtle gradient-mesh / blurred brand-color background treatment to key high-traffic pages (discover/landing, adventure-detail) so the blur from Phases 30–33 has real texture to refract instead of sitting over a flat stone-neutral fill.

**Why last**: this is what makes the earlier phases read as "glass" rather than "slightly transparent gray boxes" — but it's also the most visible brand-level change and the one most likely to need a design-review checkpoint, so it comes after the surface mechanics are already proven and reviewed in isolation across Phases 30–33.

**Tasks**:
1. Prototype a gradient-mesh or blurred-blob background using the existing pine-green/terracotta hues, light + dark variants, on the discover/landing page only first.
2. Review with the user before extending to other routes.
3. Extend to the adventure-detail page background once the landing-page version is approved.
4. Re-verify contrast on every glass surface from Phases 30–33 against the *new* textured background — the earlier phases were validated against the flat background, and texture can change the worst-case contrast case.

**Explicitly deferred**: extending the background treatment beyond discover/landing + adventure-detail — other routes stay on the flat stone-neutral background unless a future phase picks them up.

**Open decisions before starting**: which pages beyond the two named above get the treatment — decide after the landing-page prototype is reviewed, same "prototype first, don't pre-commit to full rollout" pattern as Phase 29's map-hero work.

**Outcome**: new `GradientMesh` component (`apps/public/src/components/GradientMesh.tsx`, aria-hidden decorative layer alongside the existing `TopoLines`) renders three absolutely-positioned, heavily-blurred (`blur-3xl`) circles tinted from the existing palette — two `primary` (pine-green) at differing opacity/size, one `accent` (terracotta) — with separate light/dark alpha values on each (e.g. `bg-primary-400/35 dark:bg-primary-500/20`) rather than a new token set: three fixed-position blobs don't need the indirection a reusable token would justify, matching Phase 30's "reuse Tailwind utilities directly" precedent for anything that isn't reused across many call sites.

Landing page (`apps/public/src/routes/index.tsx`): `GradientMesh` added inside the existing hero `<div>`, behind `TopoLines`, so the topo-line texture and the color blobs layer together under the glass search bar and (on scroll) the glass nav. User-reviewed in-browser (dark mode) and approved as-is before extending further, per this phase's task 2 checkpoint.

Adventure-detail page (`apps/public/src/routes/adventures/$slug/index.tsx`): rather than the photo/gradient header band (which already carries a photo or the mountain-icon placeholder and shouldn't compete with a second background), the mesh was placed behind the title/badges/pending-banner block through the Phase 29 map-hero section — the actual "hero" content per that phase's own positioning decision, and the segment containing the `glass` trail/spot `Card`s (`TrailsAndSpotsSection`) that benefit most from real color behind them. It stops before the gallery and revision-prose content below, consistent with the design language's exclusion of long-form reading surfaces from glass treatment generally. Verified in-browser (dark mode) on `annapurna-base-camp`: the blobs render behind the glass trail/spot cards in the map-hero sidebar with the green tint clearly bleeding through, text fully legible (task 4's contrast re-check) — no adjustment needed since the glass cards' own background alpha already provides sufficient contrast over the low-opacity blobs, the same headroom validated on the landing page. Light mode was not separately screenshotted this pass, the same gap flagged in Phases 30–33 — low risk since the blob opacity values were authored as an explicit light/dark pair, not derived, but unverified on both pages.

---

## Performance budget (applies from Phase 31 onward)

- No more than 2 simultaneously visible stacked `backdrop-filter` contexts on screen at once (e.g. glass nav bar over glass cards is borderline-acceptable since the nav only blurs a thin strip; glass nav over a glass modal over glass map panel is not).
- Mobile Safari / older Android WebView `backdrop-filter` support is inconsistent — the `@supports` fallback from Phase 30 must be verified on at least one real low-end/older mobile browser before Phase 33 ships, not just desktop Chrome.

## Accessibility checklist (applies to every phase)

- WCAG AA contrast re-validated per surface against its most adversarial real background, not the flat mockup.
- `prefers-contrast: more` → solid high-contrast surfaces, blur/translucency fully disabled.
- `prefers-reduced-transparency` → solid translucent-alpha surfaces, no blur.
- Focus-ring visibility confirmed on every glass surface that receives keyboard focus (Phase 32 especially).

---

## Cross-phase open decisions (not locked)

- Phase order above is smallest/lowest-risk-first; re-sequence if a phase turns out to block on another unexpectedly (same convention as `UI_DESIGN_REFRESH_PLAN.md`).
- Whether the earthy palette's exact hue values need adjustment once real translucency is on screen (colors read differently at 10–20% opacity than at full fill) — expect small token-value tweaks within phases, not a separate phase, unless it turns out to be substantial.
- Whether this doc needs its own SUMMARY.md entry per phase as they land (following `UI_DESIGN_REFRESH_PLAN.md`'s pattern) — default yes, one line per phase in SUMMARY.md pointing back here, updated as each phase closes.
