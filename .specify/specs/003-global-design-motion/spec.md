# Feature Specification: Global Design System and Motion Foundation

**Feature Branch**: `003-global-design-motion`

**Created**: 2026-08-17

**Status**: Draft

**Input**: User description: "Establish one global visual, interaction, motion, spacing, typography, component, accessibility, responsive, and migration foundation for every existing and future SAWA screen without changing marketplace business behavior or frozen backend architecture."

---

## Design Reality & Scope Boundaries *(read first)*

This feature makes every existing and future SAWA surface feel like one premium marketplace product. It establishes shared rules, consolidates the reusable presentation layer where safe, and migrates existing screens to those rules. It does not add marketplace capabilities, create or alter marketplace data, or redesign any journey's business behavior.

The intended character is Airbnb-level interaction craft plus Vinted-style marketplace usability, expressed through an original SAWA identity. These references describe a quality bar, not a license to copy another product's layouts, assets, wording, or distinctive visual treatment.

### Included screen families

The migration covers every routable screen that exists when implementation begins, including:

- onboarding;
- authentication, account recovery, and verification;
- Home, Browse, and Search;
- listing detail and seller profile;
- Favorites;
- Sell;
- Inbox and Chat;
- Notifications;
- Profile and profile editing;
- Checkout;
- Orders and order detail;
- global navigation, overlays, sheets, toasts, loading states, empty states, and errors;
- application icon/adaptive icon backgrounds, splash/launch treatment, system bars, and the root pre-route surface.

New screens created after this feature must use the same foundation. The visible primary navigation labels are Home, Browse, Sell, Inbox, and Profile; Browse maps to the existing marketplace-browsing destination and does not create a new business route.

### Excluded changes

This feature must not:

- change the database schema, migrations, row-level security, grants, or policies;
- change authentication, Realtime, Stripe, checkout, order, Edge Function, or payment architecture;
- change marketplace queries or writes unless an independently proven user-interface defect requires a narrowly scoped correction and receives the approval required by the SAWA Constitution;
- add fake listings, people, images, counts, ratings, delivery facts, orders, messages, or payment states;
- add dark mode;
- rebuild working screens or journeys merely to make them look different;
- introduce a separate visual system for onboarding, authentication, or any feature area.

### Canonical visual language

The fixed light palette and its exact semantic tokens are:

| Token role | Value | Normative use |
|---|---|---|
| `background` | `#FFFFFF` | Primary application canvas and launch background |
| `primary` | `#111111` | Primary actions and strongest emphasis |
| `textPrimary` | `#111111` | Default readable text and icons on light surfaces |
| `textInverse` | `#FFFFFF` | Text and icons on `primary` or another approved dark surface |
| `textSecondary` | `#717171` | Supporting copy, placeholders, inactive navigation, and all readable low-priority metadata |
| `textMuted` | `#9A9A9A` | Non-readable decoration or appropriately non-essential disabled treatment only; never a standalone readable label, other readable text, or a placeholder |
| `surface` | `#F7F7F5` | Grouped neutral surfaces |
| `surfaceSecondary` | `#F2F2F0` | Recessed areas and image wells |
| `skeletonBase` | `#ECECEA` | Skeleton body |
| `skeletonHighlight` | `#F7F7F5` | Subtle skeleton highlight in normal-motion mode |
| `border` | `#E5E5E5` | Subtle separation |
| `borderStrong` | `#D5D5D5` | Focus and stronger neutral separation |
| `success` | `#16835B` | Confirmed positive status and readable success text on white |
| `error` | `#D64545` | Error iconography, borders, and large graphical signal |
| `errorText` | `#B42318` | Normal-size readable error text on white |
| `warning` | `#C58A20` | Warning iconography, borders, and large graphical signal |
| `warningText` | `#71520A` | Normal-size readable warning text on white |
| `overlay` | `rgba(0,0,0,0.28)` | Modal and sheet scrim |
| `floatingSurface` | `rgba(255,255,255,0.92)` | Controls floating over photography |

WCAG 2.2 Level AA is the normative minimum contrast baseline for this feature. Normal-size readable text requires at least 4.5:1 contrast; large text and non-text interactive boundaries require at least 3:1 where the criterion applies. `textMuted` is 2.81:1 on white and therefore cannot carry standalone readable labels, placeholders, errors, prices, navigation labels, or readable metadata. Disabled button labels use `textSecondary #717171`, combined with the canonical disabled opacity and explicit disabled semantics; disabled state is also exposed through structure rather than relying on color or opacity alone. The darker `errorText` and `warningText` roles exist because the base error and warning signal colors do not meet 4.5:1 for all normal-text use on white.

Only the listed opaque roles, the listed alpha roles, and the following centrally derived state surfaces are permitted: success surface `#EAF5F0`, error surface `#FCEEEE`, and warning surface `#FBF5E8`. A new tint requires a documented contrast need, must be derived from an existing semantic role, and must be added to the one canonical token source before use. It cannot become a brand accent or screen-local palette.

The 90/8/2 balance is reviewable guidance, not a claim about user photography. For each route family, the migration record samples the default resting chrome of one populated real state or truthful empty state using a 10 by 10 grid over a representative screenshot, excluding product photography, avatars, system chrome, and semantic status content. Across the aggregate sample, 85–95 cells per hundred must be white/neutral, 5–12 must be near-black, and no more than 3 may be semantic color. Any exception is recorded rather than hidden by averaging. “Ordinary use” means a non-error, non-success, non-modal resting screen state.

Orange-heavy branding, teal-heavy branding, random gradients, rainbow decoration, arbitrary screen-specific colors, and semantic color used only to attract attention are prohibited. Success and warning colors are allowed only for real status and remain exceptions to the Constitution's default error-only color rule, not decorative accents.

### Canonical spatial and shape language

- The shared spacing rhythm is 4, 8, 12, 16, 20, 24, 32, 40, and 48.
- Normal horizontal screen padding is 20–24 pixels. Full-bleed photography and documented space-constrained compositions may intentionally break the gutter, but arbitrary 17, 19, 23, or 27 pixel margins are not part of the shared rhythm.
- Canonical radii are small 8, medium 12, large 16, extra-large 20, sheet 24, and pill 999.
- Photography normally uses a 12–16 pixel radius. Sheets use a 24 pixel top radius.
- Radius communicates component family and hierarchy; containers are not rounded by default.
- Shadows are quiet and reserved for genuinely floating elements such as elevated controls, toasts, sheets, and modals. Marketplace grids remain image-first and visually light.

The normative token registry for space, shape, elevation, opacity, layering, and touch size is:

- Spacing tokens are `space4=4`, `space8=8`, `space12=12`, `space16=16`, `space20=20`, `space24=24`, `space32=32`, `space40=40`, and `space48=48` pixels. Zero is permitted where no separation is intended. Hairlines and asset geometry are not spacing tokens.
- `gutterCompact=20` applies below 390 logical pixels wide; `gutterRegular=24` applies at 390 logical pixels and above.
- Radius tokens are `radiusSmall=8`, `radiusMedium=12`, `radiusLarge=16`, `radiusXLarge=20`, `radiusSheet=24`, and `radiusPill=999`. Non-pill rounded surfaces use continuous corner curves where supported.
- Listing and thumbnail photography uses 12–16 pixels according to its component family; sheets use only the 24 pixel top radius; buttons and fields use 12 pixels; toasts use 16 pixels. Ordinary grouping containers have no radius unless they are one of these named families.
- Elevation tokens are `raised="0 1px 4px rgba(17,17,17,0.08)"`, `floating="0 6px 18px rgba(17,17,17,0.12)"`, and `sheet="0 -10px 32px rgba(17,17,17,0.12)"`. Listing grids and ordinary cards have no shadow. React Native `boxShadow` is used where supported; a canonical border, not a screen-local legacy shadow/elevation value, is the fallback when a target cannot render it.
- Opacity tokens are `disabled=0.44`, `pressed=0.82`, `scrim=0.28`, `skeletonLow=0.55`, and `skeletonHigh=1`. State cannot be communicated by opacity alone.
- Layer tokens are `base=0`, `sticky=10`, `floating=20`, `overlay=40`, `modal=50`, and `toast=60`. A screen cannot invent a z-index ladder.
- Touch-size tokens are `minimum=44`, `standard=48`, and `large=56`. A visually compact control can be smaller only inside an effective hit target of at least 44 by 44 pixels.

“Ordinary layout” means screen content that is neither full-bleed media nor a platform-owned control. Full-bleed product photography can extend to the viewport edge. A space-constrained composition can use a different measured value only when the nearest canonical step would make required content or a 44 pixel target impossible; the exact measurement, affected surface, and reason become a DesignException. Asset bounds, one-pixel hairlines, safe-area insets, keyboard measurements, and aspect-ratio calculations are geometry rather than additions to the spacing scale.

### Canonical type roles

Every text treatment maps to one of these roles: display, screen title, section title, card title, body, body medium, metadata, price, button, or caption. Roles define size, weight, line height, and letter spacing as one unit. Prices remain visually prominent on marketplace surfaces. The existing system typography direction remains in force; screens cannot create an independent type ramp or a separate onboarding font hierarchy.

Interface text uses the platform system sans. Instrument Serif remains limited to the existing SAWA wordmark; Manrope and Instrument Sans do not define separate interface hierarchies. The exact treatments are:

| Role | Size | Line height | Weight | Letter spacing | Scaling and use |
|---|---:|---:|---:|---:|---|
| `display` | 34 | 40 | 700 | -0.8 | Hero statement; wraps rather than shrinking |
| `screenTitle` | 29 | 35 | 700 | -0.6 | Top task title where a native stack title is not appropriate |
| `sectionTitle` | 21 | 27 | 700 | -0.4 | Major in-screen section |
| `cardTitle` | 15 | 20 | 600 | -0.1 | Listing and compact-card title |
| `body` | 16 | 23 | 400 | 0 | Default readable content |
| `bodyMedium` | 16 | 23 | 600 | 0 | Emphasized body and labels |
| `metadata` | 13 | 18 | 400 | 0 | Secondary details using `textSecondary` |
| `price` | 18 | 23 | 700 | -0.3 | Marketplace price with tabular numerals |
| `button` | 16 | 20 | 600 | 0 | Button and primary control label |
| `caption` | 12 | 16 | 500 | 0 | Non-essential caption that remains readable |

All roles permit system text scaling through 200%. Essential labels, prices, errors, and controls do not opt out of scaling. Text wraps or the surrounding layout grows; fixed-height clipping and ellipsis of essential task information are prohibited. A private asset label or measured wordmark can use a documented non-scaling exception, but it cannot become a general text role.

The exact icon roles are:

| Role | Glyph box | Stroke/weight | Use |
|---|---:|---|---|
| `iconMetadata` | 16 | 1.75 / regular | Inline metadata and status support |
| `iconInline` | 20 | 1.75 / regular | Field adornments and row actions |
| `iconNavigation` | 24 | 2.0 / medium | Bottom navigation and primary navigation actions |
| `iconAction` | 24 | 2.0 / medium | Standalone icon buttons inside a 44+ target |
| `iconHero` | 28 | 2.25 / semibold | Empty states and high-emphasis controls |

Icons remain on a 24-unit optical grid unless the source asset requires a documented adjustment. Selected state uses fill, weight, an indicator, or an accessible selected value in addition to color.

### Canonical image roles

| Image role | Aspect ratio (width:height) | Radius | Fit and fallback |
|---|---:|---:|---|
| Listing grid and rail | `3:4` | 16 | Cover; neutral image-error well |
| Listing detail gallery | `393:430` | 0 when full bleed | Cover; neutral full-size error well |
| Conversation and order thumbnail | `3:4` | 8 | Cover; neutral compact error well |
| Category/search tile | `1:1` | 12 | Cover; neutral category well when no real source exists |
| Profile/avatar | `1:1` | Pill/circle | Cover; real initials/avatar-color fallback only |
| Sell composer tile | `3:4` | 12 | Cover preview; full preview preserves prepared-source dimensions |

Content-bearing images expose a meaningful label or are grouped with adjacent labeled content; decorative duplicates are hidden from assistive technology. `expo-image` owns decode, caching, and the canonical 240 ms reveal. A missing or failed product source never selects bundled or generated product photography.

### Canonical component and state criteria

| Family | Objective geometry and hierarchy | Required states and behavior |
|---|---|---|
| Button | Standard minimum height 48, horizontal padding 24, radius 12; compact visual height 40 only inside a 44+ target | Primary, secondary, ghost, icon; idle, pressed, focused, disabled, busy. Disabled readable labels use `textSecondary` plus `disabled=0.44` and semantic disabled state, never `textMuted`; busy blocks duplicate activation; labels scale and the control grows vertically. |
| Input | Minimum height 52, horizontal padding 16, radius 12, one-pixel border and two-pixel focused outline/indicator | Default, focused, filled, error, disabled; persistent label, associated hint/error, correct keyboard behavior, no color-only focus/error. |
| Listing card | No outer box shadow or decorative border; 3:4 image at radius 16, 8 pixel content gap, price before metadata | Image loading/error, pressed, favorite selected/busy, real navigation target; price uses `price`, title uses `cardTitle`, metadata uses `metadata`. |
| Selection | At least 44 by 44 target; selection marker and label remain visible | Idle, focused, selected/checked, disabled, busy where persisted; state uses structure/icon/weight and accessibility state, not color alone. |
| Skeleton | Destination dimensions; base/highlight tokens only | 120 ms show delay, 180 ms minimum shown time, 240 ms replacement; static in reduced motion. |
| Empty state | Hero icon 28, title `sectionTitle`, body `body`, 16 pixel internal gap | Optional action appears only when a real action exists; no fabricated rows, counts, people, or product imagery. |
| Error | Inline/form/screen/retry/network variants | Human-readable message, associated announcement, retry only when real and one-flight; raw service/database strings are not exposed. |
| Toast | Edge inset 16, radius 16, maximum readable width 360, floating shadow | Neutral/success/error only for an authoritative outcome; 240 ms fade/short movement, opacity-only under reduced motion. |
| Bottom sheet | Top radius 24, scrim 28%, content padding 24, internal gap 16, drag indicator, safe-area bottom padding | Short/long/keyboard states, scrolling content, sticky action, safe dismissal, focus transfer and restoration. |
| Primary navigation | White bar, one-pixel top divider, 44+ targets, 24 pixel icons | Home/Browse/Sell/Inbox/Profile; selected uses weight/fill/indicator plus accessible state; Sell is the centered/highest-emphasis action without gradient, decorative badge, or a new route. |

In acceptance language, “quiet” shadow means only the three elevation tokens and none on ordinary cards; “subtle” motion means the specified scale delta is <=0.15 and uses a named duration/spring; “restrained” means the spring obeys the table's overshoot and settle limit; “comfortable” sheet spacing means 24 pixel content padding and 16 pixel internal gaps; “prominent” means the single primary action has the strongest black/white contrast and precedes secondary actions in task order; “minimal” means no decorative gradient, particle, redundant badge, or color that lacks state meaning. “Premium” is not a standalone pass criterion: it is assessed through hierarchy, alignment, token consistency, motion timing, state completeness, and the moderated consistency method below.

### Canonical motion language

Motion is smooth, premium, confident, subtle, and purposeful. The shared duration bands are:

| Role | Duration range | Typical meaning |
|---|---:|---|
| Instant | 100–150 ms | Immediate acknowledgment |
| Fast | 160–200 ms | Presses and small selection changes |
| Standard | 220–280 ms | Fades and ordinary transitions |
| Slow | 300–400 ms | Sheets and longer travel |

Shared spring roles cover button press, selection, sheet, modal, card, and favorite feedback. Each role has one consistent, restrained physical character; excessive bounce is prohibited.

The exact duration tokens are `instant=120 ms`, `fast=180 ms`, `standard=240 ms`, and `slow=340 ms`; each remains inside its named band above. Timed motion uses `easeStandard=[0.2,0,0,1]` for entry/state change and `easeExit=[0.4,0,1,1]` for exit.

The exact Reanimated spring presets are:

| Spring role | Mass | Stiffness | Damping | Overshoot clamped | Acceptance constraint |
|---|---:|---:|---:|---|---|
| `buttonPress` | 0.70 | 420 | 30 | Yes | Returns to within 0.005 scale of rest in <=300 ms |
| `selection` | 0.80 | 360 | 28 | Yes | No visible secondary oscillation |
| `cardPress` | 0.80 | 320 | 28 | Yes | Cancels cleanly when the gesture becomes a scroll |
| `favorite` | 0.65 | 500 | 24 | Yes | One explicit 1.15 peak; no additional bounce |
| `sheet` | 1.00 | 320 | 32 | Yes | Settles within 1 pixel in <=400 ms |
| `modal` | 0.90 | 300 | 30 | Yes | Settles within 1 pixel in <=360 ms |

No screen-local spring is permitted. Runtime tuning can change a value only after evidence is recorded and the canonical table is updated first; it cannot create a route-specific preset.

The standard behaviors are:

- buttons compress from 1.0 to 0.97 and return to 1.0;
- listing cards compress from 1.0 to 0.98 and return without disrupting scroll;
- favorite controls animate 1.0 to 1.15 to 1.0 without particles;
- images fade from transparent to visible, and skeletons fade smoothly into real content;
- forward navigation uses a small horizontal movement with a fade, Back reverses that relationship, modals use a restrained fade/scale or appropriate native transition, and sheets move vertically with a restrained spring;
- onboarding story content uses fade plus subtle translation, hero imagery may settle from 1.03 to 1.0, progress changes animate, and calls to action use the same press language as the rest of SAWA;
- users requesting reduced motion receive a non-disorienting experience that removes non-essential scale and travel while preserving state changes and completion feedback.

The normative interpretation of those behaviors is:

- Images reveal over `standard` (240 ms). A skeleton waits 120 ms before appearing, remains visible for at least 180 ms once shown, and cross-fades over 240 ms so fast content never flashes.
- Forward navigation uses the existing native Expo Router Stack directional transition and Back its native reverse. Peer-tab changes do not imitate stack travel and use only the 180 ms selection response. Modals retain the appropriate native modal/fade presentation. Sheets use the `sheet` spring and a 240 ms scrim fade. Platform-owned native transition duration can differ when the API does not expose exact timing, but the semantic transition family cannot drift.
- Reduced motion produces immediate endpoint state: no press/card/favorite/hero scale, translation, spring overshoot, or repeating skeleton shimmer. A single opacity transition of at most 120 ms can remain when it clarifies replacement; progress and completion feedback remain explicit.
- Haptics are best-effort and never the sole feedback channel. The exhaustive allowed events are a real favorite state confirmed, a selection that commits a value, entry into the existing Sell action, an authoritatively confirmed listing publication, an authoritatively sent offer, and completion of an existing high-consequence action that already required explicit confirmation. “High consequence” means an irreversible or externally visible persisted change; navigation, typing, ordinary saves, retries, errors, scrolling, image loading, and ordinary taps never vibrate. This feature cannot add a business confirmation merely to justify haptics.

### Pre-route and system surfaces

The light-only foundation includes the application icon backgrounds, adaptive/monochrome icon treatment, splash/launch background and mark, status/navigation system bars, root navigation container, and first painted route surface. The splash and adaptive-icon background are `background`; marks and monochrome foregrounds are `primary` or `textInverse` as required by the platform mask. Blue starter backgrounds and automatic dark appearance are outside the feature. Product photographs, marketplace claims, and fake content never appear in launch/icon assets. Any changed non-system brand asset must have documented provenance and must not reproduce another marketplace's logo or distinctive composition.

### Responsive, accessibility, and performance baseline

- Portrait is the supported native orientation because the existing application configuration locks portrait. Landscape is explicitly outside this feature; if orientation support changes later, every responsive requirement must be re-run before it is claimed supported.
- The normative small viewport is no larger than 375 by 667 logical pixels on iOS and 360 by 640 on Android. The normative large viewport is at least 430 by 932 on iOS and 412 by 915 on Android. A physical device can substitute only when its logical viewport meets the corresponding threshold; the exact viewport is recorded.
- Existing web surfaces are checked at 360 pixels and 1280 pixels CSS width. This does not add a desktop information architecture.
- Text scaling is required through 200%. A control can grow vertically, a label can wrap, and a row can reflow; essential text cannot be clipped to preserve a fixed design height.
- WCAG 2.2 AA is the minimum contrast/operability baseline. Every focusable web control has a visible focus indicator of at least a two-pixel `primary` outline or equally perceivable platform-native focus treatment. Native controls expose role, name, value/state, disabled state, and busy state where applicable.
- Long content means any remote-backed collection that is not contractually capped below 20 rows or whose contents can grow across sessions. It uses virtualization regardless of the row count currently present. Runtime high-volume evidence requires at least 30 naturally existing real rows; if fewer exist, implementation still uses virtualization and the high-volume runtime cell is UNVERIFIED rather than creating data.
- Performance is evaluated in a release-like build on each available small and large native target. Target/aspiration: 60 fps on a 60 Hz display. Measured acceptance threshold: >=55 observed fps during a 10-second scroll/interaction sample; the aspiration is not the pass threshold. No input or visual stall may exceed 100 ms. On other refresh rates, the equivalent frame-budget ratio applies. A missed acceptance threshold is reported as FAIL or UNVERIFIED, never silently reclassified as acceptable lower-end degradation.
- Press acknowledgment uses 20 recorded enabled presses for each applicable family—button, icon button, listing card, selection, and favorite—on each executed platform class. A 60 fps or higher screen recording or an instrumented monotonic event/first-frame trace supplies the measurement. The p95 start latency must be <=150 ms, with zero duplicate actions and zero intended-scroll captures in the sample.

### Verification sampling and originality review

- The SC-003 control sample is deterministic: for every screen family, include every shared interactive component variant/state that appears there plus the first instance of each screen-private control type. The migration inventory names the controls before testing; a reviewer cannot omit a failure after sampling begins.
- The complete screen inventory is refreshed immediately before migration and immediately before final verification. Newly added routes and global overlays are added to the ledger even when only a truthful empty state is reachable.
- Originality review is split by ownership: User Story 1 covers asset provenance, layout composition, UX writing, icons, and static navigation treatment; User Story 2 covers motion signatures and animated navigation treatment after motion exists. Together they must find no copied logo, asset, text, distinctive screen composition, or branded interaction from Airbnb, Vinted, or another marketplace. General quality principles—hierarchy, image-first commerce, direct task flow—are allowed. The reviewer records each reference inspected and the SAWA-specific decision that replaces imitation.
- The SC-009 study recruits at least five participants who did not implement or design the feature. Each participant reviews 15 randomized SAWA screen pairs with route names, wordmark, and other direct brand labels masked; every major screen family appears in at least two pairs. Participants answer only whether each pair appears to belong to the same product. At least 68 of 75 judgments must answer yes to satisfy the >=90% criterion. Device, pair set, participant independence, and raw totals are recorded without personal data.
- Typecheck, lint, static audits, bundle export, screenshots, runtime visual observation, runtime motion/performance observation, accessibility observation, journey regression, and moderated-study evidence remain separate classes. None substitutes for another.

### Migration sequence and stop rules

Migration proceeds by the route families in the plan: foundation/global chrome; onboarding/auth; marketplace discovery/detail; Sell/profile; messaging/notifications; checkout/orders. For each family, the migration record captures the pre-change route, data source, action, authorization, persistence, NEW-only behavior, and reachable states; applies only presentation changes; runs the available static/runtime checks; and records exceptions before the next family is closed.

| Migration family | Required design-system coverage | Behavior that must remain authoritative |
|---|---|---|
| Pre-route and global chrome | Launch/icon/system colors, root background, stack presentation, Home/Browse/Sell/Inbox/Profile bar, headers, overlays, sheets, toasts | Existing route groups, guards, Back behavior, `/explore` destination, real actions |
| Onboarding and authentication | Global type/spacing/buttons/fields/motion/reduced motion, keyboard and safe-area states | Completed onboarding persistence, Supabase Auth/session/recovery architecture |
| Home, Browse, Search, Favorites | Image-first cards, grids/lists, filters, skeleton/empty/error/refresh, selection/navigation | Real NEW-only queries, real categories/results, real UUID routes, favorite persistence |
| Listing and seller detail | Gallery/image errors, price/seller metadata, actions, sheets, loading/error | Real UUID reload, real seller/listing data, NEW-only visibility, existing authorized actions |
| Sell, Profile, Edit Profile, Verify | Step/form hierarchy, photos, fields, selection, busy/progress/error, sticky actions | Existing schema-supported writes, authenticated identity, publication/profile authority |
| Inbox, Chat, Notifications | Conversation/order thumbnails, long-list virtualization, composer/actions, loading/empty/error | Real participants/messages/notifications, existing Realtime/data behavior and destinations |
| Checkout, Orders, Order detail | Form/summary/status hierarchy, skeleton/empty/error, keyboard/sticky actions | Stripe test-mode boundary, webhook authority, real orders/statuses, no client-paid state |

If a presentation change alters a route destination, real action, query/write contract, authorization boundary, persisted outcome, Realtime behavior, Stripe/payment/order authority, or NEW-only rule, work on that family stops. Only the feature-authored presentation hunk is reversed or corrected; unrelated user changes are preserved. The baseline is restored and the regression is recorded. A required frozen-architecture change is reported as a separate proven defect and waits for explicit approval. It is never smuggled into this feature or hidden by marking the route migrated.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Experience One Coherent SAWA Product (Priority: P1)

As a customer moving between SAWA screens, I experience one recognizable visual hierarchy and component language instead of a collection of independently styled screens.

**Why this priority**: Product-wide coherence is the purpose of the feature and directly affects trust in a marketplace.

**Independent Test**: Traverse every existing screen family using real reachable data or legitimate empty states and verify that palette, typography, spacing, radius, icon sizing, component family, image geometry, and visual hierarchy map to the canonical roles without changing what the screens do. Motion correctness is independently owned by User Story 2; loading/error behavior is independently owned by User Story 3.

**Acceptance Scenarios**:

1. **Given** a person navigates across onboarding, authentication, Home, Browse, listing detail, Sell, messaging, profile, checkout, and orders, **When** each surface appears, **Then** the same canonical palette, type hierarchy, spacing rhythm, image roles, and component families are recognizable throughout.
2. **Given** launch/root chrome, primary navigation, and a representative screen from each family are visible, **When** their static presentation is compared, **Then** their colors, type, spacing, radii, icon roles, and image geometry map to the same canonical registry without relying on User Story 2 motion or User Story 3 state behavior.
3. **Given** a new screen is added after this foundation, **When** its design is reviewed, **Then** every visual and interaction choice maps to an existing canonical role or is formally added to the one shared foundation before use.

---

### User Story 2 - Receive Consistent Interaction Feedback (Priority: P1)

As a person tapping, selecting, favoriting, opening a sheet, or navigating, I receive immediate and consistent feedback that makes the interface feel responsive without becoming distracting.

**Why this priority**: Consistent feedback makes controls understandable, reinforces trust, and prevents premium polish from being reduced to static styling.

**Independent Test**: Exercise each canonical interaction family on a supported device, compare timing and physical character, verify that controls do not fire twice or interfere with scrolling, and repeat with reduced motion enabled.

**Acceptance Scenarios**:

1. **Given** an enabled button is pressed, **When** the press begins and ends, **Then** it acknowledges the press within the instant/fast timing bands and returns smoothly without delaying the action.
2. **Given** a listing card is pressed while its collection can scroll, **When** the user presses, drags, or releases, **Then** the subtle card response never captures or degrades normal scrolling.
3. **Given** a favorite action succeeds, **When** the state changes, **Then** the heart uses the canonical 1.0 → 1.15 → 1.0 motion and only uses a subtle meaningful haptic where haptics are supported.
4. **Given** a sheet opens or closes, **When** the transition runs, **Then** the overlay, surface, drag indicator, spacing, action placement, and vertical motion behave as one consistent sheet family.
5. **Given** reduced motion is enabled, **When** the same interactions occur, **Then** state remains clear without non-essential zoom, bounce, or long spatial travel.

---

### User Story 3 - Understand Loading, Empty, and Error States (Priority: P1)

As a person waiting for or unable to retrieve real content, I see a polished and truthful state with a useful action rather than fake content, exposed technical errors, or a blank surface.

**Why this priority**: Empty and failure states are normal in an early marketplace and are governed by SAWA's no-fabricated-data rule.

**Independent Test**: Reach real loading, empty, form-error, screen-error, and network-error states across representative screen families and verify shared structure, truthful language, accessible announcements, and working retry actions.

**Acceptance Scenarios**:

1. **Given** content is loading, **When** its destination layout is known, **Then** a matching canonical skeleton appears with subtle motion and transitions smoothly to the real content.
2. **Given** a product image is unavailable or fails, **When** the image surface renders, **Then** SAWA shows a neutral non-product error treatment and never substitutes fake product photography.
3. **Given** a real collection is empty, **When** the screen settles, **Then** a minimal icon, clear title, short explanation, and only a real usable action are shown.
4. **Given** a request fails, **When** the error is presented, **Then** the message is concise, does not expose unnecessary service details, and offers Retry or another truthful corrective action where one exists.
5. **Given** an action has genuinely completed, **When** a toast is shown, **Then** it uses the shared high-contrast toast treatment and subtle fade/vertical motion; no success toast appears before success is authoritative.

---

### User Story 4 - Use SAWA Across Supported Phones and Assistive Settings (Priority: P1)

As a person using a small or large supported phone, keyboard, screen reader, larger text, or reduced motion, I can understand and operate the same real journeys without clipped content or inaccessible controls.

**Why this priority**: Accessibility and responsive behavior are foundation requirements, not optional polish.

**Independent Test**: Run representative journeys on small and large iOS and Android viewports, with safe-area variations, keyboard open, increased text size, VoiceOver/TalkBack, keyboard navigation where supported, and reduced motion.

**Acceptance Scenarios**:

1. **Given** any interactive control, **When** it is measured and inspected, **Then** its effective target is at least 44 by 44 pixels and its role, label, state, and disabled/busy status are conveyed correctly.
2. **Given** a selected, checked, focused, disabled, loading, success, warning, or error state, **When** a person cannot distinguish color, **Then** text, shape, weight, iconography, or accessibility state still communicates the meaning.
3. **Given** a small phone, large phone, notch, Dynamic Island, home indicator, or on-screen keyboard, **When** a journey is completed, **Then** primary content and actions remain reachable without fixed-height clipping or unsafe-area overlap.
4. **Given** larger text or a screen reader, **When** controls and status messages are traversed, **Then** labels remain meaningful, reading order remains logical, state changes are announced appropriately, and core tasks remain completable.
5. **Given** a web-capable existing surface, **When** it is operated by keyboard, **Then** focus order and semantics are usable without inappropriate web-only semantics being imposed on native controls.

---

### User Story 5 - Preserve Every Existing Real Journey (Priority: P1)

As a current SAWA user, I retain the same real accounts, listings, messages, purchases, orders, and navigation outcomes after the visual migration.

**Why this priority**: A visually improved screen that breaks real behavior violates the Constitution and is not a successful migration.

**Independent Test**: Execute the existing real-journey regression set before and after migration and compare route destinations, persisted outcomes, real data shown, loading/error behavior, and available actions.

**Acceptance Scenarios**:

1. **Given** an existing control performs a real action, **When** its presentation is migrated, **Then** it retains the same authorized outcome and never becomes decorative or dead.
2. **Given** an existing screen reads real marketplace data, **When** it is migrated, **Then** it still presents only real data and preserves NEW-only listing behavior.
3. **Given** a checkout, payment, authentication, messaging, listing, or order journey, **When** its visual regression test runs, **Then** no architecture, persistence contract, authorization boundary, or authoritative status transition has changed.
4. **Given** safe consolidation would require changing working business behavior, **When** the conflict is discovered, **Then** the business behavior is preserved and the visual exception is documented for later review rather than forcing a risky rewrite.

### Edge Cases

- A surface needs full-bleed product photography while the rest of the screen follows the standard 20–24 pixel gutter.
- A label grows because of localization or larger text and cannot fit the default one-line arrangement.
- A device is narrow or short, is interrupted by a keyboard, or has unusually large safe-area insets; native landscape is not claimed while the application remains portrait-locked.
- A person enables reduced motion while the application is open.
- A touch begins on a press-animated card and turns into a scroll gesture.
- A sheet contains enough content to scroll or the keyboard obscures its sticky action.
- Content loads immediately, so the skeleton must not flash distractingly.
- A loading request fails, retries, or returns a genuinely empty result.
- A product image has no valid source or fails after a skeleton has appeared; no fake image may replace it.
- A semantic status requires a tint for readable contrast; the tint must remain centrally derived from the approved semantic role.
- A destructive and a neutral action appear together; hierarchy must remain clear without using arbitrary color.
- A haptic-capable action runs on a platform where haptics are unavailable or disabled.
- An existing custom control has unique behavior that cannot safely be consolidated during visual migration.
- A raw value is genuinely required by platform geometry, measured layout, or asset composition; it must be documented as an intentional exception rather than silently expanding the design system.
- The underlying marketplace table is empty; validation uses the real empty state and does not create sample rows.

## Requirements *(mandatory)*

### Functional Requirements

#### Foundation and governance

- **FR-001**: SAWA MUST have exactly one canonical design foundation covering color and derived state surfaces, spacing/gutters, radius, typography, icon size/stroke, image ratios, touch size, shadows/elevation, opacity, layering, motion durations/easings, and motion springs using the exact registries in this specification.
- **FR-002**: Existing tokens and reusable components MUST be audited before anything new is added; duplicate systems MUST be consolidated rather than preserved under different feature names.
- **FR-003**: All existing and future screens MUST consume canonical roles instead of defining screen-specific palettes, type ramps, spacing ladders, radius ladders, shadows, or motion presets.
- **FR-004**: The static design foundation MUST preserve an original SAWA identity, MUST NOT reproduce another marketplace's distinctive visual assets, composition, language, icons, or static navigation treatment, and MUST complete User Story 1's documented static originality review; motion-signature originality is owned separately by FR-039 and User Story 2.
- **FR-005**: The repository-wide migration MUST cover every routable screen, shared overlay, and pre-route/system surface present when implementation begins, including the screen families and launch/icon/system surfaces listed in this specification; the inventory MUST be refreshed before migration and before final verification.
- **FR-006**: Consolidation MUST be incremental and risk-based; working screens MUST NOT be rewritten when adopting shared roles is sufficient.
- **FR-007**: Any unavoidable exception to a canonical role MUST state the user or platform need that makes it necessary and MUST remain narrowly scoped.

#### Color, space, shape, type, and elevation

- **FR-008**: The canonical colors MUST match the exact values, semantic roles, derived surfaces, and WCAG 2.2 AA usage restrictions in the Canonical visual language table; `textMuted` MUST NOT carry readable text or placeholders.
- **FR-009**: The application SHOULD meet the documented 85–95% white/neutral, 5–12% black, and <=3% semantic-color aggregate sampling bands for ordinary resting chrome; semantic color MUST communicate genuine state rather than decoration.
- **FR-010**: Arbitrary screen-specific colors, orange-heavy or teal-heavy branding, random gradients, and decorative rainbow palettes MUST NOT appear.
- **FR-011**: The spacing scale MUST be limited to 4, 8, 12, 16, 20, 24, 32, 40, and 48 for ordinary layout, with a standard horizontal screen gutter of 20–24 pixels.
- **FR-012**: The canonical radius scale MUST provide 8, 12, 16, 20, 24, and pill treatments with the usage rules defined in this specification; containers MUST NOT be rounded without a component-family reason.
- **FR-013**: Typography MUST expose display, screen-title, section-title, card-title, body, body-medium, metadata, price, button, and caption using the exact family, size, line-height, weight, tracking, scaling, and usage treatments in the Canonical type roles table.
- **FR-014**: Marketplace prices MUST remain more prominent than supporting metadata and must use the canonical price role consistently.
- **FR-015**: Shadows MUST be minimal and limited to genuinely elevated surfaces; listing grids and ordinary content cards MUST remain light and image-first.
- **FR-016**: Icons MUST use the exact metadata, inline, navigation, action, and hero size/stroke roles in the Canonical type roles section; selected state MUST not depend on icon color alone.

#### Reusable controls and surfaces

- **FR-017**: The shared button family MUST include primary, secondary, ghost, and icon actions with consistent enabled, pressed, disabled, and genuine loading states.
- **FR-018**: Primary buttons MUST use a near-black surface with inverse text; secondary buttons MUST use a white surface with dark text and a subtle border; disabled buttons MUST use neutral surfaces, a readable `textSecondary #717171` label, canonical disabled opacity/state semantics, and MUST NOT use `textMuted` for the label.
- **FR-019**: Buttons and icon actions MUST have a minimum 44 by 44 pixel effective touch target, must not accept duplicate activation while busy, and must never be rendered as dead controls.
- **FR-020**: The shared input family MUST cover default, focused, filled, error, and disabled states with a visible label, concise error association, accessible description, and keyboard-safe placement.
- **FR-021**: Screens MUST NOT create independent input styles when the canonical input family can represent the required interaction.
- **FR-022**: The shared card family MUST define listing, editorial, compact, and selection roles with clear content hierarchy and restrained use of border, shadow, and radius.
- **FR-023**: Listing cards MUST be image-first, show price clearly, keep metadata subtle, and avoid heavy boxed treatment.
- **FR-024**: Selection controls MUST expose selected or checked state through more than color and MUST use consistent control semantics.

#### Images, loading, empty, error, toast, and sheets

- **FR-025**: The shared image system MUST use the exact listing-grid, listing-gallery, conversation/order, category/search, profile/avatar, and Sell-composer aspect-ratio/radius roles in the Canonical image roles table, with the defined loading, 240 ms reveal, accessibility, fit, and failure behavior.
- **FR-026**: Missing or failed product images MUST use a neutral non-product error treatment; fake product imagery MUST never be used as a fallback.
- **FR-027**: Skeleton patterns MUST cover listing, profile, search, category, conversation, and order content, use subtle non-flashing motion, and resemble the destination layout.
- **FR-028**: Skeletons MUST transition smoothly into real content without creating a distracting flash when content resolves quickly.
- **FR-029**: The shared empty-state pattern MUST provide a minimal icon, title, short explanation, and optional real action, and MUST never use fabricated data to make an empty screen appear populated.
- **FR-030**: The shared error system MUST cover inline, form, screen, retry, and network errors with concise user-facing language and no unnecessary raw service or database strings.
- **FR-031**: The one canonical shared toast MUST use a high-contrast white or black surface, restrained elevation, exactly 16 pixel radius, and subtle fade plus vertical movement.
- **FR-032**: A toast MUST describe only an authoritative completed outcome and MUST NOT claim success for an operation that remains pending, failed, or ambiguous.
- **FR-033**: All bottom sheets MUST share a white surface, 24 pixel top radius, drag indicator, comfortable spacing, an exact 0.28/28% black overlay, restrained upward spring, smooth downward close, and sticky action placement where needed.
- **FR-034**: Sheets MUST remain operable when content scrolls, the keyboard opens, or safe-area insets change; opening and closing MUST manage accessibility focus and restore the user's context.

#### Motion, navigation, haptics, and performance

- **FR-035**: Motion duration choices MUST use the exact instant=120 ms, fast=180 ms, standard=240 ms, and slow=340 ms tokens and canonical easing roles; a changed value MUST update the canonical registry before use and cannot remain screen-specific.
- **FR-036**: Button press, selection, sheet, modal, card, and favorite interactions MUST use the exact mass/stiffness/damping/overshoot/settle constraints in the canonical spring table with no screen-local spring.
- **FR-037**: Buttons MUST use the canonical 1.0 → 0.97 → 1.0 press behavior, and listing cards MUST use 1.0 → 0.98 → 1.0 without interfering with scrolling.
- **FR-038**: Favorite interactions MUST use the canonical 1.0 → 1.15 → 1.0 feedback without particle effects.
- **FR-039**: Navigation MUST use consistent, original SAWA forward, reverse, modal, sheet, and peer-tab transition families; dramatic zooms, long transitions, random per-screen animations, and copied marketplace motion signatures are prohibited, and User Story 2 MUST complete the motion/animated-navigation originality review.
- **FR-040**: Primary navigation MUST present Home, Browse, Sell, Inbox, and Profile with a white background, subtle top divider, near-black selected state, secondary-text unselected state, subtle selected feedback, and a prominent but minimal Sell action.
- **FR-041**: Haptics MUST be limited to the exhaustive authoritative events in the Canonical motion language section, MUST remain best-effort and supplementary, and MUST NOT occur for ordinary taps, navigation, typing, retries, errors, scrolling, or image loading.
- **FR-042**: Onboarding motion MUST use the same duration, spring, reduced-motion, transition, and press-feedback language as the rest of SAWA while retaining its completed real journey; onboarding's static typography, spacing, and components are governed independently by FR-001–FR-024 and User Story 1.
- **FR-043**: Non-essential motion MUST be reduced or removed when the user requests reduced motion, while state changes, progress, and completion remain understandable.
- **FR-044**: Continuous animation and press feedback MUST use interruptible transform/opacity work, begin within the SC-005 latency threshold, and MUST NOT delay actions, block input, capture intended scrolling, or create a stall longer than 100 ms.
- **FR-045**: Every collection meeting the normative “long content” definition MUST use virtualization; runtime high-volume evidence MUST use at least 30 naturally existing real rows or be marked UNVERIFIED, and off-screen work MUST NOT cause visible input or scrolling delay.

#### Responsive and accessible behavior

- **FR-046**: Every migrated screen MUST support the exact small and large portrait iOS/Android viewport classes in the responsive baseline without fixed-height clipping; native landscape is explicitly outside scope while `app.json` remains portrait-locked.
- **FR-047**: Layouts MUST respect safe areas, notches, Dynamic Island, home indicators, and the on-screen keyboard, keeping primary actions reachable.
- **FR-048**: Every interactive control MUST expose an appropriate role, label, value or selected/checked state, disabled state, and busy state where applicable.
- **FR-049**: State MUST never rely on color alone; focus, selection, error, warning, success, disabled, and loading states MUST have an additional perceivable signal.
- **FR-050**: VoiceOver and TalkBack reading order MUST follow the visual task order, dynamic status changes MUST be announced appropriately, and decorative elements MUST not add noise.
- **FR-051**: Text and controls MUST remain understandable and operable through 200% system text scaling; labels MUST wrap or layouts MUST adapt rather than clipping essential content.
- **FR-052**: Existing web-capable surfaces MUST have logical keyboard focus and appropriate semantics, while native controls MUST not inherit inappropriate web-only accessibility patterns.

#### Migration safety and verification

- **FR-053**: Migration MUST preserve every existing route destination, real action, real-data source, authorization boundary, persistence result, and NEW-only marketplace rule.
- **FR-054**: This feature MUST NOT alter Supabase schema or policies, authentication architecture, Realtime architecture, Stripe, checkout or order behavior, Edge Functions, or payment architecture.
- **FR-055**: The migration MUST NOT replace real data with local presentation fixtures or create fake data for visual verification.
- **FR-056**: The baseline and final repository-wide audits MUST cover raw colors, derived tints, semantic colors, typography, spacing, gutters, radii, shadows/elevation, opacity, layers/z-index, touch sizes, button heights, icon sizes/strokes, image constants, motion durations, easings, springs, duplicate components, button/input/card/sheet/navigation variants, and all duplicated design constants; each finding MUST be migrated, removed, centrally derived, or documented as an approved DesignException, and final closure requires every category to be rechecked with zero `OPEN` findings.
- **FR-057**: Runtime visual review MUST cover the complete screen inventory and compare loading, empty, error, offline, populated, disabled, focused, selected, pressed, and reduced-motion states where those states are reachable.
- **FR-058**: Static inspection MUST be reported as static evidence only and MUST never be presented as proof of runtime appearance, interaction, accessibility, motion performance, or journey preservation.

### Verification Requirements

- **VR-001**: `npm run typecheck` MUST complete with zero errors before implementation is reported complete.
- **VR-002**: `npm run lint` MUST complete with zero errors before implementation is reported complete.
- **VR-003**: A repository-wide static audit MUST report every raw, derived, and semantic color candidate outside the canonical foundation and classify each as removed, tokenized, centrally derived, or justified.
- **VR-004**: A repository-wide static audit MUST report every FR-056 category—typography, spacing/gutters, radii, shadows/elevation, opacity/layers, touch/button sizes, icon size/stroke, image constants, duration/easing/springs, duplicate components, and button/input/card/sheet/navigation variants—and record zero `OPEN` findings only after every category is rechecked.
- **VR-005**: Runtime visual verification MUST cover every existing screen family on at least one small and one large supported phone viewport, with unavailable platforms stated explicitly.
- **VR-006**: Runtime motion verification MUST exercise buttons, listing presses, favorite feedback, sheets, toasts, image loading, navigation families, tab selection, onboarding, and reduced motion.
- **VR-007**: Runtime accessibility verification MUST cover 44 by 44 pixel targets, roles, labels, state, reading order, larger text, VoiceOver/TalkBack where available, and keyboard focus on supported web surfaces.
- **VR-008**: Runtime responsive verification MUST cover safe areas, keyboard avoidance, short screens, long content, and sticky actions on small and large supported phones.
- **VR-009**: Existing journey regression verification MUST confirm that authentication, onboarding, Home/Browse discovery, listing detail, Favorites, Sell, Inbox/Chat, profile, checkout, and orders retain their real outcomes and data provenance.
- **VR-010**: Motion-performance verification MUST record the tested devices and observed scroll/interaction behavior; static code review alone cannot prove responsive motion.
- **VR-011**: Visual comparisons MUST use real reachable data or truthful empty states and MUST not create fake marketplace records or fake product imagery.
- **VR-012**: The final evidence report MUST classify every required check as PASS, FAIL, BLOCKED, or UNVERIFIED and state the exact reason for anything not executed.

### Key Entities

- **Design Token Role**: A canonical semantic choice for color, space, radius, typography, elevation, opacity, layering, duration, or spring behavior. Screens refer to the role rather than inventing a raw value.
- **Component Family**: A reusable interaction or surface pattern—button, input, card, image, skeleton, empty state, error, toast, sheet, navigation item, or selection control—with defined states and accessibility behavior.
- **Motion Role**: A named interaction purpose with a duration band, physical character, reduced-motion equivalent, and constraints on where it may be used.
- **Screen Migration Record**: The auditable result for one routable surface, identifying its canonical roles, reachable visual states, justified exceptions, responsive/accessibility checks, and confirmation that business behavior did not change.
- **Design Exception**: A narrowly scoped departure tied to a real user, content, platform, or measured-layout need; it is not a new token or precedent unless formally adopted into the canonical foundation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the existing routable screen inventory is reviewed and recorded as migrated or as a documented, narrowly justified exception.
- **SC-002**: 100% of candidates in every FR-056 baseline/final audit category are removed, mapped to a canonical role, centrally derived, or documented as an approved exception, with zero `OPEN` findings after the full final recheck.
- **SC-003**: 100% of the deterministic control inventory—every shared interactive variant/state present in each screen family plus the first instance of every screen-private control type—has an effective target of at least 44 by 44 pixels and exposes a meaningful role, label, and state.
- **SC-004**: On each executed normative small/large iOS and Android portrait viewport and 360/1280 web width, all primary journeys complete at normal and 200% text scale without clipped essential text, unsafe-area overlap, keyboard-obscured required actions, or fixed-height dead ends.
- **SC-005**: Across 20 measured enabled presses for each applicable button, icon-button, listing-card, selection, and favorite family on each executed platform class in a release-like build, p95 visual acknowledgment begins within 150 ms, with zero duplicate actions and zero intended-scroll captures.
- **SC-006**: 100% of tested reduced-motion scenarios preserve understandable state and completion feedback without non-essential zoom, bounce, or long spatial travel.
- **SC-007**: 100% of tested loading, empty, image-error, form-error, screen-error, and network-error states use the canonical state language and contain no fabricated marketplace content or unnecessary raw service errors.
- **SC-008**: 100% of the existing real-journey regression set preserves its pre-migration route destination, authorized action, persisted result, and real-data provenance.
- **SC-009**: In the documented moderated review, at least five non-implementer participants each judge 15 randomized, brand-masked screen pairs covering every major family at least twice, and at least 68 of the resulting 75 judgments identify the surfaces as belonging to the same product.
- **SC-010**: The final verification record contains no runtime claim supported only by static inspection and explicitly classifies every unavailable device, platform, or state.

## Assumptions

- This checklist review adopts WCAG 2.2 AA as the normative accessibility baseline. It is no longer an unresolved planning choice; changing it would require an explicit specification amendment and cannot reduce the Constitution's accessibility obligation.
- The existing light visual system is the only supported theme; dark mode is not currently a real product feature.
- Native orientation remains portrait, matching the existing `app.json`; landscape support is not claimed by this feature.
- The existing shared token and component layer is the starting point and will be audited and evolved rather than replaced wholesale.
- Existing business journeys and real-data integrations are authoritative and remain behaviorally unchanged during presentation migration.
- The current Browse destination may retain its internal route identity while presenting the requested user-facing Browse label.
- Centrally defined tonal and translucent variants may be necessary for contrast, focus, skeleton, overlay, and semantic-state surfaces, but they remain derivatives of the approved palette rather than independent accent colors.
- Full-bleed photography, measured icon geometry, hairlines, and platform-controlled values may require documented exceptions to the ordinary spacing or sizing scale.
- Supported web behavior is preserved and accessibility-tested where it already exists, but this feature does not add a separate desktop information architecture.
- Runtime validation uses real reachable records or legitimate empty states. No sample marketplace data is created for screenshots or audits.
