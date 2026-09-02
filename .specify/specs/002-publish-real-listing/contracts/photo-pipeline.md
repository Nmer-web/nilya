# Contract: Listing Photo Pipeline

## Purpose

Turn 1-10 real system-library selections into immediate previews and truthful, upload-ready JPEG
resources without fake bytes, silent MIME substitution, source metadata forwarding, or leaked web
object URLs.

## Picker input contract

The picker call MUST:

- originate directly from the seller's Add photos action, especially on web;
- request images only;
- enable multiple selection and disable editing;
- limit native selection to the remaining capacity up to ten;
- request ordered selection on supported iOS versions;
- prefer compatible iOS asset representation;
- leave EXIF retrieval disabled;
- use quality 1 because deterministic preparation happens afterward.

The result handler MUST:

- treat cancellation as a no-op;
- append accepted assets immediately, before preparation finishes;
- deduplicate current and Android-restored results;
- reject additions beyond ten without removing current valid photos;
- never synthesize a URI or fall back to a bundled image.

Android startup/return MUST consume `getPendingResultAsync()` once so an image result survives
activity destruction. Web behavior MUST tolerate a chooser close that returns no explicit cancel
event.

## Preparation contract

For each accepted asset, in bounded concurrency:

1. Display its real source preview URI with a Preparing state.
2. Decode it through Expo SDK 57 ImageManipulator.
3. Render and save a new JPEG; do not upload the original bytes.
4. Read the newly prepared bytes using the platform path below.
5. Verify JPEG magic bytes, non-zero length, positive dimensions, and <= 5,242,880 bytes.
6. If too large, recompress and progressively downscale without upscaling, then repeat step 5.
7. Mark ready with fixed MIME `image/jpeg` and extension `jpg`, or mark error with a specific reason.

No Supabase draft or object may be created while any retained photo is preparing or invalid.

### Platform reads

| Prepared URI | Required reader | Prohibited behavior |
|--------------|-----------------|---------------------|
| Native `file://` | Expo SDK 57 `File`; verify then `bytes()` | base64 conversion, fake MIME, web fetch assumption |
| Web `blob:` | browser Blob/`arrayBuffer()` through fetch; use real picker `File` for source facts | Expo FileSystem against blob URI |
| Anything else | Reject as unsupported unless the SDK's prepared-output contract explicitly documents it | guessing from extension |

## Local curation contract

- The tile list renders every retained photo, not only the cover.
- Array index is the only order source. Position 0 is visibly marked Cover.
- Remove disposes owned resources and immediately reindexes all remaining photos.
- Move earlier and Move later are available when the move is possible, have 44x44 targets, and
  announce the new position. Boundary controls are disabled with accessible state.
- A tile announces `Photo <position> of <count>` and `Cover photo` when position is zero.
- A preparation error remains attached to its tile with Remove and Retry/Choose another action.
- Adding/reordering/removing after Preview invalidates any stale publication snapshot.

Gesture-only drag is not required. An implementation may add a visual drag affordance only if the
explicit accessible move controls remain the authoritative fallback.

## Web object URL ownership

The app tracks whether it called `URL.createObjectURL` for each source or prepared preview. It MUST
call `URL.revokeObjectURL` exactly once for each owned URL when that resource is replaced, removed,
reset after success, or unmounted. It MUST NOT revoke a URL it does not own. Upload byte reads must
finish before revocation.

## Upload snapshot contract

When Publish begins, the UI freezes mutations and creates an immutable final-order snapshot. For
each photo it provides:

- stable local ID;
- prepared URI;
- `image/jpeg`;
- `jpg`;
- verified byte length;
- positive width and height;
- contiguous position.

The publication boundary re-reads and verifies real bytes. Picker metadata alone is never treated
as upload proof.

## Errors and user actions

| Error | Message intent | Action |
|------|----------------|--------|
| Unsupported URI/decode | This photo cannot be read on this device | Remove / Choose another |
| Empty output | This photo contains no readable image data | Remove / Choose another |
| JPEG signature mismatch | This photo could not be prepared safely | Retry / Remove |
| Still >5 MiB | This photo is too large after preparation | Choose another |
| Local file disappeared | This photo is no longer available | Choose again |
| Web blob expired | This browser photo is no longer available | Choose again |
| Preparation interrupted | Preparation did not finish | Retry |

Messages identify the affected position without exposing full device paths.

## Privacy verification gate

At least one real fixture containing GPS/EXIF metadata MUST be selected and published on each
supported platform family. Inspect the uploaded JPEG independently. If location metadata remains,
the implementation fails this contract even if the image displays correctly. Source review or the
absence of an `exif` request is not sufficient evidence.

## Progress semantics

Photo preparation may report `Preparing photo x of n`. Standard Supabase upload has no byte-level
callback in this architecture, so upload reports `Uploading photo x of n` and increments only after
that object's upload and image-row insert both succeed. No percentage may imply byte progress.
