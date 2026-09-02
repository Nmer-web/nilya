# Feature Specification: Real Selling and First Real Listing

**Feature Branch**: `marketplace-app`

**Created**: 2026-08-17

**Status**: Core implementation present; T047–T048 and runtime verification pending

**Input**: User description: "Enable a real authenticated SAWA seller to create and publish the marketplace's first real new-product listing from the mobile app, with real photos, real categories, real Supabase records, truthful rollback, and visibility on listing detail and Home."

---

## Data Reality & Scope Boundaries *(read first)*

This specification is constrained to the repository's existing schema and policies. It does not change authentication, the database schema or migrations, row-level security, Realtime, Stripe, checkout, or payment behavior. It does not rebuild onboarding.

### Listing fields available to this journey

The Sell flow may collect or display only the following existing `listings` data:

| Field | Sell behavior |
|---|---|
| `seller_id` | Required; derived exclusively from the authenticated seller and never accepted from form or route input. |
| `title` | Required; trimmed length 1–120 characters. |
| `brand` | Optional real seller input. |
| `description` | Optional real seller input; maximum 4,000 characters. |
| `price_cents` | Required positive price, converted exactly from the seller's currency input. |
| `currency` | Existing EUR default; no currency selector is introduced by this feature. |
| `condition` | Always `new`; no condition control is shown. |
| `category_slug` | Required; selected from rows currently returned by the real `categories` data source. |
| `city` | Optional real seller input, prefilling from the seller's profile when present. |
| `country_code` | Required two-letter country code, prefilling from the seller's profile when present. |
| `status` | System-controlled: starts as `draft` and becomes `active` only after the complete publish operation succeeds. |
| `published_at` | System-controlled and set only when the listing becomes active. |

`original_price_cents`, `size`, `color`, and `tagline` exist but are not required by this feature and are not added to the initial journey. No substitute field or metadata object may be invented for information the schema cannot represent.

### Photos and storage contract

- The existing public `listing-images` bucket accepts JPEG, PNG, WebP, and AVIF images, with a maximum of 5 MiB per stored object.
- Every object path must begin with the real listing UUID: `<listing_id>/<unique-image-name>`. The first path segment is load-bearing for the existing ownership policy.
- Each successful object must have one real `listing_images` row containing its listing UUID, storage path, zero-based position, and real width/height when those dimensions are available.
- `listing_images.position` supports ordering and a cover image at position `0`. This feature therefore includes explicit reordering before publication.
- The Sell experience accepts 1–10 photos. Ten is the existing application limit and remains within the schema's position range of 0–19.
- Unknown, empty, oversized, or unsupported image bytes must be rejected. The system must never label unknown bytes as JPEG, invent a MIME type, or substitute a fallback image.
- Photo preparation is sequential: no more than one source image may be decoded and re-rendered at a time. Each retained prepared upload payload remains within 5 MiB, so ten retained payloads have a combined byte-payload ceiling of 52,428,800 bytes, excluding platform image-view/cache overhead.
- A ten-photo runtime stress run must finish preparation without process termination, browser-tab termination, or an unresponsive composer; the preparing indicator must visibly advance between photos. This is an observable resource-safety requirement, not a claim about an unmeasured total process-memory ceiling.

### Authentication reachability

The existing protected `(app)` route group remains the mobile authentication boundary. A signed-out
Sell deep link must reach the existing sign-in journey and cannot create a draft or upload an object.
The feature does not add anonymous mobile navigation. Buyer-facing mobile verification therefore uses
an independent signed-in account. Any anonymous database-read policy check is separate from this app
journey and must not be used as authority to change the frozen authentication architecture.

### Delivery limitation

`delivery_options` rows are keyed by country, with a country-specific set or the existing `**` fallback. The `listings` table has no delivery-option column and no listing-to-delivery relationship. Consequently:

- the seller selects or confirms the listing location;
- the flow retrieves and displays the real active delivery information applicable to that country;
- delivery rows are informational in Sell and are not selectable, persisted, copied, or rewritten;
- if no active delivery row applies, the flow states that delivery information is not currently available and still avoids inventing an option;
- changing this behavior would require an approved schema change and is outside this feature.

### Offline behavior contract

Offline behavior is bounded by the real-data and publication rules rather than by fabricated cache
fallbacks:

- The local composer preserves entered values and already selected/prepared photos while mounted.
- A category request that cannot reach Supabase shows a category-specific offline/error state with
  Retry, exposes no hardcoded rows, and blocks category progression until a real row is selected.
- A delivery request that cannot reach Supabase shows that delivery information could not be loaded
  and offers Retry. Because delivery is informational and has no listing relationship, this state does
  not invent an option or silently persist a choice.
- Starting or continuing publication while connectivity is unavailable stops at the known stage,
  preserves legitimate composer state, and follows the existing compensation or reconciliation rules;
  it never reports success from local state.
- Detail and Home show retryable unavailable states and never substitute a local form snapshot, sample
  listing, or cached value presented as a confirmed live result.
- A restored connection never triggers an automatic duplicate publication. The seller explicitly
  retries the failed read/action, except owner-scoped recovery, which reconciles the retained UUID
  before enabling a new draft.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Publish a real new-product listing (Priority: P1)

An authenticated seller completes a focused, step-by-step Sell journey using their own photos and product facts, reviews the complete listing, publishes it, and lands on the real listing detail page.

**Why this priority**: This creates SAWA's first genuine supply. Without a trustworthy end-to-end publish journey, every downstream marketplace screen remains empty by design.

**Independent Test**: Sign in with a real seller account, choose at least one real supported image, enter valid required details using a category returned by the live category source, publish, and verify that the resulting real UUID opens a detail page populated from the persisted listing, images, and seller profile.

**Acceptance Scenarios**:

1. **Given** a seller has a valid authenticated session and corresponding profile, **When** they open Sell, **Then** they see a premium multi-step journey rather than one large form.
2. **Given** the seller has selected valid photos and entered valid required details, **When** they reach preview, **Then** they can review every selected photo, cover order, title, category, optional details, price, condition as New, location, and real applicable delivery information before any publication begins.
3. **Given** the preview is valid, **When** the seller publishes once, **Then** the system creates an owner-only draft, uploads every real image, creates the matching ordered image records, and only then activates and timestamps the listing.
4. **Given** activation is confirmed, **When** publication completes, **Then** the app uses the returned real UUID, reloads the listing from the real data source, and opens its detail route with the real title, price, images, and seller.
5. **Given** publication has not been confirmed, **When** any operation is still pending or has failed, **Then** the app does not claim that the item is live.

---

### User Story 2 - Curate real listing photography (Priority: P1)

The seller selects multiple real images from the system image library, sees them immediately, removes mistakes, and reorders them so the strongest image is the cover.

**Why this priority**: Photography is the primary product signal and is required before a listing may become visible.

**Independent Test**: On each supported platform, select several real images, observe immediate previews, remove one, reorder the remainder, and confirm that the uploaded objects and image records match the final visible order exactly.

**Acceptance Scenarios**:

1. **Given** the photo step is open, **When** the seller invokes image selection, **Then** the system image library opens for images only and allows multiple selection up to the remaining 10-photo limit.
2. **Given** the seller cancels the system picker, **When** control returns to SAWA, **Then** the existing photo selection and form state remain unchanged and no error or draft is created.
3. **Given** the picker returns valid assets, **When** selection completes, **Then** each image appears immediately in the selected order and the first is clearly identified as the cover.
4. **Given** several photos are selected, **When** the seller removes or reorders one, **Then** the preview updates immediately and the remaining positions are contiguous from zero.
5. **Given** a selected asset cannot be read, has no usable URI or bytes, exceeds 5 MiB, or has an unsupported/unknown effective MIME type, **When** it is validated, **Then** it is not uploaded and the seller receives a specific corrective message without a fake replacement.
6. **Given** a native picker returns a valid `file://` asset, **When** the image is prepared, **Then** the original local bytes are read successfully through an Expo SDK 57-compatible native file API.
7. **Given** a web picker returns a valid `blob:` asset and web file metadata, **When** the image is prepared, **Then** its actual bytes and MIME type are used and its temporary object URL is released after removal, completion, or abandonment.

---

### User Story 3 - Recover safely from publication failures (Priority: P1)

A seller encountering a file, network, storage, image-record, or activation failure receives a truthful error and can retry without creating an active partial listing, duplicate submission, or unreachable orphaned image.

**Why this priority**: Cross-service publication is not atomic. Compensating rollback is necessary to preserve marketplace truth and seller trust.

**Independent Test**: Force one failure at each publication stage and verify that no partial listing becomes active, successful prior objects are cleaned up in ownership-safe order, form inputs remain available for correction/retry, and no success message appears.

**Acceptance Scenarios**:

1. **Given** an image read or preparation fails during the mandatory preflight, **When** publication aborts, **Then** no draft, Storage object, or `listing_images` row is created, the legitimate composer state is preserved, and the seller sees which photo failed. Any later state-changing failure after draft creation follows scenarios 2–6 and the exact-path compensation rules.
2. **Given** a Storage upload fails after earlier photos succeeded, **When** rollback runs, **Then** every object uploaded by that attempt and its corresponding image records are removed, and the draft is deleted only after object cleanup succeeds.
3. **Given** an object upload succeeds but its `listing_images` insert fails, **When** the failure is detected, **Then** that object is removed immediately and the overall attempt follows the same rollback rules.
4. **Given** all photos and image rows exist but activation conclusively fails, **When** rollback runs, **Then** the listing never becomes visible and all artifacts from the attempt are cleaned up.
5. **Given** publication outcome is ambiguous because connectivity is lost during activation, **When** connectivity permits reconciliation, **Then** the system reads the listing by its real UUID before deciding whether to continue success or rollback; it does not blindly republish or delete a possibly active listing.
6. **Given** Storage cleanup cannot complete, **When** rollback reports its result, **Then** the app keeps the listing non-active and preserves the owning draft needed by the current Storage policy for a later cleanup retry; it does not delete the draft first or claim complete rollback.
7. **Given** publication is already in progress, **When** the seller taps Publish again, **Then** no second publish attempt or duplicate listing is created.

---

### User Story 4 - Discover the first real listing on Home (Priority: P2)

After publication, the seller or another user refreshes Home and sees the newly active listing among the real feed results.

**Why this priority**: Publication only delivers marketplace value when the listing is visible through the actual buyer discovery path.

**Independent Test**: Begin with a legitimately empty database, publish one real listing through User Story 1, then refresh Home from an independent app session and open the resulting real card.

**Acceptance Scenarios**:

1. **Given** the marketplace has no active new-product listings, **When** Home loads before publication, **Then** it shows the designed empty state and no sample products.
2. **Given** a listing was fully published with `condition = new`, **When** Home refreshes, **Then** the live feed returns it with its real cover, title, price, seller, and UUID.
3. **Given** a draft or failed publication attempt exists, **When** Home refreshes, **Then** it is absent from the feed.
4. **Given** another independently signed-in user sees the real card, **When** they open it, **Then** the same real listing detail route and persisted data load through the existing protected app architecture.

### Edge Cases

- The seller is signed out, the session expires mid-flow, or the authenticated user has no valid profile row.
- The real category query is loading, fails, or legitimately returns no eligible rows; publication remains blocked and no hardcoded category appears.
- The seller changes the country after delivery information loads; stale delivery information must not be shown for the new country.
- The chosen country has no specific delivery rows and uses the real active fallback, or neither specific nor fallback rows are available.
- The seller enters an empty/whitespace title, more than 120 title characters, more than 4,000 description characters, a zero/negative/malformed price, or an invalid country code.
- The picker returns duplicate assets, missing optional names, missing MIME metadata, an unsupported URI scheme, an empty file, or more assets than the remaining limit.
- An image is removed after being made cover; the next image becomes cover and all positions are recalculated.
- The app is backgrounded or Android recreates the activity while the system picker is open; a recoverable picker result is restored without duplicating assets, otherwise the seller receives a retry path.
- Connectivity drops during image reading, object upload, image-row creation, activation, confirmation read, detail reload, or Home refresh.
- The active write succeeds but its response is lost; reconciliation must prevent both duplicate publication and destructive rollback of a live listing.
- Cleanup partially fails; the UI distinguishes publication failure from incomplete cleanup and never reports a clean rollback without evidence.
- The listing publishes successfully but detail reload temporarily fails; the app truthfully states that publication succeeded, offers a detail reload/Home path, and does not create a second listing.
- A profile contains a lowercase or unsupported country value; lowercase supported ISO alpha-2 values are normalized to uppercase, while unsupported values are cleared and require an explicit real-country selection.
- A recovery journal contains malformed JSON, an unknown version, missing fields, unsafe paths, or a key-owner/payload-owner mismatch; no identifier or path from that record is used for a backend mutation.
- The seller leaves before publishing; no active listing, image row, or Storage object is created merely from filling the form or selecting local photos.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST restrict publication to a currently authenticated seller and derive `seller_id` only from that authenticated identity.
- **FR-002**: The Sell route MUST keep the existing authentication architecture; signed-out users receive a working sign-in action and cannot create a draft or upload listing images.
- **FR-003**: The flow MUST be step-based in this order: photos, title/product identity, category, optional product details, price, location/delivery information, and final preview.
- **FR-004**: The flow MUST preserve entered values and selected photos while the seller moves backward and forward between steps or corrects a validation error.
- **FR-005**: The photo step MUST support 1–10 library images, multiple selection, immediate preview, individual removal, explicit reordering, and clear cover-photo identification.
- **FR-006**: Photo selection MUST accept images only and MUST use only APIs available in Expo SDK 57 for the target platform.
- **FR-007**: Native `file://` photo assets MUST be read as their real bytes through the SDK 57 file interface; web `blob:` assets MUST be read as their real bytes using available web file/blob data.
- **FR-008**: The system MUST determine an asset's effective MIME type from real picker/file information, allow only the bucket's existing accepted image types, keep filename extension/content type consistent with the actual bytes, and reject unknown types without a JPEG fallback.
- **FR-009**: The system MUST validate that each image is non-empty and no larger than the existing 5 MiB Storage object limit before treating it as uploadable whenever size is knowable locally; a server-side size rejection MUST produce the same useful outcome.
- **FR-010**: Removing, reordering, or adding photos MUST immediately recompute contiguous positions, with the cover at position `0`; persisted image records MUST use that final order.
- **FR-011**: The system MUST load categories from real `categories` rows, show real loading/empty/error states, provide a retry after failure, and block publication until a returned category is selected.
- **FR-012**: The system MUST NOT hardcode or fabricate marketplace categories when category data is empty or unavailable.
- **FR-013**: The form MUST collect only the in-scope existing listing fields recorded in Data Reality & Scope Boundaries and validate them against their existing constraints before publication.
- **FR-014**: Every listing created by this journey MUST write `condition = new`, and no alternative condition control or copy may appear anywhere in the Sell journey or resulting listing presentation.
- **FR-015**: The price shown in preview and detail MUST be derived from the seller's entered amount and stored cents; the Sell flow MUST NOT display an earnings, fee, or proceeds claim unless backed by a real implemented source.
- **FR-016**: The location step MUST require an uppercase code from the app's existing supported ISO 3166-1 alpha-2 country set and allow an optional city. A supported lowercase profile value is normalized to uppercase; a non-null profile value outside that set is cleared, is never treated as valid merely because it has two characters, and requires the seller to select a real supported country before progression.
- **FR-017**: For a valid country, the flow MUST retrieve active country-specific delivery rows or the existing active fallback and display their real names, prices, and estimates without storing a listing-level choice.
- **FR-018**: The preview MUST show all selected photos and their order, title, real category label, optional brand/description, price, condition as New, location, and applicable real delivery information, with a direct way to return and edit earlier steps.
- **FR-019**: Publish MUST be disabled until all required fields and at least one valid photo are present, and duplicate submissions MUST be prevented while publication is in progress.
- **FR-020**: Publication MUST expose clear phases—preparing, uploading with completed/total photo progress, activating, and confirming—so the seller can distinguish work from a stalled interface.
- **FR-021**: The system MUST first create the seller-owned listing as `draft`, because the existing Storage ownership rule requires the listing UUID before an image can be uploaded.
- **FR-022**: Each uploaded object MUST use the existing `listing-images` bucket and a path whose first segment is the real listing UUID.
- **FR-023**: Each successful object upload MUST be followed by one real `listing_images` record with the correct listing UUID, exact storage path, final position, and real dimensions when available.
- **FR-024**: The listing MUST remain `draft` and invisible to Home until all selected images have readable bytes, all objects are stored, and all image records are persisted.
- **FR-025**: Activation MUST set `status = active` and a real publication timestamp as one logical publication step only after FR-024 succeeds.
- **FR-026**: The system MUST maintain the exact set of object paths created by the current attempt so rollback never targets another listing or an earlier successful publication.
- **FR-027**: On a conclusive pre-activation failure, rollback MUST remove current-attempt Storage objects before deleting the draft, because deletion first would invalidate the current object-deletion policy; related image records MUST also be removed.
- **FR-028**: If a Storage object succeeds but its image record fails, that object MUST be removed before the failure is returned; if removal cannot be confirmed, the owning draft MUST remain non-active and available for cleanup retry.
- **FR-029**: If activation has an ambiguous outcome, the system MUST reconcile the real listing status by UUID before either reporting success, rolling back, or permitting a retry.
- **FR-030**: No failure path may display “Your item is live” or an equivalent success claim unless activation is confirmed.
- **FR-031**: After confirmed publication, the system MUST navigate with the real listing UUID and reload the listing from the real data source rather than rendering the unsaved form draft as if it were persisted data.
- **FR-032**: The reloaded detail MUST show the real title, price, ordered images, condition, location, and seller relationship; missing or failed real data MUST produce an honest loading/empty/error state.
- **FR-033**: Home refresh MUST query real active listings, enforce `condition = new`, and surface the newly published listing without a fabricated local insertion.
- **FR-034**: All steps MUST use the existing black/white/neutral SAWA design system, generous spacing, strong photography, deliberate transitions, and complete loading, empty, error, offline, and disabled states. The category, delivery, publication, detail, and Home surfaces MUST implement the explicit Offline Behavior Contract above, preserve truthful known state, and provide the specified retry or recovery action without fabricated data.
- **FR-035**: Every interactive control MUST have an appropriate accessibility role, label, state, and touch target; progress and errors MUST be conveyed without relying on color alone.
- **FR-036**: The feature MUST NOT alter onboarding, Auth, Supabase schema/migrations/RLS, Realtime, Stripe, checkout, or payment architecture.
- **FR-037**: Seller-facing failures MUST distinguish at least session expiry, category loading, invalid/unsupported/oversized photo, local photo read, Storage upload, image-record creation, activation, confirmation, and incomplete cleanup, and each message MUST give a useful retry or correction action.
- **FR-038**: If an interrupted attempt retains a non-active draft because cleanup could not be confirmed, the next recoverable Sell session MUST resume reconciliation/cleanup for that exact UUID before creating another draft; once cleanup is confirmed, the retained draft MUST be deleted. If the local journal is malformed, has an unknown version, omits required fields, contains an unsafe path, or its storage key owner disagrees with its payload owner, the app MUST treat it as untrusted: preserve the raw local record, perform no Storage or database mutation from it, block creation of a new draft for that seller, and show an integrity-specific state explaining that no automatic cleanup was attempted and providing a safe retry/support path. The app MUST NOT clear or reinterpret such a record merely to unblock Sell.

### Verification Requirements

- **VR-001**: `npm run typecheck` MUST finish with zero errors before implementation is reported complete.
- **VR-002**: `npm run lint` MUST finish with zero errors before implementation is reported complete.
- **VR-003**: Runtime verification MUST select real images through the system library, exercise multiple selection, immediate preview, removal, reordering, and cancellation. On native and supported web targets, a ten-photo stress run MUST also confirm sequential preparation, visible per-photo progress, and no process/tab termination or unresponsive composer.
- **VR-004**: Runtime verification on a native target MUST demonstrate a real selected `file://` image being read and uploaded successfully.
- **VR-005**: Runtime verification on web MUST demonstrate a real selected `blob:` image being read and uploaded successfully if web remains a supported target for this journey.
- **VR-006**: Runtime verification MUST confirm the real Storage object path begins with the resulting listing UUID and uses an allowed MIME type and actual bytes.
- **VR-007**: Runtime verification MUST confirm creation of one real draft listing row owned by the authenticated seller and one ordered `listing_images` row per uploaded object.
- **VR-008**: Runtime verification MUST confirm the listing remains absent from buyer feeds before activation and becomes active only after all required photo/database work succeeds.
- **VR-009**: Runtime verification MUST navigate to the real detail route, reload by the real UUID, and observe the persisted title, price, seller, and ordered public images.
- **VR-010**: Runtime verification MUST refresh Home from a separate buyer-facing session and observe the real listing returned by the real feed query.
- **VR-011**: Runtime failure tests MUST cover image-read failure, Storage failure after partial success, image-row insert failure, activation failure, interrupted connectivity, and malformed/unknown-version/owner-mismatched recovery journals. They MUST inspect the real database/bucket outcome after each state-changing run and confirm that an untrusted journal causes no backend mutation or automatic local deletion.
- **VR-012**: Static code inspection may support review but MUST NOT be recorded as runtime verification for VR-003 through VR-011.

### Key Entities

- **Authenticated Seller**: The current real account and its profile. Its authenticated UUID owns the listing; profile city/country may provide editable defaults and profile identity supplies seller data on detail.
- **Listing**: A real product offer with title, optional brand/description, positive price, EUR currency, condition `new`, real category reference, location, draft/active status, publication time, and authenticated owner.
- **Selected Photo**: A temporary local image with a valid platform URI, actual bytes, supported effective MIME type, real size/dimensions when available, and seller-controlled order. It is not marketplace data until uploaded and recorded.
- **Stored Listing Image**: A real object in `listing-images`, named below the owning listing UUID, paired one-to-one with a `listing_images` row and an ordered position.
- **Category**: Existing marketplace reference data identified by a real slug and label; Sell may select only a row currently returned by the category source.
- **Delivery Option**: Existing active country/fallback reference information shown for transparency. It is not attached to or chosen for an individual listing in the current schema.
- **Publication Attempt**: The coordinated draft, photo, image-record, activation, confirmation, and compensating-cleanup lifecycle for exactly one real listing UUID.

## Success Criteria *(mandatory)*

### Measurement protocols

**SC-001 moderated-study protocol**:

- Use at least 20 authenticated participants who have not previously completed this Sell journey;
  at least eight complete the run on iOS and at least eight on Android. Web may be recorded
  separately but does not replace either native cohort.
- Each participant starts authenticated on Home with an existing real profile, one genuine NEW
  product to describe, and 1–3 real product photos already available in the system library.
- Start the timer when the participant activates Sell. Stop only when the confirmed real UUID detail
  screen has loaded persisted title, price, seller, and images.
- Pause only for the coordinator's measured Uploading phase; preparation, draft creation, activation,
  confirmation, navigation, and detail loading remain counted.
- “Without assistance” means no moderator instruction, correction, or navigation hint after timing
  starts. Normal platform accessibility tools and a request to repeat the written task are allowed and
  recorded, but a procedural hint makes that run assisted and therefore unsuccessful for SC-001.
- SC-001 passes only when at least `ceil(0.90 × eligible participants)` finish successfully within
  the adjusted four-minute limit; for the minimum cohort this is 18 of 20. Record platform,
  duration, excluded upload interval, assistance, and outcome for every participant without
  recording secrets or full local paths.

**SC-004 Home timing protocol**:

- Use the independent signed-in buyer session with search and category filters cleared and the first
  feed page selected.
- “Stable connection” means the device remains online with no connectivity transition, request
  timeout, retry, or Supabase error from refresh invocation until the target card renders. A run that
  violates this condition is invalid and must be rerun, not counted as a pass.
- Start the monotonic timer when the manual refresh invokes the page-zero Supabase fetch. Stop when a
  rendered Home card carrying the published listing's exact UUID, real cover, title, and price is
  visibly present. Query completion without a rendered matching card does not stop the timer.
- One manual refresh is allowed. The run passes only when the stop event occurs within 5.0 seconds;
  record platform, connection type, listing UUID, start/end timestamps, and observed duration.

### Measurable Outcomes

- **SC-001**: Under the moderated-study protocol above, at least 90% of authenticated sellers can complete a valid first listing without assistance in under 4 minutes after subtracting only the measured Uploading phase.
- **SC-002**: 100% of successful test publications produce exactly one active new-product listing owned by the signed-in seller, with a publication time and 1–10 ordered real images.
- **SC-003**: 100% of successful publications open a detail page addressed by the real listing UUID and display the same real title, price, seller, and photo order that were persisted.
- **SC-004**: Under the Home timing protocol above, a published listing appears on the first Home page within one manual refresh and 5.0 seconds from page-zero fetch invocation to the matching real card being visibly rendered.
- **SC-005**: Across every required forced-failure test, zero partial attempts appear active, zero false success messages are shown, and every cleanup result is reported truthfully.
- **SC-006**: In cross-account verification, a second independent session can refresh Home, see the first real listing, and open its real detail page without seeded or locally fabricated data.
- **SC-007**: All seller-visible category, delivery, listing, image, price, location, and seller values shown in the completed journey are traceable to real seller input, authenticated identity, or existing persisted data.
- **SC-008**: All required runtime checks have recorded execution evidence; any unexecuted check is explicitly marked unverified rather than inferred from static inspection.

## Assumptions

- The existing `listing-images` bucket, schema, grants, ownership helpers, and policies are deployed and remain frozen for this feature.
- The authenticated account normally has the existing profile row required by the `listings.seller_id` relationship; if it does not, publication fails honestly and no workaround profile is fabricated.
- The existing system image picker is the source for this feature; taking a new camera photo is outside the requested first journey.
- The app-level 10-photo limit is retained even though the schema permits positions through 19.
- Images are uploaded in one of the bucket's existing supported formats and within its existing 5 MiB per-object limit; support for additional formats would require an approved storage change and is out of scope.
- City remains optional because the schema permits null; country is required because the schema does not.
- The listing currency remains the existing EUR default. Currency expansion and pricing conversion are separate features.
- Delivery selection is not representable by the existing listing schema. This feature truthfully previews applicable active delivery information based on country and does not add a dead or non-persistent selector.
- Home already has a real refresh path and listing detail already has a real UUID route; this feature verifies and completes their integration rather than replacing their architecture.
- A legitimately empty category table blocks publication with a finished empty state; a legitimately empty listings table remains empty until this journey publishes a real listing.
