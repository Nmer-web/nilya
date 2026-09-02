# Phase 0 Research: Global Design System and Motion Foundation

**Feature**: `003-global-design-motion`  
**Date**: 2026-08-17

## Research method

This research combines the checked-in Expo/React Native implementation, the SAWA Constitution, the exact installed package versions, and primary documentation. Static counts below are discovery candidates, not proof that every match is a defect or that any runtime behavior works.

## Decision 1 — Evolve the existing theme; do not create a second system

**Decision**: Keep `src/theme/tokens.ts` as the sole public source for design and motion roles. Expand and correct it in place. Existing shared components in `src/components/ui.tsx`, `field.tsx`, `sheet.tsx`, `overlays.tsx`, `skeleton.tsx`, and related files are evolved or composed; they are not shadowed by a parallel `design-system/` library.

**Rationale**:

- The repository already has a canonical-looking token file and shared primitive layer.
- The feature explicitly requires consolidation before invention.
- Incremental evolution minimizes behavior risk across 22 routes.
- A transitional second token entry point would make raw-value elimination harder to audit.

**Alternatives rejected**:

- New theme package: duplicates ownership and increases migration surface.
- Per-feature themes: directly conflicts with one global foundation.
- Wholesale component rewrite: risks changing working controls and journeys for presentation-only gains.

## Decision 2 — Adopt WCAG 2.2 AA as the normative baseline

**Decision**: WCAG 2.2 Level AA is the minimum contrast and operability baseline. The requested `#9A9A9A` muted role is retained, but it cannot be used for readable text or placeholders. `#717171` carries readable secondary content on light surfaces. Every role/surface combination is audited, not assumed.

**Resolution status**: The design-quality review adopts this baseline as a normative specification decision. Changing it requires an explicit specification amendment and cannot reduce the Constitution's accessibility obligation.

**Rationale**:

- A design foundation needs a measurable accessibility baseline.
- Muted text still conveys information; low visual priority does not remove its accessibility obligation.
- The spec already requires non-color signals, screen-reader semantics, larger text, focus, and 44x44 targets.

**Alternative rejected**: Treat the palette table as unconditional even when a role/surface pairing fails. That would make FR-048 through FR-052 internally inconsistent and weaken the requested quality bar.

**Primary source**: [W3C Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/)

## Decision 3 — Use the exact semantic visual roles and remove decorative accent

**Decision**: Correct the existing values to the specification, add explicit `primaryText: #111111` and `inverseText: #FFFFFF` semantics, complete the requested spacing/radius/type/icon/touch/elevation roles, and remove orange/teal as decorative brand emphasis. Status colors remain only for genuine success, error, and warning states, with centrally derived tonal surfaces where required.

**Current gaps**:

- `surfaceSecondary` is `#F2F2EF`, not `#F2F2F0`.
- `textMuted` is `#8A8A8A`, not `#9A9A9A`.
- `borderStrong` is `#D8D8D5`, not `#D5D5D5`.
- `primaryText` currently means white-on-primary; the spec assigns primary text to near-black and names inverse text separately.
- Orange accent roles support unread badges and editorial decoration, contrary to the new neutral direction.
- `space.gutter` is 16 instead of the requested 20–24.
- Type and motion roles are incomplete.
- `app.json` uses automatic interface style and blue launch/icon backgrounds, so system chrome and launch surfaces do not yet guarantee the light canonical language.

**Migration rule**: Resolve semantic renames atomically at call sites; do not preserve an ambiguous compatibility alias that could render black text on black surfaces.

## Decision 4 — Keep system sans for UI and serif only for the wordmark

**Decision**: Use the platform system sans for all interface roles and preserve Instrument Serif only for the existing SAWA wordmark. Consolidate onboarding's separate Manrope hierarchy into the same global type roles. After migration, remove unused font loading and dependencies only when repository search proves they have no remaining references.

**Rationale**:

- The existing `T` primitive already intends platform sans.
- The spec prohibits an independent onboarding type system.
- One role-based ramp improves Dynamic Type behavior and reduces font-loading complexity.

**Alternative rejected**: Make Instrument Sans or Manrope a second interface hierarchy. That preserves the inconsistency this feature exists to remove.

## Decision 5 — Reanimated for component motion; native Stack for navigation

**Decision**: Use installed React Native Reanimated 4.5.1 and Worklets 0.10.1 for reusable press, selection, favorite, sheet, toast, image/skeleton, and onboarding motion when UI-thread execution protects responsiveness. Keep Expo Router's existing native Stack for navigation and standardize its options by semantic route group. Do not migrate to the experimental stack.

**Rationale**:

- SDK 57 includes/configures Reanimated and the project already has the compatible packages.
- UI-thread transform/opacity motion is appropriate for scroll-adjacent feedback.
- Expo Router's standard Stack is native and already encodes the app's route hierarchy.
- Navigation duration customization is platform-limited, so the contract defines transition families, not a false promise of identical millisecond timing everywhere.

**Alternatives rejected**:

- Continue isolated React Native `Animated` presets across files: perpetuates duplicate springs/durations and inconsistent reduced motion.
- Replace native Stack with custom screen transitions: adds gesture/accessibility risk and unnecessary architecture.
- Experimental stack migration: out of scope and unnecessary for the requested behavior.

**Primary sources**:

- [Expo SDK 57 Reanimated](https://docs.expo.dev/versions/v57.0.0/sdk/reanimated/)
- [Expo SDK 57 Router Stack](https://docs.expo.dev/versions/v57.0.0/sdk/router/stack/)
- [Reanimated accessibility and reduced motion](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/)

## Decision 6 — One central reduced-motion policy

**Decision**: Define a shared reduced-motion policy consumed by every motion primitive. Reanimated animations use system reduction; JS/navigation behavior also reads platform accessibility state so a setting change while the app is active is handled. Reduced mode removes non-essential travel, scale, bounce, shimmer, and repeated motion while retaining immediate state changes and short opacity feedback when non-disorienting.

**Rationale**:

- Reanimated's `useReducedMotion` is synchronous but documents that it reflects the value when the app starts.
- The feature explicitly includes the edge case of enabling reduced motion while the app is open.
- A central policy prevents Sell, onboarding, cards, and sheets from diverging.

**Alternative rejected**: A per-screen reduced-motion hook. Only Sell currently has similar logic; copying it would create another fragmented system.

## Decision 7 — Meaningful haptics are best-effort enhancement only

**Decision**: Use `expo-haptics` only for the real events listed in FR-041. Haptic failure or platform unavailability never blocks the action, changes state, or substitutes for visual/accessibility feedback. Ordinary taps do not vibrate.

**Rationale**: Expo documents platform-specific availability and conditions under which feedback may not fire. Therefore runtime evidence records haptic observation separately from action success.

**Primary source**: [Expo SDK 57 Haptics](https://docs.expo.dev/versions/v57.0.0/sdk/haptics/)

## Decision 8 — Standardize real images with `expo-image`; never invent a fallback

**Decision**: Consolidate remote/display imagery around the already-installed `expo-image`. Shared image surfaces own aspect ratio, radius, destination-shaped loading, cache behavior, fade duration, accessible labeling, and neutral failure state. Missing or failed product imagery uses the existing neutral `ImageSlot` concept, never generated or bundled fake product photography.

**Rationale**:

- Expo Image supports caching, placeholders, transitions, content fitting, error callbacks, and accessibility labels.
- The no-fabricated-data constitution makes a neutral error surface the only honest product-image fallback.

**Primary source**: [Expo SDK 57 Image](https://docs.expo.dev/versions/v57.0.0/sdk/image/)

## Decision 9 — Central elevation roles with a platform-parity gate

**Decision**: Define exactly three semantic `boxShadow` roles for floating surfaces, using the values in the specification. Ordinary listing cards remain shadow-free. If a supported platform does not render a role acceptably, use the canonical border fallback and record that runtime result; do not add screen-local legacy shadow/elevation definitions.

**Rationale**:

- React Native 0.86 supports `boxShadow` under the New Architecture, with Android version limits.
- The existing project uses legacy `shadow*` plus `elevation`, and centralized compatibility is preferable to a visually inconsistent forced conversion.
- The feature controls the number and meaning of elevations more importantly than the syntax.

**Primary source**: [React Native View Style Props — boxShadow](https://reactnative.dev/docs/view-style-props#boxshadow)

## Decision 10 — Contract-driven primitive consolidation

**Decision**: Existing primitives gain semantic variants and state contracts rather than unrestricted screen-level styling. Escape hatches remain possible for measured platform geometry or asset composition but require a documented exception. Core families are text, button/icon button, pressable, input, card, selection, image, skeleton, empty/error, toast, sheet, and navigation item.

**Rationale**:

- Current `T` and Button APIs allow many raw sizes/colors/heights.
- State and accessibility rules need to live with the primitive to be consistent.
- Composition retains unique behavior without allowing every screen to invent a new visual family.

## Decision 11 — Preserve route architecture and relabel the existing destination

**Decision**: Keep all current Expo Router destinations. The visible bottom navigation label changes from Explore to Browse while retaining `/explore`. Standardize transition families within current route groups: directional native stack for forward/back, existing modal/bottom presentation where semantically correct, and subtle peer-tab feedback without turning tab switches into stack travel.

**Rationale**: The request is presentational and explicitly preserves business routes. A new `/browse` route would create migration risk without user value.

## Decision 12 — Migrate by screen family, with collection-specific performance review

**Decision**: Migrate in bounded, strictly sequential families: global chrome; onboarding; auth; shared marketplace components and discovery/detail; Sell/profile editing; messaging/notifications; checkout/orders. Each family closes its auditable source/evidence record before the next begins; story phases that revisit the same files execute sequentially after static visual migration. Data-growing collections use virtualized lists; short static forms can retain ScrollView.

**Rationale**:

- The source includes 22 screens and over 11k relevant lines.
- A global mechanical rewrite would hide route-specific regressions.
- Several current collection screens use ScrollView even though their data can grow; these require case-by-case review, not an indiscriminate rewrite.

**Primary source**: [React Native performance overview](https://reactnative.dev/docs/performance)

## Decision 13 — Evidence is a first-class deliverable

**Decision**: Add a migration/evidence contract and complete it during implementation. Static audit, build smoke, runtime visual checks, runtime motion, accessibility, responsive behavior, and business regression are separate evidence classes. Each requirement is PASS, FAIL, BLOCKED, or UNVERIFIED.

**Rationale**:

- The repository has no Jest, Detox, Maestro, or Playwright harness.
- Typecheck/lint/export cannot prove screen appearance, system settings, touch behavior, haptics, performance, or real journey outcomes.
- The Constitution prohibits converting inspection into runtime claims.

**Alternative rejected**: Treat screenshots or static literal counts as completion. They prove only a narrow visual state or source shape.

## Repository baseline

### Routable screens at planning time

- App: checkout, edit profile, Explore/Browse, Favorites, Home, Inbox, Notifications, Orders, Profile, Search, Sell, Verify, Chat detail, Listing detail, Order detail, Seller detail.
- Auth: check email, forgot password, reset password, sign in, sign up.
- Onboarding: index.

Layouts and shared overlays are tracked separately because they affect multiple routes.

### Static candidate inventory

| Candidate class | Baseline count | Important concentration |
|---|---:|---|
| Raw color literals outside theme | 15 | `onboarding-parts.tsx` |
| Raw `fontSize`/icon `size` candidates | 340 | onboarding, listing detail, Sell, Chat, Checkout |
| Spacing literals | 421 | onboarding, Chat, Sell, overlays, listing detail |
| Radius literals | 58 | Chat, onboarding, Profile, shared UI |
| Motion duration/spring literals outside theme | 14 | listing favorite, onboarding, spinner, skeleton, sheet/toast |
| Legacy shadow/elevation fields | 15 | canonical theme definitions only |

These are intentionally overinclusive search results. Implementation must classify constants that represent borders, measured icon geometry, media ratios, or platform values before calling them violations.

### Current architectural assets to preserve

- Protected Expo Router route groups and real navigation destinations.
- Existing Supabase queries/mutations, Auth state, Realtime, Stripe, checkout, and order contracts.
- Current real empty/error/loading states as behavioral starting points.
- `expo-image`, Reanimated, Haptics, safe-area context, native screens, and gesture handler already installed.

## Sources consulted

- [Expo SDK 57 documentation index](https://docs.expo.dev/versions/v57.0.0/)
- [Expo SDK 57 Reanimated](https://docs.expo.dev/versions/v57.0.0/sdk/reanimated/)
- [Expo SDK 57 Image](https://docs.expo.dev/versions/v57.0.0/sdk/image/)
- [Expo SDK 57 Haptics](https://docs.expo.dev/versions/v57.0.0/sdk/haptics/)
- [Expo SDK 57 Router Stack](https://docs.expo.dev/versions/v57.0.0/sdk/router/stack/)
- [React Native Accessibility](https://reactnative.dev/docs/accessibility)
- [React Native Performance](https://reactnative.dev/docs/performance)
- [React Native View Style Props](https://reactnative.dev/docs/view-style-props)
- [React Native 0.86 release notes](https://reactnative.dev/blog/2026/06/11/react-native-0.86)
- [React Native Reanimated accessibility](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

## Resolved unknowns

All Technical Context fields are resolved. The earlier skipped contrast choice is now the normative WCAG 2.2 AA baseline; no unresolved clarification marker remains. Any future change requires an explicit specification amendment and cannot weaken other accessibility requirements.
