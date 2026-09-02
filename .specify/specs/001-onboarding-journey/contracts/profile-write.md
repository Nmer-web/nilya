# Contract: Profile Write Surface

**Consumer**: `src/app/onboarding/index.tsx` profile step, via `src/lib/mutations.ts`.

The complete set of account-level writes this feature performs. Anything not listed here is out of
contract and must not be attempted.

---

## Permitted columns

Verified 2026-08-17 against `information_schema.column_privileges` on project
`tggnhpvrvnmrvmsdyxyu`. These six are the entire set carrying `UPDATE` for the `authenticated`
role. RLS policy `profiles_update_own` restricts each member to their own row; RLS is enabled.

| Column | This feature | Validation before send |
|---|---|---|
| `display_name` | writes | trimmed length 1–60, else a plain-language message |
| `avatar_url` | writes | set only by a successful upload |
| `avatar_color` | writes | **requires extending `updateProfile`** — see below |
| `city` | writes | trimmed; empty becomes `null`, never `''` |
| `country_code` | writes | uppercase alpha-2, from the staged device value |
| `bio` | **does not write** | permitted but deferred to profile editing |

### Forbidden — no `UPDATE` grant exists

`is_verified` · `verified_at` · `lifetime_sales` · `rating_avg` · `rating_count` · `id` ·
`created_at` · `updated_at`

These must not appear as an input, a toggle, a promise, or a "complete your profile" target. A
member cannot verify themselves or move their own rating, and onboarding must not imply otherwise
(FR-019).

---

## Required change to `updateProfile`

`updateProfile` currently accepts `displayName`, `bio`, `city`, `countryCode`, `avatarUrl`. It does
**not** accept `avatarColor`, though the column carries the grant and `profile-identity.tsx` already
reads it.

```ts
export async function updateProfile(input: {
  displayName?: string;
  bio?: string | null;
  city?: string | null;
  countryCode?: string | null;
  avatarUrl?: string | null;
  avatarColor?: string | null;   // ← added
}): Promise<void>
```

Additive, app-layer, and **not** a schema change — Principle IV is not engaged. The existing
patch-building pattern (`if (input.x !== undefined)`) extends unchanged, so a caller that omits the
field still sends no column.

---

## Write sequence at the profile step

```text
1. photo chosen?  ──yes──▶ uploadAvatar(image)   → storage + avatar_url
                  ──no ──▶ pick avatar_color
2. updateProfile({ displayName, city, countryCode, avatarColor? })
3. on success ──▶ advance to `done`
   on failure ──▶ stay, show the failure, keep every entered value
```

**Ordering matters.** `uploadAvatar` internally calls `updateProfile({ avatarUrl })`, so it must
resolve before the main patch — otherwise the two writes race and the later one wins with a stale
view of the row.

**Partial failure is expected and must be handled** (US2 acceptance 6): if the upload fails, the
remaining fields must still save, and the member must be told plainly which part did not.

---

## Storage contract — avatars

Object path **must** begin with the member's own id: policy `avatars_write_own` checks
`(storage.foldername(name))[1] = auth.uid()::text`. Any other layout is refused.

```
avatars/{auth.uid()}/{random}.{ext}
```

The bucket is public, so the resulting URL needs no signing. The previous object is deliberately not
deleted — a URL already handed to a rendered image would break, and the bucket's 2 MB cap makes the
leak cheap. Cleanup belongs to a storage lifecycle rule, not a client delete.

---

## Reads

| Source | Purpose |
|---|---|
| `fetchProfile(id)` | pre-fill the profile step so a name seeded at signup is not asked for twice |
| `fetchCategories('home')` | render the marketplace the member arrives into |
| `delivery_options` | order the country picker by real coverage (research D2) |

No other table is read. No table is inserted into — `profiles` rows are created by the
`on_auth_user_created` trigger, never by this feature.
