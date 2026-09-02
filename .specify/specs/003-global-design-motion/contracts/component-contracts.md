# Component Contracts

These contracts define observable behavior and semantic API boundaries. Exact TypeScript signatures may adapt to the existing code, but implementation cannot weaken the states, accessibility, or business-preservation rules.

## Global rules

- Components consume canonical roles from `src/theme/tokens.ts`; callers do not supply arbitrary colors, radii, shadows, durations, springs, button heights, or text treatments.
- A narrow raw geometry escape hatch is allowed only with a recorded DesignException.
- Every interactive surface has an effective target of at least 44x44, a meaningful role and label, current selected/checked/disabled/busy state, and visible focus where supported.
- Disabled and busy controls cannot activate. Loading is shown only while the real action is in flight.
- Color is never the only indicator of selection, focus, failure, warning, success, disabled, or loading.
- Presentation wrappers do not change route destinations, query inputs, mutations, persistence, authorization, or authoritative success rules.

## Text

**Required prop**: one canonical typography role.  
**Optional props**: semantic color role, alignment, wrapping/truncation behavior, accessibility heading semantics where supported.  
**Forbidden**: screen-specific font ladder; arbitrary font size/weight/line-height/letter-spacing combination.

The role supplies all type metrics. Essential content wraps or adapts under increased text size. Instrument Serif is restricted to the existing wordmark.

## Button

**Variants**: `primary | secondary | ghost`  
**Sizes**: canonical regular and compact visual sizes; effective target always >=44x44.  
**States**: idle, pressed, focused, disabled, loading.

- Primary: near-black surface, inverse text.
- Secondary: white surface, dark text, subtle border.
- Ghost: no boxed decoration by default, dark semantic content.
- Disabled: neutral surface with readable `textSecondary #717171` label, canonical `disabled=0.44` opacity, and semantic disabled state; `textMuted` is forbidden for the readable label.
- Press scale is 0.97 in normal motion; reduced motion uses non-spatial state feedback.
- `loading=true` exposes busy state, prevents duplicate activation, retains a stable accessible name, and does not claim success.
- A control without a real handler is not rendered as an enabled button.

## IconButton

**Variants**: inline, floating-on-image, destructive where a real destructive action exists.  
**States**: Button states plus selected where applicable.

Visible glyph size and hit target are separate canonical roles. An icon never supplies its own raw size or stroke width. Accessible label is mandatory unless the control is hidden from accessibility because an adjacent control owns the same action.

## Pressable/Card press behavior

- Listing card visual scale is 0.98, using transform only.
- Motion must not claim the scroll gesture. Dragging a list cancels or naturally releases press feedback.
- Nested favorite/icon actions do not also open the card.
- One activation yields one existing real route/action.

## Input

**States**: default, focused, filled, error, disabled.  
**Slots**: label, field, optional hint, error, optional leading/trailing real control.

- Label remains visible; placeholder is supplementary and has sufficient contrast.
- Error text is concise and associated with the field for assistive technology.
- Focus uses more than a color change.
- Disabled state is both visual and semantic.
- Multiline/content-growing fields do not clip larger text.
- Keyboard type, capitalization, secure entry, and validation continue to reflect existing behavior.
- Screens cannot create independent field shells when this family can represent the interaction.

## Card

**Variants**: `listing | editorial | compact | selection`.

- Listing is image-first, shadow-free, and keeps price stronger than metadata.
- Editorial exists only for real editorial content, not invented marketplace claims.
- Compact reduces layout density without reducing interactive target size.
- Selection exposes selected state with structure/icon/text in addition to color.
- Cards are not rounded containers by default; radius follows the chosen family.

## Image

**Required**: real source or explicit missing/error state; aspect-ratio role; meaningful accessibility label when content-bearing.  
**States**: loading, loaded, missing, error.

- Uses `expo-image` for display surfaces where compatible with current behavior.
- Loading representation matches destination geometry and does not flash on an immediately resolved image.
- Loaded image fades in using the canonical image role unless reduced motion is active.
- Missing/error product imagery renders a neutral, non-product `ImageSlot`; never a fake photo.
- Content fit and radius are determined by component role, not a screen-specific guess.

## Skeleton

**Variants**: listing, profile, search, category, conversation, order.

- Shape resembles the destination layout.
- Normal motion is subtle and non-flashing.
- Reduced motion disables repeating shimmer and leaves a stable neutral placeholder.
- Skeleton does not resemble or imply a real product/person beyond anonymous layout geometry.

## EmptyState

**Slots**: minimal icon, title, short explanation, optional real action.

- Copy truthfully describes the absence of real rows or results.
- Optional action is rendered only when it works.
- No fake records, counts, people, or product images are added for visual fullness.

## Error

**Variants**: inline, form, screen, retry, network.

- Message is user-facing and does not expose unnecessary raw service/database text.
- Retry appears only if a real retry path exists and prevents duplicate concurrent retries.
- Screen-reader announcement is appropriate to urgency without repeated noise.
- Offline language is used only when the app actually knows connectivity/request failure warrants it.

## Toast

**Variants**: neutral, success, error where the underlying event is authoritative.

- High-contrast black or white surface, exact radius 16, maximum readable width 360, 16-pixel edge inset, and canonical floating elevation.
- Fade plus short vertical movement; reduced motion removes travel.
- Success is displayed only after the existing authoritative source confirms completion.
- Toast never replaces persistent error recovery where the person must act.

## Sheet

- White surface, 24 top radius, drag indicator, 28% black overlay, safe-area padding.
- Content scrolls independently when necessary; sticky action remains reachable above keyboard/home indicator.
- Open uses restrained upward spring; close is smooth downward motion; reduced mode minimizes travel.
- Opening transfers accessibility focus to the sheet; closing restores context to the invoking control when supported.
- Backdrop, close control, swipe/drag, and hardware back behavior preserve existing dismissal rules and cannot dismiss during an unsafe real operation.

## Navigation

- Visible primary items are Home, Browse, Sell, Inbox, Profile. Browse preserves existing `/explore` destination.
- Selected item uses near-black plus a non-color signal; unselected uses secondary text.
- Bottom bar is white with subtle top separation and safe-area padding.
- Sell is prominent but minimal and retains its real route/action.
- Stack, modal, and peer-tab semantics follow the motion contract; no route is added merely for relabeling.

## Selection controls

- Use the native-appropriate role and selected/checked accessibility state.
- Do not apply web-only `aria-*` properties directly to native controls where React Native accessibility props are required.
- Visual indication includes shape, icon, weight, or text in addition to color.
- Selection feedback is canonical and meaningful haptic is best effort only where FR-041 permits it.

## State-surface composition

Every data-bearing screen explicitly chooses one of:

```text
loading -> populated
loading -> empty
loading -> error -> retry -> loading
populated -> refreshing -> populated/empty/error-with-existing-content
```

The shared visual system does not alter how the screen determines these states. It only renders the existing truthful state consistently.
