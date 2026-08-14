---
title: Home
---

# Adventure Nepal

*A community-built guide to every kind of adventure in Nepal — trekking, biking, motorcycle routes, bungee, paragliding, and more. Free, non-commercial, built by the people who go.*

## The idea, in one line

Imagine if OpenStreetMap, Wikipedia, and Strava had a baby, and that baby only cared about Nepal.

- **OpenStreetMap** gave it the map — every trail and point of interest is real, editable geodata, not a marketing brochure.
- **Wikipedia** gave it the article layer — every place has a page anyone can write and improve, with full history so nothing is ever really lost.
- **Strava** gave it the social layer — people log the trips they actually did, with real dates, real costs, and real photos, and the community shows appreciation with kudos.

Nobody currently combines all three, for Nepal, for free. Existing options are narrow: some apps only cover trekking, some are booking platforms, some are global and generic and don't know anything about local guides or the fact that certain regions legally require a licensed agency to visit. This project exists to fill that gap — not to make money, but to make good information about adventuring in Nepal easy to find and easy to trust.

## Who it's for

- **The Planner** — a foreign trekker researching a trip months in advance, who wants real trail conditions, real costs, and a way to find a legitimate guide.
- **The Weekend Warrior** — someone based in Kathmandu looking for a good day hike or short trip, not a three-week expedition.
- **The Local Contributor** — someone who's out on the trails regularly and wants to keep the map and route info accurate for everyone else.
- **The Adrenaline Seeker** — someone booking a single activity like paragliding or bungee, not planning an itinerary.
- **The Guide** — a licensed professional who wants to be found by the people who need them, without paying for placement or giving up a commission.

## What you can actually do on the site today

- **Discover** — browse a map-first view of adventure pages: treks, day hikes, biking routes, and more, each with its own trail/waypoint data plotted on a real map.
- **Read and contribute to adventure pages** — every destination has a Wikipedia-style page: an overview, practical details (duration, difficulty, best season, maximum altitude), and a full edit history. Anyone can propose an edit; it goes live once the community has reviewed it (see "How trust works," below).
- **Plan a trip** and **log a trip you already did** — write up a trip report with real dates and costs, attach your own recorded GPS track, and share photos. Other people can leave kudos and comments.
- **Find a guide** — browse a directory of guide profiles with their specialties, languages, and the regions they cover. Guides for legally restricted regions (like Upper Mustang or the Annapurna Sanctuary) are only shown as verified once their license has actually been checked by a moderator — this isn't optional paperwork, it's a real Nepali government requirement for trekker safety.
- **Find travel companions** — join a trip-companion group tied to a specific route and date window, or join a persistent Club (like "Kathmandu Hikers") for ongoing community around a shared interest, complete with discussion threads.
- **Search** — full-text search across adventure pages.
- **Get notified** — an in-app notification bell for replies, kudos, approvals, and other activity relevant to you.

There's deliberately no booking system, no commission, no pay-to-rank, and no paywall anywhere on the site. Success for this project is measured by how complete and accurate the information is, not by revenue.

## How trust works

A brand-new website with anonymous editors needs some way to keep information honest without a full-time staff of fact-checkers. The approach here is borrowed from how Wikipedia and OpenStreetMap have scaled for twenty years: **trust is earned through contribution, not granted by title.**

- Every meaningful edit to a page, trail, or map point is stored as its own revision — nothing is ever silently overwritten, and anything can be compared against an earlier version or reverted.
- New edits to existing content don't go live immediately. They sit as a proposed change until enough experienced community members (or a single moderator/admin) vote to approve or reject it. The current, live version of a page is always the last *approved* one — but a pending change is never hidden, it's shown with a clear "N unapproved changes" indicator so nobody thinks something's been suppressed.
- Trust to vote on other people's changes is earned by contributing successfully yourself. Every approved contribution earns points; enough points raises your level; a high enough level unlocks approval rights, and a still-higher level unlocks the ability to apply to become a community moderator.
- Anyone can flag content that looks wrong, fake, or inappropriate. If a flag is upheld by a reviewer, the content reverts to its last good version and the person responsible loses some points — a real, if modest, consequence for bad-faith edits.
- Trip reports (a personal account of "here's a trip I took") are treated differently — they're not a factual claim about a place the way an edit to a trail description is, so they're never gated behind approval. They go live immediately; kudos and comments are the community signal there instead.
- Guide verification is its own, separate thing entirely — it's not peer-voted at all, it's manually reviewed, because it's about verifying a real professional credential (and, for restricted regions, a real government license), not about editorial quality.

## What's built so far

The platform is functional today, not just a design document. It has three parts working together: a public-facing website anyone can browse and contribute to, an admin dashboard for moderators and site administrators, and the backend that powers both.

Live today: the full adventure-page/map/trip-report/guide-directory experience described above, trip-companion groups, persistent Clubs with discussion threads, the points-and-approval trust system, content flagging and moderation, full-text search, in-app notifications, GPS track import (GPX/KML/KMZ/GeoJSON) with elevation profiles, spatially-aware map tagging by district, and a real deployed production environment with automatic HTTPS.

This is an active, evolving project. Development is ongoing, and the roadmap is driven by what actually turns out to matter once real people are using the map and writing the pages — not a fixed feature list decided in advance.

## Get involved

This is a community project — the entire point is that it gets better the more people who explore, write, and correct pages. If you're interested in the technical side of how it's built, see the repository's `CLAUDE.md` for the full developer-facing architecture and design reference.
