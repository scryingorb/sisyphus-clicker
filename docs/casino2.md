# Olympus Casino 2.0 validation

Historical baseline: the energy-spin formula, guaranteed jackpot minimum, and pending-decision prestige policy below are superseded by [Mountain-scaled casino rewards](casino-reward-scaling.md).

Baseline: 90 tests passed before gameplay edits. Recorded in `test-results/casino2-baseline.json`. Final simulation: `test-results/overhaul-economy.json`; reproduce with `node scripts/progression-sim.mjs src test-results/casino2-economy.json`.

## Rules

- Mountain 4 unlock remains unchanged. Old checkpoint/summit outcomes settle immediately through the original engine; energy spins add a player-triggered call to that same engine. No wagers, purchases, or deducted Obols. STOP changes presentation timing only.
- 100 energy earns a spin. Meaningful accepted pushes add 0.8, limited to once per simulation second. Actual uphill workers add 0.8 + 0.4 * min(1, power / (resistance * 100)) per second, capped at 1.2. Ares adds 12% push energy; Hermes adds 8% worker energy within the cap. Checkpoints add 15; summits add 30.
- Storage: five spins and 100 reserve energy. Ordinary generation stops at full reserve. Checkpoint overflow pays 0.0002% of current mountain base earnings per point. Original checkpoint rewards always remain intact.
- Offline policy: retain pending spins/holds/decisions and settle original worker/checkpoint rewards, but generate no new energy or interactive decisions. Eight-hour cap unchanged. Prestige retains earned chances and pending decisions, clears selected holds, and preserves the existing progression reset.
- One Hold token every third energy spin, maximum two stored. One token fixes up to two chosen symbols for one earned energy spin; the other reels use their unchanged independent weights. Tokens and selections persist. No hold reroll loop.
- Energy-spin base is 0.05% of mountain base earnings. Original matches, relic modifiers, Athena and temporary reel bonuses apply in their existing order. Checkpoint base remains 0.2%. Only original progression events fill the guaranteed jackpot meter.
- Every third energy spin with a pair/triple offers an optional bonus of 25% of its settled reward. BANK pays that bonus once. PRESS pays three bonuses with probability 40%, otherwise zero. Expected optional payout is 1.2 times BANK, with 60% chance of losing only the unbanked bonus. Owned Obols are protected.
- Triple Flame adds eight base bursts and a non-stacking 20-second x1.2 earnings effect. Unheld probability: 0.0216%; with two held Flames: 6%. Guaranteed jackpot remains separate.

## Exact independent-reel probabilities

Unheld: triple 4.1512%, pair 46.1664%, special triad 3.3%, unmatched 46.3824%. Mega is a subset of triples. Two held Coins: triple 22%, pair 78%. Expected symbol factor without holds: 1.6027; with two held Coins: 2.44, before relic/Athena modifiers. UI enumerates the selected hold distribution directly.

## Deterministic progression measurements

| Strategy | Prestige / target seconds | Energy spins/hour | Spins played | Holds used | Risk decisions | Average spin Obols | Longest purchase gap |
|---|---:|---:|---:|---:|---:|---:|---:|
| casual | 8018.7 | 21.55 | 43 | 0 | 6 | 346.12 | 135 |
| frequent | 7886.55 | 76.69 | 168 | 0 | 22 | 352.44 | 146.55 |
| holds | 7792.2 | 76.69 | 166 | 55 | 23 | 369.48 | 150 |
| risk | 7751.95 | 76.63 | 165 | 54 | 28 | 423.72 | 150 |
| workers | 9916.85 | 46.47 | 128 | 42 | 26 | 389.64 | 165 |
| poor | 8103.85 | 76.41 | 172 | 0 | 0 | 230.25 | 135 |
| good | 7237.5 | 77.1 | 155 | 0 | 51 | 915.27 | 135 |
| returning | 5135.45 | 56.08 | 80 | 26 | 8 | 413.57 | 135 |
| long | 19202.95 | 50.05 | 267 | 88 | 39 | 5973.13 | 465 |

Previous seeded checkpoint casino baseline: 7988.2 seconds to prestige. No-casino baseline: 8164 seconds. First three active mountains remain 62.1 / 63.3 / 120.7 seconds; first worker remains 45 seconds. Worker-only opening is checked against its own automation baseline.

All strategies use the same production, physics and purchasing harness. Frequent/bank spins whenever earned; casual participates every 180 seconds. Hold/risk preserve up to two matching symbols (or the first symbol if unmatched). Worker and relic strategies also change clicking, equipment and blessings, so their differences are not solely caused by holding. Poor/good force unmatched/triple-Coin symbols in both checkpoint and energy spins as stress bounds, not percentile claims. Returning uses inherited progression; long targets 40 mountains. Caps explain low earned-spin throughput for casual/nonparticipating players. Average hold payouts, resource earnings, mountain timings, jackpots, purchase logs and offline snapshots are in JSON.

## Validation and limits

98 automated tests pass, including energy limits, exact hold probabilities, protected risk payouts, Mega reward bounds, persistence, offline, prestige and pacing gates. Production build passes. Browser checks cover the permanent cabinet, physical scrolling, fixed held symbols, STOP, BANK, win/loss risk decisions, Mega, reduced motion and four viewport sizes. Existing casino, Divine Combo, purchase and pending-reveal smoke checks are retained. Screenshots are under `test-results/`. Perceptual audio quality and sustained FPS are not benchmarked. No commit, push or release.
