# Migration Inventory: Global Design and Motion Foundation

**Feature**: `003-global-design-motion`  
**Baseline commit**: `30ee88240d615159e75d3413139d671923cfc8e2`  
**Working branch observed**: `marketplace-app`  
**Baseline date**: 2026-08-17  
**Source roots**: `src/app`, `src/components`, `src/hooks`, `src/lib`, `src/store`, `src/theme`  
**Canonical theme entry point**: `src/theme/tokens.ts`  
**Styling system**: React Native `StyleSheet` and inline style objects; no NativeWind, Tamagui, Restyle, Unistyles, or styled-components dependency is present.

This is a static implementation inventory. It does not prove runtime appearance, interaction, accessibility, motion, data persistence, or journey preservation. The worktree already contained user-authored changes when this baseline was captured; those changes remain outside this feature unless a task explicitly requires an overlapping presentation edit.

## Route and shared-surface inventory

The following inventory is frozen before implementation. A final scan must add any later-discovered surface before closure.

| ID | Route or surface | Family | Primary source | Existing real behavior/data source | Predeclared representative state | Status |
|---|---|---|---|---|---|---|
| R001 | Root pre-route/session guard | Global | `src/app/_layout.tsx` | Existing `AuthProvider`/auth store chooses onboarding, auth, recovery, or protected app routes | Auth/session loading | MIGRATED_STATIC |
| R002 | Protected app stack | Global | `src/app/(app)/_layout.tsx` | Existing Expo Router stack and protected navigation | Resting protected route | MIGRATED_STATIC |
| R003 | Auth stack | Global | `src/app/(auth)/_layout.tsx` | Existing recovery-aware auth routes | Sign-in resting state | MIGRATED_STATIC |
| R004 | Onboarding stack | Global | `src/app/onboarding/_layout.tsx` | Existing completed-onboarding guard and flow | First reachable onboarding step | MIGRATED_STATIC |
| R005 | Bottom navigation | Global | `src/components/bottom-nav.tsx` | Existing Home, `/explore`, Sell, Inbox, Profile destinations | Home selected | MIGRATED_STATIC |
| R006 | Screen headers/frosted bars | Global | `src/components/screen-header.tsx`, `src/components/frosted-bar.tsx` | Existing Back/dismiss actions and safe-area placement | Pushed-screen header | MIGRATED_STATIC |
| R007 | Sheets and scrim | Global | `src/components/sheet.tsx`, `src/components/overlays.tsx` | Existing sort/filter/app overlays and dismissal behavior | Filters sheet open | MIGRATED_STATIC |
| R008 | Toast/flash overlay | Global | `src/components/sheet.tsx`, `src/components/overlays.tsx` | Existing app flash state | Authoritative reachable flash only | MIGRATED_STATIC |
| R009 | Image loading/error | Global | `src/components/image-slot.tsx`, `src/components/listing-card.tsx` | Real supplied URI or neutral missing/error state | Real image when reachable, otherwise neutral error | MIGRATED_STATIC |
| R010 | Skeleton/empty/error surfaces | Global | `src/components/skeleton.tsx`, `src/components/ui.tsx` | Existing truthful request states | Destination-shaped loading or truthful empty | MIGRATED_STATIC |
| R011 | `/onboarding` | Onboarding | `src/app/onboarding/index.tsx`, `src/components/onboarding-parts.tsx` | Real onboarding store, Auth sign-up, profile update, avatar upload, delivery-country query | First eligible real step | MIGRATED_STATIC |
| R012 | `/sign-in` | Auth | `src/app/(auth)/sign-in.tsx` | Existing Supabase Auth `signIn`; routes to check-email when required | Resting sign-in | MIGRATED_STATIC |
| R013 | `/sign-up` | Auth | `src/app/(auth)/sign-up.tsx` | Existing Supabase Auth `signUp`; routes to check-email when required | Resting sign-up | MIGRATED_STATIC |
| R014 | `/forgot-password` | Auth | `src/app/(auth)/forgot-password.tsx` | Existing password-reset request | Resting form | MIGRATED_STATIC |
| R015 | `/reset-password` | Auth | `src/app/(auth)/reset-password.tsx` | Existing recovery session and password update | Recovery-session form when reachable | MIGRATED_STATIC |
| R016 | `/check-email` | Auth | `src/app/(auth)/check-email.tsx` | Existing pending-email state and resend verification | Pending-email state when reachable | MIGRATED_STATIC |
| R017 | `/` Home | Marketplace | `src/app/(app)/index.tsx` | Real categories/profile queries and real NEW-only paginated feed hook; real UUID routes | Populated real feed or truthful empty | MIGRATED_STATIC |
| R018 | `/explore` Browse | Marketplace | `src/app/(app)/explore.tsx` | Real categories and NEW-only listing feed; sort/filter overlay | Real categories/results or truthful empty | MIGRATED_STATIC |
| R019 | `/search` | Marketplace | `src/app/(app)/search.tsx` | Real categories, debounced NEW-only feed, existing recent local searches | Real categories/results or truthful empty | MIGRATED_STATIC |
| R020 | `/favorites` | Marketplace | `src/app/(app)/favorites.tsx` | Real authenticated favorites and listing query | Real saved listings or truthful empty | MIGRATED_STATIC |
| R021 | `/listing/[id]` | Marketplace | `src/app/(app)/listing/[id].tsx` | Real UUID `fetchListing`, real images/seller/delivery, favorite/chat/checkout actions | Existing real UUID if available; otherwise not fabricated | MIGRATED_STATIC |
| R022 | `/seller/[id]` | Marketplace | `src/app/(app)/seller/[id].tsx` | Real seller UUID/profile and NEW-only seller listing feed | Existing real UUID if available; otherwise not fabricated | MIGRATED_STATIC |
| R023 | `/sell` | Selling/account | `src/app/(app)/sell.tsx` | Authenticated real listing composer/publication coordinator and real categories/delivery | Initial composer with real session | MIGRATED_STATIC |
| R024 | `/profile` | Selling/account | `src/app/(app)/profile.tsx` | Authenticated real profile and real NEW-only seller listings | Real profile or truthful error | MIGRATED_STATIC |
| R025 | `/edit-profile` | Selling/account | `src/app/(app)/edit-profile.tsx` | Real profile query/update and avatar upload | Existing authenticated profile | MIGRATED_STATIC |
| R026 | `/verify` | Selling/account | `src/app/(app)/verify.tsx` | Existing Stripe verification launch behavior | Resting verification explanation | MIGRATED_STATIC |
| R027 | `/inbox` | Communication | `src/app/(app)/inbox.tsx` | Real conversations and summaries | Real threads or truthful empty | MIGRATED_STATIC |
| R028 | `/chat/[id]` | Communication | `src/app/(app)/chat/[id].tsx` | Real conversation UUID, messages/subscription, offers, sends | Existing real conversation if available | MIGRATED_STATIC |
| R029 | `/notifications` | Communication | `src/app/(app)/notifications.tsx` | Real notification rows and read mutation | Real rows or truthful empty | MIGRATED_STATIC |
| R030 | `/checkout` | Commerce | `src/app/(app)/checkout.tsx` | Real listing/offer/settings/delivery; existing server-owned Stripe test checkout | Existing real eligible listing only | MIGRATED_STATIC |
| R031 | `/orders` | Commerce | `src/app/(app)/orders.tsx` | Real authenticated orders | Real rows or truthful empty | MIGRATED_STATIC |
| R032 | `/order/[id]` | Commerce | `src/app/(app)/order/[id].tsx` | Real authorized order UUID and authoritative payment/order state | Existing authorized real order only | MIGRATED_STATIC |

## Long-content inventory

Remote-backed collections without a contractual sub-20 cap qualify even when the current database is empty.

| ID | Surface | Current composition | Qualification | Required action |
|---|---|---|---|---|
| L001 | Home/Browse/listing feed | `FlatList` via `ListingFeedGrid` | Qualifies | Preserve virtualization |
| L002 | Favorites | Unbounded collection in screen scroll composition | Qualifies | Virtualize in T052 |
| L003 | Profile remote listings | Remote collection in profile screen composition | Qualifies | Virtualize in T052 |
| L004 | Search categories/results | Remote categories/results composition | Qualifies | Virtualize in T052 |
| L005 | Inbox | Remote conversation collection | Qualifies | Virtualize in T052 |
| L006 | Chat messages | Remote, session-growing message collection | Qualifies | Virtualize in T052 |
| L007 | Notifications | Remote notification collection | Qualifies | Virtualize in T052 |
| L008 | Orders | Remote order collection | Qualifies | Virtualize in T052 |
| L009 | Static forms/onboarding steps | Short bounded form content | Does not qualify | Retain accessible `ScrollView`/keyboard composition |

## Deterministic interactive-control inventory

This list is frozen before runtime accessibility verification. Each row represents every shared variant/state used by the named family plus the first screen-private control type. Later discoveries must be appended before T055 closes.

| ID | Family/surface | Source location | Variant/state to verify | Expected target and semantics |
|---|---|---|---|---|
| C001 | Shared Button | `src/components/ui.tsx` | primary idle/pressed | >=44x44, role button, stable name, single activation |
| C002 | Shared Button | `src/components/ui.tsx` | secondary idle/pressed | >=44x44, role button, stable name |
| C003 | Shared Button | `src/components/ui.tsx` | ghost idle/pressed | >=44x44, role button, stable name |
| C004 | Shared Button | `src/components/ui.tsx` | disabled | disabled state, no activation, non-color signal |
| C005 | Shared Button | `src/components/ui.tsx` | busy/loading | busy+disabled semantics, stable name, duplicate suppressed |
| C006 | IconButton/floating action | `src/components/screen-header.tsx`, `src/components/ui.tsx` | normal/selected/disabled | >=44x44 effective target, explicit label and state |
| C007 | Generic pressable | `src/components/ui.tsx` | pressed/cancelled-by-scroll | role from caller, immediate feedback, no scroll capture |
| C008 | Field | `src/components/field.tsx` | default/focused/filled | label association, keyboard semantics, visible focus |
| C009 | Field | `src/components/field.tsx` | error | associated error and live announcement without raw service text |
| C010 | Field | `src/components/field.tsx` | disabled | disabled state and non-color treatment |
| C011 | Password reveal | `src/components/field.tsx` | hidden/revealed | >=44x44, role button, name/state describes result |
| C012 | Chip selection | `src/components/ui.tsx` | idle/selected/disabled | >=44x44, selected state beyond color |
| C013 | Segmented selection | `src/components/ui.tsx` | idle/selected | each option >=44x44 and selected state announced |
| C014 | Underline tab | `src/components/ui.tsx` | idle/selected | role tab, selected state, >=44x44 |
| C015 | Toggle | `src/components/ui.tsx` | on/off/disabled | switch semantics, checked state, >=44x44 |
| C016 | Row action | `src/components/ui.tsx` | enabled/disabled | button/link semantics according to action, >=44x44 |
| C017 | Listing card | `src/components/listing-card.tsx` | idle/pressed/scroll-cancel | role button/link, real title/price label, real UUID, no nested propagation |
| C018 | Favorite | `src/components/listing-card.tsx` | off/on/busy/failure reconciliation | role button, selected/busy state, explicit label, >=44x44 |
| C019 | Bottom navigation item | `src/components/bottom-nav.tsx` | selected/unselected | role tab, visible label, selected state, >=44x44 |
| C020 | Bottom navigation Sell | `src/components/bottom-nav.tsx` | enabled/pressed | visible Sell label, role button/tab as implemented, real `/sell` action, >=44x44 |
| C021 | Header Back/Close | `src/components/screen-header.tsx` | back/close | role button, explicit name, >=44x44 |
| C022 | Sheet close/backdrop | `src/components/sheet.tsx` | open/closing/unsafe-busy | named close, safe dismissal, focus restore, >=44x44 where interactive |
| C023 | Toast | `src/components/sheet.tsx` | neutral/success/error | live announcement only for authoritative outcome; not focus-trapping |
| C024 | Filter sheet Clear/Apply | `src/components/overlays.tsx` | idle/preview-loading | named actions, duplicate suppression, keyboard-safe |
| C025 | Onboarding shared Button | `src/app/onboarding/index.tsx`, `src/components/ui.tsx` | idle/pressed/disabled | shared canonical semantics, >=44x44 |
| C026 | Onboarding choice | `src/components/onboarding-parts.tsx`, `src/app/onboarding/index.tsx` | unselected/selected | role and selected state, >=44x44, non-color signal |
| C027 | Auth recovery/link actions | `src/app/(auth)/*.tsx` | enabled | role button/link, explicit destination, >=44x44 effective target |
| C028 | Home/Browse filter/search controls | `src/app/(app)/index.tsx`, `explore.tsx` | idle/selected/filter-active | explicit labels/states, >=44x44 |
| C029 | Search query input/clear/category | `src/app/(app)/search.tsx` | focused/filled/clear/selected | label, visible focus, keyboard control, selected state |
| C030 | Listing gallery/favorite/chat/buy | `src/app/(app)/listing/[id].tsx` | enabled/busy/selected | real UUID/action, explicit labels, >=44x44 |
| C031 | Sell Back/Next/Publish | `src/app/(app)/sell.tsx` | enabled/disabled/busy | progress context, busy state, duplicate suppression, >=44x44 |
| C032 | Sell photo controls | `src/components/sell-photo-grid.tsx` | add/remove/move earlier/move later | position+cover label, disabled boundaries, >=44x44 |
| C033 | Sell category/country | `src/app/(app)/sell.tsx`, `src/components/sell-country-picker.tsx` | selected/loading/error | real option labels, selected state, retry/name, >=44x44 |
| C034 | Profile rows/actions | `src/app/(app)/profile.tsx` | enabled/sign-out | explicit real destination/action, >=44x44 |
| C035 | Edit profile avatar/fields/save | `src/app/(app)/edit-profile.tsx` | enabled/focused/error/busy | associated fields, stable busy name, >=44x44 |
| C036 | Inbox thread | `src/app/(app)/inbox.tsx` | unread/read/pressed | real participant/thread label and UUID, >=44x44 |
| C037 | Chat composer/send/offer | `src/app/(app)/chat/[id].tsx` | empty/filled/busy/error | label, busy state, keyboard reachability, real action |
| C038 | Notification row/mark-all | `src/app/(app)/notifications.tsx` | unread/read | real destination only, state beyond color, >=44x44 |
| C039 | Checkout delivery selection/CTA | `src/app/(app)/checkout.tsx` | unselected/selected/busy/error | radio/selected semantics, real server action, >=44x44 |
| C040 | Order row/retry | `src/app/(app)/orders.tsx`, `order/[id].tsx` | idle/error/retry | real order UUID, explicit names, >=44x44 |

## Baseline static-audit manifest

All counts are overinclusive candidate counts from static searches at the baseline commit/worktree. They are not runtime evidence and not every literal is automatically a defect. Initial classification is `OPEN` until the implementing task maps, removes, centrally derives, or formally excepts it.

| Category | Search method | Candidate count | Highest concentrations | Baseline classification |
|---|---|---:|---|---|
| Raw/derived/semantic colors | `rg -n "#[0-9A-Fa-f]{3,8}|rgba?\\(" src` | 63 total; 16 outside theme | onboarding parts (15), auth-link geometry string (1) | OPEN |
| Typography | `rg -n "fontSize|lineHeight|letterSpacing" src` | 32 | UI, onboarding, Chat, Sell | OPEN |
| Spacing/gutters | `rg -n "padding|margin|gap" src` | 545 | onboarding, Chat, Sell, listing detail, overlays | OPEN |
| Radii | `rg -n "borderRadius" src` | 92 | UI, onboarding, Profile, Sell photos | OPEN |
| Shadows/elevation | `rg -n "boxShadow|shadowColor|shadowOpacity|shadowRadius|shadowOffset|elevation" src` | 16 | current theme only | OPEN (legacy theme definitions) |
| Opacity/layers/z-index | `rg -n "opacity|zIndex" src` | 32 | UI, Sheet, onboarding, Skeleton | OPEN |
| Touch/button sizes | `rg -n "hitSlop|height:\\s*[0-9]+|minHeight:\\s*[0-9]+" src` | 112 | onboarding, Chat, Search, Sell photos | OPEN |
| Icon sizes/strokes | `rg -n --glob '*.tsx' "size=\\{?[0-9]+|strokeWidth" src` | 382 | Icon definitions, onboarding, listing detail, Sell | OPEN |
| Image constants | `rg -n "aspectRatio|contentFit|transition=" src` | 19 | listing detail/card, Chat, profile | OPEN |
| Motion duration/easing/springs | `rg -n "duration|damping|stiffness|mass|friction|tension|withTiming|withSpring|Animated\\.timing|Animated\\.spring" src` | 49 | Sheet, onboarding, Skeleton, UI | OPEN |
| Duplicate component/variant candidates | `rg -n "function .*Button|function .*Card|function .*Sheet|function .*Toast|createAnimatedComponent|BottomNav|TabBar" src/components src/app` | 23 | overlays, sheet, UI, listing card | OPEN |

Baseline source size is 15,282 TypeScript/TSX lines. Candidate-density scoring is deliberately deferred until each broad search is manually separated into true design escapes, canonical-token use, and geometry/platform exceptions; presenting raw matches as defects would be misleading.

## Component-family baseline

| Family | Existing implementation | Baseline issue to close |
|---|---|---|
| Text | `T` in `ui.tsx` | Allows arbitrary size/weight/line-height and incomplete role ramp |
| Button/pressable | `Button`, `Tap`, `PressableScale` | Legacy variants/sizes, RN Animated, ordinary-tap haptic option, inconsistent targets |
| Input | `Field`, screen-local `TextInput` shells | Screen-local variants and incomplete association/state contract |
| Card/selection | `Card`, `Chip`, `Segmented`, `UnderlineTabs`, screen-private selectors | Uncanonical radii/spacing and duplicate selection structures |
| Image | `ImageSlot`, `ListingImage`, direct Expo Image use | Incomplete image-role API and timing/error consolidation |
| Skeleton | `Skeleton` and limited variants | Missing category/conversation/order variants and canonical timing/reduced policy |
| Empty/error | `EmptyState`, `FormError`, screen-local errors | Raw service text and duplicated state structures remain candidates |
| Toast/sheet | `Toast`, `Sheet`, `Overlays` | Local RN Animated timings, incomplete focus/keyboard/reduced-motion contract |
| Navigation | `BottomNav`, stack layouts, headers | Browse label absent, undersized targets/icons, local transition decisions |

## DesignException register

No DesignException is accepted at baseline. An implementation need must fill every field below and receive review; preference or convenience is insufficient.

| ID | Location | Canonical rule | Concrete need | Smallest scope | Rejected alternative | Verification | Review status |
|---|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — | None |

## Originality baseline

- No third-party marketplace asset is authorized for reuse.
- Existing SAWA marks and local assets require provenance review in T027.
- Airbnb and Vinted are quality/usability references only. Layout composition, copy, icons, navigation treatment, and later motion signatures must remain SAWA-specific.
- No fake product image may be introduced to make a screenshot populated.

## Foundation asset provenance

- The consumed Expo starter “A” icon/blue launch treatment was removed from active configuration because it was neither SAWA identity nor part of the approved neutral palette.
- Built-in image generation produced an original flat S/W monogram specifically for this repository on 2026-08-17. Prompt constraints required `#111111`, transparency/white only, no text, gradients, marketplace imagery, or resemblance to Expo, Airbnb, Vinted, or other marketplace marks.
- The opaque white master is consumed by `assets/images/icon.png`; the transparent master is consumed by `splash-icon.png`, `favicon.png`, `android-icon-foreground.png`, and `android-icon-monochrome.png`. `android-icon-background.png` is no longer referenced because Android now uses the canonical `#FFFFFF` adaptive-icon background color.
- This provenance record covers creation and source use only. Runtime mask, splash, and favicon appearance remains UNVERIFIED until executed.

## Family closure records

### Global navigation and shared header chrome (T017)

- Family: Global chrome
- Source files: `src/components/bottom-nav.tsx`, `src/components/screen-header.tsx`, `src/components/frosted-bar.tsx`
- Existing real behavior/data source: Expo Router `dismissTo` destinations and Back behavior; no data query or mutation.
- Reachable states: selected/unselected primary item, centered Sell action, pushed Back/Close header, solid primary bar, frosted sticky bar.
- Canonical tokens/components adopted: `background`, `primary`, `textPrimary`, `textInverse`, `textSecondary`, canonical icon/action/navigation roles, 44-pixel targets, spacing/radius/touch roles.
- Raw-value audit findings resolved: visible Explore label changed to Browse while `/explore` is preserved; undersized header/floating targets raised to 44; unselected readable labels moved from `textMuted` to `textSecondary`; decorative nav shadow removed.
- Design exceptions: none.
- Behavior comparison: source inspection confirms existing Home `/`, Browse `/explore`, Sell `/sell`, Inbox `/inbox`, Profile `/profile`, `dismissTo`, and header `router.back()` behavior are unchanged.
- Static checks: typecheck PASS and lint PASS on 2026-08-18.
- Runtime visual/accessibility/motion: UNVERIFIED; no named app runtime/device has been executed yet.
- Evidence IDs: E009.
- Status: MIGRATED (runtime cells remain UNVERIFIED).

### Root and route-group stack presentation (T018)

- Family: Global chrome
- Source files: `src/app/_layout.tsx`, `src/app/(app)/_layout.tsx`, `src/app/(auth)/_layout.tsx`, `src/app/onboarding/_layout.tsx`
- Existing real behavior/data source: existing auth/onboarding/recovery guards and Expo Router native stacks.
- Canonical tokens/components adopted: fixed `background` content surfaces and canonical duration tokens where the current native-stack API exposes duration.
- Behavior comparison: all `Stack.Protected` guards, route-group names, screen names, peer fade/deeper native transitions, checkout/verify modal direction, and recovery routing remain unchanged.
- Design exceptions: native stack owns platform transition physics; exact runtime duration remains platform-controlled where the API does not expose it.
- Static checks: typecheck PASS and lint PASS on 2026-08-18.
- Runtime navigation/Back/gesture observation: UNVERIFIED.
- Evidence IDs: E010.
- Status: MIGRATED (runtime cells remain UNVERIFIED).

### Onboarding presentation (T019)

- Family: Onboarding
- Source files: `src/components/onboarding-parts.tsx`, `src/app/onboarding/index.tsx`, with obsolete interface-font loading removed from `src/app/_layout.tsx` and dependencies removed from `package.json`/`package-lock.json` after a zero-reference audit.
- Existing real behavior/data source: completed onboarding store, existing Auth sign-up/session flow, real delivery-country query, profile/avatar mutations, and existing sign-in destinations.
- Canonical tokens/components adopted: global palette, typography roles, spacing/radius/touch roles, `T`, `Button`, `PressableScale`, `Field`, and `PasswordField`; Instrument Serif remains restricted to the SAWA wordmark.
- Removed duplicate system: onboarding-local palette, `FONT`, `OBText`, `OBPress`, `PrimaryButton`, Manrope type ramp, custom account/profile input shells, and ordinary-layout spacing/radius ladder.
- Behavior comparison: source inspection confirms the existing step order, persistence calls, email-confirmation hold, signed-in resume, real country/delivery data, profile/avatar actions, completion guard, and `/sign-in` destinations are unchanged.
- Design exceptions: 112px avatar composition and introduction tap-zone proportions are asset/interaction geometry, not additions to ordinary spacing roles; onboarding-local motion remains temporarily isolated for the explicitly later T034 canonical-motion task.
- Static checks: typecheck PASS and lint PASS with no diagnostics on 2026-08-18.
- Runtime journey/visual/accessibility observation: UNVERIFIED.
- Evidence IDs: E011.
- Status: MIGRATED (runtime cells remain UNVERIFIED).

### Authentication and recovery presentation (T020)

- Family: Authentication and recovery
- Source files: `src/app/(auth)/sign-in.tsx`, `sign-up.tsx`, `forgot-password.tsx`, `reset-password.tsx`, and `check-email.tsx`.
- Existing real behavior/data source: existing Auth-store sign-in, sign-up, verification resend, password-reset request, password update, sign-out, pending-email state, and root recovery/session guards.
- Canonical tokens/components adopted: system-sans typography roles, wordmark exception, canonical gutters/spacing/touch roles, `Field`, `PasswordField`, `FormError`, `Button`, `Note`, and accessible 44px link targets.
- Truthfulness correction: the sign-up description now says “new products”; no used/secondhand marketplace wording remains in this family.
- Behavior comparison: source inspection confirms validation, request sequencing, busy duplicate guards, anti-enumeration reset/verification copy, confirmation routing, expired-link handling, and root-guard ownership of successful navigation are unchanged.
- Design exceptions: 56px shield/send status symbols are icon-container composition geometry, not a new touch or spacing role.
- Static checks: local escape audit found no raw palette values or independent text treatments; typecheck PASS and lint PASS with no diagnostics on 2026-08-18.
- Runtime Auth/recovery/keyboard/accessibility observation: UNVERIFIED.
- Evidence IDs: E012.
- Status: MIGRATED (runtime cells remain UNVERIFIED).

### Shared marketplace presentation components (T026)

- Family: Listing/product/feed/profile/order/offer/slider shared surfaces
- Source files: `src/components/listing-card.tsx`, `product-card.tsx`, `listing-rail.tsx`, `listing-feed-grid.tsx`, `profile-identity.tsx`, `order-status.tsx`, `offer-card.tsx`, and `slider.tsx`.
- Existing real behavior/data source: `ListingRow`/`Profile`/`OrderRow`/`OfferRow`, real cover URLs, existing listing-feed query, real UUID navigation, existing favorite callback, and existing authorized offer mutation.
- Canonical tokens/components adopted: listing/conversation image roles, card-title/section-title/price/metadata/caption roles, canonical gaps/gutters/radii/durations/touch targets, semantic status surfaces, and shared compact Button treatment.
- Behavior comparison: source inspection confirms listing UUID routes, feed pagination/refresh, price formatting, favorite callback ownership, profile facts, order/payment enum mappings, offer authorization/actions, and slider value/responder calculations are unchanged.
- Design exceptions: thumbnail/avatar/favorite/status-glyph dimensions and slider thumb/track measurements are bounded component geometry; responsive card-width arithmetic is layout calculation rather than a spacing-scale addition. Favorite motion remains temporarily in its existing component for T030.
- Static checks: targeted escape audit found no independent text-role/raw-color treatment; typecheck PASS and lint PASS with no diagnostics on 2026-08-18.
- Runtime rendering/action/accessibility observation: UNVERIFIED.
- Evidence IDs: E013.
- Status: MIGRATED (runtime cells remain UNVERIFIED).

### Home, Browse, Search, and Favorites (T021)

- Family: Marketplace discovery
- Source files: `src/app/(app)/index.tsx`, `explore.tsx`, `search.tsx`, and `favorites.tsx`.
- Existing real behavior/data source: real categories, `useListingFeed`, real filters/sorts, profile-derived country, real favorites, pull-to-refresh, real empty/error states, and listing-card UUID destinations.
- Canonical tokens/components adopted: canonical brand/title/body/metadata roles, responsive feed/card primitives, 20px compact gutters, 44px+ search/filter/sort/link targets, neutral input/chip surfaces, semantic error text, and image-first listing hierarchy.
- Behavior comparison: source inspection confirms Home rails use only real country signals, `/explore` remains Browse, Search still debounces the real full-text query and dismisses categories to `/explore`, filters/sorts remain store-owned, refresh invokes the same feed/favorite methods, and listing destinations remain real UUIDs.
- Design exceptions: one-pixel header hairline and computed animated header height/offset are geometry; search header measurement remains runtime-derived. Existing header motion is deferred to T033.
- Static checks: targeted escape audit found no independent text/raw-color/undersized-control treatment; typecheck PASS and lint PASS with no diagnostics on 2026-08-18.
- Runtime populated/empty/error/refresh/responsive observation: UNVERIFIED.
- Evidence IDs: E014.
- Status: MIGRATED (runtime cells remain UNVERIFIED).

### Listing and seller detail (T022)

- Family: Listing and seller detail
- Source files: `src/app/(app)/listing/[id].tsx` and `src/app/(app)/seller/[id].tsx`.
- Existing real behavior/data source: `fetchListing(id)`, `fetchProfile(id)`, seller listing feed, real listing images/positions, delivery options, favorite state, conversation creation, and checkout/chat UUID destinations.
- Canonical tokens/components adopted: detail photography ratio/transition, section-title/price/body/metadata/caption roles, neutral attribute/status sections, semantic error text, 44px+ actions, canonical seller and delivery hierarchy, and shared listing feed.
- Behavior comparison: source inspection confirms the exact route `id` drives every read/action, image rows remain position-sorted, publication-reload recovery copy remains authoritative, favorite/share/message/checkout actions retain existing ownership, and seller/delivery values remain real database results.
- Design exceptions: full-bleed gallery width/height, 48px seller avatar, page-indicator geometry, and one-pixel section dividers are image/component geometry; favorite motion remains for T030 and route transition behavior for T033.
- Static checks: targeted escape audit found no independent readable muted text/raw color/type ramp or undersized actions; typecheck PASS and lint PASS with no diagnostics on 2026-08-18.
- Runtime image/error/action/UUID navigation observation: UNVERIFIED.
- Evidence IDs: E015.
- Status: MIGRATED (runtime cells remain UNVERIFIED).

### Sell, Profile, Edit Profile, and Verify (T023)

- Family: Seller creation and account surfaces
- Source files: `src/app/(app)/sell.tsx`, `profile.tsx`, `edit-profile.tsx`, and `verify.tsx`.
- Existing real behavior/data source: authenticated session/profile reads, real category/delivery queries, real photo preparation/publication/recovery coordinator, real profile/avatar mutations, own listing feed, and the pre-existing verification entry behavior.
- Canonical tokens/components adopted: screen-title/body/price/metadata roles, shared `Field` shells for composer/profile inputs, canonical category/step/progress/action/error/preview cards, gutters/spacing/touch roles, semantic error text, neutral account sections, and shared Buttons.
- Behavior comparison: source inspection confirms seller identity remains session-derived, category/delivery data stays Supabase-backed, condition remains NEW, publication phases/recovery/authoritative UUID route remain unchanged, profile writes expose only existing columns, and no Stripe/payment/Auth behavior was altered.
- Design exceptions: Sell photo previews, price underline, progress bar, avatar dimensions, and fixed sticky-action clearance are bounded component/media/safe-area geometry. Sell/onboarding-like local motion remains for T034 and state-family completion for T039.
- Static checks: targeted escape audit found no independent readable muted text/raw color/type ramp/undersized action treatment; typecheck PASS and lint PASS with no diagnostics on 2026-08-18.
- Runtime photo/publication/profile/verification observation: UNVERIFIED.
- Evidence IDs: E016.
- Status: MIGRATED (runtime cells remain UNVERIFIED).

### Inbox, Chat, and Notifications (T024)

- Family: Messaging and notifications
- Source files: `src/app/(app)/inbox.tsx`, `chat/[id].tsx`, and `notifications.tsx`.
- Existing real behavior/data source: authenticated conversation/summaries/messages/offers/notifications queries, existing conversation subscription hook, read/send/offer mutations, real participant/listing rows, and real chat/seller/listing UUID destinations.
- Canonical tokens/components adopted: card-title/body/metadata/caption/price roles, readable secondary timestamps/details, canonical thread/message/composer/offer/notification spacing, semantic error text, 44px+ Back/send/link/action targets, neutral unread structure, and canonical image/icon roles.
- Behavior comparison: source inspection confirms RLS-scoped participant rows, message ordering/subscription, mark-read/send/offer actions, busy guards, thread/listing/seller route identifiers, notification no-destination truthfulness, and empty/error states remain unchanged.
- Design exceptions: 34px header avatar inside a 44px profile target, 38px notification icon well, 40px listing thumbnail, unread dot, message bubble width, and keyboard/safe-area calculations are bounded component geometry. Fade/message motion remains for T031/T032 as assigned.
- Static checks: targeted escape audit found no independent readable muted text/raw color/type ramp or undersized interactive target; typecheck PASS and lint PASS with no diagnostics on 2026-08-18.
- Runtime subscription/send/keyboard/screen-reader observation: UNVERIFIED.
- Evidence IDs: E017.
- Status: MIGRATED (runtime cells remain UNVERIFIED).

### Checkout, Orders, and Order detail (T025)

- Family: Checkout and orders
- Source files: `src/app/(app)/checkout.tsx`, `orders.tsx`, and `order/[id].tsx`.
- Existing real behavior/data source: real listing/offer/delivery/platform-setting reads, server `startCheckout`, hosted Stripe test Checkout, webhook-created order/payment reads, real account-scoped order UUIDs, and pull-to-refresh.
- Canonical tokens/components adopted: item/card-title/price/section/metadata/caption roles, delivery radio structure, semantic payment/order statuses, canonical neutral cards/gutters/spacing, readable secondary metadata, semantic errors, and 44px+ actions.
- Behavior comparison: source inspection confirms the client still cannot decide charged amounts or mark payment/order success; accepted offers, delivery fees, protection fee, ownership/availability checks, checkout URL/order UUID, role-specific counterparty facts, and refresh behavior remain unchanged.
- Design exceptions: 54px listing thumbnail, 20px radio glyph, one-pixel dividers, and fixed sticky-checkout safe-area clearance are bounded component/layout geometry.
- Static checks: targeted escape audit found no independent readable muted text/raw color/type ramp or undersized actions; typecheck PASS and lint PASS with no diagnostics on 2026-08-18.
- Runtime hosted-checkout/order-refresh/accessibility observation: UNVERIFIED.
- Evidence IDs: E018.
- Status: MIGRATED (runtime cells remain UNVERIFIED).

## Post-migration visual audit and capture declaration (T027)

**Refresh date**: 2026-08-18  
**Route-file result**: 26 TSX route/layout files; no route or shared surface was discovered beyond R001–R032. Every inventory row is now `MIGRATED_STATIC`; this status does not imply runtime verification.

### Static candidate recheck

The same overinclusive searches were rerun after all US1 family migrations. Counts remain candidate counts, not defect counts. Later-task ownership is retained rather than hidden.

| Category | Post-migration candidates | Classification at T027 |
|---|---:|---|
| Raw/derived/semantic colors | 26 matches | 25 canonical literals/derived values in `src/theme/tokens.ts`; one `#access_token` URL-fragment comment false positive in `src/lib/auth-link.ts`; zero raw color values outside the canonical foundation |
| Typography | 14 matches | 10 canonical role definitions; shared `T` role application; Avatar proportional glyph geometry; zero route-local `T` override props and zero custom Button text-size props |
| Spacing/gutters | 532 broad matches | Canonical token consumption plus flex/absolute/safe-area/media geometry; family records classify bounded exceptions; final full candidate ledger/zero-OPEN closure remains T064 after accessibility/performance migrations |
| Radii | 77 broad matches | Canonical radius roles plus proportional avatar/dot/media geometry; no route-local radius ladder remains |
| Shadows/elevation | 16 matches | Canonical elevation registry and its shared raised/floating/sheet consumers only |
| Opacity/layers/z-index | 33 broad matches | Canonical opacity/layer roles plus animation values and absolute overlay ordering; final motion recheck remains T064 |
| Touch/button sizes | 54 broad matches | Shared touch roles plus non-interactive media/skeleton/indicator geometry; zero custom Button height/size props; deterministic control ledger retained for T055 runtime verification |
| Icon sizes/strokes | 72 broad matches | Canonical Icon role declarations/consumers plus internal SVG path geometry and bounded status/image-well glyphs; interactive target size remains separate |
| Image constants | 30 broad matches | Canonical image roles and explicit `contentFit`; thumbnail/avatar/gallery geometry classified in family records; image-state runtime evidence remains T044/T059 |
| Motion duration/easing/springs | 60 broad matches | Canonical registry plus deliberately retained pre-US2 implementations assigned to T029–T034; no motion behavior is claimed closed here |
| Duplicate component/variant candidates | 21 broad matches | One shared Button/Card/Sheet/Toast/BottomNav implementation, domain-specific listing/order/offer compositions, and the module-scope virtualized AnimatedFlatList wrapper; state/motion variants remain owned by later tasks |

### Predeclared runtime capture and 10×10 sampling protocol

For every family below, capture the named representative state at the normative viewport when real data or the truthful empty/error state is actually reachable. Crop only system-owned status/navigation pixels and full-bleed product media permitted by FR-009. Divide the remaining screenshot into ten equal columns and ten equal rows. Sample the center pixel of all 100 cells in row-major order `(r1c1 … r10c10)`; do not move, omit, or replace a cell after inspecting it. Classify each cell as neutral, black, semantic, excluded media, or excluded system control, retain the raw 100-cell sheet, and calculate family plus aggregate percentages in T028.

| Family | Predeclared representative route/state | Required artifact (not yet captured) |
|---|---|---|
| Launch/global chrome | Root launch, then Home-selected bottom bar | launch image plus 100-cell sheet |
| Onboarding | First eligible real onboarding step | screenshot plus 100-cell sheet |
| Authentication | `/sign-in`, resting and keyboard-safe | screenshot plus 100-cell sheet |
| Discovery | Home real feed if available, otherwise truthful empty; `/explore` real categories/truthful empty; Search resting; Favorites truthful reachable state | one screenshot and 100-cell sheet per route |
| Listing/seller detail | Existing real listing and seller UUID only; unavailable cell remains unavailable rather than fabricated | screenshot and 100-cell sheet per reachable route |
| Seller/account | Sell first step, Profile real/truthful error, Edit Profile real, Verify resting | one screenshot and 100-cell sheet per route |
| Communication | Inbox, Chat with an existing real conversation UUID only, Notifications | one screenshot and 100-cell sheet per reachable route |
| Commerce | Checkout with an eligible real listing UUID only, Orders real/truthful empty, Order detail with an authorized real UUID only | one screenshot and 100-cell sheet per reachable route |
| Global overlays/states | Filters sheet, authoritative toast, image error, skeleton, empty, and screen error when safely reachable | one screenshot and 100-cell sheet per surface |

### Static originality review

- References inspected: the user’s “Airbnb-level craftsmanship” and “marketplace usability inspired by Vinted” direction only. No Airbnb, Vinted, Expo-starter, or other marketplace logo, illustration, product image, copy block, icon asset, navigation composition, or screen capture is reused.
- Asset decision: the Expo starter mark was removed. The generated SAWA S/W monogram provenance is recorded above; it contains no marketplace imagery or borrowed brand geometry.
- Layout decision: SAWA uses its own five-destination Home/Browse/Sell/Inbox/Profile bar, centered Sell action, neutral image-first cards, seven-step real Sell composer, real-data rails, and truthful empty surfaces. These are composed from this repository’s routes/data constraints rather than copied screen layouts.
- UX-writing decision: copy describes NEW products, real Supabase/Auth/Stripe authority, and reachable actions. Used/secondhand claims, invented popularity/proceeds, and fake marketplace records are absent from migrated presentation.
- Icon decision: the existing repository symbol set is retained through one canonical role API; no third-party marketplace iconography was imported.
- Static navigation decision: Browse remains `/explore`, native Back/dismiss semantics remain intact, and the presentation is canonical SAWA black/white/neutral rather than a reproduction of another marketplace’s branded navigation.
- Motion-signature originality is intentionally not claimed here; T036 owns that review after motion implementation.

**T027 result**: PASS for static migration mapping, post-migration audit classification, capture predeclaration, asset/layout/copy/icon/static-navigation originality, and exception classification. Runtime visual evidence remains UNVERIFIED and is owned by T028.

## Final inventory and design-exception review (T061–T063)

**Working-tree refresh**: 2026-08-18, uncommitted by explicit instruction. The final scan contains 26 route/layout TSX files and 21 shared component TSX files. No new route family is outside the existing R001–R032 inventory. Extracted onboarding, country picker, photo grid, destination skeleton, and list primitives remain within their already recorded families.

### Final candidate classification

| Category | Final result | Classification |
|---|---|---|
| Palette and derived tints | Zero raw color values outside `src/theme/tokens.ts`; the sole search hit is `#access_token` in an auth-link comment | CENTRAL_DERIVATION / false positive |
| Typography | Zero local `fontWeight`, `lineHeight`, or `letterSpacing`; proportional Avatar/badge `fontSize` inputs are component geometry | CENTRAL_DERIVATION / EXCEPTION |
| Spacing and gutters | Screen and component rhythm uses `space`; remaining zero/absolute/media dimensions do not create another spacing ladder | MIGRATED / EXCEPTION |
| Radius | Zero numeric `borderRadius` values outside the theme | CENTRAL_DERIVATION |
| Shadow/elevation | Zero local shadow, box-shadow, or numeric elevation definitions outside the theme | CENTRAL_DERIVATION |
| Opacity and layer order | Shared opacity/layer roles cover UI state; animation interpolation and local SVG geometry remain bounded | CENTRAL_DERIVATION / EXCEPTION |
| Touch and button height | Shared controls use 44px minimum targets and canonical compact/regular sizes; smaller visual glyphs sit inside compliant targets | MIGRATED |
| Icons | Shared semantic icon roles own consumer size/stroke; `icon.tsx` SVG path coordinates are source geometry | CENTRAL_DERIVATION / EXCEPTION |
| Images | Shared aspect/fade/failure contracts apply; explicit avatar, thumbnail, gallery, and sell-preview dimensions express media composition | MIGRATED / EXCEPTION |
| Motion | Zero numeric `duration:` values outside tokens; scale and spring presets are canonical and reduced-motion-aware | CENTRAL_DERIVATION |
| Components/variants | One shared Button, Field shell, Card, Sheet host, Toast, state family, listing-card family, and bottom navigation contract | MIGRATED |
| Collections | All data-growing known scopes use FlatList/SectionList; remaining ScrollViews are bounded forms/details, short horizontal rails, or overlay content | MIGRATED |
| Accessibility | No web-only `aria-*` props; shared roles, names, state, focus, 44px targets, progress announcements, and decorative silence are present | MIGRATED_STATIC |

### Approved bounded DesignExceptions

| Location | Canonical rule | Concrete need and smallest scope | Rejected alternative | Verification |
|---|---|---|---|---|
| `src/components/icon.tsx` and `src/components/onboarding-parts.tsx` check glyph | Consumer icon/spacing tokens | SVG/path and hand-built check coordinates must retain measured geometry | Converting path coordinates into spacing tokens would mislabel drawing data as layout roles | Static source review; runtime visual remains BLOCKED |
| Listing, order, chat, notification, profile, auth, onboarding, and sell media wells | Canonical image roles | 34–112px avatars/thumbnails and sell previews encode bounded composition, while their controls retain >=44px targets | A single global square size would damage information hierarchy and responsive fit | Static target/layout review; runtime responsive remains BLOCKED |
| One-pixel dividers and 3–5px progress/page/unread marks | Canonical border/semantic colors | Physical hairlines and state marks need component-local thickness but use canonical color/radius | Promoting every stroke thickness to the spacing ladder would create misleading aliases | Static audit; runtime density remains BLOCKED |
| Safe-area, keyboard, gallery width, and card-width calculations | Canonical gutters/touch roles | Values depend on device insets, viewport, column count, or image ratio | Fixed token sizes would clip content or break responsiveness | Formula/source review; device matrix remains BLOCKED |
| Avatar initials and optional count-badge font size | Canonical type roles | Text must scale proportionally within caller-sized circular geometry | A fixed role would overflow small wells or undersize large avatars | Static component review; 200% text remains BLOCKED |

All exceptions are bounded geometry, not alternate palettes, spacing ladders, typography ramps, radii, shadows, or motion systems. No candidate remains OPEN. Runtime limitations and final evidence IDs E022–E036 are recorded in `validation-evidence.md`.
