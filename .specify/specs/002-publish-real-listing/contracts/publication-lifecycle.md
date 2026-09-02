# Contract: Listing Publication Lifecycle

## Boundary

This is an application-layer coordinator over the existing publishable-key Supabase client. It does
not introduce a transaction RPC, server function, service role, schema column, policy change,
Realtime channel, payment action, or checkout action.

## Inputs

```ts
type PublishListingInput = {
  title: string;
  brand: string | null;
  description: string | null;
  priceCents: number;
  categorySlug: string;
  city: string | null;
  countryCode: string;
  photos: PreparedPhotoUpload[];
};
```

Prohibited inputs: seller ID, condition, status, publication time, listing ID, delivery selection,
Storage path, or image-row ID. The coordinator derives/creates all of them.

## Successful result

```ts
type PublishListingSuccess = {
  kind: 'published';
  listingId: string;
};
```

This result is legal only after a fresh owner-visible select confirms the same UUID has:

- expected `seller_id`;
- `condition = new`;
- `status = active`;
- non-null `published_at`;
- exactly the expected 1-10 image rows;
- the expected exact paths and contiguous positions.

## State machine

```text
validating
  -> authenticating
  -> creating-draft
  -> journaling
  -> uploading (photo 1..N)
  -> activating
  -> confirming
  -> published

failure before confirmed active
  -> reconciling when outcome may be ambiguous
  -> compensating when draft is confirmed
  -> clean-failure OR recovery-required
```

Only `published` permits success copy/navigation. One coordinator instance may be in flight; repeat
taps are ignored while busy.

## Operation contract

### 1. Validate and authenticate

- Require normalized schema-faithful fields and 1-10 contiguous ready photos.
- Re-read real bytes and their JPEG/size constraints before creating a row.
- Call `supabase.auth.getUser()` immediately before the draft operation.
- A missing/expired user stops with `session-expired`; no remote write occurs.
- Confirm the existing profile relationship; a missing profile is a blocker, never auto-fabricated.

### 2. Create owner draft

Insert exactly one row with the authenticated UUID, normalized inputs, `condition='new'`, and
`status='draft'`. Require the returned real UUID. Do not make it active and do not add it to Home
state.

### 3. Journal intended objects

Construct collision-resistant filenames using app-generated uniqueness, always beneath
`<listingId>/` with `.jpg`. Validate the first segment equals the returned UUID. Before the first
upload, persist an owner-scoped recovery record containing all intended paths and expected count.
If journaling fails, delete the object-free draft and return a truthful failure; do not upload.

### 4. Upload and insert sequentially

For each immutable final-order photo:

1. Read/validate real prepared bytes.
2. Upload to the exact journaled path in `listing-images` with `image/jpeg` and no overwrite.
3. Treat the path as potentially existing as soon as the request begins; the journal already knows
   it, so a lost response cannot hide it.
4. Insert one `listing_images` row with path, listing ID, position, width, and height.
5. Increment completed-photo progress only after both operations succeed.

The listing stays draft throughout. Do not parallelize uploads: sequential work gives exact progress
and compensation order and limits memory pressure.

### 5. Activate conditionally

Update the exact UUID only while `status='draft'`, setting `status='active'` and one real current
timestamp together. Require the returned row with `.select(...).single()`. A successful transport
response with no returned row is not success.

### 6. Confirm authoritatively

Use a dedicated owner-visible read, not the buyer detail query. Confirm all success invariants. If
confirmation passes, clear the recovery journal, release prepared resources, return the UUID, and
replace the route with `/listing/<UUID>`. That route independently reloads active+new data.

If the route's subsequent read fails, the publication remains successful: show Retry/Open Home and
never create another listing for the same form submission.

## Failure classification

```ts
type PublishListingFailure =
  | { kind: 'session-expired'; retryableAfterAuth: true }
  | { kind: 'validation'; fieldOrPhoto: string }
  | { kind: 'draft-create-failed'; safeToRetry: true }
  | { kind: 'upload-failed'; position: number; cleanup: CleanupOutcome }
  | { kind: 'image-row-failed'; position: number; cleanup: CleanupOutcome }
  | { kind: 'activation-failed'; cleanup: CleanupOutcome }
  | { kind: 'confirmation-unavailable'; listingId: string; recoveryRequired: true }
  | { kind: 'integrity-error'; listingId: string; recoveryRequired: true }
  | { kind: 'cleanup-incomplete'; listingId: string; remainingPaths: string[] };
```

Errors preserve local form/photos so the seller can correct or retry. Messages distinguish the
stage and action without exposing raw Supabase errors, tokens, local paths, or secrets.

## Reconciliation contract

Reconcile before compensation whenever activation could have reached the server or the client lost
connectivity around a write.

| Authoritative observation | Action |
|---------------------------|--------|
| Active, NEW, correct owner, expected images | Clear journal and return published success |
| Draft, correct owner | Run compensation |
| Row absent and all intended objects absent | Clear journal and return clean failure |
| Read unavailable/unauthorized | Retain journal, block duplicate draft, request auth/connectivity retry |
| Active but wrong/missing image set | Never auto-delete; retain evidence, report integrity error |
| Owner/UUID mismatch | Take no destructive action; report integrity/security error |

The buyer-facing detail query must not be relaxed to support reconciliation.

## Compensation contract

For a confirmed owner draft:

1. Enumerate only the exact intended paths from the owner-scoped record.
2. Request Storage removal for every path, including paths whose upload response or image-row insert
   failed.
3. Confirm every intended object is absent using an authorized exact-folder/list check; a missing
   object counts as absent, while an unavailable check is unknown.
4. Only when every object is confirmed absent, delete the owner draft. Cascade removes image rows.
5. Confirm the draft is absent, then clear the journal.

If any object remains/unknown, do not delete the draft: it is the ownership fact needed by Storage
DELETE RLS. If objects are absent but draft deletion fails, retain the record with a cleanup-required
stage and retry deletion later. Cleanup returns structured results; no error is swallowed.

## Recovery entry contract

When Sell mounts for an authenticated user:

- load only that user's versioned record;
- if none, allow a new composer;
- if present, show `Finishing cleanup`/`Checking your previous listing` and block new publication;
- reconcile active/draft/absent state, then confirm success or compensate;
- expose Retry for network/session problems;
- never operate on a record for a different authenticated UUID.

App uninstall or a seller who never returns is outside the attainable client-only guarantee and
must not be described as guaranteed cleanup.

## Development/test fault seam

The coordinator accepts injected operations with production defaults. Development/test builds may
pause/fail at named boundaries: local read, later upload, post-upload/pre-row, pre-activation,
post-commit response loss, and object removal. There is no production menu or remotely controllable
fault flag. Real-runtime failure evidence must still inspect the actual project on each side of the
injected boundary.
