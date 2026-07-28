# Nepal adventure platform — idea document

A community-run, non-commercial platform for every kind of adventure in Nepal — trekking, biking, motorcycle routes, bungee, paragliding, and whatever else fits. Built by someone living it, maintained by everyone who's done it.

## Vision

**OpenStreetMap + Wikipedia + Strava, for adventure in Nepal.**

- Open, anyone-can-edit map data of trails and adventure spots (OpenStreetMap)
- Collaboratively written, versioned info pages per adventure (Wikipedia)
- A social feed of real people's real completed trips (Strava)

No bookings, no commission, no pay-to-rank listings, no paywalls. Success is measured by coverage and accuracy of Nepal's adventure info — not revenue.

## Why this, why now

What already exists is narrow:

- **HoneyGuide** — separate offline apps per trek (EBC, ABC, Poon Hill), guide/lodge booking. Trekking-only, per-route, not unified.
- **Hop Nepal** — accommodation booking. No itinerary or guide layer.
- **AllTrails** — global, generic. No guide directory, no multi-activity types, no local depth.

A real constraint to design around from day one: Nepal's government requires trekkers to go through a **registered trekking agency** to get permits for restricted routes (Annapurna, Manaslu, Upper Mustang). The guide directory has to route through licensed operators for those regions, not just any local contact.

**The gap**: nobody spans multiple adventure types + planning + community knowledge + peer connection, in one place, non-commercially.

## The three inherited layers

| Layer | Inherited from | What it gives the platform |
|---|---|---|
| Geodata | OpenStreetMap | The map itself — trails and spots as editable geodata, open license, anyone can add or correct |
| Article | Wikipedia | Per-adventure info pages — infobox + prose, collaboratively edited, full revision history |
| Activity | Strava | The social layer — logged trips, trip reports, kudos, clubs |

A single unified account ties all three together — one profile accumulates map edits, article edits, and logged trips, the same way a Wikipedia editor's userpage shows everything they've touched. That combined history is also the natural trust signal later (see Contribution & trust below) — no separate verification bureaucracy needed for casual contributors.

## Core pillars

1. **Discover** — map-first browsing. Pins colored by activity type, filterable, click to see details. List view as a secondary mode.
2. **Plan** — day-by-day itinerary + linked accommodation (teahouses, hotels, camps). Needs to flex per activity: trekking is multi-day logistics, bungee/paragliding is closer to a single booking.
3. **Connect** — free guide directory. Profiles show certifications, languages, specialties, regions, rate range. No in-app payment or commission. Restricted-region guides need license verification before being marked verified.
4. **Share** — Strava-style trip reports: what someone actually did, real dates, real costs, kudos/comments. This is the differentiator vs. static guidebook content.
5. **Contribute** — two flows:
   - *Add new*: a missing trail/spot gets added directly from the map.
   - *Edit existing*: suggest a correction to an existing page (trail closed, new teahouse, price change).
6. **Community (trip companions)** — Strava-clubs-style groups around a shared route + date window (e.g. "EBC, Sept 15–25"). Safety in numbers, cost-splitting, social connection. Genuinely missing from every existing competitor.

## Adventure page anatomy

Each adventure is a single page combining all three layers:

- Header: title, last-edited-by, link to edit history, "edit this page" button
- Embedded map snippet with the route/pin, link to full map
- Infobox (Wikipedia-style): region, difficulty, duration, best season, max altitude
- Prose description, collaboratively editable
- Trip reports feed: avatar, name, date completed, caption, kudos/comments
- "Log your trip" call to action

## Contribution & trust model (leaning toward, not locked)

- New submissions go live immediately, tagged **unverified**
- Promoted to **verified** after a few confirmations from other users, or manual review for anything safety-critical (route conditions, hazards)
- Full edit history per page, revertable, like Wikipedia
- Trust accumulates through activity (edit count, logged trips) rather than manual gatekeeping for every change — mirrors how OSM and Wikipedia scale moderation without a centralized review team

## Guide accounts

- Free profile, not a paid listing: certifications/license number, languages, specialties, regions covered, rate range (informational only)
- Surfaced from the specific adventure/region pages they cover, not a generic directory
- Restricted-region guides (Annapurna, Manaslu, Upper Mustang) require license verification before the profile is marked verified — this isn't optional, it reflects an actual legal requirement

## Personas (for reference, not gatekeeping who can use it)

- **The Planner** — foreign trekker planning a multi-week trip in advance
- **The Weekend Warrior** — Kathmandu-based, wants biking/paragliding day trips
- **The Local Contributor** — updates trail conditions, corrects info, doesn't necessarily travel much themselves
- **The Adrenaline Tourist** — wants a single bungee/paragliding booking, not itinerary-heavy
- **The Guide** — wants visibility, not commission-based bookings

## Open questions — not yet decided

- **Governance tiers** — exactly what it takes for a contributor's edits to auto-publish instead of queuing (OSM uses account age + edit history; Wikipedia uses a few trust tiers)
- **Hosting/sustainability without revenue** — map + photo data isn't free to host even at hobby scale; worth an early instinct even if not urgent (out-of-pocket vs. Wikipedia-style occasional donations later)
- **Name / branding** — not discussed yet
- **Tech stack** — deliberately deferred, separate conversation
- **MVP scope / build order** — deliberately deferred, separate conversation

## Competitive landscape (reference)

- HoneyGuide — per-route offline trekking apps, guide/lodge booking, trekking-only
- Hop Nepal — accommodation booking platform
- AllTrails — global trail database, hiking-only, no guide layer
- Nepal government mandates registered trekking agencies for permits on Annapurna, Manaslu, Upper Mustang
