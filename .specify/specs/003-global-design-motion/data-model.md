# Phase 1 Data Model: Design and Motion Foundation

**Feature**: `003-global-design-motion`  
**Persistence impact**: None. These are TypeScript design-domain contracts and audit records, not database tables.

## Boundary

This feature adds no Supabase table, column, enum, relationship, migration, Storage object, RLS policy, Realtime channel, Edge Function, Stripe field, or local marketplace record. Existing business entities and their real data sources remain unchanged.

The entities below model the presentation foundation and its evidence. They may be encoded as TypeScript values/types and Markdown evidence; they must not become a parallel marketplace persistence layer.

## Entity: DesignTokenRole

A named semantic choice consumed by screens and components.

| Field | Type | Rules |
|---|---|---|
| `domain` | `color | space | radius | typography | icon | touch | opacity | layer | elevation | duration | easing | spring` | Required; closed canonical domain list. |
| `name` | semantic string literal | Unique within its domain; describes purpose, not a screen. |
| `value` | domain-specific immutable value | Defined only in `src/theme/tokens.ts`. |
| `usage` | documentation string | Names allowed component/state contexts. |
| `accessibilityConstraints` | optional rules | Contrast, minimum target, reduced-motion, or non-color-signal constraints. |
| `platformVariant` | optional `ios/android/web` mapping | Allowed only for a real platform capability difference. |

### Validation

- Raw color, shadow, duration, spring, type, spacing, and radius definitions outside the canonical source are forbidden unless a DesignException records the need.
- Token names describe semantics (`textSecondary`, `durationFast`, `springSheet`) rather than routes (`sellGray`, `onboardingSpring`).
- Semantic colors represent real state only.
- Type roles contain size, weight, line height, and letter spacing as one treatment.
- All ordinary spacing values belong to 4, 8, 12, 16, 20, 24, 32, 40, or 48.

## Entity: TypographyRole

A specialized token grouping for a complete text treatment.

| Field | Type | Rules |
|---|---|---|
| `role` | `display | screenTitle | sectionTitle | cardTitle | body | bodyMedium | metadata | price | button | caption` | Exactly the specified set. |
| `fontFamily` | system sans or approved wordmark serif | Wordmark exception is not a general UI role. |
| `fontSize` | number | Tokenized and compatible with increased text size. |
| `fontWeight` | supported weight | Defined with the role. |
| `lineHeight` | number | Must avoid clipping at supported scaling. |
| `letterSpacing` | number | Defined with the role. |
| `defaultColorRole` | color role | Must pass the applicable contrast baseline on its intended surface. |

### Validation

- Screens select a role; they do not mix independent size/weight/line-height values.
- Price remains more prominent than metadata.
- Standalone readable labels and placeholders cannot use `textMuted`; a disabled button label uses `textSecondary`, canonical disabled opacity, and semantic disabled state.
- Text may wrap or layout may adapt under larger text; essential content cannot be clipped solely to preserve a fixed height.

## Entity: ComponentFamily

A reusable interaction or surface contract.

| Field | Type | Rules |
|---|---|---|
| `family` | `text | button | iconButton | pressable | input | card | selection | image | skeleton | emptyState | error | toast | sheet | navItem` | Required. |
| `variants` | closed variant map | Only variants with distinct semantics/layout are admitted. |
| `sizes` | canonical size map | Must respect 44x44 interactive minimum. |
| `states` | set of ComponentState | Every rendered state has visual and accessibility behavior. |
| `slots` | composition contract | Allows real content/actions without duplicating component families. |
| `motionRole` | optional MotionRole reference | State transition purpose, not an arbitrary config. |
| `accessibilityContract` | role/label/value/state/focus rules | Required for interactive families. |

### ComponentState

`idle | pressed | focused | selected | checked | filled | loading | disabled | success | warning | error`

Not every family uses every state. Unsupported states are excluded explicitly rather than rendered ambiguously.

### State transition rules

```text
idle -> pressed -> idle
idle -> focused -> filled/idle
idle/filled -> error -> focused/filled
idle -> loading -> success/error
idle <-> selected
idle <-> checked
any operable state -> disabled
disabled -X-> pressed/action
loading -X-> duplicate action
```

- A busy control cannot trigger its action twice.
- Success is entered only after the existing authoritative operation confirms success.
- Color is never the only state signal.
- A component that cannot execute a real action is not rendered as interactive.

## Entity: MotionRole

A named motion purpose and its accessible equivalent.

| Field | Type | Rules |
|---|---|---|
| `name` | `buttonPress | cardPress | selection | favorite | imageReveal | skeleton | toast | sheet | modal | navigation | onboarding` | Semantic role. |
| `driver` | `timing | spring | sequence | native` | Native is used for Expo Router Stack transitions. |
| `durationBand` | `instant | fast | standard | slow` | For timed motion only. |
| `springRole` | optional canonical spring | For physical motion only. |
| `properties` | set of transform/opacity/layout properties | Prefer transform and opacity for continuous feedback. |
| `interruptible` | boolean | Press/scroll-adjacent motion must be interruptible. |
| `reducedEquivalent` | ReducedMotionPolicy | Required. |
| `hapticEvent` | optional meaningful event | Never required for state or success. |

### Duration bands

- `instant`: 100–150 ms; exact token 120 ms
- `fast`: 160–200 ms; exact token 180 ms
- `standard`: 220–280 ms; exact token 240 ms
- `slow`: 300–400 ms; exact token 340 ms

Timed entry/state motion uses `easeStandard=[0.2,0,0,1]`; exit uses `easeExit=[0.4,0,1,1]`. Spring roles use the exact specification registry: `buttonPress` 0.70/420/30, `selection` 0.80/360/28, `cardPress` 0.80/320/28, `favorite` 0.65/500/24, `sheet` 1.00/320/32, and `modal` 0.90/300/30 (mass/stiffness/damping), all overshoot-clamped and subject to the specification's settle/cancellation constraints.

### Motion transitions

```text
button:   1.00 -> 0.97 -> 1.00
card:     1.00 -> 0.98 -> 1.00
favorite: 1.00 -> 1.15 -> 1.00
image:    loading opacity -> visible opacity
sheet:    closed below viewport -> open resting position -> closed
toast:    absent -> visible -> dismissed
```

Every transition is cancelable or reconciles to its current real state. Animation never owns the business action result.

## Entity: ReducedMotionPolicy

| Field | Type | Rules |
|---|---|---|
| `systemRequested` | boolean | Derived from platform accessibility settings, not user marketplace data. |
| `allowOpacity` | boolean | At most one opacity replacement <=120 ms may remain where state clarity benefits. |
| `allowScale` | boolean | False for non-essential scale when reduction is requested. |
| `allowTravel` | boolean | False for non-essential spatial travel. Native navigation uses the least disorienting supported option. |
| `allowRepeat` | boolean | False for shimmer/repeated decorative motion. |
| `stateFeedback` | immediate perceivable update | Must remain present. |

The policy is local presentation state and does not require a schema field. It is re-evaluated when the platform setting changes during an active session.

## Entity: ScreenMigrationRecord

The traceable unit for repository-wide migration completion.

| Field | Type | Rules |
|---|---|---|
| `routeOrSurface` | existing route path or shared surface ID | Must map to real code. |
| `family` | screen-family identifier | Used for migration order. |
| `sourceFiles` | repository paths | All touched presentation owners. |
| `reachableStates` | list | Loading, empty, error, offline, populated, disabled, focus, selection, pressed, reduced motion as applicable. |
| `tokenFindings` | audit references | Each candidate is migrated or excepted. |
| `componentMappings` | old-to-canonical mappings | Identifies consolidation. |
| `behaviorBaseline` | real route/action/data result | Captured before presentation change. |
| `behaviorResult` | post-change observed result | Must match baseline. |
| `viewportChecks` | iOS <=375x667/>=430x932 pt; Android <=360x640/>=412x915 dp; web 360/1280 CSS-px observations | Native portrait only; unsupported environments are not silently omitted. |
| `accessibilityChecks` | target, semantics, reading order, text size, focus | Runtime where required. |
| `motionChecks` | normal/reduced/performance observations | Runtime where required. |
| `exceptions` | DesignException references | Empty if none. |
| `status` | `not_started | in_progress | migrated | blocked` | `migrated` requires required evidence, not source edits alone. |

### Migration state transition

```text
not_started -> in_progress -> migrated
                         \-> blocked
blocked -> in_progress   (when prerequisite becomes available)
```

No record moves to `migrated` solely because static checks pass.

## Entity: DesignException

A narrowly scoped, reviewable departure from the foundation.

| Field | Type | Rules |
|---|---|---|
| `id` | stable identifier | Unique in evidence ledger. |
| `location` | file and component/route | Exact target. |
| `canonicalRule` | token/contract reference | Rule being departed from. |
| `need` | user, platform, measured layout, or asset constraint | Required and concrete. |
| `scope` | smallest affected surface | Cannot silently become a precedent. |
| `alternativeRejected` | explanation | Why the canonical path cannot satisfy the real need. |
| `verification` | evidence requirement | Shows the exception remains usable and accessible. |
| `reviewStatus` | `proposed | accepted | rejected | removed` | Accepted only after review. |

Pure preference, deadline pressure, or visual novelty is not a valid need.

## Entity: VerificationEvidence

| Field | Type | Rules |
|---|---|---|
| `requirement` | VR/SC/task ID | Traceable to a required claim. |
| `evidenceClass` | `static | build_smoke | runtime_visual | runtime_motion | runtime_accessibility | runtime_journey | study` | Prevents category substitution. |
| `status` | `PASS | FAIL | BLOCKED | UNVERIFIED` | Required. |
| `environment` | commit, platform, device/viewport, runtime | Required for executed checks. |
| `procedure` | exact commands/actions | Reproducible. |
| `observed` | factual result | No inference beyond observation. |
| `artifacts` | screenshots/video/logs/audit IDs | Optional but recommended. |
| `blocker` | exact reason | Required for BLOCKED/UNVERIFIED. |

### Evidence rules

- Static evidence cannot satisfy runtime visual, motion, performance, accessibility, journey, or study requirements.
- A screenshot does not prove action persistence or animation performance.
- A successful journey with one account does not prove the second-account requirement.
- `expo export` is a bundle smoke test, not a browser runtime test.
- SC-009 requires the specified moderated five-participant study; it cannot be inferred from developer review.

## Relationships

```text
DesignTokenRole ----< ComponentFamily >---- MotionRole
        |                    |                    |
        |                    v                    v
        +-----------> ScreenMigrationRecord <----+
                              |
                              +----< DesignException
                              |
                              +----< VerificationEvidence
```

These relationships are documentation and TypeScript composition only. They do not authorize a database or analytics schema.
