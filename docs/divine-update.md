# Divine Combos & Sound Design validation

The audit reused Web Audio synthesis, Defiance, Golden events, the shared simulation integrator, schema 5 saves, and the existing economy harness. No dependencies, samples, currencies, or base progression values were added.

Four permanent Obol unlocks allow two active relics. Atlas unlocks at 5 lifetime summits for 2,500 Obols: during Defiance, add 4% of current workforce climbing speed to manual impulse, then multiply by 1.15. Toll unlocks at 8 for 8,000: newly credited quarter-mountain checkpoints grant Shades 1.2x for 10 seconds, refreshing without stacking. Zeus unlocks at 12 for 25,000: Golden becomes 1.65x clicks and 1.35x workforce; Defiance retains priority. Chronos unlocks at 18 for 100,000: 30 seconds of uninterrupted passive climbing grants 1.1x workforce. Pushing, stopping, returns, or switching resets its charge. Prestige preserves ownership and selection but clears charges.

Chains snapshot real calculation stages and the authoritative total. One bounded sequence presents additive and multiplicative stages with rising tones; rapid pushes compress it. Reduced motion shows the final result immediately. No animation changes simulation timing or awards resources.

Audio initializes on gestures, uses separate Master/SFX gains and a compressor, limits transient voices to six, and rate-limits meaningful coin gains. Muting, zero SFX, inactivity, unavailable APIs, and suspended contexts are covered. All sounds are original synthesis. Browser checks verified running audio contexts and oscillator activity, not subjective sound quality by listening.

## Economy

Same deterministic shopping/click policies as the preceding update; relic runs purchase their chosen relics through actual costs and unlocks. Times are seconds. Full output is reproducible with `node scripts/progression-sim.mjs src test-results/divine-economy.json`.

| Scenario | Baseline finish | Relic finish | Longest purchase gap |
|---|---:|---:|---:|
| Active / Atlas | 8164 | 8213.55 | 135 |
| Automation / Toll + Chronos | 10545.6 | 10428.55 | 150 |
| Active + Golden / Atlas + Zeus | 7956.4 | 8023.8 | 120 |
| Returning / Atlas + Zeus + Golden | 5549.75 | 5346.35 | 105 |
| Late burst, 40 mountains / Toll + Chronos + Golden | 20349.9 | 19785.6 | 510 |

Returning and late comparisons include Golden claims, so gains are not attributable solely to relics. Upfront relic costs slightly delay the first active prestige; ownership then persists. The late purchase gap rises from 480 to 510 seconds. Ordinary first-three mountain times remain 62.1 / 63.3 / 120.7 seconds; first recruitment remains 45 seconds. Legal relic pairs have bounded power and preserve the progression curve.

## Checks

- 72 tests passed, including all six legal relic pairs, exact calculation snapshots, expiration, selection costs, legacy saves, prestige, offline equivalence, eight-hour cap, audio failure/mute behavior, and economy pacing.
- Production build passed using `npm run build -- --configLoader native`.
- Divine, clicker, progression, satisfaction, and UI browser smoke scripts passed at 1280x800, 800x620, and 390x844; no page errors. Screenshots inspected at mobile and compact desktop sizes.
- Browser tests exercise gesture initialization, synthesis activity, SFX silence, relic selection persistence, Atlas chain values, responsive overflow, and reduced-motion settings. No native desktop packaging, auditory quality assessment, or frame-rate benchmark was performed for this update.

No commit, push, or release was performed.
