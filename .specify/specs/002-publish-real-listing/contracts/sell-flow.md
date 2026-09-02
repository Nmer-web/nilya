# Contract: Premium Seven-Step Sell Flow

## Entry and global behavior

The existing protected `(app)` route group remains the authentication gate. An authenticated seller
enters from the center Sell navigation action. A signed-out deep link follows existing auth routing;
Sell does not add or redesign authentication.

If the session expires after entry:

- stop all new server operations;
- retain local form values and prepared photo resources while the route remains mounted;
- state `Session expired - sign in again to continue`;
- use the existing authentication path;
- never substitute a seller UUID or silently start another publication.

If the authenticated user has no real profile row, block publication with an honest profile error.
Do not create or fabricate the missing profile in this feature.

## Shared shell

Every step has:

- visible `Step n of 7` text plus a semantic progress value;
- one clear heading and short task-specific supporting text;
- preserved values when moving Back, Next, or Edit;
- a sticky primary action and working Back action, except while a remote critical section is busy;
- heading focus/announcement after step changes;
- reduced-motion-aware transitions;
- black, white, and neutral tokens from the existing SAWA system;
- generous spacing and minimum 44x44 interactive targets;
- loading/error states conveyed in text and accessibility announcements, never color alone.

The shell prevents duplicate submission while publication/recovery is in flight. It warns before
discarding a populated local composer through a destructive close/navigation action.

## Step 1 - Photos

**Goal**: Retain 1-10 ready real photos in the desired order.

Controls:

- Add photos opens the system library from the user's gesture.
- Every tile displays the real image, order number, preparation/error state, and Cover at position 1.
- Remove, Move earlier, and Move later are explicit accessible buttons.
- Add remains available while fewer than ten photos are retained.

Next is enabled only when at least one photo exists and all retained photos are ready. Canceling the
picker leaves the step unchanged. Photo-specific problems keep other valid selections intact and
offer correction. Full lifecycle rules are in [photo-pipeline.md](./photo-pipeline.md).

No fake fallback image, generic product placeholder, wear/condition prompt, or drag-only control is
allowed.

## Step 2 - Product title

Collect one real title, trimmed length 1-120. Show remaining count near the limit and an inline
required/length error. Do not generate or suggest claims about the product that the seller did not
enter. Next requires a valid value.

## Step 3 - Category

Read real categories through the existing query.

| State | Required UI |
|------|-------------|
| Loading | Neutral skeleton and disabled Next |
| Error | Useful message, Retry, disabled Next |
| Empty | Honest `No categories are available right now`, disabled Next |
| Ready | Real category labels with semantic selected state |

If Retry returns a set that excludes the prior selection, clear it and announce that a new category
is required. No hardcoded category constants or stale local label may replace the query.

## Step 4 - Product details

Collect optional brand and description only. Description is at most 4,000 characters and shows a
counter/error as needed. Copy describes a new product and must not mention second-hand, pre-owned,
like new, very good, good, satisfactory, marks, wear, or unsupported claims such as `sell faster`.

## Step 5 - Price

Collect a positive EUR amount with no more than two fractional digits. Parse decimal text exactly to
integer cents; malformed input never rounds silently. Preview uses the same persisted-price formatter
as Home/detail so the displayed amount corresponds to `price_cents`.

Remove the current 97%/3% proceeds/fee copy. The existing schema and frozen payment architecture do
not provide a truthful seller-fee result for this form.

## Step 6 - Location and delivery information

City is optional. Country is required through a searchable control backed by existing ISO codes and
platform-resolved display names. A real profile city/country may prefill; no approximate location or
guessed country may be invented. This reuses `src/lib/countries.ts` and does not modify onboarding.

Changing country cancels/invalidates the prior delivery request so stale results never render.

| Delivery state | Required UI |
|---------------|-------------|
| Loading | Neutral skeleton tied to selected country |
| Error/offline | Useful message and Retry |
| Empty | Honest `Delivery information is not available for this country` |
| Ready | Real option name, price and ETA from specific or fallback rows |

Delivery rows are informational. They have no selection affordance and are not submitted. Seeded
subtitle copy that assumes a buyer location is not shown.

## Step 7 - Preview

Preview renders only real current state:

- all prepared photos in final order with Cover marker;
- title;
- returned category label;
- optional brand and description when present;
- exact formatted price;
- fixed condition label `New`;
- real city/country label;
- current real delivery information or its honest unavailable state.

Each section has a labelled Edit action that returns to its source step without losing other values.
Preview does not show a seller earnings estimate, fake engagement, fake shipping promise, or a local
draft styled as an already-live listing.

Publish is enabled only when a fresh full validation passes. Once tapped, form/edit/navigation
mutations that could create a duplicate are disabled.

## Publication overlay and terminal states

The busy surface keeps the seller oriented and exposes one live message:

1. `Preparing photos` (only if final boundary verification is still running)
2. `Uploading photo x of n`
3. `Activating listing`
4. `Confirming publication`
5. `Finishing cleanup` or `Checking your previous listing` when recovery applies

Do not show a byte percentage. Do not show `Your item is live` until the lifecycle contract returns
`kind: published` after authoritative confirmation.

On confirmed success:

- release/reset the local composer;
- perform the existing success feedback/haptic;
- replace navigation with the real `/listing/<UUID>` route;
- let detail issue its own Supabase query.

On a normal corrected/cleaned failure, preserve local form/photos and offer the action appropriate
to the stage. On incomplete cleanup, explain that the listing is not confirmed live, keep the exact
recovery record, block another draft, and offer Retry. If confirmation proves publication but the
detail request fails, explicitly say the item was published and offer Retry/Open Home; do not expose
Publish again for that attempt.

## Accessibility contract

- Progress exposes value, min, max, and `Step n of 7` text.
- Category/photo controls expose selected/disabled/busy state.
- Photo labels include position and cover status; move results are announced.
- Inputs have visible labels, hints, error association, and logical keyboard order on web.
- Errors and phase transitions use an appropriate live region/announcement without repeated noise.
- VoiceOver and TalkBack order follows heading -> content -> errors -> navigation.
- Reduced-motion preference suppresses decorative transitions without removing state feedback.
- Keyboard users on web can complete every step, including photo removal/reorder and country search.

## Existing integration contract

Home remains `useListingFeed` backed and performs no local insertion. Its manual refresh must query
active+new rows. Detail accepts the confirmed real UUID and its buyer query requires active+new,
then renders real ordered images, title, price, seller, condition, and location. Neither integration
is replaced by a visual prototype.
