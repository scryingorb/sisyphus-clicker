# Overhaul validation: 2026-10-20

Phase 1 gate completed before visual implementation: real-formula simulations and all 46 existing tests passed. Active means 1 click/second, purchases every 15 seconds. Casual means 2 clicks/second for 5 seconds every 45 seconds after hiring. Only one purchase per visit. No automatic offline purchases.

| Scenario | M1 / M2 / M3 (seconds) | First worker | Longest meaningful purchase gap | Time to 28 |
|---|---|---|---|---|
| relaxed | 62.10 / 63.30 / 120.70 | 45s | 135s | 2.27h |
| burst | 69.00 / 99.95 / 177.40 | 45s | 135s | 2.55h |
| automation | 88.55 / 134.60 / 222.10 | 45s | 165s | 2.93h |
| imperfect | 61.90 / 63.05 / 122.65 | 60s | 140s | 2.78h |
| second | 63.95 / 79.15 / 129.95 | 45s | 120s | 1.54h |

Active first-three average worker power: 0.39 / 3.88 / 9.60. One untrained Shade completes mountain 1 from rest in 241.5s. First manual upgrade at 15s gives +25% impulse.

The longest purchase gap in the active first three mountains is 45s; the full first run reaches 135s. Active first prestige is 2h16m04s, casual burst prestige 2h33m06s, and the returning burst run 1h32m30s (about 40% faster).

Prices: Hands 20 -> 15, Shade 65 -> 55; Shade power 1.2 -> 1.4. Opening distances 330 / 400 / 1300 / 3200 / 6500. Mountain 1 was previously 45.9s; its longer introduction now meets the requested minimum while mountains 2-5 are faster. From mountain 8, explicit short / steady / challenge distance multipliers are .78 / 1 / 1.15; base work continues to rise. After 28, new-height earnings grow 8% per mountain to help reinvestment.

Mid-game is measured in the full-run scenarios, including individual mountain speeds and output in the JSON. Extended burst run completes 40 mountains in 5.65h; longest climb 1848.7s, longest purchase gap 480s. These optional post-prestige waits are deliberately longer (validation limit: 35min/climb and 8min/purchase); prestige remains available at 28 for 8 Favor. This is a limitation, not a claim that late-game purchases remain under five minutes. No later adjacent climb exceeds 2.5x its predecessor.

Offline scenarios each settled exactly 28,800 seconds from a 24h absence. Save key/schema, normalized partial height, ownership, Favor, rewards and unlock migration remain intact.

Reproduce: `node scripts/progression-sim.mjs src test-results/overhaul-economy.json`; `npm test`. JSON includes click impulse (m/s added), average actual worker power, theoretical auto speed, observed uphill distance/time, every purchase and summit, isolated Shades, mid-game subset, returning prestige and extended late run. These are deterministic simulations, not human playtesting.

Presentation validation: 54 automated tests pass, including the real-formula economy gate, counter bounds/formatting, actual impulse/work inputs, milestone suppression, ownership-based helper limits, reduced motion and optional distance-field compatibility. Production build passes with `npm run build -- --configLoader native`. Browser suites run: `scripts/ui-smoke.mjs`, `scripts/progression-smoke.mjs`, `scripts/satisfaction-smoke.mjs`, `scripts/mountain-smoke.mjs`, `scripts/workforce-smoke.mjs`; all pass at 1280x800, 800x620 and 390x844. Desktop and mobile screenshots were inspected; a clipped mobile gain was fixed and rechecked.

Obols animate independently from state and snap on spending. Actual earnings are sampled per second. Click popups label velocity added; crew work means integrated workforce power over 1.25s, not currency. Effects cap at 16 gain labels, four celebration events, eight nearby helpers and four existing rig representatives. New helpers enter in 1.1s; output drives exertion speed. The existing exact boulder/character positions, signed rotation, themed weather and return sequence are retained, with threshold feedback and a summit banner added. The shop refreshes at most every 250ms during passive play; HUD updates at 80ms; hidden tabs skip canvas rendering.

Limitations: optional atmospheric/camera redesign was not pursued; existing themed backgrounds and movement were reused. Native Electron packaging, audio listening, human playtesting, and a sustained 60 FPS benchmark were not performed. Historical travelled distance cannot be reconstructed from old saves, so its optional counter begins at this update and is labeled accordingly. Saves keep schema 5 and the original key. Nothing was committed, pushed or released.
