> Historical balance report: the subsequent unified-screen update reduces offline Spin Energy to 25% of the live worker rate. See [current update](unified-arcade.md).

# Casino-first progression

Stored spins now use safe integers with no gameplay cap (technical maximum Number.MAX_SAFE_INTEGER). Schema 7 retains existing spins, converts the old 100-energy reserve to a spin, drains milestone reserves into storage, and keeps fractional energy, claims and paid pending results. Saving the normalized state makes migration idempotent.

## Generation

Every accepted manual push earns 4 * (1 + .12 * Hands level) * (1 + .08 * Titan Grip level) energy, capped at 12 before Defiance (1.5x) and Ares (1.12x). The existing 125 ms input cooldown rejects excess input; paused and summit-return clicks do not earn energy. Workers continuously earn .15 + .15 * log2(1 + permanent workforce power) energy/sec, with Hermes 1.08x. No workforce means zero passive energy. Ownership milestones, training, Overseer, permanent Favor and cross-tier improvements all affect permanent power. Temporary output multipliers do not inflate this rate. 100 energy becomes one spin. Energy remains locked until mountain 4; already-earned milestone spins are stored immediately.

| Snapshot | Energy/push | Worker energy/sec | Idle spins/min | 1 push/sec spins/min | 2 pushes/sec spins/min | 8-hour spins |
|---|---:|---:|---:|---:|---:|---:|
| 10 Shades, no upgrades | 4.00 | 0.88 | 0.53 | 2.93 | 5.33 | 253 |
| Active run, mountain 4 | 4.48 | 0.63 | 0.38 | 3.07 | 5.76 | 182 |
| Active run, mountain 16 | 4.48 | 2.33 | 1.40 | 4.09 | 6.77 | 670 |
| Active run, mountain 28 | 4.48 | 3.12 | 1.87 | 4.56 | 7.25 | 897 |

Listed rates exclude checkpoint/milestone awards and temporary Defiance. Offline examples use frozen purchased equipment, actual climbing and eight hours of settlement; fractional energy remains. Monotonic lastSeen and commit-before-exposure prevent repeated/rollback credits; a client-only clock cannot authenticate arbitrary future wall-clock jumps.

## Batches and ascent

SPIN x10 snapshots an up-to-ten count and calls the single-spin engine independently for each result. It consumes only each settled spin, preserving RNG, checkpoint, jackpot, milestone and reward-pricing order. At a summit, the persisted unspent remainder waits for the ordinary 2.9-second return; online fixed-step simulation resumes it. Offline never spends batch spins. Prestige is unavailable during an unfinished batch; clicking and purchases remain available. Compact summaries combine Obols (including triggered checkpoint rewards), combination counts, jackpot winnings and actual push distance. Reveal/dismiss never pays again. Identical authoritative ordering matches singles without artificial animation time between them; naturally elapsed time and player purchases can change any run.

Per the follow-up request, base Casino Push is now pair 1.5%, two pair 3%, triple 6%, full house 9%, four 13.5%, five 18%, adjusted by square-root mountain pace and clipped to 18% and the remaining climb. No-match gives no push. Odds (79.55% match), Obol factors and jackpot rules are unchanged. Checkpoint rolls never recursively push. Maximum-tier spins cannot refund their own cost: at most 75 checkpoint energy per mountain versus at least six full-strength spins to ascend it.

## Economy results

The seeded frequent-clicking run reaches first prestige in 68.2 minutes versus 98.6 before this overhaul. Earned spins provide 24.9% of mountain-normalized ascent and 52.2% of earned Obols. The rest of ascent remains physical climbing; worker and click momentum interact nonlinearly and are not claimed as separately additive percentages. The simulator records per-mountain worker power, click impulse and climbing speed, plus purchase counts, gains and gaps.

| Scenario | Prestige/target minutes | Casino ascent | Earned-spin Obols | Spins used | Stored |
|---|---:|---:|---:|---:|---:|
| casual | 114.6 | 3.4% | 8.5% | 37 | 469 |
| frequent | 68.2 | 24.9% | 52.2% | 307 | 0 |
| holds | 70.2 | 22.9% | 50.8% | 318 | 0 |
| risk | 68.0 | 24.3% | 54.0% | 306 | 0 |
| workers | 112.1 | 12.9% | 33.1% | 180 | 0 |
| poor | 110.7 | 0.0% | 23.7% | 491 | 0 |
| good | 22.8 | 63.4% | 80.0% | 110 | 4 |
| returning | 60.3 | 12.6% | 19.0% | 160 | 0 |
| long | 163.3 | 22.6% | 60.4% | 425 | 0 |

'holds' and 'risk' are historical simulator scenario names for relic/Fate loadouts; both mechanics remain removed. 'good' forces every spin to Mega and 'poor' forces every spin to no-match as extreme stress bounds. 'long' targets mountain 40. The baseline no-casino control remains 136.1 minutes, with the first worker at 45 seconds and unchanged introductory mountains.

## Verification

120 automated tests pass, including migration, safe integer storage, active rates, eight-hour offline settlement, duplicate/rollback protection, batch/singles equivalence, return/reload, milestone and prestige safety. Production build passes. Browser checks cover 1440, 1280, 800 and 390 widths, batch summaries, return/reload and reduced motion; screenshots are in test-results/casino-first-*.png. Existing single-spin/automatic-Golden smoke checks are also run. No audio-quality or sustained-FPS measurement is claimed.

Reproduce with npm.cmd test; npm.cmd run build; node scripts/casino-first-smoke.mjs; node scripts/casino2-smoke.mjs; node scripts/progression-sim.mjs src test-results/casino-first-economy.json; node scripts/casino-first-report.mjs.

## Payout-linked Divine Push reward

Supersedes the fixed combination percentages above. Each earned SPIN x1 and each individual spin in SPIN x10 awards ascent from its total Obol payout, including jackpot and relic bonuses:

`requested percent = min(18, max(0.25, 50 * payout / stable full-mountain Obol value))`

This is half the payout's mountain-earnings equivalent, with a quarter-percent minimum even for no-match results. Actual ascent clips to the remaining climb. The scale is captured before settlement; owned Obols and the act of manually pushing are not inputs. The original Obol payout is preserved and awarded distance does not pay height earnings again. Checkpoint/summit bonus rolls do not recursively generate ascent; offline settlement does not create new Casino Pushes. Old settled presentation records keep their awarded values. Batch settlement, summit returns and reload behavior are unchanged.

## Reveal-synchronized impact

Divine Push now holds back its visual ascent, trail and reward label until the final spin result is shown. Single spins resolve after the reel/bonus reveal; x10 resolves after its rapid sequence. Skip and reduced motion reveal immediately. The authoritative reward remains saved at settlement, while a session-only projection preserves normal movement and holds the reward's distance out of the displayed boulder position. Summit transitions can settle safely behind the reveal; no saved reward is paid twice. Reset/import clears transient presentation state.

Validation: 125 tests pass; production build passes. The five-viewport browser harness verifies no impact at click time, impact after a natural reveal, x10 timing, Skip, reduced motion, checkpoint rewards and summit behavior.
