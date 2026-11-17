# Emberhold

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/kobe258174/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/kobe258174/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Hold the last Ember against the Hollow King's march.** A tower defence game that runs entirely in your browser: no build step, no network, no downloads — just static files and a canvas.

The shadows walk a winding road toward the Ember. Build towers on the stone plots, upgrade them, sell them when the plan changes, and survive all 10 waves. The Hollow King himself comes at the end.

## How to play

- **Goal:** don't let the shadows reach the Ember. You have 20 lives; each shadow that slips through costs lives.
- **Build:** click a tower card at the bottom (or press `1`, `2`, `3`), then click a stone plot.
  - **Spark Spire** (60g) — fast bolts, single target.
  - **Frost Lantern** (80g) — chills the march, slowing everything it hits (Shades and the King don't care).
  - **Ember Mortar** (120g) — slow lobbed shells that splash.
- **Manage:** click one of your towers to upgrade it (up to level 3) or sell it back for 70%.
- **Waves:** press `Space` or the Start Wave button. Clearing a wave pays a bonus; kills pay bounties.
- **Controls:** mouse to build and select · `1`/`2`/`3` pick a tower · `Space` starts a wave · `F` fast-forward (2x) · `P` pause · `M` mute · `R` restart.
- **Win:** clear Wave 10. **Lose:** the Ember's lives hit zero.

## Run it

```sh
node serve.ts
# open http://localhost:8080 in desktop Chrome
```

Or open `game/index.html` from any static file server. The game needs no network: every script, sound (synthesized with WebAudio) and pixel is a file under `game/` or drawn on the canvas.

## Layout

- `game/` — the game itself: `index.html` plus `src/` (one job per file: `config.js` tuning, `world.js` rules, `input.js` controls, `render.js` drawing, `audio.js` synthesized sound, `shots.js` screenshot scenes, `main.js` loop).
- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to `/output` and writes `dossier.json` (Node 22, standard library only).
- `screenshots/` — 3–4 real renders of the game (title, play, victory, defeat).
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

## Screenshots

The shots are staged by the game's own code (`game/src/shots.js`): `?shot=start|play|win|end&seed=1` replays the real rules with a build bot, so every frame is what a real game looks like.

---

<sub>Entered on [make.fun](https://make.fun/?ref=x9f1j2w7&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
