# Validation Evidence: Real Selling and First Real Listing

**Started**: 2026-08-17  
**Feature**: `002-publish-real-listing`  
**Rule**: Record PASS, FAIL, BLOCKED, or UNVERIFIED. Static inspection is never runtime evidence.

## Redaction rules

- Record account roles as `seller` and `buyer`; never record email, password, token, cookie, or key.
- Record local URI schemes only; never record full device paths.
- Record a listing UUID only when an authorized seller really creates it.
- Never record or use a service-role key from the application.

## Setup and preflight

| Check | Status | Evidence |
|------|--------|----------|
| SDK 57 ImagePicker/FileSystem/ImageManipulator documentation | PASS | Official versioned Expo SDK 57 pages were consulted before code changes on 2026-08-17. |
| `expo-image-manipulator` installation | PASS | Installed with Expo's SDK-compatible installer. npm reported 22 dependency audit findings (8 moderate, 14 high); no automatic audit fix was run. |
| Ignore/config review | PASS | `.gitignore` now explicitly covers build, OS-temporary, swap, and IDE artifacts. ESLint ignores explicitly cover dependency, distribution, build, coverage, minified, and Supabase paths. The package is private, so no `.npmignore` is needed. |
| Deployed table-column read parity | PASS (read-only) | A publishable-client preflight selected documented public columns from `listings`, `listing_images`, `categories`, `delivery_options`, and `profiles` without a write or service-role key. All five reads succeeded. |
| Deployed `listing-images` bucket/policy parity | BLOCKED | The publishable-client bucket metadata request returned HTTP 404. Checked-in migration evidence exists, but an authorized seller upload and dashboard inspection are still required. |
| Real seller/profile/category availability | UNVERIFIED | Requires an authorized real seller session; no identity or data was fabricated. |

## Static gates

| Gate | Status | Evidence |
|------|--------|----------|
| SDK 57 dependency alignment | PASS | The first `npx expo install --check` identified SDK 57 patch drift. `npx expo install --fix` aligned Expo-managed packages; the final check reported “Dependencies are up to date.” No architecture/native project configuration changed. |
| Final `npm run typecheck` | PASS | Re-executed after T049–T056 against the working tree based on `30ee882`; `tsc --noEmit` exited 0 with zero errors. Static evidence only. |
| Final `npm run lint` | PASS | Re-executed after T049–T056 against the working tree based on `30ee882`; `expo lint` exited 0 with zero errors. Static evidence only. |
| Web export | PASS | Re-executed after T049–T056: `CI=1 npx expo export --platform web` exited 0, bundled 1,508 web modules, and generated 45 static routes in `dist`. This is a build smoke check, not browser runtime evidence. |
| Frozen-boundary diff audit | PASS | No feature changes touch onboarding/Auth architecture, service-role use, Stripe, checkout, payments, Realtime, schema, migrations, or RLS. Existing unrelated dirty changes were preserved. |
| User-facing copy audit | PASS | Targeted Sell/detail/photo/recovery review found no resale-condition terms, unsourced fee/proceeds copy, fake-image fallback, hypothetical delivery subtitles, or success before authoritative confirmation. |

## Runtime environment attempts

| Target | Status | Evidence / blocker |
|--------|--------|--------------------|
| Local native target | BLOCKED | This host has no `adb` or local emulator command. |
| EAS Simulator | BLOCKED | EAS authentication exists, but this repository has no linked EAS project ID. No project was created/linked and no paid simulator session was started without user authorization. |
| Web UI | BLOCKED | Metro did not serve a response during bounded attempts. The static export served HTTP 200, but the in-app browser runtime exposed zero browser bindings, so no interaction/runtime claim is made. |
| Real seller/buyer Supabase run | UNVERIFIED | No authorized seller profile, genuine publication, second buyer session, or real-photo test inputs were supplied to this environment. |

## Verification requirements matrix

| Requirement | Status | Evidence / blocker |
|-------------|--------|--------------------|
| VR-001 typecheck | PASS | Final `npm run typecheck` exited 0. |
| VR-002 lint | PASS | Final `npm run lint` exited 0. |
| VR-003 image selection/preview/remove/reorder/cancel and ten-photo stress | BLOCKED | No controllable native or browser UI runtime was available. |
| VR-004 native `file://` read/upload | BLOCKED | A physical SDK 57 device or authorized configured simulator is required. |
| VR-005 web `blob:` read/upload/disposal | BLOCKED | Static export passed, but no browser binding was available for a real picker/upload run. |
| VR-006 Storage path/MIME/actual bytes | UNVERIFIED | No real publication ran. |
| VR-007 listing and image rows | UNVERIFIED | No real publication ran. |
| VR-008 draft invisibility/activation timing | UNVERIFIED | Requires real seller and independent buyer sessions. |
| VR-009 real UUID detail reload | UNVERIFIED | No real publication ran. |
| VR-010 independent Home refresh | UNVERIFIED | Requires a second real signed-in account/session. |
| VR-011 forced-failure and untrusted-journal outcomes | UNVERIFIED | Fault boundaries and non-destructive untrusted-journal handling are implemented, but no authorized real-project failure/journal run or post-run bucket/database inspection occurred. |
| VR-012 evidence classification | PASS | VR-003–VR-011 remain BLOCKED/UNVERIFIED; static checks and source review are not presented as runtime proof. |
| GPS/EXIF removal | UNVERIFIED | Requires a real metadata fixture and uploaded-object inspection on each supported platform family. |
| Offline-state matrix | UNVERIFIED | Category/delivery/publication/detail/Home handling is implemented, but disconnect/reconnect runtime transitions were not executable here. |
| Accessibility runtime | UNVERIFIED | VoiceOver/TalkBack, web keyboard, and reduced-motion passes were not run. |

## Success criteria matrix

| Criterion | Status | Evidence / blocker |
|-----------|--------|--------------------|
| SC-001 first listing under four minutes for at least 90% | UNVERIFIED | The written cohort/platform/timing/assistance/`ceil(90%)` protocol is complete, but no participant/device study ran. |
| SC-002 exactly one active NEW row with 1–10 ordered real images | UNVERIFIED | Requires an authorized real seller publication and row/object inspection. |
| SC-003 real UUID detail with persisted values/order | UNVERIFIED | Code uses the confirmed UUID and an independent Supabase read, but no real successful publication ran. |
| SC-004 Home within one refresh and 5.0 seconds | UNVERIFIED | The start/stop/filter/stable-connection protocol is explicit, but no real listing/buyer timing run occurred. |
| SC-005 zero active partials/false success across forced failures | UNVERIFIED | Compensation/reconciliation and fault seams are implemented; the real-project fault matrix was not executed. |
| SC-006 independent buyer sees/opens the same UUID | UNVERIFIED | Requires a second real authenticated session and one authorized publication. |
| SC-007 visible-value provenance | PASS (static) | Category/delivery values use existing Supabase rows; listing fields use seller input; identity is re-read with `auth.getUser()` and verified against `profiles`; detail/Home reload persisted rows. No fake fallback was added. |
| SC-008 truthful evidence record | PASS | Every required criterion is PASS, BLOCKED, or UNVERIFIED; no missing runtime run is classified as passing. |

## Run metadata

- Evidence timestamp: `2026-08-17T22:02:16+02:00`
- Base commit: `30ee882`; the working tree was already intentionally dirty and no commit was created.
- Static platform: Windows/PowerShell with Node/Expo CLI.
- Listing UUID: none, because no authorized real listing was created.

## Implementation notes

- Requirements-quality checklists pass: `publication.md` 40/40 and `requirements.md` 16/16. This evaluates written requirements, not runtime completion.
- T047 is implemented: untrusted journals remain locally preserved, authorize no backend mutation, block draft creation, and expose integrity-specific Retry/Home/support guidance without destructive reset.
- T048 is implemented across category, delivery, publication, detail, and Home: truthful known-state messages and explicit retry/recovery are provided without fabricated fallback data or automatic republish after reconnect.
- T049 is implemented fail-closed: a seller-scoped start guard is written before draft creation and replaced by the exact UUID/path journal. Initial exact-journal failure retains the exact in-memory record and retries journaling during cleanup; a surviving guard blocks a post-restart duplicate without authorizing any backend mutation.
- T050 is implemented: keyed async results are withheld until the current key settles, so delivery rows from a previous country cannot render for a newly selected country.
- T051 is implemented: picker additions, Android-restored assets, and retry preparation all share one serial preparation queue while thumbnails remain immediate.
- T052 is implemented: Preview has direct Edit actions for photos, title, category, optional details, price, and location, each returning to its exact composer step.
- T053 is implemented statically: publication failures retain a stage, corrective action, and photo position where applicable; feature mutation errors no longer expose raw Supabase messages. Runtime failure behavior remains UNVERIFIED under VR-011.
- T054 is implemented: recovery paths must exactly match the generated listing UUID/position/JPEG filename grammar; invalid raw journals remain preserved and authorize no backend mutation.
- T055 is implemented: app-owned web object URLs are released across retry, exception, removal, completion, unmount, and late-completion paths with an exactly-once guard; browser runtime disposal remains UNVERIFIED under VR-005.
- T056 is implemented statically: the title has a stable label, new step headings receive native/web focus, and photo order/Cover semantics are exposed without hiding nested controls. Accessibility runtime remains UNVERIFIED under T043.
- Post-convergence gates also passed: `npx expo install --check` reported dependencies up to date and `git diff --check` reported no whitespace errors (only existing LF-to-CRLF worktree warnings).
- Conservative defaults remain: reject stale profile country codes; process photos sequentially; treat corrupt/unknown recovery records as non-destructive integrity errors; never invent study, timing, accessibility, browser, native, or Supabase write evidence.
