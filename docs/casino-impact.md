# Casino hit frequency and climbing impact

Current rules supersede the historical Casino 3.0 report. HOLD and BANK/PRESS remain removed; Golden Boulder remains automatic. No dependencies added.

## Probability and payout

Old exact earned-spin match rate: 96.481%. New exact rate: 79.554%; measured over 100000 seeded spins: 79.441%.

Six symbols could not reach the requested no-match frequency with independent reels: even uniform weights give only 9.259% all-distinct rolls. Apollo Lyre and Poseidon Trident expand the set to eight original vector symbols, each with 12.5% weight. The 40% Echo assist is removed. A disclosed 0.3% earned-spin alignment retains attainable Mega jackpots. Checkpoint rolls use the same raw eight-symbol distribution without alignment. Evaluation remains order-independent with one primary result.

| Combination | Multiplier | Exact earned-spin odds | Seeded measurement | Standard-mountain push |
| --- | ---: | ---: | ---: | ---: |
| No match | 0.65x | 20.446% | 20.559% | 0% |
| One pair | 3x | 51.116% | 50.918% | 0.5% |
| Two pair | 6x | 15.335% | 15.27% | 1% |
| Three of a kind | 10x | 10.223% | 10.282% | 2% |
| Full house | 16x | 1.704% | 1.751% | 3% |
| Four of a kind | 28x | 0.852% | 0.892% | 4.5% |
| Five of a kind | 48x | 0.324% | 0.328% | 6% |

Expected primary Obol factor changes from 4.34x to 4.276x before synergies and guaranteed jackpots. Base pricing remains the permanent-production formula with its mountain-aware floor/cap. No temporary-buff repricing. Successful tiers pay 2-3 times their old multipliers; consolation falls from 1x to 0.65x. Existing bounded relic/Athena bonuses, temporary effects and guaranteed meter payouts remain.

## Real Casino Push

Only player-spent earned/milestone spins produce pushes. Multiply the tier percentage above by square-root mountain pace (relief 0.78, standard 1, challenge 1.15), then cap at 6% and the distance remaining to the summit. No permanent click-power change. Ordinary rollback and workforce physics continue afterward.

Pushes use the same high-water, relic-checkpoint, casino-checkpoint and summit-return path as normal movement. Their distance does not also earn height Obols: the explicit spin payout already pays the reward. Checkpoint rewards/energy can occur once, but checkpoint rolls never produce further Casino Pushes. A new spin is unavailable during the existing return transition. Five stored maximum-tier spins advance at most 30% before clipping, far short of an infinite reward cycle.

Settlement applies Obols and distance immediately, independently of animation FPS. The cabinet immediately says WIN SECURED and shows actual awarded progress. An energy trail, push pose and 0.65-second scene interpolation visualize that real state change while the seeded reels resolve. Final results retain actual percent, distance and pricing mountain; later reveals never move the boulder again. This deliberately avoids delaying gameplay until a long reel animation ends. Reduced motion skips travel/interpolation but retains the numeric award. Consecutive effects replace the previous scene surge.

Same baseline build snapshots; no relic multiplier in these examples, and enough climb remaining:

| Mountain | Consolation | Pair | Triple (old -> new) | Mega | Triple progress | Triple distance |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 4 | 3.9 | 18 | 24 -> 60 | 288 | 2% | 64 m |
| 16 | 1,454.539 | 6,713.257 | 8,951.01 -> 22,377.525 | 107,412.12 | 2.145% | 5,350.551 m |
| 28 | 17,688.885 | 81,641.008 | 108,854.677 -> 272,136.692 | 1,306,256.122 | 2.145% | 65,068.916 m |

Cheapest positive-production purchase ratios are included in the JSON report; purchase prices, worker power and mountain scaling were not rewritten.

## Before and after simulations

Times are seconds to first prestige, except the 40-mountain run. Historical harness keys named holds/risk now identify relic loadouts, not removed mechanics.

| Strategy | Before | After | Change | Casino share of total ascent |
| --- | ---: | ---: | ---: | ---: |
| Casual spins | 6,980.45 | 7,201.4 | 3.165% | 0.989% |
| Frequent active | 5,896.2 | 5,917.5 | 0.361% | 3.755% |
| Atlas/Zeus + Ares | 5,869.55 | 5,646.15 | -3.806% | 3.974% |
| Atlas/Zeus + Athena | 5,990.1 | 5,608 | -6.379% | 4.231% |
| Automation focused | 7,905.45 | 7,472.45 | -5.477% | 3.19% |
| Forced no matches | 7,288.2 | 7,313.7 | 0.35% | 0% |
| Forced every-spin Mega | 4,191.85 | 2,772.9 | -33.85% | 17.3% |
| Post-prestige | 4,331.8 | 4,351.6 | 0.457% | 2.078% |
| 40 mountains | 14,392.15 | 13,936 | -3.169% | 4.142% |

Frequent active average Obols per spin: 20,138.335 -> 22,136.684. Its 149 spins contribute 105.135 percentage points across 28 mountains, averaging 0.706 points per spin. It earns 20 milestone spins; longest purchase gap 150 seconds. Contributions measure awarded uphill distance and can include later rollback; they are not permanent protected height.

First-three-mountain control pacing remains 62.1 / 63.3 / 120.7 seconds, with first worker at 45 seconds. The automatic Golden variant is unchanged by this update. No-casino progression remains viable at 8,164 seconds to prestige. Forced no-match/every-spin-Mega runs are extreme bounds, not realistic luck percentiles. The latter accelerates greatly because it replaces a 0.324% result with 100%; normal seeded runs remain controlled.

## Validation

Focused coverage includes exact and seeded probabilities, tier rewards, mountain pace, actual distance, checkpoint/summit crossing, no duplicate height payment, no recursive spin loop, reload/dismiss/offline/prestige safety and old pending rewards. Existing save schema remains compatible; old pending payouts get no retroactive push.

Browser validation covers all seven tiers at 1440/1280/800/390 widths, five STOP controls, real saved progress, summit clipping, reduced motion and reload. Rendered screenshots include the energy trail and readable result panels. Sound uses the existing bounded synthesized cues, with a modest consolation note and stronger winning impacts. No perceptual sound-quality review or sustained FPS benchmark was performed.

Reproduce with node scripts/progression-sim.mjs src test-results/overhaul-economy.json, node scripts/casino-impact-report.mjs, and node scripts/casino-impact-smoke.mjs. Full test/build status is reported at delivery. No commit or release.
