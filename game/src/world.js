// Emberhold — world: the game state and its rules. No drawing here (render.js
// does that) and no input handling (input.js does that). Pure state + step.

import {
  EMBER, ENEMIES, MAX_WAVE, PATH, PATH_WIDTH, PLOTS, PLOT_RADIUS,
  START_GOLD, START_LIVES, TOWERS, WAVES, waveClearBonus, waveHpMult,
} from './config.js';

/** mulberry32: a small seeded RNG, so a seed always replays the same game. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Total length of the road, and the point `dist` along it. */
export const PATH_LENGTH = (() => {
  let total = 0;
  for (let i = 1; i < PATH.length; i += 1) {
    total += Math.hypot(PATH[i].x - PATH[i - 1].x, PATH[i].y - PATH[i - 1].y);
  }
  return total;
})();

export function pointOnPath(dist) {
  let d = Math.max(0, Math.min(PATH_LENGTH, dist));
  for (let i = 1; i < PATH.length; i += 1) {
    const seg = Math.hypot(PATH[i].x - PATH[i - 1].x, PATH[i].y - PATH[i - 1].y);
    if (d <= seg) {
      const t = seg === 0 ? 0 : d / seg;
      return { x: PATH[i - 1].x + (PATH[i].x - PATH[i - 1].x) * t, y: PATH[i - 1].y + (PATH[i].y - PATH[i - 1].y) * t };
    }
    d -= seg;
  }
  return { x: PATH[PATH.length - 1].x, y: PATH[PATH.length - 1].y };
}

export function createWorld(seed = 1) {
  const rng = makeRng(seed);
  const world = {
    rng,
    time: 0,
    screen: 'title', // title | play | win | lose
    paused: false,
    speed: 1,
    muted: false,
    gold: START_GOLD,
    lives: START_LIVES,
    score: 0,
    kills: 0,
    wave: 0, // waves cleared; the next wave to fight is wave + 1
    waveActive: false,
    spawnQueue: [],
    spawnElapsed: 0,
    spawned: 0,
    toSpawn: 0,
    enemies: [],
    towers: [],
    projectiles: [],
    particles: [],
    floaters: [],
    banner: null,
    shake: 0,
    best: 0,
    events: [],
    selectedPlot: -1, // a tower's plot index, or -1
    placeKind: null, // tower kind being placed, or null
    hover: null, // {x, y} canvas coords, or null
    stats: { built: 0, upgraded: 0, leaked: 0 },
  };
  try {
    world.best = Number(window.localStorage.getItem('emberhold-best') || 0) || 0;
  } catch {
    world.best = 0;
  }
  return world;
}

export function resetWorld(world, seed = 1) {
  const best = world.best;
  const fresh = createWorld(seed);
  fresh.best = best;
  Object.keys(fresh).forEach((key) => { world[key] = fresh[key]; });
  world.screen = 'play';
  world.banner = { text: 'Hold the Ember', sub: 'Build towers, then start Wave 1', until: 3.5 };
}

function addFloater(world, x, y, text, color) {
  world.floaters.push({ x, y, text, color, life: 1.1, maxLife: 1.1 });
}

function burst(world, x, y, color, count, speed = 90) {
  for (let i = 0; i < count; i += 1) {
    const angle = world.rng() * Math.PI * 2;
    const v = speed * (0.4 + world.rng() * 0.8);
    world.particles.push({
      x, y,
      vx: Math.cos(angle) * v, vy: Math.sin(angle) * v,
      life: 0.45 + world.rng() * 0.35, maxLife: 0.8,
      size: 2 + world.rng() * 3, color,
    });
  }
}

function setBanner(world, text, sub, seconds = 2.4) {
  world.banner = { text, sub, until: world.time + seconds };
}

function towerStats(tower) {
  const def = TOWERS[tower.kind];
  const level = tower.level - 1;
  return {
    damage: def.damage[level],
    rate: def.rate[level],
    range: def.range[level],
    splash: def.splash ? def.splash[level] : 0,
    slowPct: def.slowPct ? def.slowPct[level] : 0,
    slowDuration: def.slowDuration || 0,
    projectileSpeed: def.projectileSpeed,
  };
}

export function towerAtPlot(world, plotIndex) {
  return world.towers.find((t) => t.plotIndex === plotIndex) || null;
}

export function upgradeCost(tower) {
  const def = TOWERS[tower.kind];
  if (tower.level >= 3) return null;
  return def.cost[tower.level];
}

export function sellValue(tower) {
  return Math.floor(tower.invested * 0.7);
}

/** Build a tower on a free plot. Returns false when it cannot be built. */
export function placeTower(world, plotIndex, kind) {
  const def = TOWERS[kind];
  if (!def || !PLOTS[plotIndex] || towerAtPlot(world, plotIndex)) return false;
  if (world.gold < def.cost[0]) return false;
  world.gold -= def.cost[0];
  world.towers.push({
    kind, level: 1, plotIndex,
    x: PLOTS[plotIndex].x, y: PLOTS[plotIndex].y,
    cooldown: 0, angle: -Math.PI / 2, invested: def.cost[0], kills: 0,
  });
  world.stats.built += 1;
  world.events.push({ type: 'build' });
  burst(world, PLOTS[plotIndex].x, PLOTS[plotIndex].y, def.color, 14, 70);
  return true;
}

export function upgradeTower(world, tower) {
  const cost = upgradeCost(tower);
  if (cost === null || world.gold < cost) return false;
  world.gold -= cost;
  tower.level += 1;
  tower.invested += cost;
  world.stats.upgraded += 1;
  world.events.push({ type: 'upgrade' });
  burst(world, tower.x, tower.y, TOWERS[tower.kind].color, 18, 80);
  return true;
}

export function sellTower(world, tower) {
  const value = sellValue(tower);
  world.gold += value;
  world.towers = world.towers.filter((t) => t !== tower);
  world.selectedPlot = -1;
  world.events.push({ type: 'coin' });
  addFloater(world, tower.x, tower.y - 20, `+${value}g`, '#ffd166');
  return true;
}

export function startWave(world) {
  if (world.waveActive || world.screen !== 'play' || world.paused) return false;
  const next = world.wave + 1;
  if (next > MAX_WAVE) return false;
  const def = WAVES[next - 1];
  const mult = waveHpMult(next);
  world.spawnQueue = [];
  for (const group of def.groups) {
    for (let i = 0; i < group.count; i += 1) {
      world.spawnQueue.push({ type: group.type, at: group.at + i * group.gap });
    }
  }
  world.spawnQueue.sort((a, b) => a.at - b.at);
  world.toSpawn = world.spawnQueue.length;
  world.spawned = 0;
  world.spawnElapsed = 0;
  world.waveActive = true;
  world.wave = next;
  setBanner(world, `Wave ${next}`, next === MAX_WAVE ? 'The Hollow King comes' : `${world.toSpawn} shadows on the road`, 2.2);
  world.events.push({ type: 'horn' });
  return true;
}

function spawnEnemy(world, type) {
  const def = ENEMIES[type];
  const mult = waveHpMult(world.wave);
  const hp = Math.round(def.hp * mult);
  const speed = def.speed * (1 + 0.02 * (world.wave - 1));
  const pos = pointOnPath(0);
  world.enemies.push({
    type, def, hp, maxHp: hp,
    x: pos.x, y: pos.y, dist: 0,
    speed, slowUntil: 0, slowPct: 0,
    radius: def.radius, alive: true, hitFlash: 0,
  });
  world.spawned += 1;
}

function damageEnemy(world, enemy, amount, sourceKind) {
  if (!enemy.alive) return;
  enemy.hp -= amount;
  enemy.hitFlash = 0.12;
  world.events.push({ type: 'hit' });
  if (enemy.hp <= 0) {
    enemy.alive = false;
    world.kills += 1;
    world.score += 10;
    world.gold += enemy.def.bounty;
    const tower = sourceKind || null;
    if (tower) tower.kills += 1;
    burst(world, enemy.x, enemy.y, enemy.def.color, enemy.type === 'boss' ? 40 : 12, 110);
    addFloater(world, enemy.x, enemy.y - 14, `+${enemy.def.bounty}g`, '#ffd166');
    world.events.push({ type: 'die' });
    world.events.push({ type: 'coin' });
    if (enemy.type === 'boss') {
      world.shake = Math.max(world.shake, 10);
      setBanner(world, 'The Hollow King falls!', '', 2.5);
    }
  }
}

function fireTower(world, tower) {
  const stats = towerStats(tower);
  let target = null;
  for (const enemy of world.enemies) {
    if (!enemy.alive) continue;
    const d = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
    if (d <= stats.range && (!target || enemy.dist > target.dist)) target = enemy;
  }
  if (!target) return;
  tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
  tower.cooldown = 1 / stats.rate;
  world.projectiles.push({
    x: tower.x, y: tower.y - 14,
    target, lastX: target.x, lastY: target.y,
    speed: stats.projectileSpeed,
    damage: stats.damage, kind: tower.kind, source: tower,
    splash: stats.splash, slowPct: stats.slowPct, slowDuration: stats.slowDuration,
    alive: true,
  });
  world.events.push({ type: 'shoot', kind: tower.kind });
}

function stepProjectiles(world, dt) {
  for (const p of world.projectiles) {
    if (!p.alive) continue;
    if (p.target && p.target.alive) {
      p.lastX = p.target.x;
      p.lastY = p.target.y;
    }
    const dx = p.lastX - p.x;
    const dy = p.lastY - p.y;
    const dist = Math.hypot(dx, dy);
    const stepLen = p.speed * dt;
    if (dist <= stepLen + 2) {
      p.alive = false;
      if (p.splash > 0) {
        burst(world, p.lastX, p.lastY, '#fb923c', 10, 90);
        world.events.push({ type: 'explode' });
        for (const enemy of world.enemies) {
          if (!enemy.alive) continue;
          if (Math.hypot(enemy.x - p.lastX, enemy.y - p.lastY) <= p.splash + enemy.radius) {
            damageEnemy(world, enemy, p.damage, p.source);
          }
        }
      } else if (p.target && p.target.alive) {
        damageEnemy(world, p.target, p.damage, p.source);
        if (p.slowPct > 0 && !p.target.def.slowImmune) {
          p.target.slowUntil = world.time + p.slowDuration;
          p.target.slowPct = Math.max(p.target.slowPct, p.slowPct);
        }
        burst(world, p.lastX, p.lastY, TOWERS[p.kind].color, 4, 50);
      }
    } else {
      p.x += (dx / dist) * stepLen;
      p.y += (dy / dist) * stepLen;
    }
  }
  world.projectiles = world.projectiles.filter((p) => p.alive);
}

function stepEnemies(world, dt) {
  for (const enemy of world.enemies) {
    if (!enemy.alive) continue;
    if (enemy.hitFlash > 0) enemy.hitFlash -= dt;
    const slowed = world.time < enemy.slowUntil && !enemy.def.slowImmune;
    const speed = enemy.speed * (slowed ? 1 - enemy.slowPct : 1);
    enemy.dist += speed * dt;
    const pos = pointOnPath(enemy.dist);
    enemy.x = pos.x;
    enemy.y = pos.y;
    if (enemy.dist >= PATH_LENGTH - 4 || (enemy.dist > 1620 && enemy.x >= EMBER.x - 4)) {
      enemy.alive = false;
      world.lives -= enemy.def.lives;
      world.stats.leaked += 1;
      world.shake = Math.max(world.shake, 7);
      burst(world, EMBER.x, EMBER.y, '#fb7185', 18, 130);
      addFloater(world, EMBER.x, EMBER.y - 34, `-${enemy.def.lives} ❤`, '#fb7185');
      world.events.push({ type: 'leak' });
      if (world.lives <= 0) {
        world.lives = 0;
        world.screen = 'lose';
        world.events.push({ type: 'lose' });
        saveBest(world);
      }
    }
  }
  world.enemies = world.enemies.filter((e) => e.alive);
}

function saveBest(world) {
  if (world.score > world.best) {
    world.best = world.score;
    try {
      window.localStorage.setItem('emberhold-best', String(world.best));
    } catch {
      // storage unavailable; the best score just lives for this session
    }
  }
}

function stepSpawning(world, dt) {
  if (!world.waveActive) return;
  world.spawnElapsed += dt;
  while (world.spawnQueue.length > 0 && world.spawnQueue[0].at <= world.spawnElapsed) {
    spawnEnemy(world, world.spawnQueue.shift().type);
  }
  if (world.spawnQueue.length === 0 && world.enemies.length === 0) {
    world.waveActive = false;
    const bonus = waveClearBonus(world.wave);
    world.gold += bonus;
    world.score += 150;
    world.events.push({ type: 'waveclear' });
    if (world.wave >= MAX_WAVE) {
      world.score += world.lives * 50;
      world.screen = 'win';
      world.events.push({ type: 'win' });
      saveBest(world);
    } else {
      setBanner(world, `Wave ${world.wave} cleared!`, `+${bonus} gold  ·  Wave ${world.wave + 1} awaits`, 2.6);
    }
  }
}

/** Advance the world by `dt` seconds of game time. */
export function stepWorld(world, dt) {
  if (world.screen !== 'play' || world.paused) {
    // Ambient drift only: the Ember breathes and particles fade.
    world.time += dt * 0.2;
    for (const p of world.particles) {
      p.life -= dt * 0.4;
      p.x += p.vx * dt * 0.2;
      p.y += p.vy * dt * 0.2;
    }
    world.particles = world.particles.filter((p) => p.life > 0);
    return;
  }
  world.time += dt;
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 26);
  if (world.banner && world.time > world.banner.until) world.banner = null;

  stepSpawning(world, dt);
  for (const tower of world.towers) {
    tower.cooldown -= dt;
    if (tower.cooldown <= 0) fireTower(world, tower);
  }
  stepProjectiles(world, dt);
  stepEnemies(world, dt);
  for (const p of world.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
  }
  world.particles = world.particles.filter((p) => p.life > 0);
  for (const f of world.floaters) {
    f.life -= dt;
    f.y -= 26 * dt;
  }
  world.floaters = world.floaters.filter((f) => f.life > 0);
}

/** Enemies still to come or alive, for the HUD. */
export function enemiesRemaining(world) {
  return world.spawnQueue.length + world.enemies.length;
}
