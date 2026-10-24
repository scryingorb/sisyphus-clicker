# Unified Arcade UI 2.0

The previous stacked layout consumed too much desktop height. The interface now uses a compact HUD, mountain and casino side by side, and a full-width shop dock. Mobile stacks these regions with internal shop scrolling. Existing controls and event hooks are reused.

SPIN x10 records and presents ten independently resolved outcomes, one every 180 ms (about 1.8 seconds total). The final combined reward remains readable, with an expandable breakdown. Reduced motion shows the completed result immediately. Presentation does not delay reward settlement or change odds, prices, or rewards; pending batch presentation supports reloads.

The casino has larger symbols, adjacent spin controls, compact reward calculations, and a brief trail to the boulder for Casino Push. Worker purchases show their improvement next to the price. Notifications stay within the mountain region. Offline worker spin generation remains at the previously implemented 25% rate.

Validation:

- All 120 automated tests passed, including batch versus individual outcome equivalence and restored round snapshots.
- Production build passed.
- Updated browser smoke harness passed at 1920x1080, 1600x900, 1366x768, 1280x800, and 390x844. It checks all ten rapid outcome labels, desktop viewport fit, single-spin STOP, purchases, training, tabs, and reduced motion.
- Rendered screenshots were inspected across all five sizes, including results and mountain completion. Desktop uses internal scrolling for longer shop details and reward calculations; mobile intentionally scrolls vertically.
- An additional legacy casino2 browser regression command was not executed because automatic approval review hit a usage limit. The updated unified-arcade browser suite completed successfully.

Screenshots are saved under `test-results/arcade2-*.png`. No audio-quality or frame-rate benchmark was performed. No commit, push, or release was made.
