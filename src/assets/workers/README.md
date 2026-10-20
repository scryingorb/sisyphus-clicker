# Worker portraits

Original transparent PNG artwork generated with the built-in image_gen tool for this project. Generator and transparency metadata are recorded in [prompts.json](prompts.json). No external image service or runtime dependency is used by the game.

- `restless-shades.png`: hooded pale-blue soul with trailing wisps.
- `condemned-laborers.png`: prisoner in worn linen with broken chains.
- `bronze-automatons.png`: crested bronze mechanical servant with glowing eyes.
- `engines-of-hephaestus.png`: broad bronze gear-and-furnace pushing engine.

`src/worker-art.js` imports the assets so Vite emits local, relative asset URLs for the browser and Electron. Each image displays at 64 x 64 CSS pixels inside a 74 x 74 frame, with pixelated nearest-neighbor rendering. Locked tiers use the same alpha silhouette with a dark filter; the existing run-summit requirement controls reveal. The portraits are decorative alongside the worker's visible name, owned count and unlock requirement.

Verified production build and browser shop at 1280 x 800, 800 x 620 and 390 x 844, including all unlocked portraits, locked silhouettes, image loading, overflow checks and existing purchase/prestige smoke coverage. PNGs retain genuine alpha transparency. Original generation resolution is retained (about 3 MB total). Native Electron launch remains subject to the previously documented local runtime ACL limitation; no packaging, permissions or gameplay changes were made for this visual update.
