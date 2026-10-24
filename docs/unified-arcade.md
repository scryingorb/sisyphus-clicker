# Unified arcade interface

The final layout follows the supplied stacked concept: one compact HUD, a panoramic mountain strip, the reel cabinet with SPIN x1 / SPIN x10 directly below it, and a collapsible shop drawer. Desktop uses a bounded single-viewport cabinet; mobile stacks naturally and scrolls. Shop lists scroll internally, with purchase buttons placed immediately below worker headings and training/benefit details expandable.

The existing scene, control IDs and event listeners remain. A single pointer-transparent SVG trail connects the cabinet to the rendered boulder position; reduced motion disables it. Short scenes show the push amount in the cabinet rather than covering the boulder with a label. Batch summaries retain the final spin's five symbols, clearly labeled LAST REELS, alongside the aggregate reward and combination breakdown.

## Offline change requested during implementation

Worker Spin Energy while offline now runs at 25% of its live rate. Live clicking, live workers, existing spin balances, odds, payouts, Casino Push, milestone rewards and the eight-hour cap are unchanged. Ten unupgraded Shades earn 63 spins plus 26.62 fractional energy over eight hours (previously 253 spins). Offline reward settlement still saves once and retains monotonic lastSeen protection. Offline Obols and normal climbing are unchanged.

## Validation

- Full automated suite: 120 tests pass; focused batch/migration tests also pass.
- Production build passes.
- Browser layout checks at 1920x1080, 1600x900, 1366x768, 1280x800, and 390x844: no horizontal overflow; no desktop page scrolling; visible spin controls; individual STOP interaction; single and batch wins; purchase/training access; all shop tabs; shop fold/unfold; reduced motion.
- Existing casino browser regression suite passes: saved rewards, automatic Golden Boulder, milestone spins, STOP controls and reduced motion.
- Actual idle, win, batch and shop screenshots inspected; files: test-results/unified-*.png.

At smaller desktop heights, shop details and longer calculations use internal scrolling. Mobile intentionally uses page scrolling. No audio-quality or sustained-FPS benchmark was performed. No commit, push or release.

Reproduce: npm.cmd test; npm.cmd run build; node scripts/unified-arcade-smoke.mjs; node scripts/casino2-smoke.mjs.
