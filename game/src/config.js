// Emberhold — configuration: field, path, build plots, towers, enemies, waves.
// Everything the game tunes lives here; the rules in world.js read only this file.

export const VIEW = { width: 960, height: 600 };
export const HUD_HEIGHT = 56;
export const SHOP_HEIGHT = 60;
export const FIELD_TOP = HUD_HEIGHT;
export const FIELD_BOTTOM = VIEW.height - SHOP_HEIGHT;

// The road the shadows walk, as waypoints. The Ember sits at the end of it.
export const PATH = [
  { x: -40, y: 140 },
  { x: 740, y: 140 },
  { x: 740, y: 300 },
  { x: 220, y: 300 },
  { x: 220, y: 460 },
  { x: 1000, y: 460 },
];
export const PATH_WIDTH = 44;
export const EMBER = { x: 920, y: 460, radius: 26 };

// Fixed build plots: stone circles on the grass, clear of the road.
export const PLOTS = [
  { x: 120, y: 210 }, { x: 300, y: 210 }, { x: 480, y: 210 }, { x: 640, y: 210 }, { x: 860, y: 210 },
  { x: 120, y: 380 }, { x: 300, y: 380 }, { x: 480, y: 380 }, { x: 640, y: 380 }, { x: 860, y: 380 },
];
export const PLOT_RADIUS = 24;

// Starting resources.
export const START_GOLD = 160;
export const START_LIVES = 20;
export const MAX_WAVE = 10;
export const SELL_RATE = 0.7;

// One entry per tower kind; levels are arrays indexed 0..2 (level 1..3).
// cost[i] is the price to build (i = 0) or to upgrade to that level.
export const TOWERS = {
  spark: {
    name: 'Spark Spire',
    short: 'Spark',
    key: '1',
    blurb: 'Fast bolts, single target',
    color: '#ffd166',
    cost: [75, 70, 110],
    damage: [11, 20, 34],
    rate: [2.0, 2.4, 2.8],
    range: [130, 140, 150],
    projectileSpeed: 520,
  },
  frost: {
    name: 'Frost Lantern',
    short: 'Frost',
    key: '2',
    blurb: 'Chills and slows the march',
    color: '#7dd3fc',
    cost: [100, 85, 130],
    damage: [4, 8, 16],
    rate: [1.2, 1.3, 1.5],
    range: [120, 130, 145],
    slowPct: [0.45, 0.55, 0.65],
    slowDuration: 1.4,
    projectileSpeed: 420,
  },
  mortar: {
    name: 'Ember Mortar',
    short: 'Mortar',
    key: '3',
    blurb: 'Slow lobbed shells, splash',
    color: '#fb923c',
    cost: [150, 135, 190],
    damage: [34, 60, 110],
    rate: [0.7, 0.75, 0.85],
    range: [170, 180, 195],
    splash: [55, 65, 80],
    projectileSpeed: 260,
  },
};
export const TOWER_ORDER = ['spark', 'frost', 'mortar'];

// Enemy kinds. hp is multiplied by waveHpMult(wave) when a wave spawns.
export const ENEMIES = {
  wisp:   { name: 'Wisp',    hp: 46,   speed: 55, bounty: 6,   lives: 1,  radius: 10, color: '#e0f2fe', slowImmune: false },
  skitter:{ name: 'Skitter', hp: 21,   speed: 95, bounty: 4,   lives: 1,  radius: 8,  color: '#bef264', slowImmune: false },
  brute:  { name: 'Brute',   hp: 240,  speed: 32, bounty: 13,  lives: 2,  radius: 15, color: '#fda4af', slowImmune: false },
  shade:  { name: 'Shade',   hp: 105,   speed: 60, bounty: 9,  lives: 1,  radius: 11, color: '#c4b5fd', slowImmune: true },
  boss:   { name: 'Hollow King', hp: 2100, speed: 26, bounty: 120, lives: 10, radius: 24, color: '#f0abfc', slowImmune: true },
};

/** Enemy hit points scale with the wave, so the march keeps threatening. */
export function waveHpMult(wave) {
  return 1 + 0.28 * (wave - 1);
}

/** Gold for clearing a wave, on top of kill bounties. */
export function waveClearBonus(wave) {
  return 20 + 4 * wave;
}

// Waves: groups spawn in order; `at` is the delay in seconds after the wave
// starts, `gap` the seconds between spawns inside the group.
export const WAVES = [
  { groups: [{ type: 'wisp', count: 8, gap: 0.9, at: 0 }] },
  { groups: [
    { type: 'wisp', count: 10, gap: 0.8, at: 0 },
    { type: 'skitter', count: 6, gap: 0.5, at: 6 },
  ] },
  { groups: [
    { type: 'skitter', count: 10, gap: 0.45, at: 0 },
    { type: 'wisp', count: 8, gap: 0.7, at: 5 },
    { type: 'brute', count: 2, gap: 2.0, at: 12 },
  ] },
  { groups: [
    { type: 'wisp', count: 12, gap: 0.6, at: 0 },
    { type: 'brute', count: 4, gap: 1.6, at: 6 },
    { type: 'shade', count: 4, gap: 1.0, at: 12 },
  ] },
  { groups: [
    { type: 'brute', count: 6, gap: 1.4, at: 0 },
    { type: 'skitter', count: 14, gap: 0.35, at: 5 },
    { type: 'shade', count: 6, gap: 0.9, at: 10 },
  ] },
  { groups: [
    { type: 'shade', count: 13, gap: 0.7, at: 0 },
    { type: 'wisp', count: 20, gap: 0.4, at: 4 },
    { type: 'brute', count: 8, gap: 1.1, at: 10 },
  ] },
  { groups: [
    { type: 'skitter', count: 26, gap: 0.28, at: 0 },
    { type: 'brute', count: 10, gap: 1.0, at: 6 },
    { type: 'shade', count: 10, gap: 0.65, at: 12 },
  ] },
  { groups: [
    { type: 'brute', count: 12, gap: 0.9, at: 0 },
    { type: 'shade', count: 15, gap: 0.55, at: 6 },
    { type: 'wisp', count: 22, gap: 0.35, at: 12 },
  ] },
  { groups: [
    { type: 'skitter', count: 30, gap: 0.25, at: 0 },
    { type: 'shade', count: 17, gap: 0.5, at: 6 },
    { type: 'brute', count: 12, gap: 0.85, at: 12 },
  ] },
  { groups: [
    { type: 'boss', count: 1, gap: 1.0, at: 0 },
    { type: 'shade', count: 12, gap: 0.7, at: 8 },
    { type: 'brute', count: 10, gap: 0.9, at: 16 },
    { type: 'skitter', count: 16, gap: 0.35, at: 24 },
  ] },
];

// Presentation.
export const PALETTE = {
  bg: '#0b1026',
  bg2: '#111838',
  grass: '#101a33',
  path: '#2a3358',
  pathEdge: '#3d4a7a',
  plot: '#1c2748',
  plotEdge: '#43538f',
  ember: '#ffb703',
  emberCore: '#fff3c4',
  gold: '#ffd166',
  lives: '#fb7185',
  panel: '#141c3d',
  panelEdge: '#2e3a6b',
  text: '#e8ecff',
  dim: '#93a0c8',
};
