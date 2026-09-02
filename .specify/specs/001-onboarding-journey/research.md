# Phase 0: Research — Onboarding Journey

**Date**: 2026-08-17 | **Plan**: [plan.md](./plan.md)

Resolves the three clarifications left open in [spec.md](./spec.md) plus the technical unknowns the
plan depends on. Every decision below is reversible; each records what else was considered so a
different call can be made without re-deriving the ground.

> **These three were put to the user and not answered before `/speckit-plan` was invoked.** They are
> resolved here by applying the constitution and the verified schema. D1 in particular changes the
> shape of the feature, so it is the one to overturn first if any of these is wrong.

---

## D1 — Personalization / interests *(resolves Q1)*

**Decision**: **Remove the personalization step.** The journey is 7 steps, not 8.

**Rationale**: There is no member↔category relation in the schema. All 19 public tables were
enumerated; `follows` is profile→profile, `favorites` is user→listing, and `categories` has no join
table. So a chosen interest cannot reach the account, cannot survive a reinstall, and cannot
personalise anything for anyone.

Constitution Principle III names this case explicitly: *"Inventing a workaround, a parallel local
store, or a JSON blob standing in for a column is forbidden."* Storing interests in AsyncStorage
would be precisely a parallel local store standing in for the missing relation. It also fails
Principle V — a control that appears to tune the marketplace but tunes nothing is a dead control
wearing a costume.

This is distinct from language and completion, which Principle III permits as genuine device state:
a language preference *is* a property of an install, and "has this install been onboarded" *is* a
first-run flag. Neither stands in for a column that ought to exist. Interests do.

**Alternatives considered**:

- *Keep it, device-local, labelled honestly* — rejected as the forbidden case above. The label
  would also be an admission that the step is theatre.
- *Add a `member_interests` table* — the only route to real personalization, and the right long-term
  answer. Rejected here because Principle IV freezes the schema without explicit approval, and none
  was given. **This is the recommended follow-up feature.**
- *Client-side feed re-ranking from local interests* — rejected: it would be real behaviour, but the
  marketplace holds 1 listing, so it would re-rank nothing while implying it re-ranked something.

**Consequence**: the brief asked for personalization "only where the existing schema can genuinely
support them". It cannot. This is the schema limitation the brief asked to have reported rather than
worked around.

---

## D2 — Country data source *(resolves Q2)*

**Decision**: Ship the **ISO 3166-1 alpha-2 code set** in `src/lib/countries.ts`; resolve display
names at runtime through `Intl.DisplayNames`; order the list by real delivery data.

**Rationale**: `profiles.country_code` needs a valid alpha-2 value, and the picker must be
searchable across real countries. Three facts constrain the answer:

1. **The runtime cannot enumerate countries.** `Intl.supportedValuesOf` accepts only `calendar`,
   `collation`, `currency`, `numberingSystem`, `timeZone` and `unit` — `'region'` is not a valid key
   and never will be. The earlier "Invalid key" failure was the specification working as designed,
   not a platform gap. Enumeration therefore *requires* a shipped code list; there is no third path.
2. **ISO 3166-1 alpha-2 codes are a published standard, not authored content.** Constitution
   Principle II forbids *fabricated* data — invented sellers, prices, ratings. A standards body's
   country codes are the opposite of fabricated. The earlier instruction "do not generate a country
   dataset" was given against generating a large table of country *names and metadata*; shipping
   codes and letting the platform's ICU supply the names honours its intent, because this repository
   authors no country name at all.
3. **The database knows SAWA's real geography.** `delivery_options` holds domestic delivery for
   `FR` and `SD`, plus an international `**` wildcard. That is real data and it gives the list a
   defensible order rather than an editorial guess.

**Design**: codes are a constant; names come from `Intl.DisplayNames(locale, {type:'region'})`;
the two countries with domestic delivery surface first under a "Delivers locally" heading read from
`delivery_options`, with the rest alphabetical beneath. Nothing about the ordering is invented — it
is a projection of a real table.

**Alternatives considered**:

- *Keep the curated 46-country list currently in the flow* — rejected. With `**` international
  delivery reaching everywhere, any hand-picked subset silently excludes members for no reason the
  data supports, and the 46 were an editorial guess.
- *Free-text country field* — rejected. It produces unnormalised `country_code` values, which
  breaks joins against `delivery_options` and `listings.country_code`.

**Open risk — must be verified at runtime, not assumed**: `Intl.DisplayNames` availability on
Hermes/Android is not guaranteed and is **not currently used anywhere in this codebase**. The
implementation must probe it at module load. If it is unavailable, the picker shows the code itself
(`FR`, `SD`) — never an invented name — and that becomes a reported limitation requiring a decision,
per D2-fallback in [quickstart.md](./quickstart.md) step 4.

---

## D3 — Editorial imagery *(resolves Q3)*

**Decision**: Build the image slots; ship with the design's ink treatment; leave a single documented
insertion point per panel.

**Rationale**: `assets/` was enumerated and contains **no editorial photography** — only app icons,
tab icons, and Expo starter images. The one asset that exists (`sawa2-story-5`) lives as base64 in
the DesignSync project state, not in this repository. Shipping stock or generated imagery of people
or products would fabricate the marketplace's character before it has one, which Principle II
forbids in spirit even though the constitution's letter concerns data.

The introduction therefore carries its weight typographically: large Manrope display type on the ink
surface the design's gradient already assumes. This is a finished look, not a placeholder look —
which matters, because Principle VI requires every state ship finished.

**Alternatives considered**:

- *Block until photography is supplied* — rejected; it stalls the entire feature on an asset
  dependency outside the repository.
- *Ship without slots and retrofit later* — rejected; retrofitting full-bleed imagery into a
  type-only layout means redoing the layout. Building the slot now costs nothing.

**Insertion point**: each panel carries an optional `image` field. Supplying an asset switches that
panel to full-bleed with the scrim already specified. No layout change required.

---

## D4 — The email-confirmation seam

**Decision**: The journey pauses at account creation and resumes after confirmation. It does not
attempt to run continuously into profile setup.

**Rationale**: `enable_confirmations = true` in the committed auth config, so `signUp` returns a
user with **no session**. Profile setup writes to `profiles` under RLS `profiles_update_own`, which
needs `auth.uid()`. There is therefore no session to write with until the member clicks the link.

The account step ends in a "check your email" state offering sign-in. On return with a session, the
navigator's onboarding guard is still open (completion is not yet set), so the flow resumes at
profile setup rather than dropping the member into the marketplace half-configured.

**Alternatives considered**:

- *Turn confirmations off* — rejected outright; Principle IV freezes auth configuration, and
  confirmations are a security control.
- *Collect profile data pre-auth and flush it after confirmation* — rejected. It would mean holding
  a name and an image on the device across an indefinite gap, and it makes the profile step's
  success invisible to the member at the moment they perform it.

---

## D5 — `avatar_color` adoption

**Decision**: Set `profiles.avatar_color` during profile setup; extend `updateProfile` to accept it.

**Rationale**: The column exists, carries an `UPDATE` grant to `authenticated`, and the existing
`updateProfile` does not cover it — verified against `information_schema.column_privileges`. The
avatar fallback in `profile-identity.tsx` already reads it. Without it, a member who skips the photo
has a null colour and no honest avatar; with it they get a real stored identity mark rather than a
fabricated portrait, which is what FR-021 requires.

This is an app-layer addition to an existing function. It is **not** a schema change and does not
engage Principle IV.

**Alternatives considered**: *derive a colour from the user id at render time* — rejected; it would
be a computed value masquerading as a stored preference, and it changes if the derivation changes.

---

## D6 — Language persistence

**Decision**: Device-local, and the step says so.

**Rationale**: No `profiles.language`, and no settings table anywhere in `public`. A language
preference is legitimately a property of an install, so Principle III permits it as device state
provided the reason is documented in code — which `src/lib/onboarding.ts` already does.

Nothing is translated yet. FR-011 requires the step to say so, because a control that appears to
change the interface and does not is the dead-control problem again.

---

## D7 — Navigator guard shape

**Decision**: Three guards in the root navigator; onboarding runs until completion regardless of
session; the navigator mounts nothing until both the session and the first-run flag resolve.

**Rationale**: The flow crosses the auth boundary partway through (account creation sits in the
middle), so onboarding cannot live inside either the signed-in or signed-out branch. The auth group
must stay navigable alongside it so "I already have an account" works. `(app)` must not, or a
half-finished first run could race into the marketplace.

Mounting the Stack before the stored session resolves is what causes a flash of the sign-in screen —
the guards evaluate against a null session and the redirect has already committed. The first-run
flag is read the same way and must be waited on for the same reason.

**Verified constraint**: React Compiler is enabled and its ESLint rule rejects synchronous
`setState` inside an effect body. Completion must therefore be derived or set from an event handler,
not written during render or in a bare effect.

---

## D8 — Verification approach

**Decision**: `npm run typecheck` and `npm run lint` as hard gates; runtime verification by the
manual protocol in [quickstart.md](./quickstart.md); anything unverified reported as unverified.

**Rationale**: No test framework is installed — `package.json` carries no jest and no
testing-library, so there is no automated suite to add to and adding one is outside this feature's
scope. Constitution Principle VII forbids describing a runtime behaviour as verified unless it was
executed, so the protocol names each check explicitly and the report must distinguish executed from
read.

**Known blocker to record now**: full end-to-end verification needs a **second confirmed account**,
because FR-021 and US2 acceptance require seeing a profile as another member sees it. The project
currently holds 1 profile. Creating the second account requires entering a real address and password
and clicking a confirmation link — actions outside what can be automated here. Until that exists,
quickstart steps 6–9 cannot be claimed as passed.
