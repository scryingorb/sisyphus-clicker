Windows desktop release of Sisyphus Clicker 1.2.2.

### Downloads

- **Sisyphus-Clicker-Setup-1.2.2.exe:** Windows x64 installer with desktop and Start menu shortcuts.
- **Sisyphus-Clicker-Portable-1.2.2.exe:** run directly without installation. Initial extraction may take a few seconds.
- **SHA256SUMS.txt:** checksums for both downloads.

Play offline without Node.js, VS Code, a terminal or a separate server. The executables are unsigned, so Windows may display an unknown-publisher warning. Updates are manual: download and run the new installer. Existing per-user saves are preserved; export a backup through Settings if desired.

### Changes

- Four worker tiers with original transparent pixel portraits and visible hauling equipment.
- Original artwork for ordinary, tier-specific and permanent upgrades, plus actual in-game collectible previews.
- A responsive shop with bulk buying, production previews, locked silhouettes and clear purchase status.
- A stronger manual opening and gradually harder mountains across five distinct environments.
- Suggested mountain goals and previews of summit rewards, unlocks and the next environment.
- Optional prestige after 28 completed climbs per run, with a progress indicator and confirmation. Ordinary summits retain purchases.
- Longer progression: simulated first prestige around 2-4 hours, with faster subsequent runs after spending Divine Favor.
- Offline workforce progress capped at 8 hours, without automatic purchases or prestige.
- Save migration preserves purchases, currency, Divine Favor and previously earned unlocks.

### Validation

The release workflow runs 46 unit tests, builds the Windows installer and portable executable, and checks the packaged desktop game and portable launcher offline before publishing. Tests cover input, momentum, pause, save recovery, settings, summit flow, fullscreen and desktop layout. Installation through the setup wizard itself is not tested.

Production browser checks cover desktop/mobile layouts, artwork, purchase controls and prestige. Pacing figures are simulation estimates, not human playtest results. See the README and balance report for assumptions and save compatibility details.
