# Motion Contract

## Purpose

Motion explains press, selection, hierarchy, loading, entry, dismissal, and authoritative completion. It never decorates business state, delays an action, or compensates for an unclear control.

## Canonical timing

| Role | Allowed band | Exact token | Use |
|---|---:|---:|---|
| instant | 100–150 ms | 120 ms | acknowledgment |
| fast | 160–200 ms | 180 ms | press/selection |
| standard | 220–280 ms | 240 ms | fade/ordinary transition |
| slow | 300–400 ms | 340 ms | sheet/longer travel |

Timed entry/state-change motion uses `easeStandard=[0.2,0,0,1]`; exit uses `easeExit=[0.4,0,1,1]`. A value can change only after evidence is recorded and the canonical specification/token registry is updated first. Platform-owned native navigation is exempt from exact millisecond equality but must preserve the semantic transition family.

## Canonical springs

| Spring role | Mass | Stiffness | Damping | Clamp | Observable constraint |
|---|---:|---:|---:|---|---|
| `buttonPress` | 0.70 | 420 | 30 | overshoot | within 0.005 scale of rest in <=300 ms |
| `selection` | 0.80 | 360 | 28 | overshoot | no visible secondary oscillation |
| `cardPress` | 0.80 | 320 | 28 | overshoot | cancels cleanly when press becomes scroll |
| `favorite` | 0.65 | 500 | 24 | overshoot | one 1.15 peak and no additional bounce |
| `sheet` | 1.00 | 320 | 32 | overshoot | within 1 px of rest in <=400 ms |
| `modal` | 0.90 | 300 | 30 | overshoot | within 1 px of rest in <=360 ms |

No component may embed an independent spring configuration unless a DesignException identifies the measured need.

## Interaction matrix

| Interaction | Normal motion | Reduced motion | Haptic |
|---|---|---|---|
| Button | 1.00 -> 0.97 -> 1.00, fast/press spring | No scale; immediate visual pressed state | None for ordinary tap |
| Listing card | 1.00 -> 0.98 -> 1.00 | No scale; immediate pressed state | None |
| Favorite | 1.00 -> 1.15 -> 1.00 | Immediate filled/selected state, no pop | Subtle only on real successful toggle |
| Selection | restrained state transition | Immediate state transition | Only meaningful successful selection |
| Image | skeleton/neutral well -> 240 ms opacity reveal | Direct replacement or opacity <=120 ms | None |
| Skeleton | 120 ms delay, >=180 ms visible when shown, 240 ms cross-fade | Static placeholder | None |
| Toast | 240 ms fade + short vertical entry/exit | Opacity <=120 ms or immediate | Important confirmed event only |
| Sheet | 240 ms overlay fade + `sheet` spring | Immediate endpoint/opacity <=120 ms, no travel | None by default |
| Modal | restrained native fade/scale where supported | Least spatial supported native option | None |
| Forward navigation | native small horizontal relationship | Least spatial supported option | None |
| Back navigation | native reverse relationship | Least spatial supported option | None |
| Peer tab | 180 ms selection feedback, no stack travel | Immediate selection | Sell only where real action starts |
| Onboarding content | fade + subtle translate; hero 1.03 -> 1.00 | Direct content/state change, optional short fade | Meaningful completed selection only |

## Driver rules

- Reanimated 4 drives shared component motion where transform/opacity or UI-thread execution improves responsiveness.
- Expo Router standard native Stack drives route transitions. Do not build a custom JS navigation animator.
- Continuous or scroll-adjacent motion uses transform/opacity whenever possible.
- Layout animation is used only after verifying text reflow, focus, and reduced-motion behavior.
- Animation completion never marks a business operation complete; authoritative state does.

## Interruption and concurrency

- Press feedback cancels or resolves cleanly when a touch becomes a scroll.
- Repeated taps while a control is busy do not queue duplicate business actions.
- A route change or unmount cancels orphaned component animation work.
- A favorite sequence reconciles to the latest real selected value if the underlying action fails or reverses.
- Sheet/toast animation cannot leave focus or interaction trapped in an invisible surface.

## Reduced-motion source

- Respect the system preference on iOS, Android, and web where supported.
- Reanimated configurations use system reduction.
- A shared JS policy observes platform accessibility changes during an active session because the setting may change without app restart.
- Reduced mode removes every press/card/favorite/hero scale, translation, spring overshoot, long travel, repeating shimmer, and repeated decorative motion. A single opacity replacement of at most 120 ms may remain when it clarifies state.
- Essential progress and completion remain perceivable; only non-essential motion is removed.

## Haptic rules

- `expo-haptics` is best effort and never a required channel.
- Allowed contexts are exhaustive: confirmed favorite state, a selection that commits a value, entry into the existing Sell action, authoritatively confirmed listing publication, authoritatively sent offer, and an existing explicitly confirmed irreversible or externally visible persisted action.
- Do not vibrate for navigation, ordinary button taps, scroll, image load, errors, or decorative timing.
- Haptic failure is swallowed only after visual/state feedback remains correct; it must not turn a successful action into an error.

## Performance verification

- Test release-like builds on named devices; development-mode smoothness is not representative evidence.
- Record 20 enabled presses per applicable button, icon-button, listing-card, selection, and favorite family on each executed platform class, using >=60 fps recording or a monotonic event/first-frame trace. Require p95 acknowledgment <=150 ms, zero duplicate actions, and zero intended-scroll captures.
- Target/aspiration: 60 fps on a 60 Hz display. Measured acceptance threshold: >=55 observed fps during a 10-second release-like scroll/interaction sample; the aspiration is not the pass threshold. Use the equivalent frame-budget ratio elsewhere, require no input/visual stall >100 ms, and classify a threshold miss as FAIL or UNVERIFIED rather than acceptable lower-end degradation.
- Static presence of Reanimated or transform usage does not prove performance.
