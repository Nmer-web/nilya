# Feature Specification: Onboarding Journey

**Feature Branch**: `marketplace-app`

**Created**: 2026-08-17

**Status**: Planned — the three clarifications were resolved in [research.md](./research.md) by
applying the constitution and the verified schema, because `/speckit-plan` was invoked before they
were answered. Each remains open to reversal; D1 changes scope and should be reviewed first.

**Input**: User description: "Build SAWA's complete onboarding experience as a real production user journey."

---

## Data Reality & Constraints *(read first)*

The feature brief requires that any preference without a database home be reported rather than
worked around, and Constitution Principle III requires the same. This section records what was
verified against the live database (project `tggnhpvrvnmrvmsdyxyu`) on 2026-08-17 — not inferred
from `database.types.ts`, which is hand-written and carries only a partial projection of `profiles`.

### What onboarding CAN persist to the member's account

`profiles` grants `UPDATE` to the `authenticated` role on exactly six columns, and RLS policy
`profiles_update_own` restricts each member to their own row:

| Field | Nullable | Enforced limit | Collected today? |
|---|---|---|---|
| `display_name` | no | trimmed length 1–60 | yes |
| `avatar_url` | yes | — | yes |
| `avatar_color` | yes | — | **no — real column, unused** |
| `bio` | yes | length ≤ 500 | no |
| `city` | yes | — | no |
| `country_code` | yes | — | yes |

`is_verified`, `verified_at`, `lifetime_sales`, `rating_avg` and `rating_count` carry **no UPDATE
grant**. A member cannot verify themselves or influence their own rating, by design. Onboarding
MUST NOT present any of them as something the member sets.

### What onboarding CANNOT persist — verified absences

The `public` schema contains exactly: `categories`, `conversations`, `delivery_options`,
`disputes`, `favorites`, `follows`, `listing_images`, `listings`, `messages`, `notifications`,
`offers`, `orders`, `payments`, `platform_settings`, `profiles`, `reviews`, `seller_accounts`,
`shipments`, `webhook_events`.

| Onboarding step | Limitation | Consequence |
|---|---|---|
| **Language** | No `profiles.language`. No settings or preferences table exists at all. | A language choice cannot follow the member to another device. |
| **Personalization / interests** | No member↔category relation exists. `follows` is profile→profile; `favorites` is user→listing. `categories` has no join table. | Chosen interests cannot be stored on the account, and cannot personalise anything server-side. |
| **Completion state** | No `profiles.onboarded_at` or equivalent. | "Has this person onboarded" can only be known per install. |
| **Notification preferences** | No column and no table. | Out of scope entirely; MUST NOT be offered. |
| **Currency** | `platform_settings.base_currency` is a single global row (`id boolean` singleton), not per-member. | MUST NOT be offered as a personal choice. |

Two further facts that shape the flow:

- **Email confirmation is on** (`enable_confirmations = true`). Account creation returns **no
  session**. The journey therefore cannot run straight from account creation into profile setup;
  everything after account creation needs a confirmed sign-in. Minimum password length is 8.
- **No third-party auth provider is configured.** Google is explicitly `enabled = false` with no
  credentials; there is no Apple provider; phone/SMS signup is off; anonymous sign-in is off.
  Email and password is the only route that can actually complete.

### Current content volume

`profiles`: 1 row. `listings`: 1 row. `categories`: 10 rows — Women, Men, Kids, Home, Electronics,
Beauty, Shoes, Bags, Sports, Sudanese. Onboarding MUST read categories live and MUST NOT hardcode
its own list.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Guided first run to a real account (Priority: P1) 🎯 MVP

Someone opens SAWA for the first time. They are introduced to what SAWA is, choose the language
they read, say which country they are in, and create a real account — arriving at a confirmed,
signed-in state having understood what they joined.

**Why this priority**: without this there is no member, and every other part of the product —
selling, buying, messaging — has nobody to belong to. It is the only story that delivers standalone
value: a person who completes just this can already sign in and browse.

**Independent Test**: install fresh, complete Welcome → Language → Country → Create account, and
confirm a real user row exists and the person can sign in on a second device.

**Acceptance Scenarios**:

1. **Given** a fresh install, **When** the app opens, **Then** the introduction is shown rather than
   the marketplace or a sign-in form.
2. **Given** the introduction, **When** the member moves through it, **Then** progress is visible at
   every step and they can go back to any earlier step without losing a prior choice.
3. **Given** the language step, **When** a language is chosen, **Then** it is recorded on the device
   and the step states honestly that the interface is not yet translated.
4. **Given** the country step, **When** the member searches, **Then** matching countries appear, and
   a search matching nothing shows an honest empty state rather than a blank list.
5. **Given** valid details, **When** the member submits account creation, **Then** a real account is
   created and — because confirmation is required — they are told to check their email rather than
   being shown a false success.
6. **Given** an email that is already registered, **When** submitted, **Then** the response does not
   reveal whether that address has an account.
7. **Given** no third-party provider is configured, **When** the account step renders, **Then** no
   Apple or Google button appears.

---

### User Story 2 - Real profile setup (Priority: P2)

A confirmed member gives their name, adds a photo, and confirms where they are, so that other
people in the marketplace see a real person rather than a placeholder.

**Why this priority**: it converts an auth account into a marketplace identity. It cannot precede
US1 — there is no row to write to before an account exists — but the product is usable without it,
so it ranks second.

**Independent Test**: sign in as a confirmed member with an empty profile, complete the step, then
read the profile back from a different session and confirm every value persisted.

**Acceptance Scenarios**:

1. **Given** a signed-in member, **When** the profile step opens, **Then** any name already seeded
   at signup is pre-filled rather than asked for twice.
2. **Given** a name outside 1–60 characters, **When** submitted, **Then** the member sees a plain
   sentence explaining the limit, not a database error.
3. **Given** a chosen photo, **When** it uploads, **Then** it becomes the member's avatar and is
   visible to other members.
4. **Given** the member skips the photo, **When** they continue, **Then** their avatar falls back to
   a stored colour and their initial — never a stock face or a fabricated portrait.
5. **Given** a country chosen before the account existed, **When** the profile step completes,
   **Then** that country is written to the member's account without being asked again.
6. **Given** the upload fails, **When** the member retries or skips, **Then** the rest of the
   profile still saves and the failure is stated plainly.

---

### User Story 3 - Onboarding persists and never repeats (Priority: P3)

Someone interrupted mid-flow returns to where they were, and someone who has finished never sees
onboarding again — they land in the real marketplace.

**Why this priority**: it is what separates a real journey from a demo. Lower than US2 only because
the flow delivers value on first pass before durability is added.

**Independent Test**: force-quit at each step and relaunch; then complete the flow, relaunch, and
confirm the marketplace opens directly.

**Acceptance Scenarios**:

1. **Given** any step, **When** the app is force-quit and reopened, **Then** prior choices are
   retained.
2. **Given** completed onboarding, **When** the app is reopened, **Then** the marketplace opens and
   onboarding does not appear.
3. **Given** completed onboarding and a signed-out member, **When** the app is reopened, **Then**
   sign-in appears — not onboarding again.
4. **Given** the final step, **When** the member finishes, **Then** they arrive in the real
   marketplace home, not a summary or placeholder screen.
5. **Given** the marketplace has no listings to show, **When** the member arrives, **Then** they see
   an honest, finished empty state — never sample products.

---

### User Story 4 - Marketplace personalization — **REMOVED**

**Resolution** ([research.md](./research.md) D1): no member↔category relation exists anywhere in the
schema, so a chosen interest cannot reach the account, cannot survive a reinstall, and cannot
personalise anything. Constitution Principle III forbids "a parallel local store … standing in for a
column", which is exactly what device-local interests would be, and Principle V forbids a control
that appears to do something it does not.

The journey is therefore **7 steps, not 8**. This is the schema limitation the brief asked to have
reported rather than worked around.

**Follow-up**: a `member_interests` table is the only honest route to real personalization. It needs
a migration, which Principle IV freezes without explicit approval. Recommended as a separate feature.

---

### Edge Cases

- What does the member see when the underlying data is genuinely empty? (Constitution Principle II —
  the marketplace currently holds 1 listing; the arrival state MUST be designed for zero.)
- What happens when the confirmation email never arrives, or is opened days later on another device?
- What happens when the member creates an account, never confirms, and reopens the app?
- What happens when connectivity fails midway through account creation — is a partial account left?
- What happens when the profile write succeeds but the photo upload does not?
- What happens when the member reaches the profile step without a session (link opened elsewhere)?
- What happens when the member already has an account and taps "I already have one" mid-flow — are
  the language and country choices made so far discarded or carried?
- What happens on a device whose locale resolves to none of the offered languages?

---

## Requirements *(mandatory)*

### Functional Requirements

**Journey structure**

- **FR-001**: The journey MUST consist of introduction, language, country, account creation, profile
  setup, completion, and entry into the real marketplace, in that order. Personalization is
  deliberately absent — it was removed with User Story 4 because the schema cannot store an
  interest; see [research.md](./research.md) D1. (This requirement originally listed eight steps
  and was corrected once the code was assessed against it.)
- **FR-002**: Every step MUST show progress and MUST allow return to any previous step without
  discarding a choice already made.
- **FR-003**: The final step MUST hand control to the real marketplace, never to a prototype,
  summary, or placeholder screen.

**State ownership**

- **FR-004**: Every choice MUST have exactly one owner — either the device (pre-account) or the
  member's account (post-account) — and that owner MUST be recorded in the implementation.
- **FR-005**: Choices made before an account exists MUST persist on the device and survive relaunch.
- **FR-006**: Choices with an account-level home MUST be written to the member's account once a
  session exists, and MUST NOT be asked for a second time.
- **FR-007**: The system MUST NOT create any storage field, table, or encoded blob to hold a
  preference the schema does not already support.
- **FR-008**: Completion MUST be durable and MUST prevent onboarding reappearing for that install.

**Honesty**

- **FR-009**: The journey MUST NOT display any product, seller, price, rating, review, sales figure,
  member count, or location that does not come from real data.
- **FR-010**: The journey MUST NOT offer any authentication method that is not actually configured.
- **FR-011**: The language step MUST state that the interface is not yet translated, so a choice is
  not mistaken for an effect.
- **FR-012**: Any step that cannot honestly persist its choice MUST say where that choice is kept.
- **FR-013**: Empty results MUST render as designed empty states, never as blank space or filler.

**Account creation**

- **FR-014**: Account creation MUST use the existing authentication system unchanged.
- **FR-015**: Because confirmation is required, the system MUST show a "check your email" state
  rather than implying the member is signed in.
- **FR-016**: The response to an already-registered address MUST NOT reveal that the address exists.
- **FR-017**: Members who already have an account MUST be able to reach sign-in from the flow.
- **FR-018**: Password entry MUST enforce the configured 8-character minimum before submission.

**Profile**

- **FR-019**: Profile setup MUST write only to fields the member is permitted to update, and MUST
  NOT present verification status, ratings, or sales figures as member-settable.
- **FR-020**: Name MUST be validated to 1–60 characters before submission, with a plain-language
  message.
- **FR-021**: A member without a photo MUST receive a stored fallback colour rather than a
  fabricated portrait.
- **FR-022**: Country chosen before the account existed MUST be committed to the account at this
  step.

**Reference data**

- **FR-023**: Categories MUST be read live from the categories table; the journey MUST NOT hardcode
  category names.
- **FR-024**: Country selection MUST use real country data and MUST be searchable. Codes come from
  the ISO 3166-1 alpha-2 standard, display names from the platform's own locale data, and ordering
  from real delivery coverage — so no country name is authored in this repository
  ([research.md](./research.md) D2). If the platform cannot supply names, the code MUST be shown
  rather than an invented name, and the limitation reported.
- **FR-025**: Languages MUST come from the application's supported-language definition.

**Experience quality**

- **FR-026**: All interactive targets MUST be at least 44pt, and content MUST clear device safe
  areas including the home indicator and dynamic island.
- **FR-027**: Every control MUST carry a correct accessibility role, label, and selected/checked
  state.
- **FR-028**: The visual system MUST be black, white and neutral, consistent with SAWA's existing
  design tokens, and MUST NOT reproduce another company's branding, wording, or layout.
- **FR-029**: Motion MUST be present but subordinate — supporting transitions, never gating them.
- **FR-030**: The introduction MUST carry its weight typographically and MUST NOT use stock or
  generated imagery of people or products. `assets/` contains no editorial photography, and
  inventing the marketplace's character before it has one is the same failure as inventing its data
  ([research.md](./research.md) D3). Image slots MUST be built so real photography drops in without
  a layout change.

### Key Entities

- **First-run record (device)**: what the person chose before, or instead of, an account — language,
  staged country, completion. Exists per install; never leaves the device.
- **Member profile (account)**: the marketplace identity — name, photo, fallback colour, location,
  country. The only durable, cross-device home for onboarding's output.
- **Category**: an existing marketplace section, read-only to this feature.
- **Supported language**: an application-level definition of what SAWA offers to read in.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time member reaches a created account in under 90 seconds of active input.
- **SC-002**: 100% of choices survive a force-quit and relaunch at every step of the journey.
- **SC-003**: A member who has completed onboarding sees it zero times on subsequent launches,
  across at least 10 consecutive relaunches including signed-out ones.
- **SC-004**: 100% of values presented as saved to the account are retrievable in a different
  session on a different device.
- **SC-005**: Zero controls are presented that cannot complete the action they describe.
- **SC-006**: 100% of interactive targets measure at least 44pt, and no content is obscured by a
  notch, dynamic island, or home indicator on any supported device.
- **SC-007**: Zero products, sellers, prices, ratings, statistics, or locations appear that do not
  originate in real data.
- **SC-008**: Every step renders a designed state when its data source returns nothing.
- **SC-009**: A member interrupted at any step resumes without re-entering a previous answer.
- **SC-010**: The journey ends in the real marketplace in 100% of completions.

---

## Assumptions

Informed defaults taken where the brief did not specify. Each is a decision that can be reversed
without restructuring the feature.

- **Profile fields collected**: name, photo, and city — plus a stored fallback colour so photo-less
  members have a real avatar. `bio` is a permitted field but is deferred to profile editing; asking
  for a biography before a member has seen the marketplace adds friction to no purpose.
- **Password is collected at account creation.** The design direction implies an email-only step,
  but no real account can be created without a password, so a dead-end step would violate FR-010's
  spirit.
- **Language records a preference without applying one.** Nothing is translated yet; the step is
  specified to say so rather than to imply a change that will not happen.
- **The introduction is a small number of full-screen story panels**, consistent with the design
  direction, with tap-forward and tap-back zones.
- **Onboarding is per install, not per member.** With no account-level completion field, this is the
  only honest interpretation, and it matches what a first-run experience is.
- **Existing marketplace, auth, realtime, chat, checkout and payment behaviour is unchanged.** This
  feature adds a journey in front of the app and writes to permitted profile fields; it modifies
  nothing downstream.
- **Sign-in remains reachable throughout**, so an existing member never has to complete a first-run
  flow to reach their account.

---

## Dependencies

- The existing authentication system, unchanged, including its email-confirmation behaviour.
- The existing profile update and avatar upload paths, extended only if a permitted column is not
  yet covered.
- The categories table as the live source of marketplace sections.
- The application's existing design tokens as the basis of the visual system.

---

## Out of Scope

- Any change to the marketplace, Supabase schema, RLS, realtime, chat, checkout, Stripe, or payment
  architecture.
- Notification preferences, currency preferences, and any other setting with no schema support.
- Interface translation. The language step records a choice; translating SAWA is separate work.
- Seller onboarding and payout setup.
