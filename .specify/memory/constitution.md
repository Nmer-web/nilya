<!--
SYNC IMPACT REPORT
==================
Version change: 2.0.0 → 2.1.0
Bump rationale: MINOR — owner approval on 2026-09-04 adds a second, narrowly
scoped amendment to Principle IV: seller location columns, a coordinate index,
and two read-only geo functions supporting map discovery. No principle is
redefined and nothing previously forbidden by Principles I, II, III, V, VI or
VII becomes permitted.

Principles changed:
  - Principle IV records a second approved amendment scope (seller location).

Dependent artifacts checked in the same change:
  - AGENTS.md — no edit needed; it defers to this document for the scope.
  - .specify/templates/plan-template.md — no edit needed; its Constitution
    Check gate already cites "the exact dated approval recorded by the
    constitution" rather than enumerating one.
  - .specify/templates/spec-template.md, tasks-template.md — unaffected.

Unchanged boundaries: no fabricated marketplace activity, Supabase remains the
source of truth, Auth/Realtime/Stripe contracts remain frozen, RLS is not
bypassed, and completion still requires typecheck, lint, and honest runtime
evidence.
-->

# NILYA Constitution

## Core Principles

### I. New Goods and Explicit Non-Goods (NON-NEGOTIABLE)

NILYA supports new purchasable goods plus job and service posts. Every listing MUST have one
server-validated `listing_type`: `product`, `food`, `job`, or `service`.

- Purchasable `product` listings (including perfumes and incense) and `food` listings MUST set
  `condition` to `NEW_CONDITION` (`src/lib/database.types.ts`). Their create and edit flows MUST
  NOT present a condition choice.
- `job` and `service` posts MUST store `condition` as null. They MUST NOT enter cart, offer,
  shipping, order, payment, or checkout journeys and MUST NOT render controls for those journeys.
- Every listing write and read path MUST preserve the typed invariant above. A query that can leak
  a non-canonical row is a defect regardless of what the data happens to contain today.
- The words *second-hand*, *pre-owned*, *pre-loved*, *used*, *worn*, and *vintage* MUST NOT appear
  in user-facing copy, and resale framing MUST NOT appear in UX writing, iconography, categories,
  or empty states.

**Rationale**: Nilya's commerce identity remains new-goods-only, while jobs and services are
deliberately different records. Treating a job as a product, or leaking resale inventory through
an unfiltered query, breaks that identity and creates unsafe journeys.

### II. No Fabricated Data (NON-NEGOTIABLE)

If a value did not come from Supabase, from authenticated user state, or from another real
implemented source, it MUST NOT be presented as fact.

- No invented products, sellers, prices, ratings, reviews, sales counts, follower counts, response
  times, locations, distances, delivery estimates, orders, offers, messages, notifications, or
  payment states.
- No sample or placeholder rows written to the database to make a screen look populated. Seed data
  intended for the UI is fabricated data.
- Emptiness is a legitimate, shippable state. An empty table MUST produce a considered empty
  screen, never a populated-looking one. Principle VI applies to empty states in full.
- Every route that accepts an identifier MUST receive a real UUID belonging to a real row. Mock
  identifiers, hardcoded integers, and invented slugs MUST NOT be navigated to. If no real target
  exists, remove the navigation rather than invent a destination.
- A figure with no source MUST be deleted, not estimated. "Approximately" does not launder an
  invented number.

**Rationale**: a marketplace is a claim about who is really selling what, at what price. Fake data
is not a harmless placeholder here — it is the app lying to its first users, and it hides exactly
the integration failures this stage of the project exists to surface.

### III. The Schema Is the Source of Truth

The live Supabase schema, mirrored in `src/lib/database.types.ts`, defines what the app can know.

- Tables, columns, enum members, and relationships MUST NOT be invented, assumed, or written
  speculatively against. Verify before use.
- When a feature needs something the schema cannot express, the required action is to **stop and
  report the exact limitation**, naming the table and column involved. Inventing a workaround, a
  parallel local store, or a JSON blob standing in for a column is forbidden.
- State that legitimately has no column — local-only preferences, first-run flags — MUST be stored
  deliberately and documented in code as to why it is local.

**Rationale**: an app that assumes a column produces failures that appear as blank screens and
mysterious errors far from their cause, and it silently diverges from the only shared definition of
the product's data.

### IV. Frozen Architecture

Auth, Supabase, Realtime, and Stripe are settled. They MUST NOT be redesigned in passing.

Frozen: the Supabase schema and migrations; RLS policies, grants, and `security definer` helpers;
the Realtime publication and channel model; the Stripe integration end to end — the `create-checkout`
and `stripe-webhook` edge functions, webhook signature verification, the `webhook_events`
idempotency ledger, and the `payment_intent_data.metadata.order_id` contract between them.

- Changes to any of the above require a **proven defect** — evidence, not suspicion — plus explicit
  approval before the change is made.
- RLS MUST NOT be bypassed. Client access goes through `auth.uid()` and existing policy. A client
  MUST NOT be able to act as another user.
- The service-role key MUST NOT be used without explicit, task-scoped authorization.

**Approved amendment scope (owner approval, 2026-09-04)**: add the four requested category trees,
`listing_type`, normalized food/perfume/job/service detail tables, and non-payment application,
quote-request, and booking records with ownership-aware RLS. Existing conversation eligibility may
be extended only so active canonical job and service posts can contact their owner. This approval
does not authorize Auth or Realtime redesign, service-role use, or any change to the Stripe edge
functions, webhook contract, payment state machine, or live/test mode.

**Approved amendment scope (owner approval, 2026-09-04, seller location)**: add `latitude`,
`longitude` to `public.listings`; add `latitude`, `longitude`, `show_location` to
`public.profiles`; add paired range check constraints and a partial index on the listing
coordinates; and add two read-only functions — `public.distance_km` and
`public.listings_nearby`. `listings_nearby` MUST remain **security invoker** so
`listings_read_active` continues to decide which rows exist, MUST exclude non-canonical rows,
MUST exclude sellers whose `show_location` is false, and MUST round the coordinates it returns.
No human-readable location column was added: `city` and `country_code` already exist on both
tables and remain the only source for a place name. This approval does not authorize any
security-definer helper, any change to existing RLS policies, PostGIS, background location, or
any Auth, Realtime or Stripe change.

**Rationale**: these components are load-bearing and cross-cutting, and their failure modes are
silent — a loosened policy or a dropped webhook event does not raise an error, it just quietly
lets the wrong thing happen.

### V. Real Journeys, Not Mockups

Anything that looks interactive MUST be interactive, and MUST persist what it claims to persist.

- Onboarding is a real user journey: choices persist across launches, the account it creates is a
  real Supabase account, and what it collects about the user is written to `profiles`.
- Selling creates a real listing row and uploads real photo bytes to storage. A Sell flow that
  cannot produce a listing visible to another account is not finished.
- Applying to a job, requesting a service quote, and booking a service MUST create ownership-scoped
  Supabase records. External application methods may additionally open a validated URL, email, or
  phone target, but the Nilya action itself still persists.
- Dead controls are forbidden. A button that cannot do its job MUST NOT be rendered — including
  auth providers that are not actually configured.
- A journey is complete when it works for a second, independent account, not only for its author.

**Rationale**: a mockup that persists nothing is indistinguishable from a working feature in a
screenshot and worthless in the hands of a user. The distinction only surfaces under real use, so
it has to be built for real use from the start.

### VI. Premium by Default

The quality bar is Airbnb-level craft, applied to marketplace functionality in the spirit of Vinted,
expressed in NILYA's own identity — never a clone of either.

- The visual system MUST use the canonical values in `assets/brand/brand.md`: Nilya Green
  `#0F6E56` for primary actions, selected controls, focused fields, and links; Nilya Amber
  `#EF9F27` as the sole restrained accent; Ink `#141413`; Muted `#6B6B66`; and Surface
  `#FFFFFF`. Centrally defined supporting tints and borders may be derived from these roles;
  success and error retain dedicated semantic colours. Amber MUST NOT become the dominant
  interface colour or replace semantic status colours.
- The supplied logo geometry and typography are canonical. The wordmark is lowercase Inter Medium
  (500) with `-2` letter spacing; the tagline is uppercase Inter Regular with `8` letter spacing.
  Icons MUST render at least 24px, lockups below 32px MUST omit the tagline, and clear space MUST
  equal the icon corner-radius height. The amber dot MUST remain amber in the brand-color mark.
  Dark surfaces MUST use `nilya-icon-mono.svg` or the standard icon on Nilya Green.
- Every state ships finished: loading, empty, error, and offline receive the same care as the happy
  path. Under Principle II they are common states, not edge cases.
- Motion, type scale, spacing, and touch targets MUST be deliberate and internally consistent.
  Interactive controls MUST carry correct accessibility roles, labels, and state.

**Rationale**: in a marketplace, visual credibility is commercial credibility — a buyer decides
whether to trust a seller partly through the surface presenting them.

### VII. Evidence Before Claims (NON-NEGOTIABLE)

Completion is a factual report, not an impression.

- `npm run typecheck` and `npm run lint` MUST both report zero errors before any work is described
  as done. "Done except for the type errors" is not done.
- A runtime behaviour MUST NOT be claimed as verified unless it was actually executed and observed.
  Static reading, however careful, is not a test, and MUST be reported as what it is.
- What could not be verified MUST be stated plainly, along with the reason it could not be.
- Work that is partially blocked ships in full for the unblocked part, with the omission named
  explicitly. Silently reducing scope is forbidden.

**Rationale**: an unverified claim of success destroys the value of every verified one, because
afterwards no report can be trusted without redoing it.

## Platform Constraints

**Stack**: Expo SDK 57, React Native 0.86.2, expo-router, TypeScript, Supabase, Stripe. Expo's API
surface changed substantially in SDK 57; the exact versioned documentation at
`https://docs.expo.dev/versions/v57.0.0/` MUST be consulted before writing code against it, as
`AGENTS.md` requires. Pre-SDK-57 recall is not a source.

**Secrets**: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET` MUST
never be exposed, printed, logged, or placed in Expo code. The only variables permitted in the
mobile bundle are `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Server
secrets live only in edge function environments. `.env` MUST NOT be committed. Passwords, access
and refresh tokens, and payment credentials MUST NOT be logged at any level.

**Payments**: only canonical `product` and `food` listings can enter checkout. Job and service
posts never create orders or payment sessions. Payment work follows the complete application flow — it is built and verified after
the rest of the journey works, not alongside it. Stripe stays in **test mode**; live mode MUST NOT
be touched. The mobile app MUST NOT mark an order paid. Payment state changes only through the
verified webhook, which is authoritative; the client's role ends at requesting a session.

## Development Workflow & Quality Gates

**Before starting**: confirm what the schema actually provides (Principle III), and confirm whether
the change touches frozen architecture (Principle IV). If it does, stop and get approval first.

**Before claiming completion**, in order:

1. `npm run typecheck` — zero errors.
2. `npm run lint` — zero errors.
3. Runtime verification where it is possible, naming what was executed and what was observed.
4. An explicit statement of what remains unverified, and why.

**Reporting**: distinguish what was executed from what was read. Report failures with their actual
output. Name skipped steps as skipped.

**Scope**: deliver the requested scope. Deviations from an agreed design are permitted when the
design cannot be built honestly — a dead OAuth button, a sign-up that cannot complete — and each
one MUST be documented in code at the point of departure, with its reason, and reported to the user.

## Governance

This constitution supersedes other practice within the NILYA repository. Where a request, a design,
a template, or a habit conflicts with it, the constitution governs until it is amended.

**Amendment**: amendments require explicit approval from the project owner, a written record of what
changed, and propagation to every dependent artifact in the same change — the plan, spec, and task
templates, plus `AGENTS.md`. An amendment that leaves dependent templates contradicting it is
incomplete.

**Versioning** follows semantic versioning over the governance itself:

- **MAJOR** — a principle is removed or redefined in a way that permits what it previously forbade.
- **MINOR** — a principle or section is added, or existing guidance is materially expanded.
- **PATCH** — clarification, rewording, or correction that does not change what is permitted.

**Compliance**: every plan runs the Constitution Check gate in `.specify/templates/plan-template.md`
before research and again after design. Violations are either fixed or recorded in that plan's
Complexity Tracking table with a justification and the rejected simpler alternative — an unjustified
violation blocks the plan. The NON-NEGOTIABLE principles (I, II, VII) admit no such justification;
they are not tradeable against delivery pressure.

**Runtime guidance**: `AGENTS.md` and `CLAUDE.md` carry day-to-day working instructions and defer to
this document on principle.

**Version**: 2.1.0 | **Ratified**: 2026-08-16 | **Last Amended**: 2026-09-04
