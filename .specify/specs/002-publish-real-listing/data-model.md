# Data Model: Real Selling and First Real Listing

This document describes the existing Supabase records and the application-only state required to
coordinate one real publication. It does not propose a migration. Supabase remains the marketplace
source of truth; local state is either an unsubmitted form/resource or a recovery journal.

## Relationship overview

```text
Authenticated Supabase user (auth.users.id)
             |
             | identity / existing FK
             v
Profile (profiles.id) 1 -------- * Listing (listings.seller_id)
                                      |
                                      | ON DELETE CASCADE
                                      v
                                1 --- * ListingImage

Category (categories.slug) 1 -------- * Listing (category_slug)

DeliveryOption -- queried by country/fallback only; no Listing relationship exists

SellDraft + PreparedPhoto[] -- local, pre-publication only
PublicationRecoveryRecord  -- local, owner-scoped coordination only
```

## Existing persisted entities

### Listing (`listings`)

Only these existing fields participate in this journey.

| Field | Type / constraint | Source | Journey rule |
|------|-------------------|--------|--------------|
| `id` | UUID | Database | Real route key and first Storage path segment |
| `seller_id` | UUID, FK `profiles.id`, required | `auth.getUser().user.id` | Never accepted from form/navigation/public mutation input |
| `title` | text, trimmed length 1-120 | Seller | Required |
| `brand` | nullable text | Seller | Optional; empty input becomes null |
| `description` | nullable text, max 4,000 | Seller | Optional; empty input becomes null |
| `price_cents` | integer > 0 | Exact EUR parser | At most two fractional input digits; no float-derived display |
| `currency` | existing EUR value/default | Application/schema | This journey does not offer unsupported currencies |
| `condition` | existing enum | Mutation constant | Always `new`; no caller control |
| `category_slug` | FK `categories.slug`, required | Selected real category row | Must still exist in latest category result |
| `city` | nullable text | Seller/profile prefill | Optional; real value only |
| `country_code` | `char(2)`, required | Searchable ISO selection/profile | Uppercase ISO alpha-2 |
| `status` | existing enum | State machine | `draft` until all photos/rows exist; then `active` |
| `published_at` | nullable timestamp | Activation | Null for draft, real current timestamp when active |

Fields deliberately excluded from the form: `original_price_cents`, size, color, tagline, and any
delivery selection. Their presence in the schema does not make them required for this feature, and
no user requirement supplies a truthful value.

#### Listing invariants

- Every listing created by this journey is owned by the user returned immediately before creation.
- `condition` is always `new` on write and all buyer-facing reads require `new`.
- Draft rows never enter Home because Home requires active+new.
- Activation sets `status=active` and `published_at` together after all expected image rows exist.
- A confirmed publication has 1-10 image rows with contiguous positions.
- Only the owner-visible reconciliation query may inspect a draft by UUID; public detail requires
  active+new.

### ListingImage (`listing_images`)

| Field | Type / constraint | Source | Journey rule |
|------|-------------------|--------|--------------|
| `id` | UUID, default | Database | Not invented by client |
| `listing_id` | UUID FK, ON DELETE CASCADE | Created draft | Same UUID as path prefix |
| `storage_path` | required text | Planned exact object path | `<listing UUID>/<unique>.jpg` |
| `position` | smallint 0-19, unique per listing | Final photo array index | This feature uses contiguous 0..N-1; 0 is cover |
| `width` | nullable positive integer | Prepared output | Persist when actually known |
| `height` | nullable positive integer | Prepared output | Persist when actually known |

The object itself lives in the existing public `listing-images` bucket. The current policy derives
listing ownership from the first folder segment, so the owning draft must exist during upload and
object deletion.

### Category (`categories`, read-only)

The Sell journey consumes the real slug and display label/order returned by the existing category
query. Category loading, error, retry, and zero-row results are states, not occasions for fallback
constants. A selected slug becomes invalid if it disappears from a refreshed result.

### DeliveryOption (`delivery_options`, read-only)

The existing query resolves active rows for the selected country, falling back to active `**` rows.
Sell shows real name, price, and estimate fields only. There is no foreign key or listing column for
a seller selection, so no control may imply a delivery choice is saved.

### Profile (`profiles`, read-only here)

The real profile supplies seller existence and may prefill city/country. Sell never creates or
repairs a missing profile, invents a seller name, or accepts a profile UUID from navigation.

## Application-only entities

### SellDraft

Ephemeral form state owned by `sell.tsx` until confirmed publication.

```ts
type SellDraft = {
  photos: LocalListingPhoto[];
  title: string;
  categorySlug: string | null;
  brand: string;
  description: string;
  priceInput: string;
  city: string;
  countryCode: string | null;
};
```

It deliberately contains no `sellerId`, condition choice, status choice, delivery choice, generated
listing UUID, seller proceeds, or invented metadata.

### LocalListingPhoto

A lifecycle-managed picker resource. It is not a database row.

```ts
type LocalListingPhoto = {
  localId: string;
  sourcePreviewUri: string;
  sourceMimeType: string | null;
  sourceFileSize: number | null;
  sourceWidth: number | null;
  sourceHeight: number | null;
  preparedUri: string | null;
  preparedMimeType: 'image/jpeg' | null;
  preparedByteLength: number | null;
  preparedWidth: number | null;
  preparedHeight: number | null;
  ownsSourceObjectUrl: boolean;
  ownsPreparedObjectUrl: boolean;
  state: 'preparing' | 'ready' | 'error';
  errorCode: PhotoPreparationErrorCode | null;
};
```

Array order is authoritative: index 0 is the cover and final indices become database positions.
`localId` exists only for stable React identity/deduplication and is never presented as a Supabase
identifier. A photo is publishable only when state is `ready`, the prepared MIME is JPEG, actual
bytes are non-empty and <= 5,242,880, and dimensions are positive.

### PreparedPhotoUpload

Immutable snapshot passed into one publication attempt after full preflight.

```ts
type PreparedPhotoUpload = {
  localId: string;
  uri: string;
  mimeType: 'image/jpeg';
  extension: 'jpg';
  byteLength: number;
  width: number;
  height: number;
  position: number;
};
```

The coordinator re-reads/validates the bytes at its boundary so a revoked or missing local resource
cannot create a server draft and then fail predictably.

### PublicationRecoveryRecord

Durable AsyncStorage coordination state scoped to exactly one authenticated owner. This is not a
schema workaround: it stores no marketplace attribute and exists only because the client may have
to finish a policy-sensitive cleanup after interruption.

```ts
type PublicationRecoveryRecordV1 = {
  version: 1;
  sellerId: string;
  listingId: string;
  stage:
    | 'draft-created'
    | 'uploading'
    | 'activating'
    | 'confirming'
    | 'cleanup-required';
  intendedPaths: string[];
  expectedImageCount: number;
  createdAt: string;
  lastUpdatedAt: string;
};
```

#### Recovery invariants

- The key is namespaced by version and authenticated seller UUID.
- The record is written before the first upload using every intended exact path.
- It stores no image bytes, token, email, full device path, service credential, or form content.
- Recovery checks `record.sellerId === currentUser.id` before any remote action.
- A different account ignores but never deletes/acts on another owner's record.
- A new server draft cannot begin while the current owner's record is unresolved.
- Clear only after confirmed active success or confirmed object absence plus draft deletion.

## Value validation and normalization

| Value | Normalization | Invalid state |
|------|---------------|---------------|
| Title | Trim for validation/persistence | Empty or >120 chars |
| Brand | Trim; empty -> null | Schema-incompatible value |
| Description | Trim; empty -> null | >4,000 chars |
| Price | Accept digits plus one locale-supported decimal separator; normalize to cents without binary rounding | Zero/negative, >2 decimals, malformed, overflow |
| Country | Select from existing ISO code set; uppercase | Missing/not alpha-2 |
| City | Trim; empty -> null | Schema-incompatible value |
| Category | Match a currently loaded real slug | Missing/stale/not returned |
| Photos | Prepare/re-read actual bytes | None ready, >10, decode/read/signature/size error |

## State transitions

### Local photo

```text
selected -> preparing -> ready -> removed/disposed
                      `-> error -> removed OR retry -> preparing
```

Reorder is permitted in `preparing`, `ready`, or `error` and always reindexes the array. Progression
beyond Photos and publication both require every retained photo to be ready.

### Server publication

```text
no server row
  -> draft created
  -> objects + image rows added sequentially
  -> activating
  -> confirming
  -> confirmed active

Any conclusive pre-active failure:
  -> remove/confirm objects
  -> delete draft (cascades image rows)
  -> clean failure

Any ambiguous or incomplete cleanup:
  -> retain non-active/unknown row + recovery record
  -> same-owner reconciliation
  -> confirmed active OR policy-safe cleanup
```

An active inconsistent result is never automatically deleted. It is reported as an integrity error
and retains evidence for investigation because automatic deletion could destroy a real publication.
