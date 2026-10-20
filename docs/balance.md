# Mountain progression and prestige: measured balance

These are deterministic simulation estimates, not human playtesting. The responsive opening takes priority; the secondary first-prestige target is 2-4 hours. Updated 2026-10-18.

## Prestige is a run milestone

**Complete 28 climbs in the current run to unlock optional prestige.** Summits award Obols and advance automatically; they never prestige, erase purchases or award Favor automatically. The Gods tab shows completed/required climbs, remaining climbs, the expected reward and a disabled control until eligible. At 28 climbs, review and explicitly confirm to receive 8 Favor. Continuing farther increases the reward. Prestige resets the run counter, so another 28 climbs are needed in the next run. Lifetime climbs do not bypass this gate.

Compatibility exception: an older save that had already earned the former 15-climb eligibility retains that eligibility for its current run only. Its next run uses 28. This preserves an already-earned unlock.

## Reproducible assumptions

50ms shared integrator. Opening: 1 click/s; relaxed continues 1/s, burst uses 2/s for 5s every 45s after recruitment, automation stops clicking after recruitment. Shop every 15s: manual upgrade then Shade, then displayed >=1% output gain per Obol, saving at most 30s income. Imperfect variant shops every 20s, buys affordable singles, takes second-best value where possible. Second run spends 6 Favor on workforce and 2 on earnings. Durations include automatic 2.9s return; unaided tests start each mountain from rest with no upgrades or Defiance.

A meaningful purchase adds at least 1% total workforce power; the opening manual upgrade and first worker also count. Only one purchase per shop visit is made. Bulk quotes include the actual milestone and cross-tier effects. There is no future-tier foresight or frame-perfect spending. Defiance follows real pushes and cooldowns; automation does not activate it after recruitment. The first worker can arrive near the end of mountain 1, so the identical first-summit times in several scenarios are intentional.

Run `node scripts/progression-sim.mjs` for the shared harness plus assertions; `node scripts/mountain-sim.mjs` writes the full measurement without target assertions. Both write `test-results/mountains-after.json`, including every summit and purchase. `node scripts/mountain-sim.mjs <module-directory> <output.json>` can measure a preserved baseline under identical assumptions.

## Before / after

The pre-revision modules were captured in `test-results/mountain-baseline` before edits and measured in `test-results/mountains-before.json`. With the same one-click-per-second opening, all baseline strategies stall before the first purchase or summit. The harness stops after 30 minutes without higher progress; this is a stall report, not an infinite-time estimate. No first-five or prestige times are therefore available for that baseline. Earlier 2-click-per-second balance results are not directly comparable and are superseded.

A single opening push after one second moved 0.296 m (0.296% of the old slope); now it moves 2.658 m (1.131%). The change increases actual impulse, not just currency. Falls still cost only height; re-crossing old height cannot farm Obols.

## First five mountains

Each cell is **individual duration / cumulative time**. Durations include the automatic return. Purchases can shorten a particular mountain even though its fixed-workforce difficulty rises.

| Scenario | Mountain 1 | Mountain 2 | Mountain 3 | Mountain 4 | Mountain 5 |
| --- | --- | --- | --- | --- | --- |
| Steady 1 click/s | 0:00:46 / 0:00:46 | 0:01:13 / 0:01:59 | 0:02:30 / 0:04:28 | 0:04:56 / 0:09:24 | 0:05:14 / 0:14:38 |
| Short clicking bursts | 0:00:46 / 0:00:46 | 0:02:12 / 0:02:58 | 0:03:52 / 0:06:50 | 0:07:44 / 0:14:35 | 0:06:28 / 0:21:03 |
| Automation after recruitment | 0:00:46 / 0:00:46 | 0:03:22 / 0:04:08 | 0:04:50 / 0:08:58 | 0:09:36 / 0:18:34 | 0:07:41 / 0:26:15 |
| Imperfect purchasing, 1 click/s | 0:00:49 / 0:00:49 | 0:01:12 / 0:02:01 | 0:02:29 / 0:04:29 | 0:05:40 / 0:10:10 | 0:05:20 / 0:15:30 |
| Second run, short bursts | 0:00:46 / 0:00:46 | 0:01:36 / 0:02:21 | 0:02:24 / 0:04:45 | 0:04:21 / 0:09:06 | 0:03:10 / 0:12:16 |

## Full runs

| Scenario | Prestige | Favor | Purchases | Longest meaningful purchase gap |
| --- | --- | --- | --- | --- |
| Steady 1 click/s | 2:25:40 | 8 | 142 | 0:02:15 |
| Short clicking bursts | 2:46:37 | 8 | 142 | 0:02:45 |
| Automation after recruitment | 3:09:55 | 8 | 142 | 0:03:15 |
| Imperfect purchasing, 1 click/s | 3:01:36 | 8 | 159 | 0:02:00 |
| Second run, short bursts | 1:37:04 | 8 | 137 | 0:02:30 |

Spending the first 8 Favor on two workforce levels and one earnings level makes the burst second run 41.7% faster. No scenario stalled. Opening purchases are 15s/45s (upgrade/worker); the imperfect strategy buys at 20s/40s.

## Major unlocks and milestones in the burst first run

| Event | Time |
| --- | --- |
| first upgrade | 0:00:15 |
| first worker | 0:00:45 |
| unlock Condemned Laborers | 0:14:35 |
| Restless Shades x10 | 0:18:15 |
| first Condemned Laborers | 0:30:45 |
| Restless Shades x25 | 0:36:30 |
| unlock Bronze Automatons | 0:46:54 |
| Condemned Laborers x10 | 0:47:30 |
| first Bronze Automatons | 0:49:45 |
| Bronze Automatons x10 | 1:19:00 |
| Condemned Laborers x25 | 1:32:30 |
| unlock Engines of Hephaestus | 1:33:01 |
| first Engines of Hephaestus | 1:35:00 |
| Engines of Hephaestus x10 | 2:06:15 |
| Bronze Automatons x25 | 2:20:45 |

## Slowdowns and isolated workforce

The first five show deliberate growing difficulty. A new worker tier or ownership milestone can still make the next mountain quicker. Fixed-workforce work (distance times resistance) increases across all tested transitions, including environment resets. It is not a promise that every player clear time doubles.

| Scenario | Longest individual climb | Largest adjacent duration ratio |
| --- | --- | --- |
| Steady 1 click/s | Mountain 28: 0:07:24 | 2.06x, mountain 2 to 3 |
| Short clicking bursts | Mountain 28: 0:08:16 | 2.88x, mountain 1 to 2 |
| Automation after recruitment | Mountain 4: 0:09:36 | 4.41x, mountain 1 to 2 |
| Imperfect purchasing, 1 click/s | Mountain 24: 0:09:36 | 2.29x, mountain 3 to 4 |
| Second run, short bursts | Mountain 28: 0:04:58 | 2.08x, mountain 1 to 2 |

One untrained Shade from rest, with no clicking, upgrades or Defiance, completes the opening in 0:03:22; two take 0:01:44. Baseline one-Shade opening was 0:03:08. The new longer introductory distance slightly lengthens the isolated-worker case, while enabling a much stronger manual opening. These isolated tests deliberately never buy anything, so later mountains are slow:

| Mountain | One Shade | Two Shades |
| --- | --- | --- |
| 1 | 0:03:22 | 0:01:44 |
| 2 | 0:05:57 | 0:03:01 |
| 3 | 0:22:03 | 0:11:04 |
| 4 | 1:21:52 | 0:40:59 |
| 5 | 3:15:06 | 1:37:36 |

## Offline: 24-hour absence, 8-hour earnings cap

Snapshots come from the burst first run. Offline uses the owned workforce and exact same reward economy, without an earnings penalty, automatic purchases, automatic prestige or continuous Defiance. Existing boost time expires normally. Worker order is Shades / Laborers / Automatons / Engines.

| Stage | Departure | Workers | Summits before -> after | New Obols | Next ascent | Available Favor |
| --- | --- | --- | --- | --- | --- | --- |
| Early | 0:02:58 | 3 / 0 / 0 / 0 | 2 -> 6 | 9,513.03 | 96.2% | 0 |
| Middle | 0:58:05 | 32 / 12 / 4 / 0 | 12 -> 20 | 1,539,735.28 | 14.3% | 0 |
| Late | 2:19:30 | 35 / 30 / 24 / 12 | 24 -> 34 | 28,451,466.49 | 42.3% | 10 |

## Curve and economy configuration

- First five distances: 235, 400, 1,300, 4,000 and 7,500 m. Beyond that, with `n = runSummits`, `b = n - 4`: distance is `7500 * (1 + .28*b + .035*b*b) * 1.12^b` (finite safety caps apply). Resistance is terrain times `1 + .05*n*n + .18*max(0,n-4)^2`.
- Environment changes every summit through ruined terraces, volcanic cones, chainbound pillars, glaciers and floating temples. Geometry and ground materials differ, with sparse ash/snow/wind and static reduced-motion placement. Movement uses the same ridge for the character, boulder and crews.
- Environmental gravity and terrain penalties ramp linearly through mountain 13. Full extra terrain resistance is 0%, 4%, 8%, 6%, 12%; unlike the old stronger cyclic penalties, these cannot cause a difficulty drop when a cycle wraps.
- Manual impulse is 4.8 before upgrades, scaled to mountain distance. Shades produce 1.2 power each. Other worker power remains 8 / 80 / 900. Manual pushes remain useful alongside workers.
- First five new-height rewards total 105 / 180 / 300 / 500 / 800 Obols before divine earnings. Thereafter the per-metre rate rises from .25 toward .65. Rewards are tied to newly earned height only. This curbs an early currency snowball while retaining a positive workforce income.
- Summit bonus remains `24 * (1 + .35*n + .06*n^3)`, with divine earnings applied. Worker unlocks are 0 / 4 / 10 / 17 run summits; costs 65 / 900 / 6,000 / 40,000; growth 1.13 / 1.145 / 1.16 / 1.175.
- Training, cross-tier support, repeatable upgrades and ownership bonuses remain available between tier unlocks. Ownership doubles at 10 / 25 / 50 / 100; visual equipment changes at 10 / 25.
- Prestige grants `floor(8 * (runSummits / requirement)^1.5)` Favor once eligible. Neither clearing a mountain nor offline settlement executes prestige.

## Goals, permanent rewards and saves

The persistent goal panel offers a nonmandatory useful purchase for each early mountain. Its expandable preview separates Obols, purchase access, cosmetic unlocks and story discoveries, and states the next environment, distance, resistance, reward and absence of any entry fee. The summit banner reports only the reward actually settled. Goals do not grant a second payout.

Permanent cosmetics unlock at lifetime climbs 1 (Obsidian Heart), 4 (Ashen Mantle), 14 (Sunken Gold), 22 (Defiant Purple). Stories arrive at 1 / 3 / 8 / 18. Base stone and linen remain available. Cosmetic/story rewards are once-only unlocks, retained after prestige; worker access still requires purchasing the worker.

Schema 5 preserves balances, Favor, workers, upgrades, lifetime counters, normalized climb/high-water progress, old earned worker/prestige eligibility, and old cosmetic/story thresholds (including unequipped collectibles). Save/load, return recovery and offline settlement do not duplicate rewards. New difficulty does not transform partial height into a free summit. The 8-hour cap remains 28,800 seconds.

## Verification and limitations

- 46 unit tests pass, including 28-climb gates in each new run, no implicit prestige on summit, migration, reward idempotence, positive worker-only progress, shared live/offline physics and monotonic fixed-workforce difficulty.
- Pacing assertions pass for the opening windows, 2-4-hour first runs, automation, faster second run, purchase gaps under five minutes and the 8-hour cap.
- Production build passes with `npm.cmd run build -- --configLoader native`.
- Progression, workforce, purchase-artwork/UI and mountain browser smoke suites pass using built assets in isolated Chrome profiles at 1280x800, 800x620 and 390x844. Screenshots of all five desktop environments, mobile shop, compact layout, artwork and locked prestige were visually inspected. Locked/available artwork, transparent backgrounds, cosmetic previews, purchase controls, pause and reduced motion remain covered.
- Native source Electron was retried on 2026-10-18 and failed before the game opened: `FATAL:electron\shell\browser\win\install_dir_access.cc:52`. The runtime directory has an AppContainer package SID ACL entry but lacks `ALL APPLICATION PACKAGES`, so Windows denies the sandbox access. No ACL or sandbox workaround was applied. Native window and audio listening checks remain unverified.
- Human playtesting remains necessary, especially the feel of late-game waits and different buying choices. Estimates do not establish universal player times. No new release artifacts were packaged or published.

Release follow-up (2026-10-20): [version 1.2.2](https://github.com/scryingorb/sisyphus-clicker/releases/tag/v1.2.2) now includes the updated Windows installer and portable executable. The [Windows release workflow](https://github.com/scryingorb/sisyphus-clicker/actions/runs/39389235147) passed all 46 unit tests and native packaged/portable checks. This resolves release validation independently of the local runtime ACL limitation above. The setup wizard and manual audio listening remain untested.
