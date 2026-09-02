# Tasks: Global Design System and Motion Foundation

**Input**: Design documents from `.specify/specs/003-global-design-motion/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: The specification explicitly requires static audits, typecheck, lint, runtime visual and motion checks, accessibility and responsive checks, real-journey regression, performance observations, and a moderated consistency study. The repository has no automated test runner, so the tasks below create auditable manual evidence and never substitute source inspection or a web bundle export for runtime verification.

**Organization**: Tasks are grouped by the five P1 user stories in `spec.md`. The migration is presentation-only: no task may change Supabase schema/migrations/RLS, Auth architecture, Realtime architecture, Stripe, checkout/order behavior, Edge Functions, payment architecture, marketplace data provenance, or NEW-only rules.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can proceed in parallel after its stated prerequisites because it changes different files and does not depend on another incomplete task in the same phase.
- **[Story]**: Maps to US1, US2, US3, US4, or US5 from `spec.md`; setup, foundation, and final-gate tasks have no story label.
- Every evidence task writes PASS, FAIL, BLOCKED, or UNVERIFIED to `.specify/specs/003-global-design-motion/validation-evidence.md`.

---

## Phase 1: Setup and Requirements Closure

**Purpose**: Close requirement-writing gaps, freeze the real route/surface baseline, and establish truthful evidence before application edits.

- [x] T001 Review every unchecked item in `.specify/specs/003-global-design-motion/checklists/design-quality.md`, resolve genuine requirement gaps in `.specify/specs/003-global-design-motion/spec.md`, `.specify/specs/003-global-design-motion/plan.md`, and `.specify/specs/003-global-design-motion/contracts/`, and leave unresolved owner decisions explicitly marked without weakening the Constitution
- [x] T002 [P] Create the route/shared-surface inventory, a predeclared deterministic interactive-control inventory covering every shared variant/state in every family plus the first screen-private control type, the raw-value candidate table, classification fields, and DesignException register defined by the migration contract in `.specify/specs/003-global-design-motion/migration-inventory.md`
- [x] T003 [P] Create the PASS/FAIL/BLOCKED/UNVERIFIED evidence ledger, environment/redaction fields, VR/SC matrix, and evidence-class boundaries from `quickstart.md` in `.specify/specs/003-global-design-motion/validation-evidence.md`
- [x] T004 Run the baseline route and raw/derived/semantic color, typography, spacing/gutter, radius, shadow/elevation, opacity/layer/z-index, touch/button-height, icon size/stroke, image-constant, duration/easing/spring, duplicate-design-constant, component/button/input/card, sheet, and navigation variant searches from `.specify/specs/003-global-design-motion/quickstart.md`, manually classify candidate scope without calling it runtime proof, and record commands/counts/commit in `.specify/specs/003-global-design-motion/migration-inventory.md`
- [x] T005 After T002 and T003, capture the pre-migration route destination, real data source, real action, authoritative outcome, NEW-only behavior where applicable, and reachable real/empty/error states for every route/surface in the declared inventory in `.specify/specs/003-global-design-motion/validation-evidence.md`
- [x] T006 Record the installed Expo/React Native/Reanimated/Image/Haptics/Router versions, the exact SDK 57 primary documentation consulted, the absence of a test runner, and any unavailable device/account/study prerequisites in `.specify/specs/003-global-design-motion/validation-evidence.md`

**Checkpoint**: Requirements decisions and the complete pre-change baseline are traceable. No application implementation starts while T001 has an unresolved blocking decision.

---

## Phase 2: Foundational Design and Interaction Infrastructure

**Purpose**: Establish the one canonical token source and shared primitive contracts that block every user-story migration.

**CRITICAL**: No user-story phase may be considered implemented until this phase passes its static gates.

- [x] T007 Replace the incomplete palette/type/space/radius/shadow/motion definitions with the exact semantic color roles, 4–48 spacing rhythm, 20–24 gutter roles, complete type/icon/touch/elevation/layer/opacity roles, duration bands, easings, and named springs—resolving primary versus inverse text atomically and removing decorative accent semantics—in `src/theme/tokens.ts`
- [x] T008 Enforce the fixed light presentation and canonical neutral launch/system surfaces without inventing marketplace imagery, auditing and updating `app.json`, `src/app/_layout.tsx`, `assets/images/icon.png`, `assets/images/splash-icon.png`, `assets/images/favicon.png`, `assets/images/android-icon-background.png`, `assets/images/android-icon-foreground.png`, and `assets/images/android-icon-monochrome.png` only where the existing assets conflict with the approved palette
- [x] T009 Implement a shared system-aware reduced-motion policy that handles the setting at launch and changes while the app is active, exposing non-spatial equivalents for shared components in `src/hooks/use-reduced-motion.ts`
- [x] T010 Implement a best-effort semantic haptic helper limited to the allowed real events, with no ordinary-tap feedback and no effect on action success/failure, in `src/lib/haptics.ts`
- [x] T011 Evolve the existing text, Button, IconButton, pressable, card, selection, empty-state, and spinner primitives to consume semantic roles, enforce 44x44 targets, expose disabled/busy/selected state, prevent duplicate busy activation, and preserve caller behavior in `src/components/ui.tsx`
- [x] T012 [P] Consolidate default/focused/filled/error/disabled field presentation, label/error association, larger-text layout, and keyboard-safe semantics without changing validation behavior in `src/components/field.tsx`
- [x] T013 [P] Define canonical glyph sizes/strokes, decorative-versus-interactive semantics, and effective target separation while preserving the existing symbol set in `src/components/icon.tsx`
- [x] T014 [P] Consolidate real-image loading/failure contracts and destination-shaped reduced-motion-aware skeleton primitives with no fake product fallback in `src/components/image-slot.tsx` and `src/components/skeleton.tsx`
- [x] T015 [P] Consolidate canonical sheet, overlay, toast, focus-transfer/restoration, keyboard/safe-area, authoritative-success, and reduced-motion contracts without changing dismissal safety in `src/components/sheet.tsx` and `src/components/overlays.tsx`
- [x] T016 Run `npm run typecheck` and `npm run lint` after the foundation, recording exact outputs as static evidence only in `.specify/specs/003-global-design-motion/validation-evidence.md`

**Checkpoint**: One canonical foundation and reusable component contract exist; no screen family is yet claimed migrated.

---

## Phase 3: User Story 1 — Experience One Coherent SAWA Product (Priority: P1) — MVP

**Goal**: Every current screen family and global surface uses the same canonical palette, hierarchy, spacing, radii, typography, icons, controls, and neutral marketplace identity while retaining its real purpose.

**Independent Test**: Traverse every current route family using real reachable data or truthful empty states and compare its token/component mapping with the canonical roles and pre-migration behavior record; no separate onboarding/auth palette or component family remains.

**Sequential family-closure rule**: T017–T026 execute in the displayed dependency order. Each task updates and closes that family's source-file mapping, applicable static checks, behavior comparison, and available visual evidence in the migration/evidence ledgers before the next displayed task begins. A blocked family blocks the next family; no story-family task carries `[P]`.

### Implementation for User Story 1

- [x] T017 [US1] Apply canonical white/neutral chrome, safe-area spacing, icon roles, selected-state structure, and visible Home/Browse/Sell/Inbox/Profile labels while keeping Browse on `/explore` in `src/components/bottom-nav.tsx`, `src/components/screen-header.tsx`, and `src/components/frosted-bar.tsx`
- [x] T018 [US1] After T017, standardize root, protected, auth, and onboarding stack presentation around the fixed light foundation without changing route groups, guards, destinations, or presentation semantics in `src/app/_layout.tsx`, `src/app/(app)/_layout.tsx`, `src/app/(auth)/_layout.tsx`, and `src/app/onboarding/_layout.tsx`
- [x] T019 [US1] After T018, remove the separate onboarding palette, type ramp, spacing ladder, component variants, and decorative accent while preserving the completed onboarding journey in `src/components/onboarding-parts.tsx` and `src/app/onboarding/index.tsx`
- [x] T020 [US1] After T019, migrate authentication and recovery typography, fields, buttons, spacing, hierarchy, and truthful states to the canonical components without altering Auth behavior in `src/app/(auth)/sign-in.tsx`, `src/app/(auth)/sign-up.tsx`, `src/app/(auth)/forgot-password.tsx`, `src/app/(auth)/reset-password.tsx`, and `src/app/(auth)/check-email.tsx`
- [x] T026 [US1] After T020 and before T021, consolidate listing/product/rail/feed/profile/order/offer/slider presentation into canonical card and type roles without changing queries, identifiers, or actions in `src/components/listing-card.tsx`, `src/components/product-card.tsx`, `src/components/listing-rail.tsx`, `src/components/listing-feed-grid.tsx`, `src/components/profile-identity.tsx`, `src/components/order-status.tsx`, `src/components/offer-card.tsx`, and `src/components/slider.tsx`
- [x] T021 [US1] After T020 and the shared marketplace-component migration T026, migrate Home, Browse, Search, and Favorites layouts to canonical gutters, type roles, controls, and image-first hierarchy while preserving real queries, filters, refresh, and route UUIDs in `src/app/(app)/index.tsx`, `src/app/(app)/explore.tsx`, `src/app/(app)/search.tsx`, and `src/app/(app)/favorites.tsx`
- [x] T022 [US1] After T021, migrate listing and seller details to canonical photography, price, metadata, action, sheet, and navigation hierarchy while preserving real UUID retrieval and seller data in `src/app/(app)/listing/[id].tsx` and `src/app/(app)/seller/[id].tsx`
- [x] T023 [US1] After T022, migrate Sell, Profile, Edit Profile, and Verify to the shared type, field, button, selection, spacing, and step/surface language without rebuilding onboarding or changing listing/profile persistence in `src/app/(app)/sell.tsx`, `src/app/(app)/profile.tsx`, `src/app/(app)/edit-profile.tsx`, and `src/app/(app)/verify.tsx`
- [x] T024 [US1] After T023, migrate Inbox, Chat, and Notifications to canonical conversation/metadata/action hierarchy while preserving real participants, messages, subscriptions, sends, and destinations in `src/app/(app)/inbox.tsx`, `src/app/(app)/chat/[id].tsx`, and `src/app/(app)/notifications.tsx`
- [x] T025 [US1] After T024, migrate Checkout, Orders, and Order detail presentation to canonical sections, fields, buttons, status hierarchy, and neutral surfaces without changing Stripe test-mode or order behavior in `src/app/(app)/checkout.tsx`, `src/app/(app)/orders.tsx`, and `src/app/(app)/order/[id].tsx`
- [x] T027 [US1] After T025 has closed every route family and before inspecting visual captures, re-run the design-token/component audit, map every migrated route and shared surface to canonical roles, predeclare the representative real/empty screenshot state plus deterministic 10x10 sample grid for every route family, classify any narrowly justified geometry/asset/platform exception, and complete the asset-provenance/layout/UX-writing/icon/static-navigation originality review in `.specify/specs/003-global-design-motion/migration-inventory.md`; motion originality remains exclusively T036/US2 work

### Verification for User Story 1

- [x] T028 [US1] After T027, conduct the complete real-data/truthful-empty visual coherence review across every screen family; execute the predeclared 10x10 sample locations without post-inspection substitution, classify cells using FR-009 exclusions, calculate and record per-family plus aggregate 85–95% neutral/5–12% black/<=3% semantic results, link the screenshot/grid/classification artifact paths, record viewport evidence, and classify unavailable surfaces without fabricated records in `.specify/specs/003-global-design-motion/validation-evidence.md`

**Checkpoint**: US1 provides a coherent visual MVP across the current route inventory. It is not feature-complete until motion, state, accessibility, and journey-preservation phases pass.

---

## Phase 4: User Story 2 — Receive Consistent Interaction Feedback (Priority: P1)

**Goal**: Presses, selections, favorites, sheets, toasts, images, navigation, onboarding, reduced motion, and meaningful haptics share one responsive motion language.

**Independent Test**: Exercise every canonical interaction family on a supported device in normal and reduced-motion modes, including press-to-scroll cancellation and duplicate-busy activation, and compare the observed timing/physical role to the motion contract.

### Implementation for User Story 2

- [x] T029 [US2] After US1 closes at T028, implement canonical 1.00→0.97 button press, selection feedback, interruption, cancellation, and reduced-motion equivalents with Reanimated 4 while preserving synchronous action dispatch in `src/components/ui.tsx`
- [x] T030 [US2] After T029 and the closed T022/T026 listing-family migrations, implement scroll-safe 1.00→0.98 card feedback and 1.00→1.15→1.00 favorite feedback without particles or nested-action propagation in `src/components/listing-card.tsx`, `src/components/product-card.tsx`, and `src/app/(app)/listing/[id].tsx`
- [x] T031 [US2] After T030, replace isolated sheet/toast timings and springs with canonical overlay fade, vertical sheet motion, toast movement, interruption, focus-safe dismissal, and reduced-motion behavior in `src/components/sheet.tsx` and `src/components/overlays.tsx`
- [x] T032 [US2] After T031, replace isolated shimmer/image transitions with canonical non-flashing image reveal and static reduced-motion loading behavior in `src/components/skeleton.tsx` and `src/components/image-slot.tsx`
- [x] T033 [US2] After T032 and the closed T017/T018 global-navigation migrations, standardize forward/reverse/modal/peer-tab transitions with the existing native Expo Router Stack and subtle tab selection feedback, preserving hardware/swipe back and route destinations in `src/app/(app)/_layout.tsx`, `src/app/(auth)/_layout.tsx`, `src/app/onboarding/_layout.tsx`, and `src/components/bottom-nav.tsx`
- [x] T034 [US2] After T033 and the closed T019 onboarding migration, replace onboarding-local timings/springs with canonical fade/translation/progress/hero-settle/CTA motion and reduced-motion equivalents in `src/components/onboarding-parts.tsx` and `src/app/onboarding/index.tsx`
- [x] T035 [US2] Integrate the semantic haptic helper only at existing real favorite, successful selection, Sell, confirmed publish, offer-sent, and important-confirmation outcomes, leaving ordinary taps silent, in `src/hooks/use-favorites.ts`, `src/app/(app)/sell.tsx`, `src/app/(app)/chat/[id].tsx`, `src/components/listing-card.tsx`, and `src/app/(app)/listing/[id].tsx`

### Verification for User Story 2

- [x] T036 [US2] After T035, run the normal/reduced-motion interaction matrix for buttons, cards, favorites, sheets, toasts, images, navigation, tabs, onboarding, live setting changes, haptic availability, scroll cancellation, and duplicate suppression; complete the motion-signature/animated-navigation originality review; and record device/timing/originality observations without static substitution in `.specify/specs/003-global-design-motion/validation-evidence.md`

**Checkpoint**: US2 independently establishes one motion and feedback language on top of the shared foundation.

---

## Phase 5: User Story 3 — Understand Loading, Empty, and Error States (Priority: P1)

**Goal**: Every real loading, legitimate empty, image failure, form failure, screen/network error, retry, refresh, and authoritative completion state uses shared truthful language with no fake content.

**Independent Test**: Reach representative real or safely induced loading, empty, form-error, screen-error, image-error, and network-error states and establish that structure, copy, announcements, retry behavior, and success timing match the state contracts.

### Implementation for User Story 3

- [x] T037 [US3] After US2 closes at T036, complete the shared inline/form/screen/retry/network error, empty-state, refresh-with-existing-content, and authoritative toast compositions with concise redacted service language in `src/components/ui.tsx` and `src/components/overlays.tsx`
- [x] T038 [US3] After T037, apply canonical listing/search/category loading, legitimate empty, refresh, image-error, screen-error, and retry states without local fake insertion in `src/app/(app)/index.tsx`, `src/app/(app)/explore.tsx`, `src/app/(app)/search.tsx`, `src/app/(app)/favorites.tsx`, and `src/components/listing-feed-grid.tsx`
- [x] T039 [US3] After T038, apply canonical profile, category/delivery, photo, publication, field, and retry states while preserving local composer/profile state and authoritative publish success in `src/app/(app)/sell.tsx`, `src/app/(app)/profile.tsx`, `src/app/(app)/edit-profile.tsx`, and `src/app/(app)/verify.tsx`
- [x] T040 [US3] After T039, apply canonical conversation/notification loading, legitimate empty, send/retry, subscription/request error, and retained-content refresh states without invented participants/messages in `src/app/(app)/inbox.tsx`, `src/app/(app)/chat/[id].tsx`, and `src/app/(app)/notifications.tsx`
- [x] T041 [US3] After T040, apply canonical checkout/order loading, legitimate empty, form, retry, and authoritative status/error states without inventing payment/order outcomes in `src/app/(app)/checkout.tsx`, `src/app/(app)/orders.tsx`, and `src/app/(app)/order/[id].tsx`
- [x] T042 [US3] After T041, add destination-shaped listing, profile, search, category, conversation, and order skeleton variants with non-flashing and reduced-motion rules in `src/components/skeleton.tsx`
- [x] T043 [US3] Audit user-facing state copy for fabricated facts, resale framing, raw service/database leakage, unproven offline claims, and premature success across `src/app/` and `src/components/`, recording every correction or justified exception in `.specify/specs/003-global-design-motion/migration-inventory.md`

### Verification for User Story 3

- [x] T044 [US3] Execute the loading/empty/image-error/form-error/screen-error/network-error/retry/refresh/authoritative-toast matrix using real reachable data or truthful emptiness, and record unreachable states as UNVERIFIED rather than fabricating them in `.specify/specs/003-global-design-motion/validation-evidence.md`

**Checkpoint**: US3 provides truthful, reusable state language across every screen family.

---

## Phase 6: User Story 4 — Use SAWA Across Supported Phones and Assistive Settings (Priority: P1)

**Goal**: Every migrated screen remains operable on small/large supported phones, with safe areas, keyboard, larger text, screen readers, web keyboard focus, reduced motion, and responsive long collections.

**Independent Test**: Complete representative journeys on available small/large iOS and Android targets and supported web with keyboard, safe-area variation, increased text, VoiceOver/TalkBack, visible focus, reduced motion, and long real content; classify unavailable targets explicitly.

### Implementation for User Story 4

- [x] T045 [US4] After US3 closes at T044, complete shared role/name/value/selected/checked/disabled/busy semantics, 44x44 effective targets, focus visibility, non-color state, wrapping, and announcement contracts in `src/components/ui.tsx`, `src/components/field.tsx`, `src/components/icon.tsx`, and `src/components/sheet.tsx`
- [x] T046 [US4] After T045, make root chrome, headers, frosted bars, primary navigation, sheets, and sticky actions safe-area/keyboard-aware with logical focus transfer and no fixed-height clipping in `src/app/_layout.tsx`, `src/components/bottom-nav.tsx`, `src/components/screen-header.tsx`, `src/components/frosted-bar.tsx`, and `src/components/sheet.tsx`
- [x] T047 [US4] After T046, correct onboarding/auth reading order, labels, selected state, native versus web semantics, larger-text wrapping, keyboard avoidance, and reduced-motion announcements in `src/components/onboarding-parts.tsx`, `src/app/onboarding/index.tsx`, `src/app/(auth)/sign-in.tsx`, `src/app/(auth)/sign-up.tsx`, `src/app/(auth)/forgot-password.tsx`, `src/app/(auth)/reset-password.tsx`, and `src/app/(auth)/check-email.tsx`
- [x] T048 [US4] After T047, correct marketplace discovery/detail/seller/favorite touch targets, reading order, image labels, focus, larger-text layouts, responsive grids, and non-color selection in `src/app/(app)/index.tsx`, `src/app/(app)/explore.tsx`, `src/app/(app)/search.tsx`, `src/app/(app)/favorites.tsx`, `src/app/(app)/listing/[id].tsx`, and `src/app/(app)/seller/[id].tsx`
- [x] T049 [US4] After T048, correct Sell/Profile/Edit/Verify progress, field/error association, busy state, live announcements, photo/category controls, keyboard avoidance, sticky actions, and larger-text layout in `src/app/(app)/sell.tsx`, `src/components/sell-photo-grid.tsx`, `src/components/sell-country-picker.tsx`, `src/app/(app)/profile.tsx`, `src/app/(app)/edit-profile.tsx`, and `src/app/(app)/verify.tsx`
- [x] T050 [US4] After T049, correct Inbox/Chat/Notifications reading order, participant/message labels, composer focus, busy/send state, keyboard avoidance, target size, and larger-text layout in `src/app/(app)/inbox.tsx`, `src/app/(app)/chat/[id].tsx`, and `src/app/(app)/notifications.tsx`
- [x] T051 [US4] After T050, correct Checkout/Orders/detail form semantics, status announcements, focus order, touch targets, safe areas, keyboard avoidance, sticky actions, and larger-text layout without changing payment/order behavior in `src/app/(app)/checkout.tsx`, `src/app/(app)/orders.tsx`, and `src/app/(app)/order/[id].tsx`
- [x] T052 [US4] After T051, consume the T002/T004 route/surface and long-content inventory and replace every qualifying unbounded or data-growing ScrollView collection with appropriate virtualized-list composition while retaining short static form ScrollViews and existing data/actions; current known scope includes `src/app/(app)/inbox.tsx`, `src/app/(app)/notifications.tsx`, `src/app/(app)/favorites.tsx`, `src/app/(app)/orders.tsx`, `src/app/(app)/chat/[id].tsx`, the Profile remote listing collection in `src/app/(app)/profile.tsx`, and Search remote categories/results in `src/app/(app)/search.tsx`, unless an evidence-backed sub-20 cap or approved DesignException proves a case no longer qualifies; include every newly discovered qualifying collection rather than treating this list as exhaustive
- [x] T053 [US4] Remove inappropriate web-only ARIA usage from native controls, provide React Native accessibility props and supported-web keyboard semantics, and record any platform-specific exception across `src/app/` and `src/components/` in `.specify/specs/003-global-design-motion/migration-inventory.md`

### Verification for User Story 4

- [x] T054 [US4] Run iOS <=375x667 and >=430x932 pt, Android <=360x640 and >=412x915 dp, and web 360/1280 CSS-px portrait-width checks for safe areas, keyboard, short/long content, sticky actions, and 100%/200% text, recording exact devices/viewports and blockers without claiming native landscape support in `.specify/specs/003-global-design-motion/validation-evidence.md`
- [x] T055 [US4] Before verification begins, freeze and consume the deterministic interactive-control inventory created by T002; test every listed control/variant/state for 44x44 targets, roles, names, state, reading order, announcements, focus transfer/restoration, non-color meaning, decorative silence, VoiceOver/TalkBack, and web keyboard behavior; record PASS/FAIL/BLOCKED for every item with no discretionary omission, and add any later-discovered control to the inventory and evidence ledger before closure in `.specify/specs/003-global-design-motion/migration-inventory.md` and `.specify/specs/003-global-design-motion/validation-evidence.md`
- [x] T056 [US4] Run release-like image/skeleton, card-press/scroll, sheet/keyboard, and 10-second long-list observations using >=30 naturally existing real rows where available; record the 60 fps/60 Hz aspiration separately from the measured >=55 observed fps acceptance threshold (equivalent frame-budget ratio elsewhere), <=100 ms stall results, 20 presses per applicable family, and the p95 <=150 ms SC-005 calculation, marking unavailable high-volume/runtime cells UNVERIFIED without inferring performance from source in `.specify/specs/003-global-design-motion/validation-evidence.md`

**Checkpoint**: US4 establishes responsive and accessible operation for every available target; unavailable targets remain visible evidence gaps.

---

## Phase 7: User Story 5 — Preserve Every Existing Real Journey (Priority: P1)

**Goal**: Presentation migration leaves routes, real actions, real data, authorization, persistence, NEW-only behavior, Auth/Realtime/Stripe boundaries, and authoritative outcomes unchanged.

**Independent Test**: Compare the pre-migration and post-migration real-journey set for onboarding, authentication, discovery, details, Favorites, Sell, messaging, profile, checkout, and orders using real accounts/data and the same route/outcome/provenance criteria.

### Preservation and Verification for User Story 5

- [x] T057 [US5] Audit the final changes to `src/lib/queries.ts`, `src/lib/mutations.ts`, `src/lib/supabase.ts`, `src/store/auth-store.tsx`, `src/hooks/use-listing-feed.ts`, `src/hooks/use-favorites.ts`, and `src/hooks/use-conversation.ts`; preserve and report all pre-existing or user-authored drift, reverse or correct only feature-authored presentation hunks, stop the affected family on any behavior change, and record proof that NEW-only reads/writes, real identity, policies, subscriptions, and authoritative outcomes remain unchanged in `.specify/specs/003-global-design-motion/validation-evidence.md`
- [x] T058 [US5] Compare every post-migration route destination, real UUID/parameter source, enabled action, loading/error branch, data source, and persistence result with T005, documenting any presentation exception or blocking behavior regression in `.specify/specs/003-global-design-motion/validation-evidence.md`
- [x] T059 [US5] Execute Home/Browse/Search/listing/seller/Favorites/Sell/Inbox/Chat/Profile cross-account journeys with two independent real authenticated accounts where required, recording real-data provenance and visibility without service-role use in `.specify/specs/003-global-design-motion/validation-evidence.md`
- [x] T060 [US5] Execute onboarding, sign-in/up/recovery, verification, checkout in Stripe test mode, Orders, and Order detail regressions, recording unchanged Auth/payment/order authority and marking unavailable real states explicitly in `.specify/specs/003-global-design-motion/validation-evidence.md`
- [x] T061 [US5] Re-scan `src/app/` and shared global/pre-route surfaces immediately before final verification, compare the result with T002's initial inventory, add every newly added or previously undiscovered applicable route/surface/control/collection, return each discovery to its applicable migration/verification task (including T052 for qualifying long collections and T055 for controls), require a migration record plus evidence status for each discovery, block final closure while any applicable surface lacks evidence, and then complete every route/shared-surface behavior baseline/result, evidence ID, exception, and MIGRATED/BLOCKED status in `.specify/specs/003-global-design-motion/migration-inventory.md`

**Checkpoint**: US5 proves the visual migration did not become a business-architecture change. Any discovered frozen-architecture defect requires separate evidence and explicit approval, not an in-scope fix.

---

## Phase 8: Polish and Cross-Cutting Quality Gates

**Purpose**: Close repository-wide audit findings and produce the final truthful completion record.

- [x] T062 Re-run the entire T004/FR-056 audit scope across raw colors, derived tints, semantic colors, typography, spacing, gutters, radii, shadows/elevation, opacity, layers/z-index, touch sizes, button heights, icon sizes/strokes, image constants, motion durations, easings, springs, duplicate components, button variants, input variants, card variants, sheet variants, navigation variants, and all duplicated design constants; record the command/count/commit for every category, classify every candidate MIGRATED, REMOVED, CENTRAL_DERIVATION, EXCEPTION, or OPEN, and prohibit zero-OPEN closure until every category has been rechecked in `.specify/specs/003-global-design-motion/migration-inventory.md`
- [x] T063 Review every DesignException for exact location, canonical rule, concrete user/platform/measured need, smallest scope, rejected alternative, and verification; remove only feature-authored unapproved exceptions while preserving unrelated user changes, or mark the feature blocked in `.specify/specs/003-global-design-motion/migration-inventory.md`
- [x] T064 Run `npx expo export --platform web` and record the exact result as BUILD_SMOKE evidence only in `.specify/specs/003-global-design-motion/validation-evidence.md`
- [x] T065 Run `npm run typecheck` to zero errors and record the exact output in `.specify/specs/003-global-design-motion/validation-evidence.md`
- [x] T066 Run `npm run lint` to zero errors and record the exact output in `.specify/specs/003-global-design-motion/validation-evidence.md`
- [x] T067 Conduct the SC-009 study with at least five people independent of implementation/design, 15 randomized brand-masked pairs per person, every major family represented at least twice, and a >=68/75 same-product pass threshold; otherwise mark it BLOCKED/UNVERIFIED with the precise prerequisite in `.specify/specs/003-global-design-motion/validation-evidence.md`
- [x] T068 Re-run the complete visual, state, motion, reduced-motion, responsive, accessibility, performance, and real-journey matrix against the final commit, recording only executed observations and exact unavailable environments in `.specify/specs/003-global-design-motion/validation-evidence.md`
- [x] T069 Audit the final diff for prohibited changes to `supabase/`, Auth, RLS, Realtime, Stripe/Edge Functions, checkout/order behavior, payment architecture, secrets, fake marketplace data/images, route IDs, and NEW-only behavior, recording reviewed paths and any blocker in `.specify/specs/003-global-design-motion/validation-evidence.md`
- [x] T070 Reconcile FR-001–FR-058, VR-001–VR-012, SC-001–SC-010, all five user stories, every migration record, and all blocked/unverified runtime cells into the final PASS/FAIL/BLOCKED/UNVERIFIED report in `.specify/specs/003-global-design-motion/validation-evidence.md`

---

## Dependencies and Execution Order

### Phase dependencies

```text
Phase 1 Setup
    ↓
Phase 2 Foundation
    ↓
Phase 3 US1 Visual Coherence
    ↓
Phase 4 US2 Interaction Feedback
    ↓
Phase 5 US3 State Language
    ↓
Phase 6 US4 Responsive/Accessible Integration
    ↓
Phase 7 US5 Real-Journey Preservation
    ↓
Phase 8 Audit and Final Gates
```

- **Phase 1** has no implementation dependency; T004 depends on T002, T005 depends on both T002 and T003, and T006 depends on T003.
- **Phase 2** depends on Phase 1 and blocks all story implementation.
- **US1** depends on Phase 2 and closes sequentially through T017→T018→T019→T020→T026→T021→T022→T023→T024→T025→T027→T028; T026 deliberately precedes every marketplace route that consumes those shared components.
- **US2** remains independently testable but executes only after US1 closes; it owns all motion, including FR-042 onboarding motion, and follows T029→T030→T031→T032→T033→T034→T035→T036.
- **US3** executes only after US2 closes and follows T037→T038→T039→T040→T041→T042→T043→T044.
- **US4** depends on the integrated US1–US3 surfaces because it corrects accessibility/responsive behavior across their final component states.
- **US5** depends on US1–US4 because it compares the completed migration against the pre-change real-journey baseline.
- **Phase 8** depends on all selected story phases and cannot report completion while required evidence remains falsely omitted or an audit finding remains OPEN.

### User-story requirement mapping

| Story | Primary requirements | Completion evidence |
|---|---|---|
| Foundation | FR-001–FR-003, FR-005–FR-016, FR-056 | Canonical registries, primitive contracts, and baseline audit |
| US1 | FR-004, the static visual/component portions of FR-005–FR-024, and static FR-040 navigation | Complete static route/component mapping, static originality, and visual coherence review |
| US2 | FR-035–FR-044, including all FR-042 onboarding motion | Normal/reduced interaction matrix and performance observations |
| US3 | FR-025–FR-034, FR-055 | Truthful loading/empty/error/recovery matrix |
| US4 | FR-019–FR-020, FR-034, FR-043–FR-052 | Viewport, screen-reader, keyboard, text-size, and performance matrix |
| US5 | FR-053–FR-058 | Before/after real-journey, cross-account, frozen-boundary evidence |

### Success-criterion traceability

| Criterion | Explicit task coverage |
|---|---|
| SC-001 | T002 initial inventory, T027 mapping, T061 final re-scan/closure, T068 final runtime matrix, T070 reconciliation |
| SC-002 | T004 full baseline audit, T062 full final audit, T063 exception review, T070 reconciliation |
| SC-003 | T002 predeclared control inventory, T045 implementation, T055 exhaustive verification, T061 discovery loop, T070 reconciliation |
| SC-004 | T054 exact viewport/text matrix, T068 final matrix, T070 reconciliation |
| SC-005 | T036 motion observations, T056 measured performance calculation, T068 final matrix, T070 reconciliation |
| SC-006 | T009 reduced-motion policy, T029–T036 component/route implementation and matrix, T047 accessibility integration, T068/T070 final evidence |
| SC-007 | T037–T044 state implementation/verification, T068 final matrix, T070 reconciliation |
| SC-008 | T005 baseline, T057–T061 preservation/final inventory, T068–T070 final evidence |
| SC-009 | T067 moderated study or truthful BLOCKED/UNVERIFIED status, T070 reconciliation |
| SC-010 | T003 evidence boundaries, T064–T070 final evidence and classification |

### Shared-file coordination

- `src/components/ui.tsx`: T011 → T029 → T037 → T045.
- `src/components/sheet.tsx` and `src/components/overlays.tsx`: T015 → T031 → T037 → T045.
- `src/components/skeleton.tsx` and `src/components/image-slot.tsx`: T014 → T032 → T042.
- Global navigation/layout: T017/T018 → T033 → T046.
- Onboarding: T019 → T034 → T047.
- Listing/detail/card family: T026 → T021/T022 → T030 → T038/T048.
- No route/component family task may begin until the preceding task in its chain and the preceding story phase are closed; `[P]` is intentionally absent from these chains.
- Evidence tasks writing `validation-evidence.md` execute serially or merge against the latest ledger to avoid lost observations.

---

## Execution Examples and Allowed Parallelism

### Foundation

After T007, T009, and T010 establish tokens/policies, T012 and T013 can proceed in parallel because they own different primitives. T014 and T015 can then proceed in parallel after their required motion/state contracts are available.

### User Story 1

After Phase 2, route families close in this mandatory sequence; this is a dependency chain, not a parallel example:

```text
T017 Global navigation
T018 Root/route-group chrome
T019 Onboarding
T020 Authentication
T026 Shared marketplace components
T021 Discovery
T022 Listing/Seller detail
T023 Sell/Profile
T024 Messaging
T025 Commerce
```

T027 and T028 wait for all US1 implementation tasks.

### User Story 2

After T028, execute T029→T030→T031→T032→T033→T034; T035 then integrates the completed motion/haptic surfaces and T036 runs the integrated matrix. This ordering prevents T030/T033/T034 from racing T022/T026, T017/T018, or T019.

### User Story 3

After T036, execute T037→T038→T039→T040→T041→T042→T043→T044 so state work never races motion or another screen family.

### User Story 4

After T044, execute T045→T046→T047→T048→T049→T050→T051→T052→T053→T054→T055→T056. T052 consumes the complete qualifying-collection inventory, and T055 consumes the predeclared control inventory.

---

## Implementation Strategy

### MVP first: US1 visual coherence

1. Complete Phase 1 requirement/evidence setup.
2. Complete Phase 2 canonical foundation.
3. Complete Phase 3 US1 across the full route inventory.
4. Stop and run T027–T028 before proceeding.

This is the smallest coherent visual increment, not a release-complete implementation: motion, truthful state coverage, accessibility/responsive integration, and real-journey preservation remain mandatory P1 work.

### Incremental delivery

1. Foundation → one canonical source and primitive contract.
2. US1 → coherent visual language across all routes.
3. US2 → consistent interaction and reduced-motion language.
4. US3 → truthful shared loading/empty/error/recovery language.
5. US4 → responsive and accessible integrated surfaces.
6. US5 → evidence that real journeys and frozen boundaries remain unchanged.
7. Final gates → zero open audit findings, zero type/lint errors, and truthful runtime/study status.

### Stop conditions

- Stop application edits if T001 exposes an owner decision that changes the foundation materially.
- Stop and request explicit approval if any required change would touch frozen architecture.
- Preserve a working business behavior and document a narrow presentation exception when consolidation would require changing that behavior.
- Never create fake listings, people, messages, orders, images, counts, ratings, or payment states to satisfy visual evidence.
- Never mark a runtime or study task PASS from static inspection, screenshots alone, or bundle success.

---

## Notes

- `[P]` means file ownership and dependencies allow parallel work; it does not authorize unsynchronized edits to a shared file.
- Every task has an exact repository path and an observable artifact or outcome.
- Runtime tasks require real reachable data or truthful empty states and must name unavailable environments.
- The current Git worktree may contain unrelated user changes; preserve them and review overlapping files before editing.
