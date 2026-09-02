# Phase 0 Research: Real Selling and First Real Listing

**Date**: 2026-08-17  
**Status**: Complete for planning  
**Scope**: Read-only repository/schema inspection and official SDK documentation. No listing,
Storage object, policy, schema, authentication, payment, or application-code mutation was made.

## Sources and method

- Constitution: `.specify/memory/constitution.md`
- Schema and constraints: `supabase/migrations/20260812120451_sawa_core_schema.sql`
- Row policies and ownership helper: `supabase/migrations/20260812120531_sawa_rls_policies.sql`
- Bucket, path, MIME, size, and Storage policies:
  `supabase/migrations/20260812120621_sawa_storage_buckets.sql`
- Category and delivery reference rows:
  `supabase/migrations/20260812120641_sawa_reference_data.sql`
- App contracts: `src/lib/database.types.ts`, `src/lib/queries.ts`,
  `src/lib/mutations.ts`, `src/lib/supabase.ts`
- Integration surfaces: `src/app/(app)/sell.tsx`, `src/app/(app)/listing/[id].tsx`,
  `src/app/(app)/index.tsx`, `src/hooks/use-listing-feed.ts`, `src/store/auth-store.tsx`
- [Expo SDK 57 ImagePicker](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/)
- [Expo SDK 57 FileSystem](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/)
- [Expo SDK 57 ImageManipulator](https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator/)
- [Supabase standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads)

The public client performed read-only selects against the deployed project's listed columns. Those
selects returned successfully. Bucket metadata could not be read through the public endpoint, so
the bucket contract below comes from the checked-in migration and must be rechecked in the
authorized dashboard before runtime claims. No service-role credential was used or exposed.

## D1 - Prepare every photo into verified JPEG bytes

**Decision**: Add SDK 57's `expo-image-manipulator` with `npx expo install` and decode/re-render each
retained picker asset to a new JPEG before creating a Supabase draft. Do not request EXIF. Verify the
prepared byte signature, non-zero length, dimensions, `.jpg` extension, `image/jpeg` content type,
and exact 5,242,880-byte cap. If needed, progressively recompress and downscale without upscaling;
if no compliant result can be produced, reject the photo with a corrective message.

**Clarification provenance**: This resolves the unanswered clarify question using the previously
recommended Option A as a planning assumption. It is not recorded as a user-confirmed choice.

**Rationale**: The existing picker can surface HEIC and may omit `mimeType`. Relabeling unknown
bytes as JPEG is false and violates the bucket contract. Re-rendering establishes one truthful
upload format supported across SDK 57 targets, avoids uploading source bytes, and normally drops
source metadata because the new image is rendered rather than copied.

**Privacy release gate**: Expo's documented API does not explicitly guarantee metadata removal.
The runtime protocol must use a real GPS/EXIF fixture and inspect the uploaded object. If location
metadata survives on any supported target, public upload is blocked until the preparation path is
corrected; no claim is inferred from source inspection.

**Alternatives rejected**:

- Upload allowed originals: leaks source metadata and leaves HEIC/unknown types inconsistent.
- Treat missing MIME as JPEG: fabricates content type and can upload non-JPEG bytes.
- Reject all HEIC: unnecessarily rejects a common iOS source that the SDK can often decode.
- Trust `preferredAssetRepresentationMode` alone: compatibility preference is not byte validation.
- Upload before preparation: risks public originals and creates cleanup work for local failures.

## D2 - Use ImagePicker's real platform contract and explicit resource ownership

**Decision**: Launch from a direct user gesture with images only, multiple selection, no editing,
the remaining 1-10 selection limit, `orderedSelection` where supported, quality 1, and iOS compatible
asset representation. Append selected assets immediately for preview, then prepare them
sequentially or with bounded concurrency. On Android consume `getPendingResultAsync()` once and
deduplicate by a stable local identity. Cancel changes nothing.

Each local photo owns a stable ID, source preview URI, nullable source metadata, prepared URI,
prepared metadata, status, error, and an `ownsObjectUrl` flag. On web use the real picker `File` for
source metadata and app-created object URLs for previews. Revoke only URLs the app created, on
replacement, removal, successful completion, reset, or unmount.

**Rationale**: SDK 57 makes editing and multiple selection mutually exclusive. Ordered selection is
only guaranteed on supported iOS versions. Picker cancellation on web is not uniformly signalled,
and Android may destroy the activity after selection. Explicit ownership prevents leaked blob URLs
without revoking resources the app did not create.

**Alternative rejected**: A new drag/drop library. The existing array already expresses order, and
Move earlier/Move later controls are deterministic, screen-reader accessible, and dependency-free.

## D3 - Read real prepared bytes by URI scheme

**Decision**: Native prepared `file://` assets use Expo SDK 57 `new File(uri)`, verify existence,
size and type information where available, then `await file.bytes()` for a `Uint8Array`. Web prepared
`blob:` assets use `fetch(uri).arrayBuffer()`/Blob; the web picker `File` remains the source metadata
authority. Verify JPEG magic bytes after reading. Never run FileSystem against a web blob URI and
never introduce base64 or a fake image fallback.

**Rationale**: These are the SDK-compatible paths already partly present in the repository. Byte
validation is the only reliable basis for MIME consistency; picker metadata is useful but nullable.
Avoiding base64 reduces memory expansion for up to ten images.

**Alternative rejected**: `mimeType ?? 'image/jpeg'`, currently present in Sell. It converts absence
of evidence into false evidence.

## D4 - Persist only the existing schema

**Decision**: The form writes only:

- `seller_id`: required, from `supabase.auth.getUser()` immediately before draft creation
- `title`: trimmed, 1-120 characters
- `brand`: nullable
- `description`: nullable, at most 4,000 characters
- `price_cents`: positive integer, parsed from EUR with at most two fractional digits
- `currency`: existing EUR value/default
- `condition`: hardcoded `new` inside the draft mutation
- `category_slug`: required FK returned by the real category query
- `city`: nullable
- `country_code`: required ISO alpha-2 code
- `status`: `draft`, later `active`
- `published_at`: set together with activation

Do not collect `original_price_cents`, size, color, tagline, or any value without a field. Remove
condition from the caller-facing creation type. `listing_images` receives the listing UUID, exact
path, contiguous position 0..N-1, and real prepared width/height.

**Rationale**: The checked-in schema and successful live public selects agree on these fields.
Although the enum/schema can represent resale conditions, the constitution requires the app to
write and read only `new`; the database does not enforce that rule for this feature.

**Alternatives rejected**: New columns/tables, JSON metadata, caller-provided seller/condition, and
using local form state as if it were a persisted listing.

## D5 - Keep categories real and delivery informational

**Decision**: Use the existing `fetchCategories('explore')` real table query and render explicit
loading, retryable error, and empty states. Never fall back to authored marketplace categories. If
a refetch no longer contains the selected slug, clear it and block progression.

Use the existing searchable ISO code helpers in `src/lib/countries.ts` with platform
`Intl.DisplayNames`; do not expose a raw country-code input and do not modify onboarding. For the
selected country, query active country rows or the existing `**` fallback. Show only returned name,
price, and ETA. Delivery rows are informational, not selectable or persisted. Suppress seeded
subtitles whose copy assumes a hypothetical buyer location.

**Rationale**: `listings` has no delivery key or relation. Pretending to save a delivery choice
would violate schema authority. Country is representable and must be a real alpha-2 value.

**Alternatives rejected**: Hardcoded categories, a delivery JSON workaround, a new relation, and
reusing onboarding UI code in a way that rebuilds or changes onboarding.

## D6 - Publish as a confirmed state machine

**Decision**:

1. Validate the full form and prepare all retained photos before any server write.
2. Re-read the authenticated user; stop on session expiry or a missing real profile.
3. Create one owner draft with `condition = new`.
4. Precompute unique paths beginning `<listing UUID>/` and durably journal the seller UUID, listing
   UUID, stage, and exact intended paths before the first upload.
5. In final order, upload one real prepared JPEG and then insert its `listing_images` row. Progress
   is completed-photo count, not invented byte progress.
6. Conditionally update only this owner's `draft` row, setting `active` and `published_at` together;
   require the updated row using `.select(...).single()`.
7. Independently query by UUID through an owner-visible reconciliation read and verify owner,
   active status, non-null publication time, NEW condition, expected image count, paths, and order.
8. Clear the journal, reset local resources, and replace the route with `/listing/<real UUID>` only
   after confirmation. Detail performs its own active+new Supabase read.

**Rationale**: The Storage insert/delete policy calls `owns_listing` using the first folder segment,
so an owned draft must exist before upload and must survive until cleanup. A Supabase update without
a returning select can appear successful after zero affected rows. Confirmation eliminates false
success and duplicate retry after a lost activation response.

**Alternative rejected**: Create active first. Home could expose a photo-less or partial listing.

## D7 - Compensate in policy-safe order and retain recoverable uncertainty

**Decision**: Journal intended paths, not merely responses reported as successful, so response loss
cannot hide an object. On conclusive pre-activation failure, remove every exact current-attempt
object and confirm absence before deleting the owner draft. Draft deletion cascades its image rows.
If any object cannot be confirmed absent, keep the listing non-active, retain the owner-scoped
journal, report incomplete cleanup, and retry next time that same seller enters Sell. Another seller
must never operate on it. If objects are gone but draft deletion fails, retain the record and retry
the draft deletion.

On an ambiguous activation response, query the real listing first:

- confirmed active and complete: success, never delete;
- confirmed draft: compensate;
- unavailable: retain the journal and block duplicate publication until reconciliation;
- active but inconsistent: never auto-delete the active row; report an integrity error and retain
  recovery evidence for investigation.

**Rationale**: Deleting the draft first destroys the ownership fact required by Storage DELETE RLS.
The current mutation path can orphan an uploaded object when row insertion and immediate removal
both fail, because the path is not in its outer cleanup list and cleanup errors are ignored.

**Bounded guarantee**: Client-only recovery cannot guarantee eventual cleanup after uninstall or if
the seller never returns. A server cleanup job/table/RPC would exceed the frozen architecture. The
honest in-scope guarantee is recovery on the next session for that seller.

## D8 - Preserve the seven-step premium composer

**Decision**: Keep photos -> title -> category -> details -> price -> location/delivery -> preview.
Use visible Step n of 7 progress, preserved state, focused/announced headings, reduced-motion-aware
transitions, generous neutral layouts, sticky Back/Next actions, and at least 44x44 targets.

Photo tiles show every image, position, Cover at index 0, preparation/error state, Remove, Move
earlier, and Move later. Preview renders all images in final order and direct Edit actions. Publishing
uses one in-flight guard and live phases: Preparing photos, Uploading photo n of N, Activating,
Confirming, and (when needed) Finishing cleanup. Remove current wear/resale wording and the unbacked
97%/3% fee/proceeds claim.

**Rationale**: This completes the existing architecture rather than rebuilding Sell as a large form.
Explicit controls are more accessible and testable than gesture-only reordering.

## D9 - Tighten read integration, do not replace it

**Decision**: Keep Home's existing `useListingFeed` -> `fetchListings` server pagination and manual
refresh; it already filters `status=active` and `condition=new`. Do not push a local listing into the
feed. Tighten the buyer-facing detail query to require active+new. Use a separate owner-visible query
for activation reconciliation so draft access does not weaken the public detail contract.

After confirmation, navigate with the real UUID. If the detail load subsequently fails, say the
publication succeeded and offer Retry/Open Home; never republish. Verify from a second authenticated
buyer because the app's existing protected route group does not expose anonymous navigation.

**Rationale**: Existing integration is already real. The missing detail filters could expose an
owner draft or a legacy non-NEW row through direct navigation.

## D10 - Make failures deterministic without changing production architecture

**Decision**: Give the publication coordinator injectable dependencies and a development/test-only
fault controller with no production UI. Required boundaries are photo read i, before upload i after
one success, after object upload/before image-row insert, before activation, after real activation
but before the client receives its result, and Storage removal. Include a pause-before-activation
gate for independent-session draft-invisibility checks.

The fault runs still use genuine selected bytes and the real Supabase project on each side of the
injected boundary. Unit or mock-only evidence can establish coordinator branching but cannot satisfy
VR-003 through VR-011.

**Rationale**: Offline toggles cannot reliably target row insertion, response-loss-after-commit, or
cleanup failure. Backend policy changes and production debug controls are prohibited.

## D11 - Evidence is layered and explicit

**Decision**: Use [quickstart.md](./quickstart.md) as the execution record. Typecheck, lint, and web
export are static/build evidence only. Native picker/read/upload, web blob lifecycle, real RLS and
rows, visibility timing, rollback, route reload, Home refresh, screen readers, and the usability
target each require their named runtime environment.

The current Windows host has no established Android/iOS simulator tooling. Native verification
therefore needs a physical SDK 57 device or a separately authorized simulator service. SC-001 needs
a moderated multi-participant study; one developer run cannot satisfy it. Both remain explicitly
unverified until evidence exists.

**Alternatives rejected**: Relabel static inspection as runtime verification, seed a test product,
place a service-role secret in the application, or mutate RLS to make tests easier.
