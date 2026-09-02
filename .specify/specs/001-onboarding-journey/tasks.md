---

description: "Task list for the SAWA onboarding journey"
---

# Tasks: Onboarding Journey

**Input**: Design documents from `.specify/specs/001-onboarding-journey/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: No test tasks are generated. The specification does not request them and `package.json`
carries no test framework — no jest, no testing-library. Verification is `npm run typecheck`,
`npm run lint`, and the manual protocol in [quickstart.md](./quickstart.md), per Constitution
Principle VII. Adding a test framework is out of scope for this feature.

**Organization**: Grouped by user story so each can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Mobile app, Expo Router file-based. Source at `src/`. Most work below **modifies existing files** —
this feature is a restructure of an existing flow, not a greenfield build. Only `src/lib/countries.ts`
is new.

---

## Phase 1: Setup

**Purpose**: Establish a known-good baseline before changing anything

- [X] T001 Confirm toolchain: `node --version` reports ≥ 22.13 and `npx expo --version` reports 57.x, in a terminal that has the current PATH (restart VS Code if Node was installed after it launched)
- [X] T002 Record a green baseline by running `npm run typecheck` and `npm run lint` before any edit, so later failures are attributable to this feature

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The state model, data sources and write surface every user story depends on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 [P] Remove `categories` from `OnboardingState`, drop `MIN_INTERESTS`, and make `readOnboarding` tolerate (and discard) a `categories` key left by earlier builds, in `src/lib/onboarding.ts` — per [data-model.md](./data-model.md) §1
- [X] T004 [P] Create `src/lib/countries.ts`: the ISO 3166-1 alpha-2 code set, a module-load probe for `Intl.DisplayNames`, name resolution via `Intl.DisplayNames(locale, { type: 'region' })`, and a fallback that returns the bare code — never an invented name (research D2)
- [X] T005 [P] Add `avatarColor?: string | null` to `updateProfile` in `src/lib/mutations.ts`, following the existing `if (input.x !== undefined)` patch pattern so omitting it still sends no column — per [contracts/profile-write.md](./contracts/profile-write.md)
- [X] T006 [P] Add `fetchDeliveryCountries()` to `src/lib/queries.ts` returning the distinct non-`**` `country_code` values from `delivery_options`, used to order the country picker by real coverage
- [X] T007 Remove `categories` and `setCategories` from the context type, the memo value and the provider in `src/store/onboarding-store.tsx`, keeping `loading`, `setLanguage`, `setCountry`, `complete` and `reset` — per [contracts/onboarding-state.md](./contracts/onboarding-state.md) (depends on T003)

**Checkpoint**: state model matches the contract; country and profile data sources exist

---

## Phase 3: User Story 1 - Guided first run to a real account (Priority: P1) 🎯 MVP

**Goal**: A first-time visitor is introduced to SAWA, records language and country, and creates a
real Supabase account.

**Independent Test**: install fresh, complete introduction → language → country → account creation,
and confirm a real `auth.users` row exists and the person can sign in on a second device.

### Implementation for User Story 1

- [X] T008 [US1] Replace the 11-entry step machine with the seven-step contract (`intro`, `language`, `country`, `account`, `check-email`, `profile`, `done`) in `src/app/onboarding/index.tsx`, deleting the `preferences` step and the `MIN_INTERESTS` gate entirely — per research D1
- [X] T009 [P] [US1] Build the introduction panels with an optional per-panel `image` field that renders full-bleed when supplied and the ink treatment when not, in `src/app/onboarding/index.tsx` — per research D3; ship no stock or generated photography
- [X] T010 [P] [US1] Implement left-third-back / right-two-thirds-forward tap zones and the panel-level indicator for the introduction, in `src/app/onboarding/index.tsx`
- [X] T011 [P] [US1] Implement the language step from `LANGUAGES` in `src/lib/onboarding.ts`, each language shown in its own script with the English name beneath, and copy stating the interface is not yet translated (FR-011), in `src/app/onboarding/index.tsx`
- [X] T012 [US1] Implement the country step in `src/app/onboarding/index.tsx` using `src/lib/countries.ts`, with search, a designed no-match empty state, and countries carrying domestic delivery grouped first from `fetchDeliveryCountries()` (depends on T004, T006)
- [X] T013 [US1] Implement the account step in `src/app/onboarding/index.tsx`: email and password fields, an 8-character minimum matching `minimum_password_length`, **no Apple or Google button**, calling the existing `signUp` from `src/store/auth-store.tsx` unchanged
- [X] T014 [US1] Implement the `check-email` held state in `src/app/onboarding/index.tsx` for the no-session return from `signUp`, offering a route to sign-in and never implying the member is signed in — per research D4
- [X] T015 [US1] Render progress over the four functional steps (`language`, `country`, `account`, `profile`), excluding introduction panels, `check-email` and `done`, with `accessibilityRole="progressbar"` and a worded label, in `src/app/onboarding/index.tsx` — `done` was dropped from the count during implementation because it renders full-screen without the header, which would have pinned the visible bar at four-fifths; [contracts/onboarding-state.md](./contracts/onboarding-state.md) updated to match
- [X] T016 [US1] Ensure backward movement across every step preserves recorded choices, in `src/app/onboarding/index.tsx` (FR-002)

**Checkpoint**: a person can install the app and end up with a real, confirmable account

---

## Phase 4: User Story 2 - Real profile setup (Priority: P2)

**Goal**: A confirmed member gives a name, photo and location that persist to their account.

**Independent Test**: sign in as a confirmed member with an empty profile, complete the step, then
read the profile back in a different session and confirm every value persisted.

### Implementation for User Story 2

- [X] T017 [US2] Implement the profile step form in `src/app/onboarding/index.tsx` with name and city fields, pre-filling the name via `fetchProfile` so a value seeded by the `on_auth_user_created` trigger is not asked for twice
- [X] T018 [US2] Validate the name to 1–60 trimmed characters before submit with a plain-language message rather than a constraint violation, in `src/app/onboarding/index.tsx` (FR-020)
- [X] T019 [US2] Wire photo selection to the existing `uploadAvatar` in `src/lib/mutations.ts`, awaiting it before the main patch so the two writes cannot race — per [contracts/profile-write.md](./contracts/profile-write.md)
- [X] T020 [US2] Assign and persist `avatar_color` when no photo is chosen, so the fallback at `src/components/profile-identity.tsx` renders a real stored mark instead of the current `?? C.text` default, in `src/app/onboarding/index.tsx` (depends on T005)
- [X] T021 [US2] Commit the staged `country` from device state to `profiles.country_code` at this step, and stop reading the staged value afterwards, in `src/app/onboarding/index.tsx` — per [data-model.md](./data-model.md) invariant 4
- [X] T022 [US2] Render a sign-in route rather than a form when the profile step is reached without a session, in `src/app/onboarding/index.tsx` — a form that cannot save is a dead control
- [X] T023 [US2] Handle partial failure so a failed photo upload still saves the remaining fields and names which part failed, keeping every entered value, in `src/app/onboarding/index.tsx` (US2 acceptance 6)

**Checkpoint**: a member's real identity exists and is visible to other members

---

## Phase 5: User Story 3 - Onboarding persists and never repeats (Priority: P3)

**Goal**: An interrupted member resumes; a finished member lands in the real marketplace and never
sees onboarding again.

**Independent Test**: force-quit at each step and relaunch; then complete the flow, relaunch ten
times including signed-out, and confirm the marketplace opens directly every time.

### Implementation for User Story 3

- [X] T024 [US3] Verify the three navigator guards in `src/app/_layout.tsx` against the truth table in [contracts/onboarding-state.md](./contracts/onboarding-state.md), including that the Stack mounts nothing while `status === 'loading' || onboarding.loading`
- [X] T025 [US3] Call `complete()` only at the `done` step, only after any account-level write has resolved, and only from an event handler — never synchronously in an effect body, which the React Compiler ESLint rule rejects — in `src/app/onboarding/index.tsx` (research D7)
- [X] T026 [US3] Make the final step hand control to the real marketplace by letting the navigator swap groups, with no summary or placeholder screen in between, in `src/app/onboarding/index.tsx` (FR-003)
- [X] T027 [US3] Confirm the arrival state renders honestly against the current single-listing database — a finished sparse state, zero sample products — in `src/app/(app)/index.tsx` (FR-009, US3.5)

**Checkpoint**: the journey is durable and terminates in the real product

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Quality that spans every story

- [X] T028 [P] Give every selectable row and card a correct role, label and `aria-checked` in `src/components/onboarding-parts.tsx` — `accessibilityState` alone emits nothing on React Native Web, so the modern `aria-checked` prop is required (FR-027)
- [X] T029 [P] Audit every interactive target to ≥44pt and confirm content clears the notch, dynamic island and home indicator, in `src/app/onboarding/index.tsx` and `src/components/onboarding-parts.tsx` (FR-026)
- [X] T030 [P] Specify and implement loading, empty, error and offline states for the country step and the account step in `src/app/onboarding/index.tsx` (FR-013, Principle VI)
- [X] T031 [P] Verify no colour literals leaked into the flow and that the onboarding palette in `src/components/onboarding-parts.tsx` stays consistent with `src/theme/tokens.ts`
- [X] T032 Delete any now-unreferenced onboarding code and confirm zero remaining consumers of `categories`, `setCategories` and `MIN_INTERESTS` across `src/`

### Mandatory Gates (Constitution Principle VII — NON-NEGOTIABLE)

These are not optional polish. No task list may be reported complete until all three pass.

- [X] T033 Run `npm run typecheck` — MUST report zero errors
- [X] T034 Run `npm run lint` — MUST report zero errors
- [ ] T035 Runtime-verify each user story against a real account using [quickstart.md](./quickstart.md), and record what was executed, what was observed, and what remains unverified with the reason why

### Blocked verification — record, do not work around

- [ ] T036 Create a second confirmed account (real address, real password, confirmation link clicked) so US2 and FR-021 can be verified as another member sees them — **cannot be automated**; until it exists, quickstart steps 6–9 MUST be reported as not executed
- [ ] T037 Execute quickstart step 4 on Android specifically, to determine whether `Intl.DisplayNames` is available on Hermes — if it is not, stop and report the limitation rather than authoring country names (research D2)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup — **BLOCKS all user stories**
- **User Stories (Phases 3–5)**: all depend on Foundational
- **Polish (Phase 6)**: depends on the stories being complete

### User Story Dependencies

- **US1 (P1)**: depends only on Foundational. Independently testable.
- **US2 (P2)**: depends on Foundational. **Also requires a confirmed account**, which US1 produces —
  this is a real sequencing dependency created by email confirmation being on (research D4), not an
  incidental one. US2 cannot be validated before US1 works.
- **US3 (P3)**: depends on Foundational. The guard work (T024) is independent of US1/US2, but
  end-to-end validation needs both.

### Within Each Story

- State model before UI
- Data sources before the steps that read them
- Writes before the verification that reads them back

### Parallel Opportunities

- T003, T004, T005, T006 — four different files, no shared edits
- T009, T010, T011 — introduction and language work, distinct sections of the same file; parallel if
  split by section, sequential if edited as one file
- T028, T029, T030, T031 — independent polish passes

---

## Parallel Example: Phase 2

```bash
# All four touch different files and can proceed together:
Task: "Remove categories from OnboardingState in src/lib/onboarding.ts"
Task: "Create src/lib/countries.ts with ISO codes and Intl.DisplayNames probe"
Task: "Add avatarColor to updateProfile in src/lib/mutations.ts"
Task: "Add fetchDeliveryCountries() to src/lib/queries.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup
2. Phase 2: Foundational — **blocks everything**
3. Phase 3: User Story 1
4. **STOP and VALIDATE**: quickstart steps 1–5 against a fresh install
5. At this point a real person can install SAWA and create a real account

### Incremental Delivery

1. Setup + Foundational → state model and data sources correct
2. US1 → a real account can be created → validate → demo
3. US2 → a real identity exists → validate against a second account (T036)
4. US3 → the journey is durable and lands in the product → validate
5. Polish → accessibility, states, gates

### Notes

- Most tasks modify existing files; only `src/lib/countries.ts` is new
- `src/app/_layout.tsx` guards are already wired — T024 verifies rather than builds
- Commit after each task or logical group
- Nothing here changes the schema, RLS, Realtime, chat, checkout or Stripe (Principle IV)

---

## Phase 7: Convergence

Gaps found by assessing the implemented code against spec, plan and constitution. Ordered
CRITICAL first.

- [X] T038 **CRITICAL** Route account creation through `signUp` from `src/store/auth-store.tsx` instead of calling `supabase.auth.signUp` directly at `src/app/onboarding/index.tsx:199`, so `emailRedirectTo: AUTH_REDIRECT` is sent and the confirmation link returns to `sawa://auth-callback` rather than falling back to `site_url`; pass a display name (or extend the store's signature if the account step genuinely has none to give) per FR-014 (contradicts)
- [X] T039 Derive the initial step in `src/app/onboarding/index.tsx` from session and stored state instead of hardcoding `useState<Step>('intro')`, so a member returning after confirming their email resumes at `profile` rather than replaying the introduction, per US1/AC5 and research D4 (partial)
- [X] T040 Replace the `.map()` over all 249 countries inside the `ScrollView` at `src/app/onboarding/index.tsx:636,650` with a virtualized list, so the step does not mount 249 rows each holding its own `Animated.Value`, per plan: "step transitions hold 60fps" (partial)
- [X] T041 Correct FR-001 in `.specify/specs/001-onboarding-journey/spec.md` to describe the seven-step journey; it still lists "personalization" in the required order although User Story 4 was removed by research D1, so the spec currently contradicts itself (contradicts)
- [X] T042 Skip the `account` step when moving backward from `profile` with an active session in `src/app/onboarding/index.tsx`, so back does not land on a "Create your account" form the member has already completed, per US2 and data-model invariant 1 (partial)
- [X] T043 State on the country step in `src/app/onboarding/index.tsx` that the choice is held on this device until an account exists, matching the disclosure the language step already carries, per FR-012 (partial)
