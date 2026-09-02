# Implementation Plan: Real Selling and First Real Listing

**Branch**: `002-publish-real-listing` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `.specify/specs/002-publish-real-listing/spec.md`

## Summary

Complete the existing authenticated seven-step Sell composer so a seller can select and curate
real product photos, enter only values represented by the existing `listings` schema, preview the
result, and publish one real NEW-product listing. Publication is a client-side state machine using
the existing publishable-key Supabase client: prepare every photo, create an owner-only draft,
upload each object beneath `<listing UUID>/`, insert its ordered `listing_images` row, conditionally
activate the listing, then confirm the persisted result before reporting success. Home and detail
continue to load from Supabase; neither receives an optimistic or fabricated listing.

Phase 0 resolves the unanswered clarification about photo normalization as an explicit planning
assumption, not a user-confirmed answer: every retained photo is decoded and re-rendered to a
verified JPEG with Expo SDK 57 `expo-image-manipulator`, then checked against the real 5 MiB bucket
limit before a draft exists. This gives HEIC and other decodable inputs one supported upload format
and avoids forwarding source metadata. Because Expo's public API does not promise metadata removal,
a GPS/EXIF runtime fixture remains a release gate. See [research.md](./research.md), D1.

## Technical Context

**Language/Version**: TypeScript 6.0.3, React 19.2.3 (React Compiler enabled)

**Primary Dependencies**: Expo SDK 57.0.13, React Native 0.86.2, expo-router 57.0.13,
`@supabase/supabase-js` 2.112.3, `@react-native-async-storage/async-storage` 2.2.0,
expo-image-picker 57.0.10, expo-file-system 57.0.4, and one planned SDK-compatible addition:
expo-image-manipulator 57.0.10 installed with `npx expo install expo-image-manipulator`.

**Storage**: Existing Supabase Postgres tables `listings`, `listing_images`, `categories`,
`delivery_options`, and `profiles`; existing public Supabase Storage bucket `listing-images`;
AsyncStorage for an owner-scoped, non-marketplace publication recovery journal only.

**Testing**: No automated test runner is installed. Required static gates are
`npm run typecheck` and `npm run lint`. Runtime evidence uses real authenticated accounts, real
photos, a native SDK 57 target, the supported web target, the real Supabase project, and an
independent buyer session. A dependency-injected development/test-only fault seam makes rollback
states deterministic; mocked coordinator checks do not replace real Storage/database runs.

**Target Platform**: iOS and Android mobile applications; React Native Web remains supported for
the Sell journey's required `blob:` path. Local planning host is Node 22.23.2 on Windows.

**Project Type**: Existing Expo Router mobile application with a universal web build.

**Performance Goals**: Selected photos appear immediately. Preparation concurrency is exactly one:
only one source may be decoded/re-rendered at a time, each retained prepared upload payload is capped
at 5,242,880 bytes, and ten retained payloads therefore have a 52,428,800-byte byte-payload ceiling
excluding platform view/cache overhead. A ten-photo native and web stress run must complete without
process/tab termination or an unresponsive composer, with progress visibly advancing between photos.
Step transitions stay responsive; upload progress advances per completed photo. SC-004 uses the
specification's exact page-zero fetch-to-render timing protocol rather than an informal observation.

**Constraints**: NEW products only. No fake rows or fallback imagery. No onboarding, Auth,
Supabase schema/migration/RLS, Realtime, Stripe, checkout, or payment architecture changes. Storage
objects must be <= 5,242,880 bytes with the listing UUID as the first path segment. Standard
Supabase upload exposes no byte progress, so progress is truthful phase/file progress. Object
cleanup must precede draft deletion. Eventual client cleanup cannot be guaranteed after app
uninstall; recovery is bounded to the next session for the same authenticated seller.

**Scale/Scope**: One seven-step Sell route, 1-10 photos, one listing per publish attempt, one
ordered image row per photo. The implementation is expected to modify the Sell UI and existing
listing reads/mutations, add focused photo/publication/recovery helpers and small Sell components,
and leave backend artifacts untouched.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Gates derive from `.specify/memory/constitution.md` v1.0.0.

### Initial evaluation (pre-research)

| # | Gate | Status |
|---|------|--------|
| I (NON-NEGOTIABLE) | Every listing write is NEW; every listing read filters NEW; no resale language | Warning - existing draft input accepts caller condition and detail lacks a NEW filter |
| II (NON-NEGOTIABLE) | No invented marketplace data; empty states; real UUID routes | Pass - the specification forbids fallback data and optimistic feed insertion |
| III | Schema is authoritative; limitations are reported | Warning - delivery persistence and exact photo columns required inspection |
| IV | Frozen schema/RLS/Realtime/Stripe/Auth/checkout architecture | Pass - feature is constrained to the existing client and policies |
| V | Interactive controls work and persistence is checked independently | Warning - reorder, retries, and cross-account evidence were not yet designed |
| VI | Neutral visual system; complete states and accessibility | Warning - per-step state and control semantics required design |
| VII (NON-NEGOTIABLE) | Runtime verification is explicit and limitations are honest | Warning - no installed harness or native target was established yet |
| Platform | Exact SDK 57 docs; no secrets; payment untouched | Pass - versioned documentation is mandatory and payment is out of scope |

Phase 0 resolves every warning without weakening a non-negotiable principle.

### Post-design re-evaluation

| # | Gate | Status | Resolution |
|---|------|--------|------------|
| I | NEW-only writes and reads | Pass | Draft creation hardcodes `condition = new` inside the mutation and removes condition from public input. Feed already filters active+new; buyer detail will also require active+new. All wear/resale language is removed. |
| II | No invented data | Pass | Seller comes from `auth.getUser()`, categories/delivery/profile/listing data come from Supabase, country names come from platform `Intl.DisplayNames`, photos come from the system picker, and every route uses the confirmed row UUID. Empty/error states replace fallbacks. |
| III | Schema authority | Pass | Checked-in migrations and read-only live selects confirm every field. Delivery remains informational because no listing-delivery relation exists. Recovery state is transient local coordination, never marketplace metadata. |
| IV | Frozen architecture | Pass | No migration, policy, publication, channel, auth, Stripe, checkout, or payment change appears in the source plan. The existing publishable client remains the only backend client. |
| V | Real journeys | Pass | Every photo/order/edit/retry/publish control has a state transition. [quickstart.md](./quickstart.md) defines how to verify draft invisibility and the active listing from an independent signed-in buyer session; only executed results in `validation-evidence.md` count as verification. |
| VI | Premium by default | Pass | [contracts/sell-flow.md](./contracts/sell-flow.md) defines the seven-step neutral UI, accessible 44x44 controls, reduced motion, focus, loading, empty, offline, error, busy, and recovery states. |
| VII | Evidence before claims | Pass | [quickstart.md](./quickstart.md) separates type/lint, native, web, Supabase, failure, accessibility, and usability evidence and explicitly marks unavailable native tooling and the multi-participant SC-001 study unverified until run. |
| Platform | SDK and secret boundaries | Pass | Exact SDK 57 ImagePicker, FileSystem, and ImageManipulator docs informed D1-D3. Only public Supabase environment values remain in the bundle. Payments remain untouched. |

**Result: no Constitution violations. Complexity Tracking is empty.**

## Project Structure

### Documentation (this feature)

```text
.specify/specs/002-publish-real-listing/
|-- plan.md
|-- spec.md
|-- tasks.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- validation-evidence.md
|-- contracts/
|   |-- photo-pipeline.md
|   |-- publication-lifecycle.md
|   `-- sell-flow.md
`-- checklists/
    |-- requirements.md
    `-- publication.md
```

### Source Code (repository root)

```text
src/
|-- app/(app)/
|   |-- sell.tsx                    # MODIFIED - seven-step coordinator and publish UX
|   |-- listing/[id].tsx            # existing real detail route; presentation reused
|   `-- index.tsx                   # existing real Home surface; no optimistic insertion
|-- components/
|   |-- sell-photo-grid.tsx         # NEW - preview, cover, remove and move controls
|   `-- sell-country-picker.tsx     # NEW - searchable ISO country selection
|-- hooks/
|   `-- use-listing-feed.ts         # existing real refresh integration
|-- lib/
|   |-- listing-photos.ts           # NEW - picker asset preparation and URI ownership
|   |-- listing-publication.ts      # NEW - state machine, confirmation and compensation
|   |-- listing-recovery.ts         # NEW - owner-scoped durable recovery journal
|   |-- mutations.ts                # MODIFIED - narrow draft/image/activation primitives
|   |-- queries.ts                  # MODIFIED - strict detail and recovery reads
|   |-- countries.ts                # existing ISO codes/platform display names, reused
|   |-- database.types.ts           # existing schema contract, unchanged
|   `-- supabase.ts                 # existing publishable client, unchanged
`-- store/
    `-- auth-store.tsx              # existing authentication architecture, unchanged

supabase/migrations/                # inspected only; NO CHANGES
```

**Structure Decision**: Keep navigation and form state in the existing `sell.tsx` step machine so
Back/Next/Edit preserve a continuous composer. Extract only responsibilities with independent
lifecycle rules: prepared photo resources, publication/rollback orchestration, recovery journaling,
and two substantial accessible controls. Existing mutation functions become narrow Supabase
primitives; the publication coordinator owns ordering and compensation. Existing Home and detail
screens are not rebuilt: the detail query is tightened, while both routes continue their own real
Supabase reads.

## Implementation Phases

1. **Photo preparation foundation**: add the SDK-matched manipulator, define resource ownership,
   verify JPEG bytes/size/dimensions, restore Android pending results, and build immediate curated
   previews with deterministic accessible ordering.
2. **Schema-faithful composer**: enforce exact title/description/price/country constraints, real
   categories and delivery states, remove unsourced fee/resale copy, and complete the all-photo
   preview with edit shortcuts.
3. **Publication coordinator**: derive the seller immediately before the write, preflight all
   photos, journal intended paths, create the draft, upload/insert sequentially, activate with a
   conditional returning update, then confirm by UUID.
4. **Compensation and recovery**: reconcile ambiguous activation, delete exact objects before the
   owner draft, preserve incomplete cleanup, and resume only for the same seller before another
   draft can be created.
5. **Real read integration**: require active+new detail rows, route with the confirmed UUID, keep
   Home server-driven, and verify draft invisibility/active visibility from a second session.
6. **Verification and evidence**: run static gates, real native/web flows, deterministic failures,
   Storage/database inspection, accessibility checks, and record every unexecuted item honestly.

Two artifact-review follow-ups remain explicit implementation work rather than documentation-only
closure: untrusted recovery journals must produce a non-destructive, seller-actionable integrity
state, and the specification's category/delivery/publication/detail/Home offline matrix must be
implemented and runtime-checked. Tasks T047 and T048 own those changes; existing frozen architecture
and backend policies remain unchanged.

## Complexity Tracking

> No Constitution Check violations. Nothing to justify.
