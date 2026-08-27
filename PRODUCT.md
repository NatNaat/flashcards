# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The developer themselves, as a single personal user — not built for other people or a shared audience. No accounts, roles, or multi-user concerns.

## Product Purpose

A personal spaced-repetition flashcard app: create decks, add front/back cards, and review due cards on an FSRS-scheduled queue (Again/Hard/Good/Easy grading via `ts-fsrs`). Success is sustained daily review habit (streak) and cards moving through learning → review states without a growing backlog.

## Positioning

A minimal, personal alternative to tools like Anki — deliberately smaller in scope (no import/export, no card templates, no media, no sync yet), optimized for the one user's own workflow rather than general-purpose flexibility.

## Operating Context

- Installed as a PWA on mobile (manifest meta tags, `apple-mobile-web-app-capable`, viewport locked with `user-scalable=no`) — primary usage surface is a phone home-screen app, used in short daily review sessions.
- Bottom tab navigation (Decks, Stats) on list screens; deck detail and review are full-screen, nav-less flows.
- Core loop: open a deck → see due count → review queue (flip card, grade) → return to deck.
- Interface language is French (`lang="fr"`, all UI copy in French).

## Capabilities and Constraints

- Deck CRUD (create, delete with cascade to cards/logs) and card CRUD (add, delete) — no editing of existing card text yet.
- FSRS-based scheduling (`ts-fsrs`) drives due dates and review intervals; review grading writes to a `reviewLogs` table used for streak/stats.
- Stats screen: current streak, today's review count, total decks/cards/reviews, and a breakdown of cards by FSRS state (Nouvelles/Apprentissage/Révision/Réapprentissage).
- Storage is local-only via Dexie (IndexedDB), database name `flashcards-db`. **Open decision:** currently local-only; cross-device sync/account may be added later, so avoid hard-coding assumptions that preclude a future backend.
- No authentication, no backend, no network calls today.
- No media/image support on cards (text front/back only).

## Brand Commitments

None fixed. The name "Flashcards" and the current icon/theme-color are placeholders — open to change as part of design work.

## Evidence on Hand

No user content, testimonials, or brand assets beyond the placeholder app icon files (`icon-192.png`, `apple-touch-icon.png`) and a dark `theme-color` (`#0b0e14`). Nothing here should be treated as a fixed identity.

## Product Principles

- Keep the daily review loop fast and frictionless — it's a short, repeated personal ritual, not a destination app.
- Favor the single user's own workflow over generality; don't add multi-user or configuration complexity the product doesn't need.
- Local-first today, but don't design in a way that forecloses adding sync later.
- Mobile PWA is the primary surface; desktop is secondary.
