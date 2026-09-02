# Contract: Onboarding State

**Consumers**: `src/app/_layout.tsx` (root navigator), `src/app/onboarding/index.tsx` (the flow).

This is the interface the navigator and the flow must agree on. They disagree in exactly one way
that matters — a stale `completed` — and this contract exists to make that impossible.

---

## Provider contract

```ts
type OnboardingContext = {
  // ── state ──
  language: 'en' | 'fr' | 'ar' | null;
  country: string | null;          // ISO 3166-1 alpha-2, staged until profile step
  completed: boolean;

  // ── lifecycle ──
  loading: boolean;                // true until AsyncStorage has resolved

  // ── mutators ──
  setLanguage: (code: LanguageCode) => void;
  setCountry: (iso: string) => void;   // stored uppercase
  complete: () => void;
  reset: () => void;                   // clears the record; flow replays next launch
};
```

**It MUST be a provider, not a per-caller hook.** The navigator decides whether to mount the flow at
all, and the flow's last step is what marks it complete. Two independently-instantiated copies of
that boolean leave the navigator reading a stale one, and onboarding replays forever.

**`loading` is part of the contract, not an implementation detail.** The value arrives from
AsyncStorage asynchronously. A consumer that renders before it resolves shows the wrong route and —
worse — the router commits that navigation before it can be corrected.

### Removed from the previous shape

`categories: string[]` and `setCategories` are **removed**. No member↔category relation exists, so
they had no owner (research D1). Stored records written by earlier builds may still contain the key;
the reader must ignore it rather than fail.

---

## Navigator contract

```tsx
if (status === 'loading' || onboarding.loading) return null;   // mount nothing yet

const firstRun = !onboarding.completed;

<Stack.Protected guard={firstRun}>                                  → onboarding
<Stack.Protected guard={!firstRun && signedIn && !recovering}>      → (app)
<Stack.Protected guard={firstRun || !signedIn || recovering}>       → (auth)
```

**Three guards, and they are deliberately not mutually exclusive.** Onboarding runs until it marks
itself complete, signed in or not, because the flow crosses the auth boundary partway through. The
auth group stays navigable *alongside* it so "I already have an account" reaches sign-in. `(app)`
does not, which is what stops a half-finished first run racing into the marketplace.

`recovering` keeps a member inside the auth group while they choose a new password — a recovery link
signs them in before the new password is set, so `signedIn` alone would drop them into the app with
the old password still valid.

### Required behaviour

| Condition | Group |
|---|---|
| first run, no session | onboarding (auth reachable) |
| first run, session | onboarding (auth reachable) |
| completed, session, not recovering | `(app)` |
| completed, no session | `(auth)` |
| completed, session, recovering | `(auth)` |

---

## Step machine contract

```ts
type Step = 'intro' | 'language' | 'country' | 'account' | 'check-email' | 'profile' | 'done';
```

| Step | Requires session | Writes to | Advance condition |
|---|---|---|---|
| `intro` | no | — | member taps through the panels |
| `language` | no | device | a language is selected |
| `country` | no | device (staged) | a country is selected |
| `account` | no | Supabase Auth | valid email + password ≥ 8 |
| `check-email` | no | — | terminal until confirmation; offers sign-in |
| `profile` | **yes** | `profiles` | name valid 1–60; commits staged country |
| `done` | yes | device (`completed`) | member continues |

### Invariants

1. **Backward movement is lossless.** Returning to any earlier step and moving forward again must
   not clear a later recorded choice (FR-002).
2. **`profile` without a session renders a route to sign-in, not a form.** A form that cannot save
   is a dead control (Principle V).
3. **`complete()` is called only at `done`**, and only after any account write has resolved. An
   abandoned run must replay, not strand.
4. **`complete()` is called from an event handler.** React Compiler's ESLint rule rejects
   synchronous `setState` in an effect body; deriving or handler-driven only.
5. **No step renders a control it cannot honour** — specifically, no OAuth button, because no
   external provider is configured.

---

## Progress contract

Progress counts four steps: `language`, `country`, `account`, `profile`.

`done` is excluded — it is the celebration, and it renders full-screen without the header, so
counting it would leave the bar permanently at four-fifths wherever it is actually visible.
`check-email` is excluded because it is a held state rather than a step forward; showing it as
progress would imply the member had advanced when they are waiting. The `intro` panels carry their
own separate panel-level indicator.

Rendered with `accessibilityRole="progressbar"` and a label naming the position in words, so the
count is not conveyed by shape alone.
