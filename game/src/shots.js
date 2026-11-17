// Emberhold — screenshot scenes behind ?shot=start|play|win|end&seed=N.
// Each scene plays the real rules forward from a fresh world for a fixed
// number of steps, steered by a build bot that buys and upgrades towers in a
// set order, so the frame is what a real game looks like and the same seed
// always gives the same frame.

import { resetWorld, startWave, placeTower, upgradeTower, stepWorld, towerAtPlot } from './world.js';

// The bot's build order: [action, plot index, tower kind].
// Plots: 2 (300,210) and 3 (480,210) cover the top road; 7 (300,380) and
// 8 (480,380) cover the middle and bottom roads; 5 (860,210) watches the
// right-hand bend, where a mortar's long reach pays.
// Plot indices are 0-based: 2 (480,210) and 7 (480,380) each cover two
// stretches of road; 6 (300,380) covers the middle and bottom roads;
// 4 (860,210) watches the right-hand bend, where a mortar's reach pays.
const BUILD_PLAN = [
  ['build', 2, 'spark'],
  ['build', 7, 'spark'],
  ['build', 1, 'spark'],
  ['build', 6, 'frost'],
  ['build', 4, 'mortar'],
  ['upgrade', 2, 'spark'],
  ['upgrade', 7, 'spark'],
  ['build', 3, 'spark'],
  ['upgrade', 6, 'frost'],
  ['build', 9, 'mortar'],
  ['upgrade', 4, 'mortar'],
  ['build', 8, 'spark'],
  ['upgrade', 3, 'spark'],
  ['build', 5, 'frost'],
  ['upgrade', 9, 'mortar'],
  ['upgrade', 8, 'spark'],
  ['upgrade', 1, 'spark'],
  ['build', 0, 'spark'],
  ['upgrade', 2, 'spark'],
  ['upgrade', 7, 'spark'],
  ['upgrade', 5, 'frost'],
];

/** Buy every affordable next step of the plan, in order. */
function botBuild(world) {
  for (const [action, plot, kind] of BUILD_PLAN) {
    const tower = towerAtPlot(world, plot);
    if (action === 'build') {
      if (!tower) placeTower(world, plot, kind);
    } else if (tower && tower.kind === kind && tower.level < 3) {
      upgradeTower(world, tower);
    }
  }
}

const STEP = 1 / 60;

/** Run the bot until `done(world)` is true or `maxSteps` pass. */
function runBot(world, done, maxSteps = 240000, build = true) {
  for (let i = 0; i < maxSteps; i += 1) {
    if (world.screen !== 'play') break;
    if (!world.waveActive) {
      if (build) botBuild(world);
      if (world.screen === 'play') startWave(world);
    }
    stepWorld(world, STEP);
    if (done(world)) break;
  }
  return world;
}

/**
 * Set `world` to the named scene and return the screen to draw over it.
 * Any name other than play/win/end is the title scene.
 */
export function stageShot(name, world, seed = 1) {
  resetWorld(world, seed);
  if (name === 'play') {
    runBot(world, (w) => w.wave === 4 && w.enemies.length >= 6 && w.spawnElapsed > 5);
    return { screen: 'play', still: true };
  }
  if (name === 'win') {
    runBot(world, (w) => w.screen === 'win');
    return { screen: world.screen, still: true };
  }
  if (name === 'end') {
    // No towers at all: the march walks straight through to the Ember.
    runBot(world, (w) => w.screen === 'lose', 120000, false);
    return { screen: world.screen, still: true };
  }
  // Title: let the Ember breathe for a few seconds behind the menu.
  world.screen = 'title';
  for (let i = 0; i < 5 / STEP; i += 1) stepWorld(world, STEP);
  world.banner = null;
  return { screen: 'title', still: true };
}
