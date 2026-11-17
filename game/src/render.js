// Emberhold — render: everything the player sees, drawn on one canvas.
// The HUD, shop, banners and all four screens live here too, so a screenshot
// of the canvas is always a screenshot of the whole game.

import {
  EMBER, MAX_WAVE, PALETTE, PATH, PATH_WIDTH, PLOTS, PLOT_RADIUS,
  TOWERS, TOWER_ORDER, VIEW,
} from './config.js';
import { enemiesRemaining, towerAtPlot, upgradeCost, sellValue } from './world.js';
import { uiRects } from './input.js';

const FONT = '"Trebuchet MS", "Segoe UI", sans-serif';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function text(ctx, str, x, y, { size = 16, color = PALETTE.text, bold = false, align = 'left', font = FONT } = {}) {
  ctx.font = `${bold ? '700 ' : ''}${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function circle(ctx, x, y, r, color, glow = 0) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (glow > 0) {
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
  }
  ctx.fillStyle = color;
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawPath(ctx, world) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Edge glow, then the road, then marching dashes.
  ctx.beginPath();
  PATH.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.strokeStyle = PALETTE.pathEdge;
  ctx.lineWidth = PATH_WIDTH + 10;
  ctx.stroke();
  ctx.beginPath();
  PATH.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.strokeStyle = PALETTE.path;
  ctx.lineWidth = PATH_WIDTH;
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  PATH.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.setLineDash([14, 22]);
  ctx.lineDashOffset = -world.time * 26;
  ctx.strokeStyle = 'rgba(147, 160, 200, 0.35)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function drawPlots(ctx, world) {
  for (let i = 0; i < PLOTS.length; i += 1) {
    const plot = PLOTS[i];
    const tower = towerAtPlot(world, i);
    const hovered = world.hover && Math.hypot(world.hover.x - plot.x, world.hover.y - plot.y) <= PLOT_RADIUS + 8;
    circle(ctx, plot.x, plot.y, PLOT_RADIUS, PALETTE.plot);
    ctx.beginPath();
    ctx.arc(plot.x, plot.y, PLOT_RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = hovered && !tower ? '#8fa3e8' : PALETTE.plotEdge;
    ctx.lineWidth = hovered && !tower ? 3 : 2;
    ctx.stroke();
    if (!tower) {
      ctx.beginPath();
      ctx.arc(plot.x, plot.y, PLOT_RADIUS - 7, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(147, 160, 200, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (world.placeKind && hovered) {
        text(ctx, '+', plot.x, plot.y + 1, { size: 26, color: 'rgba(232, 236, 255, 0.7)', bold: true, align: 'center' });
      }
    }
  }
  // Range preview while placing or when a tower is selected.
  let range = null;
  let cx = 0;
  let cy = 0;
  if (world.placeKind && world.hover) {
    const plot = PLOTS.find((p) => Math.hypot(world.hover.x - p.x, world.hover.y - p.y) <= PLOT_RADIUS + 8);
    if (plot && !towerAtPlot(world, PLOTS.indexOf(plot))) {
      range = TOWERS[world.placeKind].range[0];
      cx = plot.x;
      cy = plot.y;
    }
  } else if (world.selectedPlot >= 0) {
    const tower = towerAtPlot(world, world.selectedPlot);
    if (tower) {
      range = TOWERS[tower.kind].range[tower.level - 1];
      cx = tower.x;
      cy = tower.y;
    }
  }
  if (range) {
    ctx.beginPath();
    ctx.arc(cx, cy, range, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 209, 102, 0.06)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 209, 102, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawEmber(ctx, world) {
  const pulse = 1 + Math.sin(world.time * 2.2) * 0.06;
  const health = Math.max(0.25, world.lives / 20);
  // Halo rings.
  for (let i = 0; i < 3; i += 1) {
    const r = EMBER.radius + 10 + i * 12 + Math.sin(world.time * 1.6 + i) * 3;
    ctx.beginPath();
    ctx.arc(EMBER.x, EMBER.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 183, 3, ${0.22 - i * 0.06})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  circle(ctx, EMBER.x, EMBER.y, EMBER.radius * pulse, PALETTE.ember, 26 * health);
  circle(ctx, EMBER.x, EMBER.y, EMBER.radius * 0.55 * pulse, PALETTE.emberCore, 18);
  text(ctx, 'EMBER', EMBER.x, EMBER.y + EMBER.radius + 16, { size: 11, color: PALETTE.gold, bold: true, align: 'center' });
}

function drawTower(ctx, tower) {
  const def = TOWERS[tower.kind];
  // Stone base.
  circle(ctx, tower.x, tower.y, 20, '#232f5c');
  ctx.beginPath();
  ctx.arc(tower.x, tower.y, 20, 0, Math.PI * 2);
  ctx.strokeStyle = '#4a5a9e';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  ctx.translate(tower.x, tower.y);
  if (tower.kind === 'spark') {
    ctx.rotate(tower.angle);
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-10, -9);
    ctx.lineTo(-10, 9);
    ctx.closePath();
    ctx.fillStyle = def.color;
    ctx.shadowColor = def.color;
    ctx.shadowBlur = 10;
    ctx.fill();
  } else if (tower.kind === 'frost') {
    ctx.fillStyle = '#33406e';
    ctx.fillRect(-3, -6, 6, 16);
    circle(ctx, 0, -12, 9, def.color, 14);
    circle(ctx, 0, -12, 4, '#e0f2fe', 8);
  } else {
    ctx.rotate(tower.angle);
    ctx.fillStyle = '#3a2c22';
    rr(ctx, -6, -16, 12, 26, 4);
    ctx.fill();
    circle(ctx, 0, 0, 11, def.color, 8);
    circle(ctx, 0, 0, 5, '#7c2d12', 0);
  }
  ctx.restore();
  // Level pips.
  for (let i = 0; i < 3; i += 1) {
    circle(ctx, tower.x - 10 + i * 10, tower.y + 26, 2.5, i < tower.level ? def.color : 'rgba(147,160,200,0.35)');
  }
}

function drawEnemy(ctx, enemy) {
  const def = enemy.def;
  const slowed = enemy.hitFlash <= 0 && enemy.slowUntil > 0;
  ctx.save();
  if (enemy.type === 'wisp') {
    circle(ctx, enemy.x, enemy.y, enemy.radius, def.color, 12);
    circle(ctx, enemy.x, enemy.y, enemy.radius * 0.5, '#ffffff', 6);
  } else if (enemy.type === 'skitter') {
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = def.color;
    ctx.shadowColor = def.color;
    ctx.shadowBlur = 8;
    ctx.fillRect(-enemy.radius * 0.8, -enemy.radius * 0.8, enemy.radius * 1.6, enemy.radius * 1.6);
  } else if (enemy.type === 'brute') {
    ctx.translate(enemy.x, enemy.y);
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * enemy.radius;
      const py = Math.sin(a) * enemy.radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = def.color;
    ctx.shadowColor = def.color;
    ctx.shadowBlur = 10;
    ctx.fill();
  } else if (enemy.type === 'shade') {
    circle(ctx, enemy.x, enemy.y, enemy.radius, '#2e1065', 10);
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    circle(ctx, enemy.x - 3.5, enemy.y - 1, 1.8, '#f5f3ff');
    circle(ctx, enemy.x + 3.5, enemy.y - 1, 1.8, '#f5f3ff');
  } else {
    // The Hollow King: a crowned orb.
    circle(ctx, enemy.x, enemy.y, enemy.radius, def.color, 18);
    ctx.fillStyle = '#3b0764';
    ctx.beginPath();
    ctx.moveTo(enemy.x - 14, enemy.y - enemy.radius + 4);
    ctx.lineTo(enemy.x - 7, enemy.y - enemy.radius - 10);
    ctx.lineTo(enemy.x, enemy.y - enemy.radius + 2);
    ctx.lineTo(enemy.x + 7, enemy.y - enemy.radius - 10);
    ctx.lineTo(enemy.x + 14, enemy.y - enemy.radius + 4);
    ctx.closePath();
    ctx.fill();
    circle(ctx, enemy.x - 6, enemy.y - 2, 2.4, '#1e1b4b');
    circle(ctx, enemy.x + 6, enemy.y - 2, 2.4, '#1e1b4b');
  }
  ctx.restore();
  if (slowed) {
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  if (enemy.hitFlash > 0) {
    circle(ctx, enemy.x, enemy.y, enemy.radius + 1, 'rgba(255,255,255,0.65)');
  }
  if (enemy.hp < enemy.maxHp) {
    const w = enemy.radius * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 9, w, 4);
    ctx.fillStyle = enemy.hp / enemy.maxHp > 0.4 ? '#4ade80' : '#f87171';
    ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 9, w * (enemy.hp / enemy.maxHp), 4);
  }
}

function drawHud(ctx, world) {
  const rects = uiRects(world);
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, 0, VIEW.width, 56);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(0, 55, VIEW.width, 1);
  // Gold, lives, wave, score.
  circle(ctx, 26, 28, 9, PALETTE.gold, 6);
  text(ctx, `${world.gold}g`, 42, 29, { size: 18, bold: true });
  text(ctx, '♥', 108, 29, { size: 18, color: PALETTE.lives });
  text(ctx, `${world.lives}`, 126, 29, { size: 18, bold: true });
  text(ctx, `Wave ${Math.max(1, world.wave)}/${MAX_WAVE}`, 178, 29, { size: 16, color: PALETTE.dim });
  text(ctx, `Score ${world.score}`, 292, 29, { size: 16, color: PALETTE.dim });
  if (world.waveActive) {
    text(ctx, `Shadows left: ${enemiesRemaining(world)}`, 420, 29, { size: 16, color: '#fda4af' });
  } else if (world.screen === 'play') {
    text(ctx, world.wave === 0 ? 'Build towers, then start Wave 1' : 'Between waves — build, upgrade, then start', 420, 29, { size: 14, color: PALETTE.dim });
  }
  // Buttons.
  const drawBtn = (r, color = PALETTE.panelEdge, textColor = PALETTE.text) => {
    rr(ctx, r.x, r.y, r.w, r.h, 8);
    ctx.fillStyle = color;
    ctx.fill();
    text(ctx, r.label, r.x + r.w / 2, r.y + r.h / 2 + 1, { size: 14, bold: true, color: textColor, align: 'center' });
  };
  const start = rects.startBtn;
  drawBtn(start, start.enabled ? '#15803d' : '#24304f', start.enabled ? '#ffffff' : PALETTE.dim);
  drawBtn(rects.speedBtn);
  drawBtn(rects.pauseBtn);
  drawBtn(rects.soundBtn);
  drawBtn(rects.restartBtn);
}

function drawShop(ctx, world) {
  const rects = uiRects(world);
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(0, VIEW.height - 60, VIEW.width, 60);
  ctx.fillStyle = PALETTE.panelEdge;
  ctx.fillRect(0, VIEW.height - 60, VIEW.width, 1);
  if (rects.panel) {
    const p = rects.panel;
    const t = p.tower;
    const def = TOWERS[t.kind];
    const stats = {
      damage: def.damage[t.level - 1],
      rate: def.rate[t.level - 1],
      range: def.range[t.level - 1],
    };
    circle(ctx, 44, VIEW.height - 30, 13, def.color, 8);
    text(ctx, p.name, 66, VIEW.height - 38, { size: 15, bold: true });
    text(ctx, `DMG ${stats.damage}  ·  ${stats.rate}/s  ·  Range ${stats.range}  ·  Kills ${t.kills}`, 66, VIEW.height - 18, { size: 13, color: PALETTE.dim });
    if (p.upgradeBtn) {
      rr(ctx, p.upgradeBtn.x, p.upgradeBtn.y, p.upgradeBtn.w, p.upgradeBtn.h, 8);
      ctx.fillStyle = world.gold >= upgradeCost(t) ? '#1d4ed8' : '#24304f';
      ctx.fill();
      text(ctx, p.upgradeBtn.label, p.upgradeBtn.x + p.upgradeBtn.w / 2, p.upgradeBtn.y + 18, { size: 14, bold: true, align: 'center', color: world.gold >= upgradeCost(t) ? '#fff' : PALETTE.dim });
    } else {
      text(ctx, 'MAX LEVEL', VIEW.width - 320, VIEW.height - 30, { size: 14, bold: true, color: PALETTE.gold, align: 'center' });
    }
    rr(ctx, p.sellBtn.x, p.sellBtn.y, p.sellBtn.w, p.sellBtn.h, 8);
    ctx.fillStyle = '#7f1d1d';
    ctx.fill();
    text(ctx, `Sell +${sellValue(t)}g`, p.sellBtn.x + p.sellBtn.w / 2, p.sellBtn.y + 18, { size: 14, bold: true, align: 'center' });
    text(ctx, '✕', p.closeBtn.x + 14, p.closeBtn.y + 18, { size: 16, color: PALETTE.dim, align: 'center' });
    return;
  }
  for (const card of rects.cards) {
    const def = TOWERS[card.kind];
    const r = card.rect;
    const afford = world.gold >= def.cost[0];
    const picked = world.placeKind === card.kind;
    rr(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fillStyle = picked ? '#1e3a8a' : '#1a2347';
    ctx.fill();
    ctx.strokeStyle = picked ? def.color : PALETTE.panelEdge;
    ctx.lineWidth = picked ? 2.5 : 1.5;
    ctx.stroke();
    circle(ctx, r.x + 26, r.y + 26, 12, def.color, 7);
    text(ctx, def.name, r.x + 48, r.y + 17, { size: 14, bold: true });
    text(ctx, def.blurb, r.x + 48, r.y + 36, { size: 12, color: PALETTE.dim });
    text(ctx, `${def.cost[0]}g  [${def.key}]`, r.x + r.w - 12, r.y + 17, { size: 13, bold: true, color: afford ? PALETTE.gold : '#f87171', align: 'right' });
  }
  text(ctx, '1–3 pick a tower · click a plot to build', VIEW.width - 16, VIEW.height - 30, { size: 12, color: PALETTE.dim, align: 'right' });
}

function drawBanner(ctx, world) {
  if (!world.banner) return;
  const left = Math.max(0, world.banner.until - world.time);
  const alpha = Math.min(1, left / 0.5);
  ctx.save();
  ctx.globalAlpha = alpha;
  text(ctx, world.banner.text, VIEW.width / 2, 108, { size: 34, bold: true, align: 'center', color: '#fff7d6' });
  if (world.banner.sub) text(ctx, world.banner.sub, VIEW.width / 2, 138, { size: 16, align: 'center', color: PALETTE.dim });
  ctx.restore();
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    circle(ctx, p.x, p.y, p.size, p.color, 6);
  }
  ctx.globalAlpha = 1;
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
    text(ctx, f.text, f.x, f.y, { size: 15, bold: true, color: f.color, align: 'center' });
  }
  ctx.globalAlpha = 1;
}

function overlay(ctx) {
  ctx.fillStyle = 'rgba(5, 8, 20, 0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function drawTitle(ctx, world) {
  overlay(ctx);
  // A few drifting embers behind the title.
  for (let i = 0; i < 14; i += 1) {
    const x = ((i * 137.5 + world.time * 12) % (VIEW.width + 40)) - 20;
    const y = 90 + ((i * 89) % 420) + Math.sin(world.time + i) * 8;
    circle(ctx, x, y, 2.5, i % 3 === 0 ? '#ffb703' : '#7dd3fc', 6);
  }
  text(ctx, 'EMBERHOLD', VIEW.width / 2, 168, { size: 72, bold: true, align: 'center', color: '#fff7d6' });
  text(ctx, 'Hold the last Ember against the Hollow King’s march', VIEW.width / 2, 222, { size: 19, align: 'center', color: PALETTE.dim });
  text(ctx, 'Build towers on the stone plots. Stop 10 waves of shadows before they reach the Ember.', VIEW.width / 2, 262, { size: 16, align: 'center' });
  text(ctx, 'Spark Spire burns · Frost Lantern slows · Ember Mortar splashes  —  upgrade them, sell them, survive.', VIEW.width / 2, 290, { size: 16, align: 'center' });
  text(ctx, 'Mouse to build & select  ·  1 / 2 / 3 pick a tower  ·  Space starts a wave  ·  F fast-forward  ·  P pause', VIEW.width / 2, 330, { size: 14, align: 'center', color: PALETTE.dim });
  if (world.best > 0) text(ctx, `Best score: ${world.best}`, VIEW.width / 2, 366, { size: 16, bold: true, align: 'center', color: PALETTE.gold });
  const btn = uiRects(world).bigBtn;
  rr(ctx, btn.x, btn.y, btn.w, btn.h, 12);
  ctx.fillStyle = '#b45309';
  ctx.fill();
  ctx.shadowColor = '#ffb703';
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.shadowBlur = 0;
  text(ctx, btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 1, { size: 20, bold: true, align: 'center', color: '#fff' });
}

function drawEnd(ctx, world, won) {
  overlay(ctx);
  const title = won ? 'THE EMBER ENDURES' : 'THE LIGHT FADES';
  const color = won ? '#fde68a' : '#fda4af';
  text(ctx, title, VIEW.width / 2, 170, { size: 52, bold: true, align: 'center', color });
  text(ctx, won ? 'Ten waves broken. The Hollow King is dust, and the Ember still burns.' : `The shadows reached the Ember on Wave ${world.wave}.`, VIEW.width / 2, 222, { size: 18, align: 'center', color: PALETTE.dim });
  const rows = [
    ['Score', String(world.score)],
    ['Waves cleared', `${won ? MAX_WAVE : world.wave - (world.waveActive ? 1 : 0)} / ${MAX_WAVE}`],
    ['Shadows destroyed', String(world.kills)],
    ['Towers built', String(world.stats.built)],
    ['Best score', String(Math.max(world.best, world.score))],
  ];
  rows.forEach(([label, value], i) => {
    const y = 272 + i * 30;
    text(ctx, label, VIEW.width / 2 - 130, y, { size: 16, color: PALETTE.dim });
    text(ctx, value, VIEW.width / 2 + 130, y, { size: 16, bold: true, align: 'right' });
  });
  const btn = uiRects(world).bigBtn;
  rr(ctx, btn.x, btn.y, btn.w, btn.h, 12);
  ctx.fillStyle = won ? '#15803d' : '#b45309';
  ctx.fill();
  text(ctx, btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 1, { size: 20, bold: true, align: 'center', color: '#fff' });
}

function drawPaused(ctx, world) {
  overlay(ctx);
  text(ctx, 'PAUSED', VIEW.width / 2, VIEW.height / 2 - 10, { size: 44, bold: true, align: 'center' });
  text(ctx, 'Press P or click ❚❚ to resume', VIEW.width / 2, VIEW.height / 2 + 32, { size: 16, align: 'center', color: PALETTE.dim });
}

/** Draw the whole game into `ctx` (already scaled to the canvas size). */
export function drawWorld(ctx, world) {
  ctx.save();
  if (world.shake > 0) {
    ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
  }
  // Background.
  const bg = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  bg.addColorStop(0, PALETTE.bg);
  bg.addColorStop(1, PALETTE.bg2);
  ctx.fillStyle = bg;
  ctx.fillRect(-20, -20, VIEW.width + 40, VIEW.height + 40);
  // Faint stars.
  ctx.fillStyle = 'rgba(232, 236, 255, 0.16)';
  for (let i = 0; i < 40; i += 1) {
    const x = (i * 197.3) % VIEW.width;
    const y = 70 + ((i * 131.7) % 440);
    ctx.fillRect(x, y, 2, 2);
  }
  drawPath(ctx, world);
  drawPlots(ctx, world);
  drawEmber(ctx, world);
  for (const tower of world.towers) drawTower(ctx, tower);
  for (const enemy of world.enemies) drawEnemy(ctx, enemy);
  for (const p of world.projectiles) {
    circle(ctx, p.x, p.y, p.kind === 'mortar' ? 5 : 3.5, TOWERS[p.kind].color, 10);
  }
  drawParticles(ctx, world);
  ctx.restore();

  drawHud(ctx, world);
  drawShop(ctx, world);
  drawBanner(ctx, world);
  if (world.screen === 'title') drawTitle(ctx, world);
  else if (world.screen === 'win') drawEnd(ctx, world, true);
  else if (world.screen === 'lose') drawEnd(ctx, world, false);
  else if (world.paused) drawPaused(ctx, world);
}
