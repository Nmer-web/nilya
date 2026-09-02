# Verification Quickstart: Global Design and Motion Foundation

This is the execution plan for proving the implementation. It does not claim that any runtime check has run. Every result must later be entered in the evidence ledger as PASS, FAIL, BLOCKED, or UNVERIFIED.

## 1. Preconditions

- Work from branch `003-global-design-motion` at a recorded commit SHA.
- Use the repository's Expo SDK 57-compatible dependency set; do not upgrade the stack as part of this feature.
- Use publishable client credentials only. Never place or print service-role, Stripe secret, webhook secret, passwords, or tokens in evidence.
- Have at least two real authenticated SAWA accounts/profiles available for cross-account regressions.
- Use existing real marketplace records where present. Where tables are empty, verify the truthful empty state. Do not seed sample rows or navigate with fake UUIDs.
- Record device/OS/browser, viewport, build mode, font-scale setting, screen-reader setting, reduced-motion setting, and network condition for each runtime run.
- Apply WCAG 2.2 AA as the normative baseline. Any proposed change requires an explicit specification amendment and cannot weaken the Constitution's accessibility obligation.

## 2. Baseline before presentation edits

Create a migration ledger using `contracts/migration-evidence-contract.md` and refresh the route inventory with:

```powershell
rg --files src/app
```

For every route/shared surface, record its existing route destination, real data source, real action, persisted outcome, and reachable loading/empty/error states. Capture screenshots or short video only where real data or a legitimate empty state is already reachable.

Record raw-value candidates. These commands are discovery aids and require manual classification:

```powershell
rg -n --glob '!src/theme/tokens.ts' "#[0-9A-Fa-f]{3,8}|rgba?\(" src
rg -n "fontSize|lineHeight|letterSpacing|borderRadius|shadowColor|shadowOpacity|shadowRadius|elevation" src
rg -n "duration|damping|stiffness|mass|friction|tension|withTiming|withSpring|Animated\.timing|Animated\.spring" src
rg -n "height:\s*[0-9]+|width:\s*[0-9]+|size=\{?[0-9]+" src
rg -n "opacity|zIndex|boxShadow|shadowOffset|borderWidth|strokeWidth|hitSlop" src
rg -n "function .*Button|function .*Card|function .*Sheet|function .*Toast|createAnimatedComponent|BottomNav|TabBar" src/components src/app
```

Record the command, commit, candidate count, classification, and exception ID. A reduced count alone is not completion.

The baseline and final audit manifests are identical and exhaustive: raw colors; derived tints; semantic colors; typography; spacing; gutters; radii; shadows/elevation; opacity; layers/z-index; touch sizes; button heights; icon sizes/strokes; image constants; motion durations; easings; springs; duplicate components; button, input, card, sheet, and navigation variants; and all duplicated design constants. Each category receives its own recorded command/count/commit and final classification; zero `OPEN` is invalid if any category was skipped.

Before application verification, predeclare two inventories in `migration-inventory.md`:

- the complete route/shared/pre-route surface inventory; and
- the deterministic interactive-control inventory containing every shared variant/state in every family plus the first screen-private control type.

Do not remove or substitute an inventory item after observing a failure. Add any later-discovered route, surface, collection, or control and require its evidence before closure.

## 3. Static gates

Run from `A:\SAWA` after each screen-family slice and at final closure:

```powershell
npm run typecheck
npm run lint
```

Both must exit successfully with zero errors before implementation is described as complete.

Optionally run:

```powershell
npx expo export --platform web
```

Classify this only as a build/bundle smoke check. It does not verify browser focus, responsive layout, motion, images, real journeys, or accessibility.

## 4. Canonical foundation inspection

Confirm statically:

- `src/theme/tokens.ts` is the only canonical token source.
- Requested palette values and semantic naming are exact, including distinct primary text and inverse text roles.
- Readable text and placeholders do not use `textMuted #9A9A9A`; role/surface combinations meet the normative WCAG 2.2 AA thresholds, readable secondary content uses `textSecondary #717171` on white, and disabled button labels use `textSecondary` plus canonical opacity and semantic disabled state.
- Spacing, radius, typography, icon/touch, elevation, duration, easing, and role-spring sets are complete.
- Decorative orange/teal/gradient usage is removed; semantic colors map to genuine state.
- onboarding no longer owns a separate palette, type ramp, spacing scale, or motion preset.
- root/system configuration produces a consistent light presentation; launch/icon surface exceptions are recorded.
- no second theme or duplicate component family was introduced.
- no Supabase, RLS, Auth, Realtime, Stripe, Edge Function, checkout/order behavior, or payment architecture file changed for this feature.

This section is static evidence only.

Before the visual-coherence review, predeclare one populated real or truthful-empty resting screenshot state and its fixed equal-area 10x10 grid for every route family. During review, use those locations without post-inspection substitution; exclude product photos, avatars, system/status chrome, transparent pixels, and genuine semantic-status content; record each cell classification, screenshot/grid artifact path, per-family result, and aggregate 85–95% neutral/5–12% black/<=3% semantic calculation. This is runtime visual evidence, not a static color-literal audit.

## 5. Runtime viewport matrix

Run representative journeys on each available target. Name unavailable targets explicitly.

| Target | Small | Large | Required observations |
|---|---|---|---|
| iOS phone | <=375x667 pt | >=430x932 pt, notched/Dynamic Island where available | safe areas, native stack direction, sheets, keyboard, 200% text, VoiceOver, reduced motion |
| Android phone | <=360x640 dp | >=412x915 dp | edge-to-edge/system bars, back behavior, sheets, keyboard, 200% text, TalkBack, reduced motion |
| Web | 360 CSS px width | 1280 CSS px width | keyboard order, visible focus, semantics, responsive wrapping, image loading, reduced motion |

For each executed cell:

1. Traverse all screen families.
2. Confirm 20–24 normal gutters and intentional full-bleed image exceptions.
3. Open the keyboard on every form family and verify required actions remain reachable.
4. Do not claim native landscape support: `app.json` is portrait-locked and landscape is outside this feature's normative matrix.
5. Test short content, long real content where available, and legitimate empty states.
6. Inspect status bar, notch, home indicator, Android edge-to-edge, modal, and sheet insets.

## 6. Runtime component and motion matrix

### Buttons and pressables

- Press enabled primary, secondary, ghost, and icon actions.
- Observe 0.97 button scale and 0.98 listing-card scale in normal motion.
- Begin a card press and turn it into a scroll; scrolling must win and navigation must not fire.
- Rapidly press a busy action; only one real action starts.
- Verify disabled actions neither activate nor appear enabled to assistive technology.
- Record 20 enabled presses per applicable button, icon-button, listing-card, selection, and favorite family for each executed platform class in a release-like build. Measure with >=60 fps recording or a monotonic event/first-frame trace; calculate p95 and require <=150 ms, zero duplicate actions, and zero intended-scroll captures.

### Favorite and selection

- Toggle a real favorite and confirm 1.00 -> 1.15 -> 1.00 normal feedback, no particles, correct final state, and best-effort subtle haptic.
- Force or encounter a real failure if safely possible; visual state must reconcile to authoritative state and no success toast may appear.
- Exercise checkbox/radio/category/tab selections and confirm selected state is perceivable without color.

### Images and skeletons

- Observe real remote images loading from their existing source.
- Verify destination-shaped skeleton and smooth image transition without a distracting flash.
- Reach a real missing/failed image state without altering production data; confirm neutral non-product treatment and no fake fallback.
- Repeat with reduced motion; shimmer/repeated motion is absent and state remains clear.

### Sheets, toasts, and navigation

- Open short, long, and keyboard-containing sheets; verify overlay, 24 radius, drag indicator, scrolling, sticky action, dismissal, and focus restoration.
- Verify authoritative success/error toasts only when the existing operation reaches that state.
- Exercise forward/back, modal, sheet, and Home/Browse/Sell/Inbox/Profile peer navigation.
- Confirm Browse still reaches the existing `/explore` destination.
- Confirm system back/swipe behavior remains native and no transition traps focus/input.

### Reduced motion

- Launch with reduced motion enabled and repeat the motion matrix.
- Change the platform setting while the app is open and repeat at least button, card, favorite, skeleton, sheet, and navigation checks.
- Confirm non-essential scale, bounce, shimmer, and long travel are removed while selected/loading/success/error state remains understandable.

## 7. Runtime accessibility matrix

For every component family and at least one instance on every screen family:

- Measure effective target >=44x44.
- Inspect role, accessible name, value/selected/checked state, disabled state, and busy state.
- Confirm error text association and appropriate dynamic announcements.
- Traverse with VoiceOver/TalkBack in logical task order; decorative elements remain silent.
- Increase text size to the normative maximum (200%) and complete the route without clipped essential content or unreachable controls.
- On web, traverse using keyboard only; focus is logical and visible, sheets trap/restore focus appropriately, and no native control relies on inappropriate web-only ARIA props.
- Verify focus, selection, success, warning, error, disabled, and loading remain identifiable without color.

Record platform limitations rather than inferring parity.

## 8. Real-journey regression matrix

Use existing real accounts and data. Do not create records merely for visual testing. If a journey naturally creates a real user-intended record, use an authentic scenario and record the UUID redacted where necessary.

| Journey | Required preservation evidence |
|---|---|
| Onboarding | Existing choices persist and real auth/profile outcome remains unchanged. Do not rebuild onboarding. |
| Sign in/up/recovery | Existing Auth architecture, routes, errors, and session behavior remain unchanged. |
| Home | Real NEW-only feed or truthful empty/error state; refresh retains source and card routes use real UUIDs. |
| Browse/Search | Existing `/explore` destination, real categories/results, NEW-only behavior, real filters. |
| Listing detail/seller | Real UUID reload, real seller/product/image/price, NEW-only read behavior. |
| Favorites | Real toggle persists; second session/account behavior remains as already authorized. |
| Sell | Existing real listing publish journey and authoritative success remain unchanged; no condition selector/resale wording. |
| Inbox/Chat | Existing Realtime/data behavior, real participants/messages, send outcome, and route IDs remain unchanged. |
| Profile/Edit/Verify | Existing authenticated identity and profile persistence remain unchanged. |
| Checkout | Existing Stripe test-mode request flow and authoritative payment boundary remain unchanged. Mobile UI never marks an order paid. |
| Orders/detail | Real orders/statuses only; existing reads and route UUIDs remain unchanged. |
| Notifications | Real notification rows or truthful empty state; navigation only to real targets. |

Where Constitution Principle V requires second-account proof, repeat with an independent authenticated account and record the observed visibility/authorization result. Never use a service-role key to make testing easier.

## 9. Long-list and performance checks

- Test Home/listing grids and every remote-backed collection not contractually capped below 20 rows. High-volume runtime evidence requires at least 30 naturally existing real rows; when fewer exist, keep virtualization and mark that evidence cell UNVERIFIED rather than creating records.
- Review Inbox, Notifications, Favorites, Orders, and Chat for virtualization appropriate to their potential growth. Do not manufacture rows to create load.
- In a release-like runtime, record a 10-second scroll/interaction sample while image loading, pressing cards, opening sheets, receiving existing real updates, and showing skeletons. Target/aspiration: 60 fps on a 60 Hz display. Measured acceptance threshold: >=55 observed fps; the aspiration is not the pass threshold. Use the equivalent frame-budget ratio elsewhere and require no input/visual stall >100 ms.
- Capture React Native performance/devtools evidence when available, but report development-mode measurements separately.
- A source review that finds Reanimated, FlatList, transform, or opacity is not runtime performance evidence.

## 10. Audit closure

Re-run the baseline static searches and classify every remaining candidate as migrated, removed, centrally derived, or an accepted exception. Verify:

- 100% of current routes/shared surfaces have a migration record.
- No record is silently omitted because its data is empty.
- Every exception names its exact need and scope.
- Every VR and SC has a ledger row.
- The originality review records inspected references and SAWA-specific decisions for asset provenance, composition, UX writing, icons, motion, and navigation, with no copied distinctive marketplace treatment.
- SC-009 remains UNVERIFIED until at least five people independent of implementation/design each judge 15 randomized, brand-masked pairs, every major screen family appears at least twice, and >=68 of 75 judgments say the pairs belong to one product.
- Any unavailable device, screen-reader, browser, real state, independent account, or performance environment is BLOCKED/UNVERIFIED with the exact reason.

## 11. Final report template

```md
Commit:
Implementation scope:

Static gates
- Typecheck: PASS/FAIL — command/output
- Lint: PASS/FAIL — command/output
- Audit closure: PASS/FAIL — report link
- Web export: PASS/FAIL/NOT RUN — build smoke only

Runtime
- iOS small/large: PASS/FAIL/BLOCKED/UNVERIFIED — device/evidence
- Android small/large: PASS/FAIL/BLOCKED/UNVERIFIED — device/evidence
- Web narrow/wide: PASS/FAIL/BLOCKED/UNVERIFIED — browser/evidence
- Motion/reduced motion: PASS/FAIL/BLOCKED/UNVERIFIED
- Accessibility: PASS/FAIL/BLOCKED/UNVERIFIED
- Real journeys/second account: PASS/FAIL/BLOCKED/UNVERIFIED
- Performance: PASS/FAIL/BLOCKED/UNVERIFIED
- Five-participant review: PASS/FAIL/BLOCKED/UNVERIFIED

Frozen architecture diff check:
Exceptions:
Known failures/blockers:
Runtime claims intentionally not made:
```

## Current planning limitations

- The repository presently has no automated test runner or end-to-end harness; the plan does not pretend otherwise.
- Device, screen-reader, and moderated-study availability at implementation time is unknown. Those checks remain mandatory evidence rows even if they must be marked blocked.
- Existing real data may not expose every error or populated state. Do not fabricate it; record the unavailable state honestly.
