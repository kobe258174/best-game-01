// Emberhold — input: mouse and keyboard, and the UI rectangles both the
// renderer draws and this file hit-tests, so the two can never drift apart.

import {
  EMBER, PLOTS, PLOT_RADIUS, TOWER_ORDER, TOWERS, VIEW,
} from './config.js';
import {
  placeTower, resetWorld, sellTower, startWave, towerAtPlot, upgradeCost, upgradeTower,
} from './world.js';

const HUD_H = 56;
const SHOP_Y = VIEW.height - 60;

/** Every clickable rectangle, from the current state. */
export function uiRects(world) {
  const rects = {
    startBtn: { x: VIEW.width - 380, y: 10, w: 150, h: 36, label: world.wave >= 10 ? 'Victory!' : (world.waveActive ? `Wave ${world.wave}` : (world.wave === 0 ? 'Start Wave 1' : `Start Wave ${world.wave + 1}`)), enabled: !world.waveActive && world.screen === 'play' && !world.paused && world.wave < 10 },
    speedBtn: { x: VIEW.width - 220, y: 10, w: 54, h: 36, label: `${world.speed}x` },
    pauseBtn: { x: VIEW.width - 156, y: 10, w: 40, h: 36, label: world.paused ? '▶' : '❚❚' },
    soundBtn: { x: VIEW.width - 106, y: 10, w: 40, h: 36, label: world.muted ? '🔇' : '🔊' },
    restartBtn: { x: VIEW.width - 56, y: 10, w: 40, h: 36, label: '↺' },
    cards: [],
    panel: null,
    bigBtn: null,
  };
  if (world.screen === 'title') {
    rects.bigBtn = { x: VIEW.width / 2 - 130, y: 408, w: 260, h: 56, label: 'Start the defence' };
  } else if (world.screen === 'win' || world.screen === 'lose') {
    rects.bigBtn = { x: VIEW.width / 2 - 130, y: 430, w: 260, h: 56, label: 'Play again' };
  } else if (world.screen === 'play') {
    const selected = world.selectedPlot >= 0 ? towerAtPlot(world, world.selectedPlot) : null;
    if (selected) {
      const def = TOWERS[selected.kind];
      const cost = upgradeCost(selected);
      rects.panel = {
        x: 16, y: SHOP_Y, w: VIEW.width - 32, h: 52,
        tower: selected,
        upgradeBtn: cost === null ? null : { x: VIEW.width - 320, y: SHOP_Y + 8, w: 150, h: 36, label: `Upgrade ${cost}g` },
        sellBtn: { x: VIEW.width - 158, y: SHOP_Y + 8, w: 110, h: 36, label: 'Sell' },
        closeBtn: { x: VIEW.width - 40, y: SHOP_Y + 8, w: 28, h: 36, label: '✕' },
        name: `${def.name} · Lv ${selected.level}`,
      };
    } else {
      const cardW = 220;
      TOWER_ORDER.forEach((kind, i) => {
        rects.cards.push({
          kind,
          rect: { x: 16 + i * (cardW + 10), y: SHOP_Y, w: cardW, h: 52 },
        });
      });
    }
  }
  return rects;
}

function inside(x, y, r) {
  return r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function plotAt(x, y) {
  for (let i = 0; i < PLOTS.length; i += 1) {
    if (Math.hypot(x - PLOTS[i].x, y - PLOTS[i].y) <= PLOT_RADIUS + 8) return i;
  }
  return -1;
}

function deny(world) {
  world.events.push({ type: 'deny' });
}

/** Handle a click at canvas coordinates. */
export function handleClick(world, x, y, sound) {
  sound.unlock();
  const rects = uiRects(world);

  if (world.screen === 'title') {
    if (inside(x, y, rects.bigBtn) || true) {
      // Any click on the title starts the game.
      resetWorld(world, (Math.random() * 1e9) | 0);
      sound.startMusic();
    }
    return;
  }
  if (world.screen === 'win' || world.screen === 'lose') {
    if (inside(x, y, rects.bigBtn)) {
      resetWorld(world, (Math.random() * 1e9) | 0);
      sound.startMusic();
    }
    return;
  }

  // HUD buttons.
  if (inside(x, y, rects.startBtn)) {
    if (rects.startBtn.enabled) startWave(world);
    return;
  }
  if (inside(x, y, rects.speedBtn)) {
    world.speed = world.speed === 1 ? 2 : 1;
    sound.click();
    return;
  }
  if (inside(x, y, rects.pauseBtn)) {
    world.paused = !world.paused;
    sound.click();
    return;
  }
  if (inside(x, y, rects.soundBtn)) {
    world.muted = !world.muted;
    sound.setMuted(world.muted);
    return;
  }
  if (inside(x, y, rects.restartBtn)) {
    resetWorld(world, (Math.random() * 1e9) | 0);
    return;
  }

  // Selected-tower panel.
  if (rects.panel) {
    const panel = rects.panel;
    if (panel.upgradeBtn && inside(x, y, panel.upgradeBtn)) {
      if (!upgradeTower(world, panel.tower)) deny(world);
      return;
    }
    if (inside(x, y, panel.sellBtn)) {
      sellTower(world, panel.tower);
      return;
    }
    if (inside(x, y, panel.closeBtn)) {
      world.selectedPlot = -1;
      return;
    }
    return;
  }

  // Shop cards: pick a tower kind to place.
  for (const card of rects.cards) {
    if (inside(x, y, card.rect)) {
      world.placeKind = world.placeKind === card.kind ? null : card.kind;
      world.selectedPlot = -1;
      sound.click();
      return;
    }
  }

  // Field: plots first, then the Ember and empty grass.
  const plot = plotAt(x, y);
  if (plot >= 0) {
    const tower = towerAtPlot(world, plot);
    if (world.placeKind) {
      if (tower) {
        world.selectedPlot = plot;
        world.placeKind = null;
      } else if (placeTower(world, plot, world.placeKind)) {
        world.placeKind = null;
      } else {
        deny(world);
      }
    } else if (tower) {
      world.selectedPlot = plot;
    } else {
      world.selectedPlot = -1;
    }
    return;
  }
  if (Math.hypot(x - EMBER.x, y - EMBER.y) <= EMBER.radius + 10) {
    world.selectedPlot = -1;
    world.placeKind = null;
    return;
  }
  world.selectedPlot = -1;
  world.placeKind = null;
}

/** Handle a key press. `key` is the KeyboardEvent key. */
export function handleKey(world, key, sound) {
  sound.unlock();
  const k = key.toLowerCase();
  if (world.screen === 'title' && (k === 'enter' || k === ' ')) {
    resetWorld(world, (Math.random() * 1e9) | 0);
    sound.startMusic();
    return;
  }
  if ((world.screen === 'win' || world.screen === 'lose') && (k === 'enter' || k === ' ' || k === 'r')) {
    resetWorld(world, (Math.random() * 1e9) | 0);
    sound.startMusic();
    return;
  }
  if (world.screen !== 'play') return;
  if (k === '1' || k === '2' || k === '3') {
    const kind = TOWER_ORDER[Number(k) - 1];
    world.placeKind = world.placeKind === kind ? null : kind;
    world.selectedPlot = -1;
    sound.click();
  } else if (k === ' ') {
    if (!world.waveActive) startWave(world);
  } else if (k === 'f') {
    world.speed = world.speed === 1 ? 2 : 1;
    sound.click();
  } else if (k === 'p' || k === 'escape') {
    world.paused = !world.paused;
    sound.click();
  } else if (k === 'm') {
    world.muted = !world.muted;
    sound.setMuted(world.muted);
  } else if (k === 'r') {
    resetWorld(world, (Math.random() * 1e9) | 0);
  }
}
