# Olympus Casino 3.0

Historical report. HOLD and BANK/PRESS have since been removed. Old pending optional bonuses are banked on load once. All new spins use the unheld probabilities below, with no optional bonus stage. Golden Boulder now activates automatically during active play; its original bonuses and cooldowns remain. Offline still does not spawn Golden events.

Supersedes the three-reel and mountain-scaling rules in earlier casino reports. No purchased spins or wagers.

## Five-reel outcomes and increased win frequency

Five vertical reels use seeded outcomes settled before animation. STOP reveals only. One token holds at most two symbols for one earned spin; fixed symbols are never overwritten. For earned spins, a disclosed 40% Echo assist copies the strongest matching group into one free reel; a separate 2% alignment makes five matching symbols unless held symbols conflict. Raw weights remain 25/22/22/15/10/6%. Displayed probabilities enumerate all outcomes and assists, including selected holds. Checkpoint rolls retain their separate original weights and summit assist.

| Primary combination | Base multiplier | Earned-spin probability |
| --- | ---: | ---: |
| No match | 1x | 3.52% |
| One pair | 1.5x | 25.38% |
| Two pair | 2.5x | 14.73% |
| Three of a kind | 4x | 33.72% |
| Full house | 6x | 6.88% |
| Four of a kind | 10x | 12.14% |
| Five of a kind | 16x | 3.63% |

Every spin has one primary outcome. A matching equipped relic adds at most 1.15x, even when two symbol groups match; Athena retains 1.1x. Expected primary factor is 4.34x before synergies and guaranteed jackpots. Five of a kind is the Mega payout, with no additional eight-base burst. Its temporary earnings benefit remains 1.2x for 20 seconds. Holding two Coins raises five-of-a-kind odds to 7.57%, full house to 16.82%, and four of a kind to 22.63%. Smaller matches frequently upgrade into larger ones; not every individual category increases.

Earned spins now add one guaranteed jackpot meter point. Checkpoints still add five, summits ten. Checkpoint meter completion pays the greater of 4% height earnings or ten regular bases; earned-spin completion pays twenty bases. Meter remainder and once-only settlement persist.

## Base rewards and milestone spins

Permanent production target increased from 15 to 40 seconds times square-root mountain pace. The cap rose from 0.8% to 1.2% of mountain height earnings times pace (relief 0.936%, standard 1.2%, challenge 1.38%). The 0.2% floor remains. Temporary buffs cannot inflate pricing. Caps usually bind: 30-60 seconds on every no-match spin would overwhelm progression at this frequency. No direct climbing teleport was added.

Same baseline-state examples, without relic bonuses:

| Mountain | Previous base | New no-match | Production seconds | Pair | Mega |
| --- | ---: | ---: | ---: | ---: | ---: |
| 4 | 4 | 6 | 4.49 | 9 | 96 |
| 16 | 1,491.83 | 2,237.75 | 6.87 | 3,356.63 | 35,804.04 |
| 28 | 18,142.45 | 27,213.67 | 8.69 | 40,820.5 | 435,418.71 |

One free spin per lifetime worker threshold (10, 25, 50, 100 for each tier), new non-Shade worker unlock, completed ten-level tier training, and existing achievement. There are 34 finite claims. Bulk purchases recognize all crossed thresholds. The five-spin store and 100 energy reserve remain; excess milestone spins wait in a separately visible reserve bounded by the claim catalog. Spins earned before Mountain 4 wait until unlock. Prestige keeps claims and reserves. Offline accomplishments may award their one-time milestone spins; offline generates no Spin Energy or interactive decisions.

## Economy measurements

Baseline was recorded before formula edits. Time below is seconds to prestige, except the 40-mountain long run. Runs use the same deterministic purchase/play strategies as their baseline.

| Strategy | Before | After | Change | Milestone spins |
| --- | ---: | ---: | ---: | ---: |
| casual | 7,698.6 | 6,908.25 | -10.27% | 19 |
| frequent | 7,218.65 | 5,774.2 | -20.01% | 19 |
| holds | 7,229.55 | 5,624.55 | -22.2% | 19 |
| risk | 7,094.4 | 5,715.05 | -19.44% | 19 |
| workers | 9,351.75 | 7,534.4 | -19.43% | 19 |
| poor | 7,611.35 | 7,288.2 | -4.25% | 20 |
| good | 6,371.45 | 4,171.75 | -34.52% | 19 |
| returning | 4,945.9 | 4,236.4 | -14.35% | 22 |
| long | 17,895.75 | 14,187.05 | -20.72% | 24 |

Frequent play earns 78.56 energy spins/hour, or 90.4 including milestones. Average earned-spin reward changes from 5,678.56 to 19,873.56 Obols. Longest purchase gap changes from 135 to 135 seconds; guaranteed jackpots change from 6 to 7. First-three active climbs remain 62.1/63.3/120.7 seconds; first worker remains 45 seconds. Forced poor/good cases are extreme bounds (all unmatched/all five-of-a-kind), not likely luck percentiles.

Same-build BANK and PRESS runs take 5,774.2 and 5,881.4 seconds respectively. PRESS rules are unchanged: 40% chance of three optional bonuses, 60% zero; bonus remains 25% of the settled spin reward every third matching earned spin. Its expected value is 1.2 times BANK, with substantial variance. BANK offers certainty; it is not equal in long-run expected value. These single seeded runs do not establish strategy superiority. Dedicated held-pair and milestone-targeting/bulk strategies are included in the JSON report; their purchase policy converged in this seed.

## Compatibility and validation

Schema 6 preserves old balances, settled payouts, RNG, spin energy, tokens, optional decisions, relics and Favor. Unfinished three-reel results retain their original three symbols and amounts for display; new spins use five. Old held positions remain usable; new positions begin unheld. Existing completed milestones are marked claimed without retroactive grants. New claims persist across reload and prestige. Pending BANK/PRESS must still resolve before prestige. Eight-hour offline cap remains.

Reproduce: node scripts/progression-sim.mjs src test-results/casino3-final.json; node scripts/casino3-report.mjs. Tests cover combinations, probabilities, held outcomes, milestone thresholds, reserves, migration, once-only payout, temporary effects and offline rules. Browser harnesses cover four viewport sizes, five STOP/HOLD controls, legacy reveals, milestone notifications, BANK/PRESS, jackpots and reduced motion. Screenshot inspection covers laptop and mobile. Final test/build status is reported with delivery. No dedicated audio listening or FPS benchmark was performed. Player feedback remains necessary for the substantially faster economy requested by the increased win rates.
