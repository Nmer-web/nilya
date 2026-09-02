# Runtime Verification: Real Selling and First Real Listing

This is the execution protocol for the implemented feature. It is not evidence that the checks have
already run. Record each result as PASS, FAIL, BLOCKED, or UNVERIFIED with the evidence named below.
Static inspection, typecheck, lint, export, mocked tests, screenshots, and dashboard inspection each
prove different things; none may be relabelled as an end-to-end runtime check.

## Safety and prerequisites

Use the existing development Supabase project and public client configuration only. Never put a
service-role key in the app, terminal transcript, screenshot, or evidence file. Do not change RLS,
Storage policies, Auth, Realtime, Stripe, checkout, payments, schema, or seed data for verification.

Required:

- Node 22.13 or newer (`node --version`; planning host was 22.23.2)
- dependencies installed from the repository lockfile
- SDK-compatible `expo-image-manipulator` installed by the implementation with `npx expo install`
- valid public Supabase URL and publishable/anon key in the project's existing environment mechanism
- one real seller account with an existing profile
- one different real buyer account/profile in an independent session
- a genuine NEW product with truthful title, category, price, country/location, and 2-3 real photos
- native iOS or Android hardware/runtime compatible with Expo SDK 57
- supported desktop browser for the web flow
- authorized dashboard/SQL and Storage inspection access for the same non-production test project
- one real GPS/EXIF image, one oversize source, one unsupported/unreadable file, and normal images

Do not publish `Test Item`, fake seller data, stock/fallback imagery, or invented values. The
successful run is intended to be a legitimate first real listing and should remain available unless
the seller independently chooses to remove it through an existing supported product action.

Native runtime is currently **UNVERIFIED** on the planning host: no local Android/iOS simulator was
established. Use a physical device or separately authorized simulator. Web support does not satisfy
the native `file://` requirement.

## Evidence record

For every runtime run record:

- timestamp and commit SHA;
- platform, device/OS or browser, and Expo/runtime build;
- seller and buyer identifiers redacted to non-sensitive labels;
- exact listing UUID;
- photo count, source format facts, and URI scheme only (never full local path);
- expected vs observed result;
- relevant screenshot/video;
- redacted listing/image-row and bucket-object inspection;
- cleanup/recovery outcome for failure runs.

Never record access tokens, cookies, public-link query secrets, passwords, full device file paths, or
service credentials.

## 1. Install and static gates

```powershell
npm install
npx expo install --check
npm run typecheck
npm run lint
```

Expected: dependency versions are SDK 57-compatible, typecheck has zero errors, and lint has zero
errors. If used, `npx expo export --platform web` is a build smoke check only; it does not verify the
picker, blob lifecycle, Supabase operations, or runtime UI.

## 2. Read-only backend preflight

With authorized project inspection, confirm without writing:

- the `listings` and `listing_images` columns/constraints match [data-model.md](./data-model.md);
- categories contain the real choices the seller may use;
- the seller has a real profile;
- `listing-images` exists, is public, limits each object to 5,242,880 bytes, accepts JPEG, and
  retains the policy requiring the listing UUID first path segment;
- current Home reads require active+new.

Checked-in migrations are design evidence, not proof that the deployed bucket still matches. Stop
and report a parity blocker if live configuration differs; do not redesign it inside this feature.

## 3. Start cleanly

```powershell
npx expo start --clear
```

Open the native target for the seller. Open web in a separate browser profile/private context for
the buyer, or use another independent authenticated device. Sign in through the existing
architecture. Do not alter auth guards to create anonymous access solely for testing.

## 4. Image selection and native read (VR-003, VR-004)

On the native seller target:

1. Enter Sell and confirm Step 1 of 7.
2. Open the library and cancel. Confirm no tile/state is added.
3. Select 2-3 real product photos at once.
4. Confirm thumbnails appear immediately while preparation is visibly in progress.
5. Remove one, add it again, move photos earlier/later, and confirm order numbers/Cover update.
6. Background/restore the picker on Android; confirm a pending result is recovered once, not
   duplicated.
7. Confirm Next remains disabled for a preparing/error photo and enables only for ready photos.
8. Continue a happy-path publication while recording that a real selected native `file://` prepared
   asset was read, its actual byte count/MIME/dimensions, and that its uploaded public image decodes.
9. In a separate native stress run, retain ten real photos. Confirm preparation remains sequential,
   the visible preparing count advances between photos, navigation remains responsive, and the app
   process does not terminate. Record the device/OS and observed result; do not infer this from logs.

PASS requires actual device execution. Source inspection of `File.bytes()` does not pass VR-004.

## 5. Photo validation and privacy

Run each on the platform where it is relevant:

1. Select an unreadable/unsupported asset. Confirm a photo-specific error and no fake preview/upload.
2. Select a very large source. Confirm it either becomes a verified JPEG <= 5,242,880 bytes or is
   rejected before draft creation.
3. Use a source whose picker MIME is missing/HEIC where available. Confirm uploaded bytes have JPEG
   signature, `.jpg` path, and `image/jpeg` content type; no metadata default is fabricated.
4. Select the GPS/EXIF fixture, publish through the real pipeline, download/inspect the uploaded JPEG,
   and confirm no GPS/location metadata remains.

If metadata survives, mark FAIL and block public photo release. The ImageManipulator code path alone
does not pass this check.

## 6. Web blob lifecycle (VR-003, VR-005)

Run the seller flow on web with a real seller session:

1. Open the picker from the Add photos gesture; test cancel and multi-select.
2. Confirm immediate `blob:` previews, remove, reorder, and add within the ten-photo limit.
3. Instrument the app-owned URL disposer or use browser runtime tooling to confirm each owned object
   URL is revoked after remove/replacement/success/unmount, never before its byte read completes.
4. Publish a legitimate real listing only if this run represents another genuine product; otherwise
   stop before Publish and use the first listing's already-recorded web-specific integration run.
5. For a full web run, confirm real blob bytes upload and the public JPEG decodes.
6. In a separate web stress run, retain ten real photos. Confirm preparation remains sequential,
   progress advances between photos, the tab remains responsive, and the tab does not terminate.

PASS for VR-005 requires an actual web publish using real selected blob data. A preview alone is
partial evidence.

## 7. Full real publication and draft invisibility (VR-006 - VR-010)

Use the deterministic development-only pause immediately before activation. It must not appear in a
production UI.

1. Seller enters a truthful title (1-120), optional real brand/description, a real returned category,
   positive EUR price with <=2 decimals, optional city, and a country from the searchable real list.
2. Confirm category loading/retry/empty handling and delivery loading/error/empty or real rows. Any
   displayed delivery values must exactly match the current query and must not be selectable.
3. Preview all photos in the final order, exact price, New, real category/location/delivery, and use
   at least one Edit shortcut before returning.
4. Tap Publish twice quickly. Confirm only one attempt starts.
5. Observe truthful phases through `Uploading photo n of N`, then pause before activation.
6. Inspect the real owner row: exactly one listing UUID, seller ID equals authenticated user,
   condition is new, status is draft, and published_at is null.
7. Inspect Storage: N non-empty JPEG objects exist only beneath `<that UUID>/`, each <= 5 MiB.
8. Inspect `listing_images`: N rows match exact paths and contiguous positions 0..N-1; dimensions
   match prepared output when available.
9. In the independent buyer session, refresh Home. Confirm the draft UUID is absent.
10. Resume activation. Observe Activating then Confirming; no live message appears early.
11. Confirm the same row is active with non-null published_at and still new; no duplicate row exists.
12. Confirm success route contains that exact UUID. Detail performs a visible fresh load and matches
    persisted title, cents-formatted price, seller, location, and ordered public images.
13. In the independent buyer session, clear any active search/category filter, pull to refresh, and
    observe the same UUID within one refresh and five seconds of result loading. Open it and compare
    title, cover, price, seller, and photo order.

Do not inject the form draft into Home or use the seller screen as cross-account evidence.

## 8. Deterministic failure matrix (VR-011)

Use the dependency-injected development/test fault seam around otherwise real operations. Each run
uses truthful data and real selected bytes. After each, inspect both database and bucket. A mock-only
test is supplemental and cannot pass VR-011.

| Fault point | Expected user outcome | Required persisted outcome |
|------------|-----------------------|----------------------------|
| Local image read before draft | Specific read error; no live message | No new row/object/image row |
| Later Storage upload after >=1 success | Upload error then cleanup status | When cleanup succeeds: all attempt objects absent and draft absent |
| After object upload, before image-row insert | Image-record error; current path included in cleanup | Just-uploaded object plus earlier objects removed; no active row |
| Activation rejected before commit | Activation error and compensation | Objects absent before draft deletion; no active row |
| Real activation commits, response is lost | Checking/confirming, no blind retry | Reconciliation sees same active UUID; success; no deletion/duplicate |
| Confirmation network unavailable | Honest recovery-required state | Row/object state untouched; owner journal retained; new publish blocked |
| Storage remove fails during rollback | Incomplete-cleanup message + Retry | Non-active owner draft retained; exact journal retained; no Home result |
| Session expires mid-attempt | Session-expired action; no seller substitution | Reconcile after same owner reauth; never another account cleanup |
| Journal contains malformed JSON, an unknown version, a missing field, or an unsafe path | Integrity-specific state with Retry check and Home/support guidance; no destructive reset | Raw local value preserved; no Storage or database mutation; new draft blocked |
| Journal storage-key owner differs from payload owner | Integrity-specific state; never reinterpret either owner | Raw local value preserved; no backend mutation by either account; new draft blocked for the scoped seller |

For cleanup-remove failure, restore connectivity/operation, reopen Sell as the same seller, and
confirm recovery runs before a new draft. Objects must be confirmed absent before draft deletion;
then the journal clears. Sign in as the other account while the record exists and confirm it does not
attempt that cleanup.

## 9. Loading, errors, accessibility, and motion

Runtime-check on native and keyboard-capable web:

- category and delivery loading, retryable error, and empty displays;
- duplicate publish guard and readable phase announcements;
- 44x44 targets for photo controls, category choices, edit actions, and navigation;
- VoiceOver/TalkBack labels, order, selected/disabled/busy state, photo position/Cover, progress,
  errors, and move announcements;
- full keyboard completion on web, including country search and photo curation;
- reduced-motion mode suppresses decorative transitions while retaining state feedback;
- while offline, category load blocks progression and offers Retry without fallback rows;
- while offline, delivery shows unavailable/retry state but does not block Next or Publish because it
  is informational and no listing delivery choice persists;
- publication disconnects preserve the known publication state and require explicit retry or
  recovery; reconnect never automatically republishes;
- detail and Home disconnects retain no fabricated listing/category data and expose explicit Retry;
- offline/confirmation/detail-load errors state what is known and provide the correct action.

A screenshot can support visual review but cannot pass the screen-reader or keyboard checks.

## 10. Success criteria accounting

| Criterion | Evidence required |
|----------|-------------------|
| SC-001 | At least 20 authenticated participants, including at least eight on iOS and eight on Android; pass count is `ceil(0.90 × eligible participants)` (18/20 at minimum). Time starts at Sell, ends after the persisted detail loads, and subtracts only measured Uploading. A single developer run remains UNVERIFIED. |
| SC-002 | Successful-run row/object inspection for exactly one active NEW row and 1-10 ordered images |
| SC-003 | UUID route plus fresh detail query and persisted-value comparison |
| SC-004 | Independent signed-in buyer, filters cleared/page zero, monotonic timing from manual-refresh fetch invocation until the matching UUID/title/price/cover card is visibly rendered; <=5.0 seconds on a run with no connectivity transition, timeout, retry, or Supabase error |
| SC-005 | Every forced-failure run and post-run bucket/database inspection |
| SC-006 | Independent signed-in buyer sees/opens the same UUID |
| SC-007 | Traceability table from each rendered value to seller input/auth/profile/reference/listing row |
| SC-008 | Completed evidence record with every missing run explicitly UNVERIFIED/BLOCKED |

## 11. Final reporting rule

Implementation may be reported complete only when typecheck and lint pass and the executed runtime
evidence is listed. Any native, web, failure, accessibility, cross-account, metadata, or usability
check that did not actually run must be called UNVERIFIED with its blocker. Static inspection must
never be classified as runtime verification.
