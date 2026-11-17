// Emberhold — main: the game loop, canvas sizing, input wiring, and the
// bridge from world events to sound. The world is stepped in fixed slices so
// a slow frame can never jump the simulation.

import { VIEW } from './config.js';
import { Sound } from './audio.js';
import { createWorld, stepWorld } from './world.js';
import { drawWorld } from './render.js';
import { handleClick, handleKey } from './input.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const sound = new Sound();
const world = createWorld(1);
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') || 1) || 1;

let still = false;
if (shotName) {
  const staged = stageShot(shotName, world, seed);
  world.screen = staged.screen;
  still = staged.still;
  document.title = `Emberhold — ${shotName}`;
}

function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
  canvas.style.width = `${Math.floor(VIEW.width * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW.height * scale)}px`;
  canvas.width = VIEW.width * dpr;
  canvas.height = VIEW.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function toGameCoords(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * VIEW.width,
    y: ((event.clientY - rect.top) / rect.height) * VIEW.height,
  };
}

canvas.addEventListener('pointerdown', (event) => {
  const { x, y } = toGameCoords(event);
  handleClick(world, x, y, sound);
});
canvas.addEventListener('pointermove', (event) => {
  const { x, y } = toGameCoords(event);
  world.hover = { x, y };
});
canvas.addEventListener('pointerleave', () => {
  world.hover = null;
});
window.addEventListener('keydown', (event) => {
  if (event.key === ' ') event.preventDefault();
  handleKey(world, event.key, sound);
});
window.addEventListener('resize', fitCanvas);
fitCanvas();

// Sounds are throttled: a volley of towers must never become a wall of noise.
let lastShoot = 0;
let lastCoin = 0;
function playEvents(now) {
  for (const event of world.events) {
    if (event.type === 'shoot') {
      if (now - lastShoot > 0.09) {
        sound.shoot(event.kind);
        lastShoot = now;
      }
    } else if (event.type === 'coin') {
      if (now - lastCoin > 0.15) {
        sound.coin();
        lastCoin = now;
      }
    } else if (event.type === 'die') sound.die();
    else if (event.type === 'leak') sound.leak();
    else if (event.type === 'build') sound.build();
    else if (event.type === 'upgrade') sound.upgrade();
    else if (event.type === 'horn') sound.horn();
    else if (event.type === 'explode') sound.noise({ dur: 0.18, vol: 0.12, freq: 900 });
    else if (event.type === 'waveclear') sound.upgrade();
    else if (event.type === 'win') sound.victory();
    else if (event.type === 'lose') sound.defeat();
    else if (event.type === 'deny') sound.blip({ type: 'square', from: 180, to: 120, dur: 0.09, vol: 0.12 });
  }
  world.events.length = 0;
}

let lastTime = performance.now();
let lastScreen = world.screen;
function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  if (!still) {
    let remaining = dt * world.speed;
    while (remaining > 0) {
      const slice = Math.min(remaining, 1 / 60);
      stepWorld(world, slice);
      remaining -= slice;
    }
    playEvents(now / 1000);
  }
  drawWorld(ctx, world);
  if (world.screen !== lastScreen) {
    lastScreen = world.screen;
    statusEl.textContent =
      world.screen === 'title' ? 'Emberhold: title screen. Press Enter to start.'
      : world.screen === 'win' ? `Victory! Score ${world.score}. Press Enter to play again.`
      : world.screen === 'lose' ? `Defeat on wave ${world.wave}. Press Enter to try again.`
      : `Wave ${Math.max(1, world.wave)} of 10. Gold ${world.gold}, lives ${world.lives}, score ${world.score}.`;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// For automated play-tests (and the maker's screenshots): the live world.
window.__emberhold = { world, sound };
