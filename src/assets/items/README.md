# Purchase artwork

Original artwork generated using OpenAI's built-in image generator. Exact prompts and original output locations are recorded in `prompts.json`. `scripts/prepare-item-art.mjs` prepares transparent 64x64 PNGs with nearest-neighbor sampling; the shop displays them at 48x48 using pixelated rendering. All runtime images are bundled by Vite. Original full-size generation outputs remain outside the bundle.

| Definition | Local asset |
| --- | --- |
| Calloused Hands | calloused-hands.png |
| Bronze Cleats | bronze-cleats.png |
| Underworld Overseer | underworld-overseer.png |
| Stygian Bindings | stygian-bindings.png |
| Hauling Discipline | hauling-discipline.png |
| Precision Gearing | precision-gearing.png |
| Divine Bellows | divine-bellows.png |
| Titan Grip | titan-grip.png |
| Eternal Workforce | eternal-workforce.png |
| Charon's Bargain | charons-bargain.png |
| Unbroken Defiance | unbroken-defiance.png |

`src/item-art.js` maps these definitions by category and index. Repeatable levels reuse their item's image and show the level as text. Tier upgrades require ownership; unaffordable unlocked purchases keep full-color art.

The four worker definitions retain their original portraits in `src/assets/workers`, mapped by `src/worker-art.js`. Equipment stages are earned from ownership, not separate purchases; they retain the existing in-scene equipment drawings. The purchasable tier improvements have the four dedicated tool assets above.

Collection definitions (`stone`, `obsidian`, `gold`, `linen`, `ash`, `royal`) are summit unlocks rather than purchases. `collectionPreview` renders a cached transparent 80x80 PNG from the same `GameScene.boulder` and `GameScene.character` routines used in play, including the selected cosmetic. No substitute symbols or extra network assets are used.

Coverage: `test/feedback.test.js` checks every purchase mapping and PNG dimensions; `scripts/ui-smoke.mjs` decodes images in the production bundle, checks transparency and pixelated rendering, and verifies all six distinct collectible previews and locked states.
