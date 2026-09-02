# Phase 1: Data Model — Onboarding Journey

**Date**: 2026-08-17 | **Plan**: [plan.md](./plan.md)

Every field below carries a **state owner**: the single place that value lives (FR-004). Nothing in
this feature has two owners, and nothing is stored anywhere the schema does not already provide.

---

## 1. Device First-Run Record

**Owner**: the device. **Store**: AsyncStorage, key `sawa.onboarding.v1`. **Lifetime**: per install.

| Field | Type | Default | Why it lives here |
|---|---|---|---|
| `language` | `'en' \| 'fr' \| 'ar' \| null` | `null` | No `profiles.language`; no settings table exists. A genuine device preference (research D6). |
| `country` | ISO 3166-1 alpha-2 \| `null` | `null` | **Staging only.** It is a real column (`profiles.country_code`) but is chosen before an account exists. Committed to the account at profile setup, after which the account is authoritative. |
| `completed` | `boolean` | `false` | No `profiles.onboarded_at`. A first-run flag is correctly per-install; it is what the root navigator reads. |

**Removed from the previous shape**: `categories: string[]`. No member↔category relation exists, so
it had no owner and no effect — see research D1. Readers of the stored blob must tolerate its
presence in records written by earlier builds and drop it.

**Corruption policy**: an unreadable or unparseable value is treated as a fresh install. The first
screen the app ever shows must not be able to crash on bad local state.

**Write policy**: written through on every change. The flow is short and the record is tiny, so
batching would risk losing a step to a crash for no gain.

---

## 2. Member Profile

**Owner**: the account (`public.profiles`, one row per `auth.users` id). **Lifetime**: permanent,
cross-device.

### Fields this feature may write

Verified against `information_schema.column_privileges` — these six are the complete set carrying
`UPDATE` for the `authenticated` role, gated by RLS policy `profiles_update_own`.

| Column | Type | Null | Constraint | Set by | Notes |
|---|---|---|---|---|---|
| `display_name` | `text` | no | `length(trim(…)) between 1 and 60` | signup metadata, then profile step | Seeded by the `on_auth_user_created` trigger from `signUp` options; profile step pre-fills rather than re-asking. |
| `avatar_url` | `text` | yes | — | profile step | Public URL from the `avatars` bucket. |
| `avatar_color` | `text` | yes | — | profile step | **Newly adopted** (research D5). The honest fallback when no photo is chosen. |
| `bio` | `text` | yes | `length ≤ 500` | *not this feature* | Permitted, deferred to profile editing (spec Assumptions). |
| `city` | `text` | yes | — | profile step | Free text; pairs with `country_code`. |
| `country_code` | `char` | yes | — | profile step, from staged device value | Uppercase alpha-2. |

### Fields this feature must never present as settable

`is_verified`, `verified_at`, `lifetime_sales`, `rating_avg`, `rating_count` carry **no `UPDATE`
grant**. `id`, `created_at`, `updated_at` are likewise not writable by a member. Onboarding must not
render any of them as an input, a promise, or a progress indicator — a member cannot verify
themselves or influence their own rating, by design.

### Creation

`profiles` rows are **not** created by this feature. The `on_auth_user_created` trigger on
`auth.users` calls `handle_new_user()`, which seeds the row including `display_name` from the
`data: { display_name }` passed to `signUp`. Onboarding updates that row; it never inserts one.

---

## 3. Category *(read-only)*

**Owner**: `public.categories`. This feature reads and never writes.

10 rows: `women`, `men`, `kids`, `home`, `electronics`, `beauty`, `shoes`, `bags`, `sports`,
`sudanese`. Read live via the existing `fetchCategories`; never hardcoded (FR-023).

**Used by this feature only** to render the marketplace the member arrives into. With the
personalization step removed (research D1), onboarding no longer collects against this table.

---

## 4. Delivery Coverage *(read-only)*

**Owner**: `public.delivery_options`. This feature reads and never writes.

| `country_code` | Meaning |
|---|---|
| `FR` | Domestic delivery — pickup point, home delivery |
| `SD` | Local delivery — local pickup, Khartoum delivery |
| `**` | International fallback — reaches everywhere else |

Used to order the country picker honestly: countries with domestic coverage first, the rest
alphabetical (research D2). This is a projection of real rows, not an editorial ranking.

---

## 5. Supported Language *(constant)*

**Owner**: `src/lib/onboarding.ts`, the application's supported-language definition (FR-025).

| Code | Label | Native |
|---|---|---|
| `en` | English | English |
| `fr` | French | Français |
| `ar` | Arabic | العربية |

Each is shown in its own script with the English name beneath, so a reader who cannot read the
current interface language can still find their own. **Nothing is translated yet** — the step
records a choice and must say so (FR-011).

---

## 6. Country *(derived)*

**Owner**: split by design, so that no country *name* is authored in this repository.

| Part | Source |
|---|---|
| Code | ISO 3166-1 alpha-2 constant set in `src/lib/countries.ts` |
| Display name | `Intl.DisplayNames(locale, { type: 'region' })` at runtime |
| Ordering | `delivery_options` (entity 4) |

**Fallback**: if `Intl.DisplayNames` is unavailable at runtime, the picker shows the code itself. It
must never show an invented name. Availability is unverified on Hermes/Android and is an explicit
check in [quickstart.md](./quickstart.md) step 4.

---

## State Transitions

```text
 intro(1..n) ──▶ language ──▶ country ──▶ account
                                              │
                    ┌─────────────────────────┴──────────────┐
                    │ session returned                        │ no session (confirmation required)
                    ▼                                         ▼
                 profile ◀───── sign-in with confirmed ── check-email
                    │                     account
                    ▼
                  done ──▶ completed = true ──▶ navigator swaps to (app)
```

**Invariants**

1. Backward movement never discards a recorded choice (FR-002).
2. `profile` is unreachable without a session; entered without one it shows a sign-in route, not a
   form that cannot save.
3. `completed` is set **only** at `done`, and only after any account-level write has succeeded — so
   an abandoned or failed run replays rather than stranding the member.
4. `country` moves from device to account exactly once, at `profile`. After that the account is
   authoritative and the staged value is not read again.
5. Completion is set from an event handler, never synchronously inside an effect body — the React
   Compiler ESLint rule rejects it (research D7).
