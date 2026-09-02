# Quickstart: Validating the Onboarding Journey

**Date**: 2026-08-17 | **Plan**: [plan.md](./plan.md)

A **manual protocol**, not an automated suite — `package.json` carries no test framework, and adding
one is outside this feature. Constitution Principle VII applies directly: nothing below may be
reported as passing unless it was actually executed, and anything skipped must be named as skipped.

---

## Prerequisites

- Node **≥ 22.13** (`node --version`). Expo SDK 57's stated minimum.
- **A terminal that has the current PATH.** VS Code inherits the environment it was launched with,
  so if Node was installed after VS Code started, restart VS Code — a new terminal tab is not enough.
- `.env` present with `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- A real email address you can receive at. Confirmation is enforced and cannot be bypassed.

---

## Gates — must pass before any runtime claim

```bash
npm run typecheck     # tsc --noEmit — must report 0 errors
npm run lint          # expo lint    — must report 0 errors
```

Both are hard gates (Principle VII). "Done except for the type errors" is not done.

---

## Start

```bash
npx expo start
```

Metro serves on `http://localhost:8081`. To prove the app compiles before touching a device:

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  "http://localhost:8081/.expo/.virtual-metro-entry.bundle?platform=android&dev=true"
```

Expect `200`. Note the entry is the router's virtual module — `/index.bundle` returns 404 here,
because `package.json` sets `main` to `expo-router/entry`.

---

## Replaying the flow

Onboarding is per install. To see it again after completing it, clear the record:

- **Device/simulator**: uninstall and reinstall, or clear app data.
- **Web (dev)**: remove the `sawa.onboarding.v1` key from localStorage and reload.
- **In code**: call `reset()` on the onboarding provider.

---

## Protocol

Each step names what to observe. Record executed / not-executed per step.

| # | Check | Expected | Covers |
|---|---|---|---|
| 1 | Launch on a fresh install | Introduction appears — **not** the marketplace, **not** sign-in. No flash of another route between splash and first paint. | US1.1, SC-002 |
| 2 | Move through the introduction | Progress visible throughout. Backward movement returns without losing a choice. | US1.2, FR-002 |
| 3 | Language step | Three languages, each in its own script. Selecting one records it. Copy states the interface is not yet translated. | US1.3, FR-011 |
| 4 | **Country step — `Intl.DisplayNames` probe** | Real country names render. Search filters; a no-match search shows a designed empty state. Countries with domestic delivery (FR, SD) appear first. **If names render as bare codes, `Intl.DisplayNames` is unavailable on this platform — stop and report it** (research D2). | US1.4, FR-024, SC-008 |
| 5 | Account step | **No Apple or Google button.** Password enforces 8 characters. Submitting shows "check your email" — not a signed-in state. | US1.5, US1.7, FR-010, FR-018 |
| 6 | Submit an address that already has an account | Response does not reveal that the address exists. | US1.6, FR-016 |
| 7 | Confirm via the emailed link, reopen | Flow resumes at profile setup — not the marketplace, not back at the introduction. | research D4 |
| 8 | Profile step | Name pre-filled from signup. Name outside 1–60 gives a plain sentence, not a database error. Photo uploads and appears. | US2.1, US2.2, US2.3 |
| 9 | Skip the photo | Avatar falls back to a stored colour and initial — **no stock face**. Verify `profiles.avatar_color` is non-null afterwards. | US2.4, FR-021 |
| 10 | Complete, then relaunch | Marketplace opens directly. Onboarding does not reappear across ≥10 relaunches, including signed-out ones. | US3.2, US3.3, SC-003 |
| 11 | Force-quit at each step, relaunch | Prior choices retained at every step. | US3.1, SC-002 |
| 12 | Arrival state | Marketplace shows only real data. With 1 listing in the database, the empty/sparse state must look finished — **zero sample products**. | US3.5, FR-009, SC-007 |
| 13 | Accessibility sweep | Every selectable row exposes `aria-checked`. All targets ≥ 44pt. Content clears notch, dynamic island and home indicator. | FR-026, FR-027, SC-006 |

### Cross-account verification (US2, FR-021)

```sql
select id, display_name, avatar_url, avatar_color, city, country_code
from public.profiles order by created_at desc;
```

Values written at step 8 must be present and visible to a *different* signed-in member. A profile
that only looks right to its author is not verified.

---

## Known blocker — record it, do not work around it

Steps 6–9 and the cross-account check need a **second confirmed account**. The project currently
holds **1 profile**. Creating the second requires entering a real address and password and clicking
a confirmation link — actions that cannot be automated from here.

Until that account exists, steps 6–9 **must be reported as not executed**. Fabricating a second
profile row to satisfy the check would violate Principle II directly — it would be exactly the
invented seller the constitution forbids.

---

## What this protocol does not cover

- Automated regression. There is no suite; every run is manual.
- Deep links on Expo Go. The `sawa://` scheme does not resolve there — confirmation and recovery
  links need a development build.
- Android `Intl` behaviour, unless step 4 is actually run on Android. iOS and web results do not
  transfer.
