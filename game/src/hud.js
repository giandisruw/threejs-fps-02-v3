// SALTLINE HUD — DOM only, no canvas except the minimap. Every number
// on screen comes from the single state store; nothing here keeps its
// own copy of health, ammo or money.
import { WEAPONS, BUY_MENU } from './weapons.js';
import { COLLIDERS, SITES } from './map.js';

let el = {};
let last = {};
let feedShown = 0;

function setText(id, v) {
  if (last[id] !== v) { last[id] = v; el[id].textContent = v; }
}

export function initHUD(callbacks) {
  const ids = ['timer', 'score', 'alive', 'health-num', 'armor-num', 'ammo',
    'weapon-name', 'money', 'banner', 'prompt', 'killfeed', 'buy-menu',
    'buy-items', 'menu-screen', 'round-screen', 'round-title', 'round-sub',
    'crosshair', 'hitmarker', 'damage', 'plant-wrap', 'plant-fill',
    'plant-label', 'start-btn', 'restart-btn', 'menu-score'];
  for (const id of ids) el[id] = document.getElementById(id);
  el.minimap = document.getElementById('minimap');
  el.healthFill = document.getElementById('health-fill');
  el.armorFill = document.getElementById('armor-fill');
  // buy menu items (click to buy; keys 1-7 work too, wired in main.js)
  el['buy-items'].innerHTML = '';
  BUY_MENU.forEach((item, i) => {
    const b = document.createElement('button');
    b.className = 'buy-item';
    b.textContent = `${i + 1}. ${item.label}`;
    b.addEventListener('click', () => callbacks.onBuy(item.id));
    el['buy-items'].appendChild(b);
  });
  el['start-btn'].addEventListener('click', () => callbacks.onStart());
  el['restart-btn'].addEventListener('click', () => callbacks.onRestart());
}

function drawMinimap(S) {
  const cv = el.minimap;
  if (!cv) return;
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const sx = (x) => ((x + 27) / 54) * W;
  const sy = (z) => ((z + 19) / 38) * H;
  g.fillStyle = '#e8e4d8'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#2e6f73';
  for (const c of COLLIDERS) g.fillRect(sx(c.x0), sy(c.z0), sx(c.x1) - sx(c.x0), sy(c.z1) - sy(c.z0));
  for (const key of ['A', 'B']) {
    const s = SITES[key];
    g.fillStyle = key === 'A' ? '#e86a1c' : '#1c7fe8';
    g.beginPath(); g.arc(sx(s.x), sy(s.z), 7, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 9px sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(key, sx(s.x), sy(s.z));
  }
  if (S.plant.state === 'planted') {
    g.strokeStyle = '#ff2222'; g.lineWidth = 2;
    g.beginPath(); g.arc(sx(SITES[S.plant.site].x), sy(SITES[S.plant.site].z), 10, 0, 7); g.stroke();
  }
  const dot = (x, z, color, r) => {
    g.fillStyle = color; g.beginPath(); g.arc(sx(x), sy(z), r, 0, 7); g.fill();
  };
  for (const b of S.bots) if (b.alive && b.team === 'atk') dot(b.x, b.z, '#e86a1c', 3);
  const p = S.player;
  if (p.alive) {
    g.save();
    g.translate(sx(p.x), sy(p.z));
    g.rotate(Math.atan2(Math.sin(p.yaw), Math.cos(p.yaw)) + Math.PI);
    g.fillStyle = '#ffffff'; g.strokeStyle = '#222'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(0, -6); g.lineTo(4, 5); g.lineTo(-4, 5); g.closePath();
    g.fill(); g.stroke();
    g.restore();
  }
}

export function flashHit(head) {
  el.hitmarker.style.opacity = '1';
  el.hitmarker.style.color = head ? '#ff5a5a' : '#ffffff';
  setTimeout(() => { el.hitmarker.style.opacity = '0'; }, 90);
}

export function flashDamage() {
  el.damage.style.opacity = '0.55';
  setTimeout(() => { el.damage.style.opacity = '0'; }, 180);
}

export function updateHUD(S, spreadPx) {
  const p = S.player;
  const w = WEAPONS[p.weapon];
  setText('timer', S.phase === 'live' ? String(Math.max(0, Math.ceil(S.roundClock))) + 's'
    : S.phase === 'buy' ? 'BUY ' + Math.max(0, Math.ceil(S.buyTime)) + 's'
    : S.phase === 'menu' ? 'SALTLINE' : '—');
  setText('score', `SALTLINE ${S.score.atk} — ${S.score.def} BRINE`);
  const aliveAtk = (p.alive ? 1 : 0) + S.bots.filter((b) => b.team === 'atk' && b.alive).length;
  const aliveDef = S.bots.filter((b) => b.team === 'def' && b.alive).length;
  setText('alive', `●`.repeat(aliveAtk) + '  vs  ' + `●`.repeat(aliveDef));
  setText('health-num', String(Math.max(0, Math.ceil(p.hp))));
  setText('armor-num', String(Math.max(0, Math.ceil(p.armor))));
  el.healthFill.style.width = Math.max(0, p.hp) + '%';
  el.armorFill.style.width = Math.min(100, p.armor) + '%';
  setText('ammo', p.weapon === 'he' ? `${p.mag} × HE` : `${p.mag} / ${p.reserve}`);
  setText('weapon-name', w.name);
  setText('money', '$' + S.money.toLocaleString('en-US'));
  setText('menu-score', `First to 5 rounds · Round ${S.round}`);
  // banner
  if (S.bannerT > 0) { setText('banner', S.banner); el.banner.style.opacity = '1'; }
  else el.banner.style.opacity = '0';
  // context prompt
  let prompt = '';
  if (S.phase === 'buy') prompt = 'Press B or click BUY to open the shop — round starts soon';
  else if (S.phase === 'live' && p.alive) {
    if (S.plant.state === 'none' && S.site) prompt = 'HOLD E — plant the charge at site ' + S.site;
    else if (S.plant.state === 'planted' && p.team === 'atk') prompt = 'Charge planted — defend site ' + S.plant.site;
    else if (S.plant.state === 'planted') prompt = 'HOLD E — defuse the charge!';
  }
  setText('prompt', prompt);
  // plant/defuse progress bar
  const showPlant = S.phase === 'live' && (S.plant.state === 'none' ? S.plant.progress > 0.02 : S.plant.state === 'planted');
  el['plant-wrap'].style.display = showPlant ? 'block' : 'none';
  if (showPlant) {
    const frac = S.plant.state === 'planted' ? S.plant.timer / 35 : S.plant.progress;
    el['plant-fill'].style.width = (Math.max(0, Math.min(1, frac)) * 100).toFixed(0) + '%';
    setText('plant-label', S.plant.state === 'planted'
      ? `CHARGE at ${S.plant.site} — ${Math.ceil(S.plant.timer)}s to detonation`
      : 'PLANTING…');
  }
  // crosshair gap follows live spread (stopping to aim visibly pays)
  el.crosshair.style.setProperty('--gap', (6 + spreadPx * 900).toFixed(1) + 'px');
  // killfeed
  while (feedShown < S.feed.length) {
    const line = S.feed[feedShown++];
    const d = document.createElement('div');
    d.className = 'feed-line';
    d.textContent = line.text;
    el.killfeed.appendChild(d);
    while (el.killfeed.children.length > 5) el.killfeed.removeChild(el.killfeed.firstChild);
  }
  drawMinimap(S);
  // screens
  el['menu-screen'].style.display = S.phase === 'menu' ? 'flex' : 'none';
  el['buy-menu'].style.display = S.phase === 'buy' && S.buyOpen ? 'flex' : 'none';
  const showRound = S.phase === 'roundEnd' || S.phase === 'matchEnd';
  el['round-screen'].style.display = showRound ? 'flex' : 'none';
  if (showRound) {
    setText('round-title', S.phase === 'matchEnd'
      ? (S.winner === 'atk' ? 'SALTLINE TAKES THE STATION' : 'BRINE HOLDS THE STATION')
      : (S.roundWinner === 'atk' ? 'ROUND WON' : 'ROUND LOST'));
    setText('round-sub', S.phase === 'matchEnd'
      ? `Final score ${S.score.atk} — ${S.score.def} · Kills ${S.stats.kills} · Plants ${S.stats.plants}`
      : `Score ${S.score.atk} — ${S.score.def} · Round ${S.round} of the match`);
    el['restart-btn'].textContent = S.phase === 'matchEnd' ? 'PLAY AGAIN' : 'NEXT ROUND';
  }
}
