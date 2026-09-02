# Implementation Plan: Global Design System and Motion Foundation

**Branch**: `003-global-design-motion` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `.specify/specs/003-global-design-motion/spec.md`

## Summary

Evolve SAWA's existing presentation layer into one canonical, light-only design and motion system, then migrate every current screen family incrementally without changing business behavior or any frozen backend architecture. The implementation will extend `src/theme/tokens.ts` as the single token source, consolidate existing primitives instead of creating a parallel component library, use installed Reanimated 4 for reusable UI-thread motion, retain Expo Router's native Stack transitions, and verify every route and shared state with a traceable migration/evidence record.

This checklist review resolves the earlier skipped contrast clarification normatively: WCAG 2.2 AA is the minimum contrast baseline. Consequently, requested `#9A9A9A` remains a canonical muted role but cannot carry readable text or placeholders; readable supporting content uses `#717171`. Changing this baseline now requires an explicit specification amendment and cannot weaken the Constitution's accessibility obligation.

## Technical Context

**Language/Version**: TypeScript ~6.0.3, React 19.2.3, React Native 0.86.2  
**Primary Dependencies**: Expo SDK ~57.0.14, Expo Router ~57.0.14, React Native Reanimated 4.5.1, React Native Worklets 0.10.1, `expo-image` ~57.0.3, `expo-haptics` ~57.0.1, `react-native-safe-area-context` ~5.7.0  
**Storage**: N/A for the design system. Existing Supabase and local application state are consumed unchanged; no schema, migration, policy, or persistence contract changes.  
**Testing**: `npm run typecheck`, `npm run lint`, repository-wide static token audit, `npx expo export --platform web` as build smoke evidence only, and manual runtime visual/motion/accessibility/journey matrices because no automated test runner exists in the repository  
**Target Platform**: Existing Expo SDK 57 targets: supported small and large iOS/Android phones plus existing React Native Web surfaces  
**Project Type**: Universal Expo mobile application with Expo Router  
**Performance Goals**: Target/aspiration: 60 fps on a 60 Hz display in a release-like runtime. Measured acceptance threshold: >=55 observed fps during the normative sample; the aspiration is not the pass threshold. Visual press acknowledgment begins within 150 ms for at least 95% of sampled enabled presses; no animation blocks input or captures an intended scroll  
**Constraints**: Light theme only; one canonical visual system; 44x44 minimum effective targets; WCAG 2.2 AA normative baseline; reduced-motion equivalents; portrait-only native orientation while `app.json` remains locked; no fabricated marketplace data; NEW-only behavior preserved; Auth/Supabase/RLS/Realtime/Stripe/checkout/payment architecture frozen; real behavior and route destinations unchanged  
**Scale/Scope**: 22 existing routable screens across onboarding, auth, marketplace, Sell, messaging, profile, checkout, and orders; shared navigation, sheets, overlays, toasts, images, skeletons, empty/error states; approximately 54 relevant TS/TSX files and 11.5k source lines at planning baseline

## Constitution Check

*GATE: Passed before Phase 0 research and re-checked after Phase 1 design.*

| # | Gate | Pre-research | Post-design evidence |
|---|---|---|---|
| I (NON-NEGOTIABLE) | Every listing write sets NEW; every listing read filters NEW; no resale language | PASS | Presentation-only migration. Contracts prohibit query/write changes and require each journey regression record to confirm NEW-only behavior. Copy audit includes prohibited resale wording. |
| II (NON-NEGOTIABLE) | No fabricated facts or seed rows; empty states; real identifiers | PASS | Canonical image/empty-state contracts prohibit fake products and fallbacks. Quickstart requires real reachable records or truthful empty states and real UUIDs only. |
| III | Schema is the source of truth | PASS | Feature defines no database entity and requires no schema change. Existing data contracts remain authoritative and untouched. |
| IV | Frozen architecture remains unchanged | PASS | No Supabase schema/RLS, Auth, Realtime, Edge Function, Stripe, checkout, order, or payment architecture work appears in the design. UI migrations preserve existing service calls and authoritative transitions. |
| V | Interactive elements are real and verified with an independent account | PASS | Component contracts prohibit dead controls and duplicate busy activation. Regression matrix covers existing actions and requires a second account for cross-account journeys where applicable. |
| VI | Premium neutral system; complete states; accessible controls | PASS | Tokens, component contracts, motion contract, migration inventory, and runtime matrix cover neutral styling, loading/empty/error/offline states, accessibility semantics, safe areas, keyboard, and reduced motion. |
| VII (NON-NEGOTIABLE) | Runtime behavior has an executable verification plan; unavailable evidence is named | PASS | Quickstart separates static, build-smoke, and runtime evidence and mandates PASS/FAIL/BLOCKED/UNVERIFIED. Static inspection cannot satisfy runtime requirements. |
| Platform | SDK 57 docs consulted; no secrets; payments unchanged/test-only | PASS | Official SDK 57 Image, Haptics, Router Stack, and Reanimated documentation informed the plan. No secret handling or payment implementation is introduced. |

No constitutional violation requires Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
.specify/specs/003-global-design-motion/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── component-contracts.md
│   ├── motion-contract.md
│   └── migration-evidence-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md                       # Created later by /speckit-tasks
```

### Source Code (repository root)

```text
app.json                           # Fixed light presentation and canonical launch/icon surfaces
assets/                            # Existing brand assets audited; no fake product imagery
src/
├── app/
│   ├── _layout.tsx                # Root theme/status bar/font loading
│   ├── (auth)/                    # Authentication family migration
│   ├── onboarding/                # Consolidate separate onboarding visual system
│   └── (app)/                     # Marketplace, Sell, messaging, profile, checkout, orders
├── components/
│   ├── ui.tsx                     # Existing shared primitives evolved in place
│   ├── field.tsx                  # Consolidated input states and semantics
│   ├── onboarding-parts.tsx       # Remove local palette/type/motion system
│   ├── bottom-nav.tsx             # Canonical Home/Browse/Sell/Inbox/Profile presentation
│   ├── sheet.tsx                  # Canonical sheet/overlay/focus behavior
│   ├── overlays.tsx               # Shared toast/error/overlay presentation
│   ├── skeleton.tsx               # Destination-shaped reduced-motion-aware loading
│   ├── image-slot.tsx             # Real-image loading and neutral failure treatment
│   ├── listing-card.tsx           # Image-first card and scroll-safe motion
│   └── ...                        # Existing components migrated, not duplicated
├── hooks/
│   └── ...                        # Shared UI hooks, including central reduced-motion policy
└── theme/
    └── tokens.ts                  # Sole canonical design and motion token source
```

**Structure Decision**: Keep the existing Expo Router application structure and evolve the current `src/theme/tokens.ts`, `src/components/ui.tsx`, and related shared components in place. Do not introduce a second theme package, new navigation architecture, or presentation-specific data layer. New shared files are permitted only when they represent a genuinely reusable behavior that cannot remain coherent in the existing files.

## Implementation Strategy

### Phase A — Establish an auditable baseline

1. Freeze a route and shared-surface inventory before edits.
2. Run static searches for raw colors, type/icon sizes, spacing, radii, shadows, button heights, durations, and spring configs. Candidate matches are classified manually; platform geometry and asset composition may be justified exceptions.
3. Capture representative pre-migration behavior for each real journey so presentation work can be compared without changing outcomes.

### Phase B — Evolve the canonical foundation

1. Correct and expand `src/theme/tokens.ts` to the specified semantic roles, complete type ramp, spacing/radius scales, icon sizes, touch sizes, opacity/layering, elevations, durations, easings, and role-specific springs.
2. Replace decorative orange/teal use with neutral hierarchy or a genuine semantic status. Preserve semantic success/error/warning only where real state warrants it.
3. Force a consistent light presentation in app configuration and root system UI; audit splash/icon background colors against the palette without inventing new marketplace imagery.
4. Retain system sans for interface text and Instrument Serif only for the existing SAWA wordmark. Remove the separate onboarding Manrope hierarchy and later remove font loading/dependencies only after a zero-reference audit.

### Phase C — Consolidate primitives and motion

1. Evolve existing Button, text, pressable, input, card, image, skeleton, empty/error, toast, selection, and sheet components according to the contracts.
2. Use Reanimated 4 for shared press, selection, image/skeleton, sheet, toast, and feedback motion where UI-thread execution materially protects responsiveness. Preserve Expo Router native Stack for route transitions.
3. Centralize reduced-motion behavior and meaningful best-effort haptics. State changes remain immediate and perceivable when travel, scale, or repeated motion is removed.
4. Prefer `transform` and `opacity` for continuous motion. Implement only the three exact centrally defined `boxShadow` roles from the specification for floating surfaces; ordinary cards remain shadow-free. Where a supported platform cannot render a role acceptably, use the specification's canonical border fallback and record the runtime result rather than introducing screen-local legacy shadow values.

### Phase D — Incremental screen-family migration

Migrate and verify one family at a time so behavior regressions stay attributable. Family closure is strictly sequential: no later family or story phase may edit a route/component owned by an earlier family until the earlier family's implementation and required evidence tasks close. Parallel work is permitted only for explicitly marked setup/foundation tasks with disjoint files; it is not permitted across screen/component families.

1. Global root chrome, navigation, overlays, sheets, and state surfaces.
2. Onboarding.
3. Authentication.
4. Home, Browse/Search, listing detail, seller profile, Favorites, and shared marketplace cards.
5. Sell and profile editing.
6. Inbox, Chat, Notifications.
7. Checkout, Orders, and order detail.

Each family must finish its source migration and family evidence record before the next family begins. Motion, state-language, accessibility/responsive, preservation, and final-audit phases then run in that order and may not race earlier work on the same files. Long, data-growing collections are reviewed for virtualization; short static forms remain scroll views where that is the simpler accessible structure.

### Phase E — Audit closure and evidence

1. Re-run the literal/duplicate audit and classify every remaining candidate.
2. Run typecheck and lint; treat web export only as a build smoke check.
3. Execute the exact small/large iOS and Android portrait classes, 360/1280 web widths, 200% text scale, motion, accessibility, long-list, and real-journey matrix described in `quickstart.md` as environments permit.
4. Produce the final evidence ledger with PASS, FAIL, BLOCKED, or UNVERIFIED for every verification requirement. Do not infer runtime behavior from source inspection.

## Risk Controls

| Risk | Control |
|---|---|
| A visual refactor changes business behavior | Keep query/mutation/auth/navigation contracts untouched; compare each route's pre/post real outcome and data provenance. |
| The requested muted value makes readable text inaccessible | Apply the normative WCAG 2.2 AA rule: reserve `#9A9A9A` for non-readable decoration/disabled treatment and use `#717171` for readable supporting content. |
| A component rewrite destabilizes unique behavior | Extend existing components through composition; document a narrow exception when consolidation would require behavior changes. |
| Press animation interferes with scroll | Animate only transform/opacity, keep gesture ownership with the existing press/list primitive, and test press-to-scroll cancellation on real devices. |
| Reduced motion is inconsistently applied | One shared policy plus Reanimated's system-aware reduction; explicitly test settings enabled before launch and changed while the app is active. |
| Broad migration hides regressions | Migrate in route-family slices with a completed record and quality gates per slice. |
| A presentation edit changes a route, action, authorization boundary, persistence result, Realtime behavior, payment authority, or NEW-only rule | Stop that family immediately; reverse or correct only the feature-authored presentation hunk, preserve unrelated user changes, restore the recorded baseline, and report any proven frozen-architecture defect for separate approval. |
| Static audit counts create false confidence | Treat counts as candidate inventory only; runtime requirements remain separately evidenced. |
| Unsupported device/platform access blocks proof | Mark exact cells BLOCKED or UNVERIFIED with reason; never convert absence of evidence into PASS. |

## Complexity Tracking

No constitutional violations or unjustified architectural additions are planned.
