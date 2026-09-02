# Implementation Plan: Onboarding Journey

**Branch**: `001-onboarding-journey` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `.specify/specs/001-onboarding-journey/spec.md`

## Summary

A first-run journey that introduces SAWA, records the reader's language and country, creates a real
Supabase account, and writes a real marketplace profile — then hands control to the actual
marketplace. Seven steps, not the eight requested: the personalization step is **removed**, because
no member↔category relation exists and Constitution Principle III forbids standing a local store in
for a missing one. See [research.md](./research.md) D1.

Technically this is one route group (`src/app/onboarding/`) holding a step machine, a device-state
provider, and a small presentational kit. It writes to exactly six `profiles` columns — the six the
`authenticated` role is granted `UPDATE` on — and reads `categories` and `delivery_options` live. It
touches no other part of the app beyond one navigator guard in the root layout.

## Technical Context

**Language/Version**: TypeScript 6.0.3, React 19.2.3 (React Compiler enabled)

**Primary Dependencies**: Expo SDK 57.0.13, React Native 0.86.2, expo-router 57.0.13,
`@supabase/supabase-js` 2.112.3, `@react-native-async-storage/async-storage` 2.2.0,
expo-image-picker 57.0.10, `@expo-google-fonts/manrope` 0.4.2. **No new dependencies.**

**Storage**: Supabase Postgres 17.6 (project `tggnhpvrvnmrvmsdyxyu`) for account data;
AsyncStorage under key `sawa.onboarding.v1` for device first-run state; Supabase Storage bucket
`avatars` for profile photos.

**Testing**: No test framework is installed — `package.json` has no jest, no testing-library. Per
Constitution VII the gates are `npm run typecheck`, `npm run lint`, and named runtime verification.
[quickstart.md](./quickstart.md) is the runtime script; it is a manual protocol, not an automated
suite, and must be reported as such.

**Target Platform**: iOS primary (safe-area and keyboard behaviour specified against it), Android
secondary, React Native Web for development only. Requires Node ≥ 22.13.

**Project Type**: Mobile application, Expo Router file-based routing.

**Performance Goals**: Step transitions hold 60fps. No frame of the wrong route between splash
dismissal and first paint — the navigator must not mount until both session and first-run flag have
resolved.

**Constraints**: No schema change, no RLS change, no auth-configuration change, no new dependency.
Email confirmation is on, so account creation returns no session and the journey has a hard seam at
that point. Profile writes are limited to six granted columns.

**Scale/Scope**: 7 steps in one route group. ~4 files touched, 1 file deleted. No change to the
marketplace, chat, checkout, or payment code.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gates derived from `.specify/memory/constitution.md` v1.0.0.

### Initial evaluation (pre-research)

| # | Gate | Status |
|---|------|--------|
| I (NON-NEGOTIABLE) | Listing condition — feature writes and reads no listings | ✅ N/A |
| II (NON-NEGOTIABLE) | No invented data; real UUIDs; empty states designed | ⚠️ At risk — imagery and country data unresolved |
| III | Schema verified; limitations reported not worked around | ⚠️ At risk — interests have no home |
| IV | No change to schema/RLS/Realtime/Stripe | ✅ Pass |
| V | No dead controls; persists what it claims; second account | ⚠️ At risk — OAuth buttons in the design |
| VI | Black/white/neutral; all states; accessibility | ⚠️ At risk — imagery unresolved |
| VII (NON-NEGOTIABLE) | Verification plan named; unverifiable named | ⚠️ At risk — no plan yet |
| Platform | SDK 57 docs; no secrets in bundle; payments sequenced | ✅ Pass |

Three ⚠️ items map exactly to the spec's open clarifications. Phase 0 resolves them.

### Post-design re-evaluation

| # | Gate | Status | Resolution |
|---|------|--------|-----------|
| I | Listing condition | ✅ Pass | Feature never touches `listings`. |
| II | No invented data | ✅ Pass | Country names come from platform ICU, codes from ISO 3166-1 (a published standard, not authored data). No photography is invented — slots render an ink treatment. Zero products/sellers/stats shown. Arrival empty state designed for the 1-listing reality. |
| III | Schema authority | ✅ Pass | Personalization **removed** rather than faked (D1). Language and completion remain device-local as genuine device state, documented in code. Every written column verified against `information_schema.column_privileges`. |
| IV | Frozen architecture | ✅ Pass | No migration, no policy change, no auth-config change. `updateProfile` gains `avatarColor` — an additive change to an existing app-layer function, not to the database. |
| V | Real journeys | ✅ Pass | No OAuth buttons (none configured). Password field present so signup can complete. Every step persists to a named owner. Second-account verification is step 8 of quickstart. |
| VI | Premium by default | ✅ Pass | Existing tokens extended, not replaced. Loading/empty/error/offline specified per step. Roles, labels and `aria-checked` mandated. |
| VII | Evidence before claims | ✅ Pass | quickstart.md names each runtime check; plan states up front that no automated suite exists. |
| Platform | Constraints | ✅ Pass | SDK 57 versioned docs cited for picker and router behaviour; no env var beyond the two public ones; feature is pre-payment. |

**Result: no violations. Complexity Tracking is empty.**

## Project Structure

### Documentation (this feature)

```text
.specify/specs/001-onboarding-journey/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output — resolves Q1/Q2/Q3 and technical unknowns
├── data-model.md        # Phase 1 output — entities and their state owners
├── quickstart.md        # Phase 1 output — runtime validation protocol
├── contracts/
│   ├── onboarding-state.md   # Step machine + state ownership contract
│   └── profile-write.md      # The exact permitted write surface
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
src/
├── app/
│   ├── _layout.tsx                 # MODIFIED — navigator guard + Manrope
│   └── onboarding/
│       ├── _layout.tsx             # Onboarding stack
│       └── index.tsx               # MODIFIED — step machine, 7 steps
├── components/
│   └── onboarding-parts.tsx        # Presentational kit (OBText, Rise, Segments…)
├── store/
│   └── onboarding-store.tsx        # MODIFIED — device first-run provider
├── lib/
│   ├── onboarding.ts               # MODIFIED — drop `categories` from state
│   ├── countries.ts                # NEW — ISO 3166-1 codes + ICU name resolution
│   ├── mutations.ts                # MODIFIED — updateProfile gains avatarColor
│   └── queries.ts                  # unchanged
└── theme/tokens.ts                 # unchanged
```

**Structure Decision**: The flow stays a single route (`onboarding/index.tsx`) driving a step
machine rather than one route per step. Steps share a continuous progress bar and header that must
animate *across* transitions; separate routes would make each transition a navigation and break that
continuity. It also keeps the auth seam — where the flow pauses for email confirmation — a state
change rather than a route the user could deep-link into without a session.

`src/lib/countries.ts` is new and is the only new module. It holds ISO 3166-1 alpha-2 codes and
resolves display names through the platform, so no country *names* are authored in this repository.

## Complexity Tracking

> No Constitution Check violations. Nothing to justify.
