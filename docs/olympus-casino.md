# Olympus Casino rules and validation

Free earned rolls begin on mountain 4 at newly credited 25/50/75/100% checkpoints. High-water tracking plus a saved per-mountain bitmask prevents recrossing or reload rewards. Summit rolls resolve before the return animation. No wagers, paid spins, cash-out, or permanent power rewards exist.

Base burst = 0.2% of this mountain's full height earnings, including permanent Favor earnings but excluding temporary effects. No match pays 1x, a pair 2x, and a triple 4x. Lightning/Coin/Hourglass together pay 1.5x. Matching equipped relics add 1.15x to the burst: Zeus/Lightning, Toll/Coin, Atlas/Boulder, Chronos/Hourglass. Zeus also enhances the three-symbol arrangement. Athena adds 1.1x while a relic is equipped. The recorded calculation stages reproduce the single authoritative award.

Pairs/triples also give 12s of 1.1x/1.2x click impulse (Lightning/Boulder), workforce (Coin), or earnings (Laurel/Flame). Hourglass instead gives 30s at 1.08x/1.12x workforce. The three-symbol arrangement grants 12s of 1.1x earnings. Only one reel effect exists; new matched effects replace it. Ordinary unmatched rolls do not erase a running bonus.

Each checkpoint adds 5 jackpot points; each summit adds 10. At 100, subtract 100 and award 4% of current mountain height earnings. No multiplier applies to this burst. Only unique progression events fill the meter; purchases, clicks and visual playback do not. A complete eligible mountain contributes 25 points.

Every fifth summit earns one deferred Fates' choice: Ares gives 1.12x click impulse, Hermes 1.08x height earnings, Athena 1.1x reel bursts with an equipped relic. Each lasts 120 simulation seconds. Three choices always remain available when eligible; no automatic choice. Another selection requires expiration. Prestige clears active temporary effects but preserves unchosen choices, RNG, accumulated jackpot progress and historical roll counts.

Gameplay RNG is a saved 32-bit LCG, separate from visual cycling. Checkpoint symbol weights are 25/22/22/15/10/6%; summit weights are 20/20/20/16/14/10%, in Lightning/Laurel/Coin/Boulder/Hourglass/Flame order. Summits have an additional 12% chance to copy the first symbol into the third reel. Outcomes and money settle immediately; skipping cannot change or duplicate them. A free SPIN button reveals already-settled outcomes in order. Up to 24 individual outcomes persist across reloads; larger backlogs retain an explicit count and total for a condensed summary. Playback, skipping and dismissal never credit money. Three finite symbol strips move continuously and stop 250ms apart on the recorded outcome.

Offline policy: the same seeded outcomes, buffs, jackpots and deferred choices settle through the shared integrator, capped at eight hours. Offline-earned rewards do not create an animation backlog. Previously pending online reveals remain available after login. Existing schema 5 saves receive defaults; prior high-water marks cannot be retroactively farmed. Audio stays gesture-unlocked and voice-capped; jackpot showers use 12 bounded particles.

## Measurements

Baseline captured before implementation in `test-results/casino-baseline.json`. Reproduce final measurements with `node scripts/progression-sim.mjs src test-results/casino-economy.json`. Existing click/shop strategies remain unchanged. No-casino runs explicitly disable the expansion; poor/good runs force unmatched/triple-Coin results as stress cases, not percentile claims.

| Strategy | Finish seconds | Max purchase gap | Jackpots | Reel uptime |
|---|---:|---:|---:|---:|
| No casino, active | 8164 | 135 | 0 | 0% |
| Average seeded luck | 7988.20 | 135 | 6 | 8.45% |
| Forced poor luck | 8086.45 | 136.45 | 6 | 0% |
| Forced good luck | 7600.15 | 150 | 6 | 15.67% |
| Active / Ares / Atlas + Zeus | 7877.10 | 165 | 6 | 8.57% |
| Automation / Hermes / Toll + Chronos | 10036.45 | 150 | 6 | 6.72% |
| Golden / Athena / Atlas + Zeus | 7792.05 | 135 | 6 | 8.66% |
| Returning / Ares / Golden / inherited relics | 5142.10 | 150 | 6 | 13.12% |
| Late 40 mountains / Hermes / Golden / Toll + Chronos | 19188.85 | 495 | 9 | 5.46% |

Ordinary active M1–3 remain 62.1 / 63.3 / 120.7s and first worker 45s in no-casino, average, poor and good runs. Average purchase spacing changes from 56.69 to 54.34s. Total earned Obols to prestige change from 9.465M to 9.698M (+2.46%). Full JSON includes midgame output, every mountain, purchase log and all return/offline scenarios. Returning and late comparisons also include their chosen relics, blessings and Golden claims; differences are not attributable to reels alone.

88 tests passed, including new casino and economy gates. Production build and big-win/casino/divine/clicker browser smoke checks passed at 1280x800, 800x620 and 390x844. Screenshots cover reels, jackpots and Fates; reduced-motion summit and reload/no-replay behavior are exercised. Sound quality was not assessed by listening, and sustained FPS/native packaging were not benchmarked. No commit, push, or release.
