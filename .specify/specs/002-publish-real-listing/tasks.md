# Tasks: Real Selling and First Real Listing

**Input**: Design documents from `.specify/specs/002-publish-real-listing/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: The specification explicitly requires typecheck, lint, native/web photo runtime checks,
real Supabase persistence/visibility checks, deterministic failure runs, and evidence reporting.
This repository has no automated test runner, so the tasks below use the development-only fault
seam and the manual protocol in `quickstart.md`; static checks are never substituted for runtime
evidence.

**Organization**: Tasks are grouped by the four user stories in `spec.md`. Every server mutation
continues through the existing publishable-key Supabase client and existing policies. No task
modifies onboarding, Auth architecture, Supabase schema/migrations/RLS, Realtime, Stripe, checkout,
or payment architecture.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it changes a different file and has no dependency on an
  incomplete task in the same phase.
- **[Story]**: Maps the task to US1, US2, US3, or US4 from `spec.md`.
- Runtime tasks record PASS, FAIL, BLOCKED, or UNVERIFIED in
  `.specify/specs/002-publish-real-listing/validation-evidence.md`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the one SDK-matched dependency and establish truthful implementation evidence.

- [x] T001 Install Expo SDK 57-compatible `expo-image-manipulator` with `npx expo install expo-image-manipulator`, updating `package.json` and `package-lock.json`
- [x] T002 [P] Create the PASS/FAIL/BLOCKED/UNVERIFIED evidence log and redaction fields from `quickstart.md` in `.specify/specs/002-publish-real-listing/validation-evidence.md`
- [x] T003 Run `npx expo install --check` and the read-only live schema/bucket/profile/category preflight, recording exact parity or blockers without service-role use in `.specify/specs/002-publish-real-listing/validation-evidence.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish the NEW-only, authenticated, byte-truth, recovery, and Supabase primitives
used by every user story.

**CRITICAL**: No user story may be considered complete until this phase is complete.

- [x] T004 [P] Define `LocalListingPhoto`, `PreparedPhotoUpload`, preparation states/errors, JPEG MIME/extension constants, the 5,242,880-byte limit, and owned-object-URL disposal contracts in `src/lib/listing-photos.ts`
- [x] T005 [P] Implement the versioned, seller-scoped `PublicationRecoveryRecordV1` keying, parse/validation, load, save, and clear helpers without storing image bytes, form data, secrets, or full local device paths; exact relative Storage object paths remain required for safe cleanup in `src/lib/listing-recovery.ts`
- [x] T006 Remove caller-controlled seller/condition/status fields, hardcode `NEW_CONDITION`, derive the seller with `supabase.auth.getUser()`, enforce the real profile relationship, and normalize only schema-supported draft fields in `src/lib/mutations.ts`
- [x] T007 Replace the monolithic image/publish cleanup calls with narrow result-bearing primitives for exact-path upload, `listing_images` insertion with width/height/position, conditional draft activation with a returned row, exact Storage removal, and owner-draft deletion in `src/lib/mutations.ts`
- [x] T008 [P] Add a dedicated owner-visible publication-state query returning listing owner/status/condition/publication time and ordered image paths while leaving buyer reads separate in `src/lib/queries.ts`
- [x] T009 Define schema-faithful publish input/output types, exact EUR-to-cents parsing, full form/photo validation, progress phases, structured failure outcomes, cleanup outcomes, and injectable operation boundaries in `src/lib/listing-publication.ts`
- [x] T010 Run `npm run typecheck` and `npm run lint` after the foundation and record the executed outputs without claiming runtime coverage in `.specify/specs/002-publish-real-listing/validation-evidence.md`

**Checkpoint**: The application has safe typed primitives, but no publication is considered live
until the US1 coordinator confirms it.

---

## Phase 3: User Story 1 - Publish a real new-product listing (Priority: P1) - MVP

**Goal**: An authenticated seller completes the seven-step form, publishes one real NEW listing
with at least one real prepared image, and reaches a detail page reloaded by the confirmed UUID.

**Independent Test**: With one real seller/profile, one genuine NEW product, one real category, and
one real native photo, complete Sell and establish exactly one active NEW row, one matching Storage
object/image row, confirmed publication, and a fresh detail read using the same UUID.

### Runtime verification for User Story 1

- [ ] T011 [US1] Execute the one-photo authenticated happy path through draft, Storage, image row, activation, confirmation, and real UUID detail retrieval, recording redacted row/object evidence for VR-006–VR-009 in `.specify/specs/002-publish-real-listing/validation-evidence.md`

### Implementation for User Story 1

- [x] T012 [US1] Implement the publication coordinator sequence—final validation, fresh authentication/profile check, owner draft, pre-upload intended-path journal, sequential exact-path upload/image-row insert, conditional activation, authoritative confirmation, journal clear, and structured success—in `src/lib/listing-publication.ts`
- [x] T013 [US1] Add conclusive-failure compensation to the coordinator so every intended object is handled before owner-draft deletion and incomplete cleanup retains the non-active draft/journal in `src/lib/listing-publication.ts`
- [x] T014 [P] [US1] Build the searchable supported ISO alpha-2 country control using `listCountries`, `searchCountries`, uppercase platform names/codes, accessible selection state, and no onboarding changes in `src/components/sell-country-picker.tsx`
- [x] T015 [US1] Refactor the seven-step form state and field validation for title, real category, optional brand/description, exact positive EUR price, optional city, and selected country; normalize supported lowercase profile country values, clear unsupported stale profile values, require explicit valid selection, and remove the condition input, resale wording, and unsupported 97%/3% proceeds copy in `src/app/(app)/sell.tsx`
- [x] T016 [US1] Add category retry/empty/stale-selection states and country-keyed delivery loading/error/empty/specific-or-fallback information without a delivery selection or seeded subtitle in `src/app/(app)/sell.tsx`
- [x] T017 [US1] Build the final schema-faithful preview with real category label, New, exact formatted price, location/delivery information, photo review, and direct Edit actions that preserve the composer in `src/app/(app)/sell.tsx`
- [x] T018 [US1] Integrate the coordinator with a one-flight guard, honest preparing/uploading/activating/confirming phases, stage-specific errors, confirmed-success reset, and `router.replace` using only the returned real UUID in `src/app/(app)/sell.tsx`
- [x] T019 [US1] Preserve confirmed publication truth when the subsequent detail request fails by providing Retry/Open Home without exposing another Publish action in `src/app/(app)/listing/[id].tsx`

**Checkpoint**: US1 is a demonstrable happy-path MVP using real data. It is not a production-release
checkpoint until the forced failure and retained-recovery requirements in US3 pass.

---

## Phase 4: User Story 2 - Curate real listing photography (Priority: P1)

**Goal**: A seller selects, immediately previews, prepares, removes, reorders, and publishes 1-10
real photos with truthful native/web bytes and contiguous persisted positions.

**Independent Test**: Select multiple real photos, cancel once, remove/re-add/reorder them, observe
preparation/error states, and publish a legitimate listing whose public JPEG objects and
`listing_images.position` rows match the final order on native and supported web targets.

### Runtime verification for User Story 2

- [ ] T020 [US2] Run the real native library flow for multiple selection, cancellation, immediate preview, remove/reorder, `file://` byte read, Android pending-result recovery where applicable, and public-image decode; include a ten-photo sequential-preparation stress run with visible between-photo progress and no process termination/unresponsive composer, recording VR-003/VR-004 evidence in `.specify/specs/002-publish-real-listing/validation-evidence.md`
- [ ] T021 [US2] Run the supported web `blob:` flow plus missing-MIME/HEIC where available, oversize, unreadable, and GPS/EXIF fixtures; include a ten-photo sequential-preparation stress run with visible between-photo progress and no tab termination/unresponsive composer, and record URL disposal, verified JPEG bytes/size, metadata inspection, and VR-003/VR-005/VR-006 outcomes in `.specify/specs/002-publish-real-listing/validation-evidence.md`

### Implementation for User Story 2

- [x] T022 [US2] Implement images-only SDK 57 picker ingestion, stable deduplication, immediate source previews, Android `getPendingResultAsync()` restoration, remaining selection limit, ordered selection, compatible iOS representation, and cancel no-op handling in `src/lib/listing-photos.ts`
- [x] T023 [US2] Implement sequential photo preparation with a maximum concurrency of one using SDK 57 ImageManipulator re-rendering, progressive no-upscale JPEG compression/downscaling, native `File.bytes()`, web Blob reads, signature/non-empty/dimension/size validation, and specific corrective errors in `src/lib/listing-photos.ts`
- [x] T024 [US2] Implement app-owned web object URL creation/revocation on replace, remove, success, reset, and unmount without revoking unowned picker URLs in `src/lib/listing-photos.ts`
- [x] T025 [P] [US2] Build the all-photo grid with preparing/error states, order labels, Cover at index zero, 44x44 Remove/Move earlier/Move later controls, boundary disabled states, and accessible announcements in `src/components/sell-photo-grid.tsx`
- [x] T026 [US2] Integrate the picker/preparation lifecycle, retry/remove/reorder/add behavior, ready-photo progression guard, immutable final-order upload snapshot, and all-photo Preview order into `src/app/(app)/sell.tsx`

**Checkpoint**: US2 independently establishes the real photo contract. A source-code review alone
does not satisfy its native, web, or metadata runtime tasks.

---

## Phase 5: User Story 3 - Recover safely from publication failures (Priority: P1)

**Goal**: Every conclusive failure compensates safely, every ambiguous outcome reconciles before a
decision, and incomplete cleanup resumes for the same seller without exposing a partial active row.

**Independent Test**: Trigger every named fault boundary against real selected bytes and the real
project, inspect rows/objects after each run, and establish zero false success, no active partial
listing, policy-safe cleanup order, active-response-loss recovery, and same-owner retry isolation.

### Runtime verification for User Story 3

- [ ] T027 [US3] Execute the real-project fault matrix for local read, later upload, post-upload/pre-image-row, pre-activation, post-commit response loss, confirmation unavailability, and Storage removal failure, recording database/bucket outcomes for VR-011 in `.specify/specs/002-publish-real-listing/validation-evidence.md`
- [ ] T028 [US3] Execute session-expiry, same-seller return, different-seller isolation, cleanup retry, duplicate-publish, malformed JSON journal, unknown-version journal, missing-field/unsafe-path journal, and key-owner/payload-owner mismatch scenarios; confirm untrusted records remain locally preserved and cause no backend mutation, recording retained/cleared journal and visibility outcomes in `.specify/specs/002-publish-real-listing/validation-evidence.md`

### Implementation for User Story 3

- [x] T029 [US3] Add a dependency-injected, development/test-only fault controller for photo read, later upload, post-upload/pre-row, pre-activation, post-commit response loss, confirmation, and object removal boundaries with no production UI in `src/lib/listing-publication.ts`
- [x] T030 [US3] Implement authoritative reconciliation for confirmed active-complete, confirmed draft, absent-clean, unavailable/unauthorized, owner mismatch, and active-inconsistent outcomes without blind retry or active-row deletion in `src/lib/listing-publication.ts`
- [x] T031 [US3] Implement exact intended-path removal and authorized absence confirmation before draft deletion, including structured unknown/remaining-path results and retryable draft-deletion failure in `src/lib/listing-publication.ts`
- [x] T032 [P] [US3] Implement same-owner recovery entry orchestration that validates the journal owner/version, blocks a new draft, reconciles first, resumes compensation, and clears only confirmed terminal outcomes in `src/lib/listing-recovery.ts`
- [x] T033 [US3] Integrate session-expired, checking-previous-listing, finishing-cleanup, cleanup-incomplete, integrity-error, Retry, and duplicate-submission-disabled states while preserving legitimate form/photo state in `src/app/(app)/sell.tsx`
- [x] T047 [US3] Complete the normative untrusted-journal behavior in `src/lib/listing-recovery.ts` and `src/app/(app)/sell.tsx`: preserve malformed/unknown-version/missing-field/unsafe-path/owner-mismatched raw records, perform no backend mutation from them, block new draft creation, and provide integrity-specific safe retry/support guidance without a destructive local reset

**Checkpoint**: US1+US2+US3 form the minimum safe publishing journey. Client-only recovery after
app uninstall or a seller who never returns remains explicitly bounded, not falsely guaranteed.

---

## Phase 6: User Story 4 - Discover the first real listing on Home (Priority: P2)

**Goal**: A separate buyer session sees the confirmed listing through the real active+NEW Home
query and opens the same real UUID; drafts and failed attempts remain absent.

**Independent Test**: Pause one attempt as draft and establish absence from a second session, then
activate/confirm it, manually refresh Home, observe the same UUID within the success threshold, and
open matching real detail data.

### Runtime verification for User Story 4

- [ ] T034 [US4] Run the independent signed-in buyer draft-invisibility and active Home check with search/category filters cleared and page zero selected; on a connection with no transition/timeout/retry/Supabase error, time monotonically from manual-refresh fetch invocation until the matching UUID/title/price/cover card is visibly rendered, require <=5.0 seconds, then verify card/detail UUID match and no fabricated insertion for VR-008–VR-010 in `.specify/specs/002-publish-real-listing/validation-evidence.md`

### Implementation for User Story 4

- [x] T035 [US4] Tighten the buyer-facing `fetchListing` query to require `status=active` and `condition=NEW_CONDITION` while keeping the owner reconciliation query separate in `src/lib/queries.ts`
- [x] T036 [P] [US4] Preserve server-backed pagination/manual refresh, active+NEW filters, and honest loading/empty/error states with no local post-publish insertion in `src/hooks/use-listing-feed.ts` and `src/app/(app)/index.tsx`
- [x] T037 [US4] Ensure detail independently retrieves the real UUID, orders `listing_images` by persisted position, displays real seller/title/price/location/images, and offers honest retry/unavailable states in `src/app/(app)/listing/[id].tsx`

**Checkpoint**: The first real listing is discoverable by an independent account through existing
Home/detail architecture, not through seller-local state.

---

## Phase 7: Polish and Cross-Cutting Quality Gates

**Purpose**: Complete premium UX, audit constitutional boundaries, and produce truthful final
evidence. These tasks do not expand the feature into onboarding, payments, or backend redesign.

- [x] T038 Apply heading focus, progress semantics, live error/phase announcements, logical web keyboard order, reduced-motion behavior, 44x44 targets, and busy/selected/disabled states across `src/app/(app)/sell.tsx`, `src/components/sell-photo-grid.tsx`, and `src/components/sell-country-picker.tsx`
- [x] T039 Audit Sell/detail user-facing copy for resale terms, fake categories/images/data, unsourced fees/proceeds, hypothetical delivery subtitles, and false success language in `src/app/(app)/sell.tsx` and `src/app/(app)/listing/[id].tsx`
- [x] T048 Implement the specification's offline-state matrix across category, delivery, publication, detail, and Home in `src/app/(app)/sell.tsx`, `src/app/(app)/listing/[id].tsx`, `src/app/(app)/index.tsx`, `src/components/listing-feed-grid.tsx`, `src/hooks/use-async.ts`, `src/hooks/use-listing-feed.ts`, and `src/lib/errors.ts`: preserve legitimate local state, expose truthful retry/recovery actions, never fabricate fallback data, and never automatically duplicate publication after reconnect
- [x] T040 Run `npx expo export --platform web` as a build smoke check and label it non-runtime evidence in `.specify/specs/002-publish-real-listing/validation-evidence.md`
- [x] T041 Run `npm run typecheck` to zero errors and record the exact executed result in `.specify/specs/002-publish-real-listing/validation-evidence.md`
- [x] T042 Run `npm run lint` to zero errors and record the exact executed result in `.specify/specs/002-publish-real-listing/validation-evidence.md`
- [ ] T043 Run VoiceOver/TalkBack, web keyboard, reduced-motion, category/delivery state, publication-phase accessibility, and the category/delivery/publication/detail/Home offline-state matrix, recording executed and unavailable targets in `.specify/specs/002-publish-real-listing/validation-evidence.md`
- [x] T044 Conduct the moderated under-four-minute SC-001 study when participants/devices are available, or mark it UNVERIFIED with the precise blocker in `.specify/specs/002-publish-real-listing/validation-evidence.md`
- [x] T045 Audit the final diff for forbidden changes to onboarding, Auth, `supabase/migrations/`, RLS, Realtime, Stripe, checkout, payments, service-role usage, fake data, and unfiltered NEW reads, recording the reviewed scope in `.specify/specs/002-publish-real-listing/validation-evidence.md`
- [x] T046 Reconcile the final SC-001–SC-008 and VR-001–VR-012 evidence matrix after T011, T020–T021, T027–T028, T034, T043, and T047–T048, preserving PASS/FAIL/BLOCKED/UNVERIFIED, commit/platform/account redactions, exact listing UUIDs, and no static-as-runtime claims in `.specify/specs/002-publish-real-listing/validation-evidence.md`

---

## Dependencies and Execution Order

### Phase dependencies

```text
Phase 1 Setup
    -> Phase 2 Foundation
        -> US1 Publish happy path
            -> US3 Failure safety/recovery
            -> US4 end-to-end buyer runtime proof
        -> US2 Photo curation (helpers/UI can begin beside US1)

US1 + US2 + US3 + US4
    -> Phase 7 Polish and final evidence
```

- **Setup (Phase 1)**: Starts immediately. T003 depends on T001 and T002.
- **Foundation (Phase 2)**: Depends on Setup and blocks story completion. T004, T005, T006, and
  T008 can begin in parallel; T007 follows T006; T009 depends on T004–T008; T010 follows T009.
- **US1 (Phase 3)**: Depends on Foundation. T011 is performed after T012–T019 despite appearing in
  the verification subsection for traceability.
- **US2 (Phase 4)**: Depends on Foundation. T022–T025 may begin while US1 work proceeds, but T026
  integrates with the current `sell.tsx` and T020–T021 run after integration/publication is ready.
- **US3 (Phase 5)**: Depends on US1's coordinator and recovery journal; runtime T027–T028 follow
  T029–T033 and T047.
- **US4 (Phase 6)**: Query/UI work T035–T037 can begin after Foundation; runtime T034 requires a
  confirmed US1 listing and the pre-activation pause supplied by US3's fault seam.
- **Polish (Phase 7)**: Depends on all desired stories. T041 and T042 may run together after code is
  stable; T043 follows T048 for offline-state verification, and T046 is rerun last.

### User story dependencies

- **US1 (P1)**: First real publication increment after Foundation; no other story is required for
  its one-photo happy-path test.
- **US2 (P1)**: Photo helpers and grid are independently developable after Foundation; final Sell
  integration shares `sell.tsx` with US1.
- **US3 (P1)**: Requires the US1 coordinator because it exercises its state-changing boundaries.
- **US4 (P2)**: Read hardening is independently developable, but its discovery runtime test requires
  a real listing from US1 and safe pause/reconciliation support from US3.

### Safe release boundary

US1 is the suggested MVP demonstration. It is **not** the minimum production release by itself.
Because publication spans local files, Storage, and Postgres without a server transaction, a safe
release requires US1 + US3 and all applicable Foundation/final gates. US2 is required for the full
1–10-photo product requirement; US4 is required before the requested feature is complete.

---

## Parallel Opportunities

### Setup and Foundation

```text
Task T002: Create validation-evidence.md
Task T001: Install expo-image-manipulator

After Setup:
Task T004: Define photo contracts in listing-photos.ts
Task T005: Define recovery persistence in listing-recovery.ts
Task T006: Refactor listing draft inputs in mutations.ts
Task T008: Add owner publication-state read in queries.ts
```

### User Story 1

```text
Task T014: Build sell-country-picker.tsx
Task T012: Build the publication coordinator in listing-publication.ts
```

T015–T018 then integrate those independent files in `sell.tsx`.

### User Story 2

```text
Task T025: Build sell-photo-grid.tsx
Task T022: Build picker ingestion in listing-photos.ts
```

T023–T024 continue the same photo module sequentially; T026 integrates it into Sell.

### User Story 3

```text
Task T029: Add fault boundaries in listing-publication.ts
Task T032: Add recovery-entry orchestration in listing-recovery.ts
```

T030–T031 continue the coordinator sequentially; T033 integrates recovery state into Sell.

### User Story 4

```text
Task T035: Tighten detail queries in queries.ts
Task T036: Audit server-backed Home refresh in use-listing-feed.ts and index.tsx
```

T037 follows T035; T034 runs after the story integration is available.

---

## Implementation Strategy

### MVP first

1. Complete Setup and Foundation.
2. Complete US1 with one genuine product and one real native photo.
3. Stop and execute T011; report missing native prerequisites honestly.
4. Treat this as a demonstrable MVP only, not a safe feature release.

### Safe incremental delivery

1. **Foundation + US1**: one confirmed real listing and UUID detail handoff.
2. **US2**: complete 1–10-photo curation, native/web byte truth, and privacy gate.
3. **US3**: deterministic compensation/reconciliation/recovery; reaches safe publication boundary.
4. **US4**: independent buyer discovery through real Home/detail reads.
5. **Polish**: accessibility, build/static gates, frozen-boundary audit, and complete evidence matrix.

### Parallel team strategy

After Foundation, one contributor can build photo helpers/grid (US2) while another builds the US1
publication coordinator/country control. A third can harden US4 queries/Home reads. Coordinate before
editing `sell.tsx`; US3 begins once the coordinator contract is stable. Runtime evidence remains
serial where it operates on one real listing or one retained recovery record.

---

## Notes

- Every task preserves NEW-only reads/writes and real-data provenance.
- `[P]` means different files or truly independent work, not merely desirable concurrency.
- Runtime tasks require real inputs/accounts/project state and must record blockers rather than use
  fake rows or mock screenshots.
- Object removal precedes owner-draft deletion on every compensation path.
- The listing UUID is the first Storage path segment and the only post-success route identifier.
- No task changes onboarding, schema/migrations/RLS, Realtime, Auth architecture, Stripe, checkout,
  payments, or service-role usage.

---

## Phase 8: Convergence

- [x] T049 **CRITICAL** Keep a draft whose first recovery-journal write fails fail-closed in `src/lib/listing-publication.ts` and `src/app/(app)/sell.tsx`: retain the exact in-memory attempt, retry durable journaling or conclusively delete and confirm the object-free draft, and never let a “no journal” reload silently re-enable publication for that unresolved attempt per FR-038, US3/AC6, and Constitution V (partial)
- [x] T050 Reset or withhold keyed async data while a new key is loading in `src/hooks/use-async.ts`, then verify `DeliveryPreview` in `src/app/(app)/sell.tsx` never renders the previous country's rows after a country change and preserves explicit loading/error/Retry behavior per FR-017, FR-034, and the delivery country-change edge case (partial)
- [x] T051 Serialize every photo-preparation entry point in `src/app/(app)/sell.tsx` and `src/lib/listing-photos.ts` through one shared queue or one-flight coordinator so picker additions, Android-restored results, and preparation retries cannot decode/re-render concurrently, while immediate previews and per-photo progress remain intact per FR-005 and the plan's preparation-concurrency decision (partial)
- [x] T052 Replace the preview's grouped/misdirected Edit controls in `src/app/(app)/sell.tsx` with accurate direct actions for photos, title, category, optional details, price, and location, preserving all composer state and returning to the correct step per FR-018 and US1/AC2 (partial)
- [x] T053 Preserve `ListingError` stage codes and photo positions through `src/lib/mutations.ts`, `src/lib/listing-publication.ts`, and `src/app/(app)/sell.tsx`; sanitize raw Supabase details and map session, profile, draft, photo-read/preflight, upload, image-row, activation, confirmation, and cleanup failures to specific corrective, retry, authentication, or recovery actions per FR-037 and US3/AC1 (partial)
- [x] T054 Tighten `PublicationRecoveryRecordV1` path validation in `src/lib/listing-recovery.ts` to the exact safe relative `<listing UUID>/<generated filename>.jpg` grammar used by publication, rejecting empty, control-character, backslash, nested, traversal-like, non-JPEG, or otherwise non-generated names as untrusted while preserving the raw record and performing no backend mutation per FR-038 and the unsafe-journal edge case (partial)
- [x] T055 Track each ImageManipulator-produced web blob URL in `src/lib/listing-photos.ts` across read, signature validation, size retry, success, and exception paths, revoking every app-owned URL exactly once without revoking picker-owned/unowned URLs per US2/AC7 and the plan's web object-URL ownership decision (partial)
- [x] T056 Complete Sell accessibility implementation in `src/app/(app)/sell.tsx` and `src/components/sell-photo-grid.tsx`: give the title field a stable accessible label, move focus to each new step heading on web as well as native, and expose preview photo position/count/Cover semantics in logical keyboard and screen-reader order per FR-035 and the plan's accessibility decision (partial)
