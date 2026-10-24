# Clicker Satisfaction Update: validation (2026-10-21)

The audit reused Defiance, Obol smoothing, bounded gain effects, worker rigs, ownership multipliers, save schema 5, and the real-formula pacing harness. No base click, worker, mountain, prestige, or ownership-bonus values changed. The baseline was rerun before implementation.

| Scenario | M1 / M2 / M3 (seconds) | First prestige / finish | Longest purchase gap |
|---|---|---|---|
| relaxed | 62.10 / 63.30 / 120.70 | 2.268h | 135s |
| golden | 62.10 / 58.10 / 122.05 | 2.210h | 150s |
| automation | 88.55 / 134.60 / 222.10 | 2.929h | 165s |
| burst | 69.00 / 99.95 / 177.40 | 2.552h | 135s |
| second | 63.95 / 79.15 / 129.95 | 1.542h | 120s |
| late | 69.00 / 99.95 / 177.40 | 5.653h (40 mountains) | 480s |

Active = 1 click/s, shopping every 15s. Casual burst = 2 clicks/s for 5s every 45s after recruitment. Automation stops clicking after hiring. Returning run spends 8 Favor as before. Mid-game is covered by every full run and the exported midgame rows. No-event results match the previous baseline: first worker at 45s, first prestige at 8164s. Golden run catches all 41 events after a 3s reaction delay, seeded 74193; first prestige takes 7956.4s (2.54% faster). It is a generous catch rate, not an assumption required for normal progression. Mountain 2 falls to 58.1s with its optional boon; no-event timing remains 63.3s.

Golden Boulder: first appearance after 75 active, non-return seconds, 30s interaction window, seeded 150-240s cooldown after claim/miss. Rewards last 20s: 1.5x manual impulse and 1.25x workforce. Defiance replaces the smaller workforce multiplier; it never multiplies it. Claims are idempotent. Pause freezes the live clock; elapsed absence ages a visible event and an already-active bonus. No events spawn offline and cooldowns do not advance offline. Save/load cannot refresh a claimed bonus. The eight-hour offline cap is unchanged.

Bulk buying extends the existing quote/buy functions to ordinary upgrades and tier training; Divine Favor upgrades remain individual purchases. Ownership doublings at 10/25/50/100 remain unchanged, with added visible rank marks at 50/100. Eleven total achievements are cosmetic acknowledgments, including the original three; no achievement resources or power are awarded.

Purchase countdowns project the actual worker integrator once per simulation second for up to five minutes, including rollback, summit rewards and bonus expiration. They explicitly assume no future clicks, purchases or events. They show Ready, Paused, Unavailable, no-idle-income guidance, or a bounded estimate. Benefit previews distinguish workforce power, click impulse, rollback resistance and steady new-height Obols/s. Completed early objectives fall back to the next checkpoint. Prestige previews derive the next run's actual permanent bonuses.

Validation: `npm test` passes 62 tests; `npm run build -- --configLoader native` passes. Chrome browser suites `clicker-smoke.mjs`, `ui-smoke.mjs`, `progression-smoke.mjs` and `satisfaction-smoke.mjs` pass at 1280x800, 800x620 and 390x844. New browser coverage includes mouse/touch event activation, timer/reload behavior, no accidental push, bulk upgrades/training, previews and reduced motion. Screenshots of event placement and compact shop layouts were inspected; claim feedback now replaces the obsolete appearance notice.

Limits: countdowns are approximate worker-only forecasts, not promises about active play. Optional post-prestige purchase gaps still reach 8min by mountain 40. Native Electron packaging, audio listening, prolonged human playtesting and sustained frame-rate benchmarking were not performed. No dependencies, releases, commits or pushes were added.

Reproduce the full report: `node scripts/progression-sim.mjs src test-results/satisfaction-economy.json`.
