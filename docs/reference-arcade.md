# Reference-driven arcade composition

The live canvas now fills the desktop viewport. A translucent top HUD, lower-center gold casino cabinet, collapsible right-side shop, and lower-left PUSH/Defiance controls overlay that world. Mobile retains the accessible stacked layout.

The camera places the route above the cabinet and keeps the summit visible. Canvas additions include dark cliff facets, warm animated path lamps, and summit temple geometry. Existing characters, workers, environmental themes, movement and reward hooks remain live. The screenshot is not used as a background.

The cabinet uses metallic borders, side pillars, a raised ornamental marquee and illuminated five-reel windows. Both spin buttons and individual STOP controls are retained. SPIN x10 still presents ten authoritative outcomes in approximately 1.8 seconds. Reward duration and calculations are unchanged. Compact calculations scroll internally.

The shop retains all four tabs and quantity controls. Worker cards use original portraits, readable prices, purchase improvements and expandable details. Collapsing the shop leaves an immediate reopen control.

## Screenshot comparison

The first 1920x1080 pass established the full-scene composition. Five differences guided the next pass: overly bright/flat terrain, sparse cabinet ornament, missing HUD crests, oversized worker cards, and a detached reward label. Added shaded facets and lamps, gold cabinet ornaments, resource emblems, compact card detail columns, and boulder-relative reward positioning. Subsequent laptop checks found and corrected marquee/energy overlap and insufficient calculation space.

The composition is substantially closer, but it is not a pixel-exact recreation of the generated reference. The existing procedural landscape and characters remain simpler; sculpted statues, dense painted architecture, foliage and cinematic lighting are not reproduced exactly. No FPS or audio-quality benchmark was performed.

## Validation

- All 120 automated tests passed; production build passed.
- Browser harness covers 1920x1080, 1600x900, 1366x768, 1280x800 and 390x844, including single-spin STOP, ten rapid results, purchases, training, tabs, shop collapse, reduced motion and summit notification.
- Added full-viewport mountain, lower floating cabinet, calculation-height and marquee-clearance assertions.
- Rendered screenshots inspected and iterated, stored as `test-results/reference-*.png`.
- Economy, save schema, odds, rewards, offline generation and settlement logic were not changed. No commit, push or release.
