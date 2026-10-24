# Mountain-scaled casino rewards

Historical balance report. Current five-reel rules and increased win rates are documented in [Olympus Casino 3.0](casino3.md).

Regular spins previously paid a base of 0.05% of mountain height earnings, often only 0.1-0.4 seconds of stable production in the measured run. This made earned spins weak relative to climbing and purchases.

## Pricing

`src/casino-rewards.js` prices earned spins once, when SPIN consumes the opportunity. It uses permanent production from the stronger of workers or one push per second under existing drag. Defiance, Golden Boulder, reel, Fates, Toll and other temporary amplification do not increase this reference. Permanent upgrades and Favor do.

- Target window: `15 * sqrt(mountain.pace)` seconds.
- Base: target production, bounded between 0.2% and `0.8% * pace` of full mountain height earnings.
- Relief / standard / challenge caps: 0.624% / 0.8% / 0.92%. These are earnings percentages, not instant climbing.
- The cap usually binds in measured play: ordinary bases represent roughly 2-6 seconds, not a guaranteed 15 seconds. Existing pairs and triples remain 2x and 4x; existing relic and Athena modifiers retain their order.
- Guaranteed jackpots pay the greater of their original amount or ten regular bases. Meter frequency is unchanged. Mega rewards retain their existing formula using the newly scaled base.
- The saved result and its production reference are frozen. Reloading, revealing later, or changing mountains never reprices a pending result or pays it twice.
- Pending BANK/PRESS decisions must be resolved before prestige, preventing an old-run bonus from bypassing the Obol reset. Earned spins still persist; the Mountain 4 unlock still applies.

No instant climbing reward was introduced. Temporary worker benefits continue through existing shared movement physics and expiration. Offline energy policy and the eight-hour cap are unchanged.

## Same-state payout examples

These use permanent-state snapshots from the baseline run, so changing progression speed does not distort the comparison. Values are Obols before relic modifiers.

| Mountain | Old base | New base | Pair | Triple |
| --- | ---: | ---: | ---: | ---: |
| 4 standard | 0.25 | 4.00 | 8.00 | 16.00 |
| 8 relief | 3.10 | 38.68 | 77.36 | 154.73 |
| 10 challenge | 11.20 | 206.09 | 412.18 | 824.37 |
| 16 challenge | 81.08 | 1,491.84 | 2,983.67 | 5,967.34 |
| 28 challenge | 986.00 | 18,142.45 | 36,284.89 | 72,569.79 |

## Deterministic simulations

An initial 2% cap accelerated frequent-play prestige by 18.5%; it was reduced to 0.8% to retain progression weight. Final results below compare each strategy with its own baseline. Time is simulated seconds to first prestige, except the 40-mountain run.

| Strategy | Before | After | Change |
| --- | ---: | ---: | ---: |
| Casual | 8,018.70 | 7,698.60 | -4.0% |
| Frequent spins | 7,886.55 | 7,218.65 | -8.5% |
| Strategic holds | 7,792.20 | 7,229.55 | -7.2% |
| PRESS strategy | 7,751.95 | 7,094.40 | -8.5% |
| Worker-focused | 9,916.85 | 9,351.75 | -5.7% |
| Forced poor outcomes | 8,103.85 | 7,611.35 | -6.1% |
| Forced good outcomes | 7,237.50 | 6,371.45 | -12.0% |
| Returning player | 5,135.45 | 4,945.90 | -3.7% |
| 40-mountain run | 19,202.95 | 17,895.75 | -6.8% |

Frequent-play average earned-spin payout rose from 352.44 to 5,678.56 Obols; the longest purchase gap fell from 146.55 to 135 seconds. Spin frequency remained about 76.8 per hour, with six guaranteed jackpots before prestige in both runs. The first three active mountains remained 62.1, 63.3 and 120.7 seconds; first worker remained 45 seconds. Forced poor/good outcomes are stress bounds, not statistical percentiles.

Reproduce measurements with `node scripts/progression-sim.mjs src test-results/scaled-tuned.json` and `node scripts/casino-scaling-report.mjs`. Baseline snapshots are in `test-results/scaled-baseline-samples.json`; comparisons are in `test-results/casino-scaling-comparison.json`.

## Validation and limits

- All 104 automated tests passed, including economy gates, reward hierarchy, temporary-buff exclusion, expiration, snapshots, save/reload, offline cap, duplicate settlement and prestige handling.
- Production build passed.
- Casino and Casino 2.0 browser smoke suites passed. Casino 2.0 covers 1440, 1280, 800 and 390 pixel widths, holds, STOP, reload, decisions, Mega, reduced motion, benefit labels and the prestige guard.
- Rendered payout screenshots were inspected at laptop and mobile widths. Actual reward, calculation, production equivalent and original pricing mountain are readable.
- Deterministic simulations are balance evidence, not a substitute for player feedback. No perceptual audio review or dedicated FPS benchmark was performed; audio and combo timing were not changed by this update.
