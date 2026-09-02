# Migration and Evidence Contract

## Inventory rule

The implementation begins by recording every routable screen, pre-route/system surface, and shared global surface that exists at that commit, then refreshes that inventory immediately before final verification. A route/surface cannot disappear from the ledger because it has no data; its truthful empty state is valid test coverage.

## Migration record template

```md
### <route or shared surface>

- Family:
- Source files:
- Existing real behavior/data source:
- Reachable states:
- Canonical tokens/components adopted:
- Raw-value audit findings resolved:
- Design exceptions:
- Small viewport:
- Large viewport:
- Keyboard/safe area:
- Screen reader/semantics:
- Increased text:
- Normal motion:
- Reduced motion:
- Journey regression result:
- Evidence IDs:
- Status: NOT_STARTED | IN_PROGRESS | MIGRATED | BLOCKED
```

`MIGRATED` requires source migration plus all evidence available in the authorized environment. Unavailable required checks remain visibly BLOCKED or UNVERIFIED in the final ledger even if the source portion is complete.

## Static audit classification

Every candidate raw or duplicate value receives one classification:

- `MIGRATED`: mapped to a canonical role.
- `REMOVED`: dead or duplicate presentation eliminated.
- `CENTRAL_DERIVATION`: required tint/opacity/platform variant derived in the canonical source.
- `EXCEPTION`: linked to an accepted DesignException.
- `OPEN`: unresolved and blocks SC-002.

Candidate categories: color, spacing, radius, typography, shadow/elevation, button height, icon size/stroke, animation duration, spring. Counts are recorded before and after migration with the exact search method and commit.

The baseline and final audits must both cover raw colors, derived tints, semantic colors, typography, spacing/gutters, radii, shadow/elevation, opacity, layers/z-index, touch sizes, button heights, icon size/stroke, image constants, motion durations/easings/springs, duplicate components, button/input/card/sheet/navigation variants, and all duplicate design constants. Zero `OPEN` candidates is permitted only after every category is rechecked with its command, count, and commit recorded.

## Deterministic interactive-control inventory

Before runtime accessibility verification begins, list every shared interactive variant/state appearing in every screen family plus the first instance of every screen-private control type. Give each item a stable ID, route/surface, source location, state/variant, and expected target/role/name/state behavior. Verification consumes this frozen list and records PASS, FAIL, or BLOCKED for every item; discretionary omission is prohibited. A later-discovered control is added to the inventory and evidence ledger before final closure.

## Evidence record template

| Field | Required content |
|---|---|
| ID | Stable evidence identifier |
| Requirement | Spec/VR/SC/task IDs |
| Class | STATIC, BUILD_SMOKE, RUNTIME_VISUAL, RUNTIME_MOTION, RUNTIME_ACCESSIBILITY, RUNTIME_JOURNEY, STUDY |
| Status | PASS, FAIL, BLOCKED, UNVERIFIED |
| Environment | Commit SHA, build mode, platform, OS, device or viewport, browser if web |
| Preconditions | Real account/data state or truthful empty state; never fake records |
| Procedure | Exact command or user actions |
| Expected | Requirement-specific observable result |
| Observed | Factual result without inference |
| Artifact | Redacted log, screenshot, video, audit output, or notes |
| Blocker | Exact reason when not executed/passing |

## Required screen inventory baseline

- Global: root system UI, launch surface, navigation, sheet, toast, overlays, image/error, skeleton, empty/error states.
- Onboarding.
- Auth: sign in, sign up, forgot password, reset password, check email.
- Marketplace: Home, Explore/Browse, Search, Favorites, listing detail, seller detail.
- Selling/account: Sell, Profile, Edit Profile, Verify.
- Communication: Inbox, Chat, Notifications.
- Commerce: Checkout, Orders, Order detail.

Implementation refreshes this list before migration so newly added routes are included.

## Required state inventory

For each applicable family, record: loading, legitimate empty, populated with real data, image missing/error, inline/form/screen/network error, retry, focused, selected/checked, pressed, disabled, busy, keyboard open, safe-area extremes, increased text, screen reader, normal motion, and reduced motion.

An unreachable state is marked UNVERIFIED with its reason; it is not fabricated.

## Business-preservation checks

For each real journey, compare before and after:

- route destination and real UUID/parameter provenance;
- query or subscription source;
- NEW-only listing filtering/writing where listings are involved;
- authenticated seller/customer identity and authorization boundary;
- existing mutation and persisted result;
- authoritative success point;
- cross-account visibility where the journey requires it.

The feature may alter presentation props and shared wrappers, not these contracts.

If any family changes a route, real action, query/write contract, authorization boundary, persistence result, Realtime behavior, payment/order authority, or NEW-only behavior, that family stops. Reverse or correct only the feature-authored presentation hunk, preserve unrelated user changes, restore the recorded baseline, and log the regression. A proven defect requiring frozen-architecture work is reported separately and waits for explicit approval.

## Deterministic verification samples

- **Control/accessibility sample (SC-003)**: inventory every shared interactive variant/state appearing in every screen family and the first instance of every screen-private control type before testing; no post-sampling omission is allowed.
- **Neutral-palette sample (FR-009)**: capture a 10x10 equal-area grid on each representative resting screen, exclude product photos, avatars, system/status chrome, and transparent pixels, then classify the remaining cells. Aggregate acceptance is 85–95% white/neutral, 5–12% black, and <=3% genuine semantic color.
- **Press/performance sample (SC-005)**: 20 enabled presses per applicable button, icon-button, listing-card, selection, and favorite family on each executed platform class in a release-like build, measured by >=60 fps recording or a monotonic event/first-frame trace; p95 <=150 ms with zero duplicate actions and zero intended-scroll captures.
- **Long-list sample (FR-045)**: use at least 30 naturally existing real rows. If fewer exist, keep virtualization but mark the high-volume runtime cell UNVERIFIED; never create marketplace data to satisfy evidence.
- **Consistency study (SC-009)**: at least five people independent of implementation/design each judge 15 randomized, brand-masked SAWA screen pairs; every major family appears at least twice and >=68 of 75 same-product judgments is required.

## Originality review

Record asset provenance, layout composition, UX writing, icon treatment, motion signatures, and navigation treatment against every inspected reference. Completion requires no copied logo, asset, wording, distinctive composition, or branded interaction; general marketplace usability principles do not count as copying.

## Evidence boundaries

- Typecheck proves TypeScript compilation only.
- Lint proves configured static lint rules only.
- Static audit proves source classification only.
- Web export proves bundling only.
- Dashboard or database inspection proves stored rows only.
- Screenshot proves one rendered moment only.
- Runtime action observation proves only the named environment and procedure.
- SC-009 passes only after the specified moderated review with at least five participants.

No evidence class substitutes for another.
