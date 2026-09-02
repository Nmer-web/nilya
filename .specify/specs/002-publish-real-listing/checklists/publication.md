# Publication Requirements Quality Checklist: Real Selling and First Real Listing

**Purpose**: Evaluate whether the photo, publication, rollback, and real-data requirements are complete, clear, consistent, measurable, and implementation-ready.
**Created**: 2026-08-17
**Updated**: 2026-08-17 after cross-artifact analysis remediation
**Feature**: [Real Selling and First Real Listing](../spec.md)

**Note**: This checklist evaluates the quality of the written requirements. It is not an implementation or runtime test plan.

## Requirement Completeness

- [x] CHK001 Are validation, normalization, persistence source, and seller-facing error requirements documented for every permitted listing field? [Completeness, Spec §FR-013–FR-017]
  - Evidence: `spec.md:17-36,164-169,188`; `data-model.md:201-212`; `contracts/sell-flow.md:55-106`; `contracts/publication-lifecycle.md:68-80,118-134` define the exact field surface, normalization, provenance, and error classes.
  - Code/task status: current `sell.tsx:133-155` validates only presence/length-2 country and `mutations.ts:36-40` rounds permissive numeric input. Implementation remains T006, T009, and T015; the requirements writing itself is complete.
- [x] CHK002 Are requirements defined for the complete lifecycle of each selected photo, including selection, immediate preview, preparation, retry, removal, reorder, publication snapshot, disposal, and successful reset? [Completeness, Spec §FR-005–FR-010]
  - Evidence: `contracts/photo-pipeline.md:9-46,56-91`; `contracts/sell-flow.md:37-53,141-152`; and `spec.md:156-161` cover the full lifecycle and terminal cleanup/reset.
  - Code/task status: current `sell.tsx:167-204` only selects/previews/removes, and its preview uses only `images[0]` at `sell.tsx:750-752`. T018 and T022-T026 own the missing implementation.
- [x] CHK003 Are byte truth, MIME determination, filename extension, content type, dimensions, non-empty data, and size-limit requirements all specified for both native and web assets? [Completeness, Spec §FR-007–FR-010]
  - Evidence: `spec.md:157-161,173-174`; `contracts/photo-pipeline.md:34-54,77-91`; and `data-model.md:118-165` specify native/web readers, verified JPEG bytes, MIME/extension, dimensions, and 5,242,880-byte limit.
  - Code/task status: current `sell.tsx:202` fabricates missing MIME as JPEG and `mutations.ts:96-155` lacks signature/size/dimension persistence. T004, T007, and T023-T024 own implementation.
- [x] CHK004 Are category loading, retryable error, empty result, stale selection, and selected-row requirements all documented without a fallback-data path? [Completeness, Spec §FR-011–FR-012]
  - Evidence: `spec.md:162-163`; `contracts/sell-flow.md:61-73`; and `data-model.md:69-73,211` define loading, Retry, empty, stale-selection clearing, and current real-row selection with no fallback constants.
  - Code/task status: current `sell.tsx:607-650` lacks Retry and a deliberate empty state. T016 owns implementation.
- [x] CHK005 Are country selection and delivery-information requirements complete for specific rows, fallback rows, loading, failure, empty results, country changes, and the absence of a persisted delivery choice? [Completeness, Spec §FR-016–FR-018]
  - Evidence: `spec.md:47-54,167-169`; `contracts/sell-flow.md:90-106`; and `research.md:124-138` define real country selection, keyed request invalidation, all delivery states, specific/fallback behavior, and informational-only delivery.
  - Code/task status: current `sell.tsx:318-322,693-715` uses a raw code input and hides loading/error/empty delivery states. T014 and T016 own implementation.
- [x] CHK006 Does the failure taxonomy cover every state-changing boundary, including journal creation, draft creation, local re-read, object upload, image-row insertion, activation, confirmation, object removal, and draft deletion? [Gap, Spec §FR-021–FR-029, §FR-037–FR-038]
  - Evidence: `contracts/publication-lifecycle.md:45-66,68-116,118-166`; `quickstart.md:166-186`; and `tasks.md:45-50,73-79,125-134` cover every named boundary, including journal failure and draft-deletion retry.
  - Code/task status: current `mutations.ts:127-214` collapses failures and ignores cleanup results. T005, T007, T009, T012-T013, and T029-T033 own implementation.
- [x] CHK007 Are recovery requirements defined through every terminal outcome: confirmed active, confirmed clean rollback, retryable uncertainty, incomplete cleanup, and active-but-inconsistent integrity failure? [Completeness, Spec §FR-029–FR-030, §FR-038]
  - Evidence: `contracts/publication-lifecycle.md:136-180` enumerates all terminal observations and forbids automatic deletion of active-inconsistent results; `research.md:167-191` states the bounded recovery guarantee.
  - Code/task status: no recovery coordinator exists in the current code; T030-T033 own it. The outcome requirements are complete.

## Requirement Clarity

- [x] CHK008 Is “immediate preview” bounded by an observable criterion that distinguishes source-preview availability from completed image preparation? [Ambiguity, Spec §FR-005]
  - Evidence: `contracts/photo-pipeline.md:22-25,34-46` requires appending the source URI before preparation finishes, showing a Preparing state, and blocking server work until ready; `quickstart.md:90-103` supplies the observable runtime criterion.
  - Code/task status: current `sell.tsx:198-204` appends immediately but has no preparation state. T022-T023 and T026 own completion.
- [x] CHK009 Is “effective MIME type” defined precisely enough to distinguish picker metadata, prepared output format, byte-signature evidence, and server-declared content type? [Clarity, Spec §FR-008]
  - Evidence: `contracts/photo-pipeline.md:34-54,77-91` separates source facts, prepared JPEG, signature verification, and upload MIME/extension; `research.md:31-58,81-94` explains why picker MIME is insufficient.
  - Code/task status: `sell.tsx:202` still uses the prohibited MIME fallback. T004 and T023 own implementation.
- [x] CHK010 Is the planning assumption to re-render every retained image as JPEG stated at the normative requirement level, including its compression/downscaling limits and failure outcome? [Assumption, Spec §FR-008–FR-009]
  - Evidence: the normative photo contract uses mandatory language at `contracts/photo-pipeline.md:34-46`; provenance is explicitly recorded at `plan.md:18-23` and `research.md:31-49` rather than misrepresented as a user answer.
  - Code/task status: ImageManipulator is not installed and no preparation module exists. T001 and T023 implement the documented decision.
- [x] CHK011 Is the privacy expectation for source metadata, especially GPS/EXIF removal, explicitly stated with an objective acceptance condition rather than left only in design research? [Gap, Spec §FR-008–FR-009]
  - Evidence: `contracts/photo-pipeline.md:107-112` makes a real GPS/EXIF fixture and independent uploaded-JPEG inspection mandatory on each platform family; `quickstart.md:107-120` defines FAIL as surviving location metadata.
  - Code/task status: no current metadata-safe preparation exists. T021 and T023 own implementation/evidence; this checkbox covers the written acceptance condition only.
- [x] CHK012 Are photo-order requirements precise about stable identity, duplicate selections, index zero as cover, contiguous persisted positions, and available move operations at list boundaries? [Clarity, Spec §FR-005, §FR-010]
  - Evidence: `contracts/photo-pipeline.md:22-31,56-68,77-91` defines deduplication, stable IDs, index zero, contiguous positions, move controls, and disabled boundaries; `data-model.md:118-165` fixes array order as authoritative.
  - Code/task status: current photo state keys by URI and has no reorder controls. T022, T025, and T026 own implementation.
- [x] CHK013 Is a “valid two-letter country code” unambiguously tied to the supported ISO alpha-2 set, case normalization, and behavior for a stale profile value? [Ambiguity, Spec §FR-016]
  - Evidence: `spec.md` FR-016 now requires the existing supported ISO 3166-1 alpha-2 set, uppercase normalization, clearing any unsupported profile default, and explicit valid selection before progression. T014–T015 carry the same contract; implementation/runtime evidence remains separate.
- [x] CHK014 Are accepted price syntax, decimal separator behavior, maximum precision, exact cents conversion, and numeric upper-bound behavior specified without relying on silent floating-point rounding? [Clarity, Spec §FR-015]
  - Evidence: `data-model.md:201-212` specifies digits, one locale-supported separator, exact cents, malformed/overflow/greater-than-two-decimal rejection; `contracts/sell-flow.md:81-88` prohibits silent rounding and unsupported fee copy.
  - Code/task status: current `mutations.ts:36-40` uses `Number` plus `Math.round`, while `sell.tsx:654-687` allows ambiguous separators and fabricated fee copy. T009 and T015 own implementation.

## Requirement Consistency

- [x] CHK015 Is FR-008’s allowance for the bucket’s accepted image types consistent with the plan’s single-output JPEG rule, or is the intended distinction between accepted source and persisted output stated explicitly? [Conflict, Spec §FR-008]
  - Evidence: `spec.md:38-44` records the bucket capabilities, while `plan.md:18-23`, `research.md:31-58`, and `contracts/photo-pipeline.md:34-54` explicitly distinguish decodable picker sources from the single verified persisted JPEG output.
  - Code/task status: current code uploads caller-labelled originals (`mutations.ts:127-151`). T004 and T023 replace that behavior.
- [x] CHK016 Is web support consistently mandatory across the platform scope, photo requirements, and VR-005 rather than conditional in one artifact and required in another? [Consistency, Spec §FR-006–FR-008, §VR-005]
  - Evidence: `plan.md:43-46` declares web supported for Sell; `contracts/photo-pipeline.md:13,31,48-54,70-75` defines mandatory web behavior; `quickstart.md:122-135` requires a real web publish for VR-005. The conditional phrase in VR-005 resolves true under that declared scope.
  - Code/task status: current web reads exist in `mutations.ts:96-104` but no blob lifecycle exists. T020-T024 and T040 cover it.
- [x] CHK017 Are NEW-only requirements consistent across draft creation, activation confirmation, buyer detail, Home, preview copy, and every other listing read/write surface touched by the feature? [Consistency, Spec §FR-014, §FR-025, §FR-031–FR-033]
  - Evidence: Constitution `constitution.md:45-63`; `spec.md:165,176,181-184`; `contracts/publication-lifecycle.md:36-43,76-80`; and `contracts/sell-flow.md:110-123,165-170` require NEW at every boundary.
  - Code/task status: Home already filters active+NEW at `queries.ts:60-76`, but draft creation still accepts caller condition (`mutations.ts:14-24,54-73`) and detail lacks filters (`queries.ts:108-116`). T006, T012, T035, T039, and T045 own correction/audit.
- [x] CHK018 Is “select available delivery information” consistently interpreted as selecting a country and viewing real informational rows, with no language elsewhere implying a saved seller delivery choice? [Consistency, Spec §Data Reality & Scope Boundaries, §FR-016–FR-018]
  - Evidence: `spec.md:47-54,167-169`; `data-model.md:75-81`; and `contracts/sell-flow.md:90-106` consistently state that country selects applicable reference information and no listing-level choice exists or persists.
  - Code/task status: current `fetchDeliveryOptions` follows specific/fallback data (`mutations.ts:242-257`), but UI states/copy remain incomplete. T014, T016, and T017 own UI completion.
- [x] CHK019 Is the owner-scoped local recovery journal consistently described as transient coordination state rather than a marketplace-field workaround, including its permitted and prohibited contents? [Consistency, Spec §FR-026, §FR-038]
  - Evidence: `data-model.md:167-199` explicitly declares transient coordination purpose and prohibited data; `plan.md:33-36,53-59` and `contracts/publication-lifecycle.md:82-87,168-180` preserve the same boundary.
  - Code/task status: the journal does not yet exist. T005 and T032 own implementation.
- [x] CHK020 Are success requirements aligned so activation response, authoritative confirmation, success messaging, route handoff, detail retrieval, and Home discovery cannot each use a different definition of “published”? [Consistency, Spec §FR-025, §FR-029–FR-033]
  - Evidence: `contracts/publication-lifecycle.md:27-64,103-116,136-150` defines one authoritative success state; `contracts/sell-flow.md:128-152,165-170` carries it through messaging, UUID route, detail, and Home.
  - Code/task status: current `publishListing` does not require a returned row (`mutations.ts:163-171`) and `sell.tsx:242-250` announces success immediately. T012, T018-T019, and T034-T037 own implementation/evidence.

## Acceptance Criteria Quality

- [x] CHK021 Is SC-001’s moderated-study requirement sufficiently defined to establish participant count, device/platform mix, starting state, assistance rules, and timing boundaries? [Measurability, Spec §SC-001]
  - Evidence: `spec.md` now defines a minimum 20-participant protocol, minimum iOS/Android cohorts, authenticated Home starting state, genuine product/photo prerequisites, exact Sell-to-confirmed-detail timing, Uploading-only subtraction, assistance rules, per-run evidence, and the 18-of-20 pass threshold. T044 owns execution and may remain UNVERIFIED until that real study runs.
- [x] CHK022 Is SC-004’s five-second Home criterion precise about when timing begins, when it ends, required network conditions, active filters, and the result considered visible? [Measurability, Spec §SC-004]
  - Evidence: `spec.md` now defines the independent signed-in buyer, cleared filters/page zero, a stable run as one with no connectivity transition/timeout/retry/Supabase error, monotonic start at refresh fetch invocation, stop only when the matching real card is visibly rendered, the 5.0-second threshold, and required evidence. T034 carries the same runtime protocol.
- [x] CHK023 Can SC-002 objectively distinguish exactly one successful listing from duplicate drafts or retained failed attempts while still requiring 1–10 ordered real images? [Acceptance Criteria, Spec §SC-002, §FR-019]
  - Evidence: `spec.md:170,221,224`; `contracts/publication-lifecycle.md:36-43,63-64`; and `quickstart.md:148-157,172-181` distinguish one active confirmed row from non-active retained attempts and require exact ordered image count.
  - Code/task status: current one-flight UI guard exists at `sell.tsx:216-217`, but confirmation/retained-attempt behavior is missing. T018, T027-T028, and T034 own runtime completion.
- [x] CHK024 Are rollback acceptance criteria defined in terms of observable row/object states, exact attempt paths, deletion order, and truthful unknown outcomes rather than a generic “cleanup succeeded”? [Acceptance Criteria, Spec §FR-026–FR-029, §SC-005]
  - Evidence: `contracts/publication-lifecycle.md:152-166`; `quickstart.md:166-186`; and `spec.md:177-180,224` define exact paths, object-before-draft order, row/object inspection, and unknown/incomplete outcomes.
  - Code/task status: current `discardDraftListing` ignores both removal and deletion results (`mutations.ts:180-184`). T013, T027, and T031 own implementation/evidence.
- [x] CHK025 Is photo-privacy acceptance measurable on each supported platform through an explicit metadata-inspection outcome? [Gap, Spec §VR-003–VR-006]
  - Evidence: `contracts/photo-pipeline.md:107-112` requires a real GPS/EXIF fixture per platform family and defines surviving metadata as failure; `quickstart.md:107-120` gives the independent uploaded-object inspection procedure.
  - Code/task status: T021 records the required runtime evidence; no such evidence currently exists, so implementation must not claim the runtime gate yet.
- [x] CHK026 Is “useful user-facing error” made objective by requiring stage-specific wording, known-state disclosure, and one valid correction/retry/recovery action for each error class? [Measurability, Spec §FR-037]
  - Evidence: `contracts/photo-pipeline.md:93-105`, `contracts/publication-lifecycle.md:118-134`, and `contracts/sell-flow.md:148-152` pair each stage/known state with a corrective or recovery action and prohibit sensitive raw detail.
  - Code/task status: current Sell collapses publication errors at `sell.tsx:251-252`. T009, T016, T018, and T033 own implementation.

## Scenario Coverage

- [x] CHK027 Does the primary-flow requirement set cover every handoff from authenticated entry through confirmed detail retrieval and server-backed Home discovery without relying on local optimistic data? [Coverage, Spec §User Story 1, §FR-021–FR-033]
  - Evidence: `spec.md:59-76,172-184`; `contracts/publication-lifecycle.md:45-116`; and `contracts/sell-flow.md:128-170` cover authentication through real Home discovery and prohibit optimistic insertion.
  - Code/task status: current Home is server-backed (`queries.ts:60-104`, `use-listing-feed.ts`) but publication confirmation/detail filtering are incomplete. T012-T019 and T034-T037 own implementation/evidence.
- [x] CHK028 Are alternate-flow requirements defined for picker cancellation, photo correction/reorder, backward/forward edits, category refetch, country change, and session restoration while preserving legitimate local state? [Coverage, Spec §FR-004–FR-011, §FR-016]
  - Evidence: `contracts/photo-pipeline.md:22-32,56-68`; `contracts/sell-flow.md:9-15,20-35,48-50,61-73,90-106`; and `spec.md:134-146` cover all named alternate flows.
  - Code/task status: current form preserves basic step state, but lacks category Retry, reorder, pending-result restore, and session recovery. T015-T016, T019, T022, T026, and T033 own implementation.
- [x] CHK029 Are exception-flow requirements complete for each photo and publication failure class, including the seller-visible distinction and whether correction, retry, compensation, or reconciliation applies? [Coverage, Spec §User Story 3, §FR-027–FR-030, §FR-037]
  - Evidence: `spec.md:97-116,177-181,188-189`; both error tables in `contracts/photo-pipeline.md:93-105` and `contracts/publication-lifecycle.md:118-166`; and `quickstart.md:166-186` map each class to correction, compensation, or reconciliation.
  - Code/task status: T013, T018, and T027-T033 own the missing implementation and real failure evidence.
- [x] CHK030 Are ambiguous-response scenarios specified separately for object upload, activation, confirmation, and cleanup so the requirements never authorize blind retry or destructive guessing? [Coverage, Spec §FR-026, §FR-029, §FR-038]
  - Evidence: `contracts/publication-lifecycle.md:82-107,136-166` treats an upload path as potentially existing before response, requires activation reconciliation, retains unavailable confirmation, and treats cleanup absence as confirmed/unknown; `research.md:142-190` gives the rationale.
  - Code/task status: current code knows only returned upload paths and blindly cleans (`mutations.ts:194-214`). T012 and T027, T029-T032 own correction.
- [x] CHK031 Are recovery scenarios explicit for the same seller returning, a different seller becoming authenticated, expired credentials, unavailable connectivity, and a seller who never returns? [Coverage, Spec §FR-038]
  - Evidence: `contracts/publication-lifecycle.md:168-180`; `data-model.md:191-199`; `research.md:189-191`; and `quickstart.md:179-186` cover same owner, other owner, auth/network retry, and the never-return/uninstall limitation.
  - Code/task status: T028 and T032-T033 own implementation/evidence.
- [x] CHK032 Are post-publication detail failures addressed as a successful publication with retrieval recovery, preventing the same form submission from producing another listing? [Gap, Spec §FR-030–FR-032]
  - Evidence: `spec.md:145,181-183`; `contracts/publication-lifecycle.md:109-116`; and `contracts/sell-flow.md:148-152` state that confirmed publication remains successful and expose Retry/Open Home without Publish.
  - Code/task status: current detail only offers Back to browsing on load error (`listing/[id].tsx:65-84`). T019 owns correction.

## Edge Case Coverage

- [x] CHK033 Are requirements defined for the eleventh photo, duplicate picker results, Android-restored results, removal during preparation, and reorder while a photo is not ready? [Edge Case, Spec §FR-005, §FR-010]
  - Evidence: `contracts/photo-pipeline.md:22-32,56-68` requires cap rejection without losing valid photos, deduplication, one-time Android restoration, disposal/reindex on removal, and reordering in any retained state; `data-model.md:216-224` permits reorder while preparing/ready/error.
  - Code/task status: current code slices to ten but does not deduplicate or restore/reorder. T022, T025, and T026 own implementation.
- [x] CHK034 Are unsupported URI schemes, missing source MIME/size/dimensions, zero-byte output, JPEG-signature mismatch, expired blob URLs, and oversized prepared output addressed without fabricated fallback data? [Edge Case, Spec §FR-007–FR-009]
  - Evidence: `contracts/photo-pipeline.md:34-54,70-75,93-105`; `data-model.md:118-165,201-212`; and `quickstart.md:107-120` cover every named condition and prohibit guessing/fallback bytes.
  - Code/task status: current `sell.tsx:202` violates this requirement and no size/signature check exists. T004, T021, and T023-T024 own correction/evidence.
- [x] CHK035 Is the required non-destructive response specified when an authoritative read finds an active listing whose owner, condition, or image set does not match the expected publication snapshot? [Gap, Spec §FR-029–FR-030]
  - Evidence: `contracts/publication-lifecycle.md:141-150` requires no destructive action for owner mismatch and no automatic deletion for active image inconsistency; `research.md:178-184` requires retained evidence/integrity error.
  - Code/task status: no reconciliation exists. T030 owns implementation.
- [x] CHK036 Are requirements stated for local journal-write failure, journal corruption/version mismatch, app data removal/uninstall, and failure to delete a draft after all objects are absent? [Edge Case, Spec §FR-026–FR-029, §FR-038]
  - Evidence: `spec.md` FR-038 and its edge cases now require malformed/unknown-version/missing-field/unsafe-path/owner-mismatched journals to remain preserved and untrusted, authorize no backend mutation or automatic local deletion, block a new draft, and surface an integrity-specific safe action. Existing lifecycle artifacts retain journal-write, draft-delete, and uninstall/never-return bounds. Open implementation/runtime ownership is explicit in T047 and T028.

## Non-Functional Requirements

- [x] CHK037 Are accessibility requirements specific for progress semantics, focus after step changes, photo position/cover announcements, reorder controls, error announcements, keyboard completion, and reduced-motion behavior? [Coverage, Spec §FR-034–FR-035]
  - Evidence: `contracts/sell-flow.md:20-35,154-163` and `contracts/photo-pipeline.md:56-68` cover every named semantic/interaction requirement; `quickstart.md:188-201` separates screen-reader/keyboard runtime evidence from screenshots.
  - Code/task status: current progress has a basic progressbar, but photo controls are undersized and there is no reorder/reduced-motion focus contract in code. T025, T038, and T043 own implementation/evidence.
- [x] CHK038 Are responsiveness and resource constraints defined for preparing up to ten large photos, including concurrency/memory expectations and truthful progress when byte-level progress is unavailable? [Gap, Spec §FR-020, §SC-001]
  - Evidence: the spec photo contract and `plan.md` now set preparation concurrency to exactly one, cap each retained payload at 5,242,880 bytes and ten payloads at 52,428,800 bytes excluding platform view/cache overhead, and define an observable ten-photo no-termination/no-unresponsive-composer test with between-photo progress. T023 states the same implementation bound; T020–T021 own real native/web stress evidence.
- [x] CHK039 Are security and privacy requirements documented for seller derivation, cross-owner recovery isolation, exact-path cleanup scope, secret/token logging, local-path disclosure, and locally journaled data minimization? [Completeness, Spec §FR-001–FR-002, §FR-026, §FR-036, §FR-038]
  - Evidence: Constitution `constitution.md:103-119,170-180`; `contracts/publication-lifecycle.md:3-7,68-87,133-166,168-180`; `data-model.md:167-199`; and `contracts/photo-pipeline.md:105` define every named boundary.
  - Code/task status: current seller derivation exists (`mutations.ts:54-58`), but recovery isolation/exact cleanup does not. T005-T009, T031-T032, and T045 own implementation/audit.

## Dependencies and Assumptions

- [x] CHK040 Are the feature’s assumptions about live schema parity, bucket size/MIME/path policy, SDK 57 decoding support, standard-upload progress limits, real accounts/profiles, and available native verification environments documented with a required response when an assumption is false? [Assumption, Spec §Data Reality & Scope Boundaries, §VR-003–VR-012]
  - Evidence: `research.md:8-29,31-94,237-249`; `plan.md:24-59`; and `quickstart.md:8-78` document all assumptions, require a parity stop rather than redesign, reject undecodable photos, forbid byte-progress claims, require real accounts, and mark unavailable native runs unverified.
  - Code/task status: T003, T020-T021, T044, and T046 own preflight/runtime evidence. No live write or fabricated evidence exists yet.

## Notes

- Check items off as requirements are reviewed: `[x]`.
- Add findings or required wording changes inline.
- This checklist does not establish implementation or runtime completion.
