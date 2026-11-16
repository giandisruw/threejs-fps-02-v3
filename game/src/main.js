// SALTLINE — Whitewash Strike. Entry point: renderer, fixed-step sim,
// round flow, economy, demo mode for screenshots (?demo=fight|site|
// buy|menu). The sim runs at a fixed 60 Hz, apart from rendering.
import * as THREE from 'three';
import { STEP, BUY_TIME, ROUND_TIME, WIN_ROUNDS, START_MONEY, KILL_REWARD, WIN_REWARD, LOSS_REWARD, LOSS_STREAK_BONUS, PLANT_REWARD, EYE, CROUCH_EYE, PALETTE } from './config.js';
import { createState, makeFighter, makeBotAI, freshArsenal } from './state.js';
import { buildMap, SPAWNS, SITES } from './map.js';
import { WEAPONS, BUY_MENU, shotSpread } from './weapons.js';
import { fireWeapon, explodeGrenade, updateObjective, siteAt } from './combat.js';
import { createInput, movePlayer, applyLook } from './player.js';
import { buildBotMesh, syncBotMesh, updateBots } from './bots.js';
import { initEffects } from './effects.js';
import { ensureAudio, sfx } from './audio.js';
import { initHUD, updateHUD, flashHit, flashDamage } from './hud.js';

const S = createState();
const input = createInput();
const vel = { x: 0, z: 0 };
const world = { scene: null, wallMeshes: [], hitMeshes: [], botGroups: new Map() };
let renderer, camera, fx, gun, muzzleTmp;
let lastPlayerHp = 100;
let fireEdge = false; // semi-auto trigger pull, consumed by the sim
let grenadeEdge = false;
let lastShotAt = -1;
let demoFoe = null; // defender the fight demo aims its staged tracer at
let demoFxTick = 0;

// ---------------------------------------------------------- scene setup
function setupScene() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  document.getElementById('app').appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.sky);
  scene.fog = new THREE.Fog(PALETTE.fog, 45, 115);
  world.scene = scene;
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 140);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a7f66, 1.15);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2dd, 2.4);
  sun.position.set(25, 38, 18);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -32; sun.shadow.camera.right = 32;
  sun.shadow.camera.top = 32; sun.shadow.camera.bottom = -32;
  sun.shadow.camera.far = 100;
  scene.add(sun);
  const built = buildMap(scene);
  world.wallMeshes = built.wallMeshes;
  fx = initEffects(scene);
  muzzleTmp = new THREE.Vector3();
  // first-person gun (viewmodel, rides the camera)
  gun = new THREE.Group();
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.45, metalness: 0.55 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.45), gunMat);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 10), gunMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.025, -0.32);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.08), gunMat);
  grip.position.set(0, -0.11, 0.12);
  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.05, 0.08),
    new THREE.MeshStandardMaterial({ color: PALETTE.accent, roughness: 0.5 }));
  sight.position.set(0, 0.075, -0.05);
  gun.add(body, barrel, grip, sight);
  gun.position.set(0.3, -0.29, -0.68);
  gun.rotation.y = 0.05;
  camera.add(gun);
  // the player's own hitboxes (invisible material still raycasts)
  const ghost = new THREE.MeshBasicMaterial({ visible: false });
  const pBody = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.3, 0.35), ghost);
  pBody.userData = { fighter: S.player, part: 'body' };
  const pHead = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), ghost);
  pHead.userData = { fighter: S.player, part: 'head' };
  scene.add(pBody, pHead);
  world.playerBody = pBody;
  world.playerHead = pHead;
  world.hitMeshes.push(pBody, pHead);
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ---------------------------------------------------------- fighters
function spawnFighters() {
  S.bots = [];
  const allyNames = ['Rook', 'Tide'];
  const defNames = ['Kelp', 'Marrow', 'Silt', 'Fathom'];
  SPAWNS.atk.slice(1).forEach(([x, z], i) => {
    const b = makeFighter('ally' + i, 'atk', allyNames[i], x, z, 0);
    b.ai = makeBotAI('escort');
    b.weapon = i === 0 ? 'rifle' : 'smg';
    b.mag = WEAPONS[b.weapon].mag;
    S.bots.push(b);
  });
  SPAWNS.def.forEach(([x, z], i) => {
    const b = makeFighter('def' + i, 'def', defNames[i], x, z, Math.PI);
    b.ai = makeBotAI(i < 2 ? 'holder' : 'roamer');
    b.ai.site = i % 2 === 0 ? 'A' : 'B';
    b.weapon = 'rifle';
    b.mag = WEAPONS.rifle.mag;
    S.bots.push(b);
  });
  for (const b of S.bots) buildBotMesh(world.scene, b, world);
}

function resetPositions() {
  const p = S.player;
  const [px, pz] = SPAWNS.atk[0];
  p.x = px; p.z = pz; p.y = 0; p.vy = 0; p.yaw = 0; p.pitch = 0;
  p.hp = 100; p.alive = true; p.reloading = false; p.bloom = 0; p.recoil = 0;
  vel.x = 0; vel.z = 0;
  S.bots.forEach((b, i) => {
    const spawn = b.team === 'atk' ? SPAWNS.atk[i + 1] : SPAWNS.def[i - 2];
    b.x = spawn[0]; b.z = spawn[1]; b.y = 0;
    b.yaw = b.team === 'atk' ? 0 : Math.PI;
    b.hp = 100; b.alive = true; b.reloading = false;
    b.mag = WEAPONS[b.weapon].mag;
    b.ai.mode = 'move'; b.ai.path = []; b.ai.pathI = 0; b.ai.target = null;
  });
  S.grenades = [];
  S.plant = { state: 'none', site: null, progress: 0, timer: 0, botDefusing: false };
}

// ---------------------------------------------------------- round flow
function startMatch() {
  S.score = { atk: 0, def: 0 };
  S.round = 1;
  S.streak = 0;
  S.money = START_MONEY;
  S.arsenal = freshArsenal();
  S.arsenal.he = 0;
  S.stats = { kills: 0, deaths: 0, plants: 0, defuses: 0 };
  S.player.weapon = 'p250';
  S.player.mag = WEAPONS.p250.mag;
  S.player.reserve = WEAPONS.p250.reserveMax;
  S.player.armor = 0;
  S.player.helmet = false;
  S.player.owned = ['p250'];
  S.player.ammoStore = {};
  startBuy();
}

function startBuy() {
  resetPositions();
  S.phase = 'buy';
  S.phaseT = 0;
  S.buyTime = BUY_TIME;
  S.buyOpen = false;
  S.banner = `ROUND ${S.round} — BUY PHASE`;
  S.bannerT = 3;
  sfx.round();
}

function startRound() {
  S.phase = 'live';
  S.phaseT = 0;
  S.roundClock = ROUND_TIME;
  S.buyOpen = false;
  S.banner = `ROUND ${S.round} — PLANT AT A OR B`;
  S.bannerT = 3;
}

function endRound(winner, reason) {
  if (S.phase !== 'live') return;
  S.roundWinner = winner;
  if (winner === 'atk') {
    S.score.atk += 1;
    S.money += WIN_REWARD;
    S.streak = 0;
    S.banner = 'ROUND WON — ' + reason;
  } else {
    S.score.def += 1;
    S.streak += 1;
    S.money += LOSS_REWARD + Math.min(1500, (S.streak - 1) * LOSS_STREAK_BONUS);
    S.banner = 'ROUND LOST — ' + reason;
  }
  S.bannerT = 4;
  S.phase = 'roundEnd';
  S.phaseT = 0;
  S.feed.push({ text: S.banner, t: S.time });
}

function endMatchCheck() {
  if (S.score.atk >= WIN_ROUNDS || S.score.def >= WIN_ROUNDS) {
    S.winner = S.score.atk >= WIN_ROUNDS ? 'atk' : 'def';
    S.phase = 'matchEnd';
    S.phaseT = 0;
    return true;
  }
  return false;
}

function nextRound() {
  if (endMatchCheck()) return;
  S.round += 1;
  startBuy();
}

// ---------------------------------------------------------- economy
function buyItem(id) {
  if (S.phase !== 'buy') return;
  const item = BUY_MENU.find((b) => b.id === id);
  if (!item || S.money < item.price) return;
  const p = S.player;
  if (id === 'armor') { p.armor = 100; }
  else if (id === 'helmet') { p.helmet = true; }
  else if (id === 'he') { S.arsenal.he = (S.arsenal.he || 0) + 1; }
  else if (id === 'ammo') {
    const w = WEAPONS[p.weapon];
    p.reserve = w.reserveMax;
  } else {
    const w = WEAPONS[id];
    if (!p.owned.includes(id)) p.owned.push(id);
    p.weapon = id;
    p.mag = w.mag;
    p.reserve = w.reserveMax;
    p.reloading = false;
  }
  S.money -= item.price;
  sfx.buy();
}

function switchWeapon(idx) {
  const p = S.player;
  const list = p.owned;
  if (idx < 0 || idx >= list.length) return;
  if (p.weapon === list[idx]) return;
  p.weapon = list[idx];
  const w = WEAPONS[p.weapon];
  const saved = (p.ammoStore || {})[p.weapon];
  p.mag = saved ? saved.mag : w.mag;
  p.reserve = saved ? saved.reserve : w.reserveMax;
  p.reloading = false;
}

// per-weapon ammo persists across switches
function storeAmmo() {
  const p = S.player;
  p.ammoStore = p.ammoStore || {};
  p.ammoStore[p.weapon] = { mag: p.mag, reserve: p.reserve };
}

// ---------------------------------------------------------- firing
function tryFire() {
  const p = S.player;
  if (!p.alive || S.phase !== 'live') return;
  const w = WEAPONS[p.weapon];
  if (p.reloading) return;
  if (S.time - lastShotAt < 60 / w.rpm) return;
  if (p.mag <= 0) { startReload(); return; }
  lastShotAt = S.time;
  const res = fireWeapon(S, p, world, fx);
  p.pitch += w.recoil * 0.4; // real kick: the player pulls back down
  sfx.shot(w.kind);
  muzzleTmp.set(0.3, -0.2, -1.1);
  camera.localToWorld(muzzleTmp);
  if (res && res.hit) {
    flashHit(res.head);
    sfx.hit(res.head);
    if (!res.target.alive) sfx.kill();
  }
}

function startReload() {
  const p = S.player;
  const w = WEAPONS[p.weapon];
  if (p.reloading || p.mag >= w.mag || p.reserve <= 0 || w.reload === 0) return;
  p.reloading = true;
  p.reloadT = w.reload;
  sfx.reload();
}

function throwGrenade() {
  const p = S.player;
  if (!p.alive || S.phase !== 'live' || !(S.arsenal.he > 0)) return;
  S.arsenal.he -= 1;
  const dir = new THREE.Vector3(-Math.sin(p.yaw), Math.tan(p.pitch) + 0.25, -Math.cos(p.yaw)).normalize();
  const g = {
    x: p.x, y: p.y + EYE, z: p.z,
    vx: dir.x * 13, vy: dir.y * 13 + 2.5, vz: dir.z * 13,
    fuse: 1.6, owner: p,
  };
  S.grenades.push(g);
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.4, metalness: 0.6 }),
  );
  mesh.position.set(g.x, g.y, g.z);
  world.scene.add(mesh);
  g.mesh = mesh;
}

function updateGrenades(dt) {
  for (let i = S.grenades.length - 1; i >= 0; i--) {
    const g = S.grenades[i];
    g.vy -= 12 * dt;
    g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt;
    if (g.y < 0.12) { g.y = 0.12; g.vy *= -0.4; g.vx *= 0.6; g.vz *= 0.6; }
    g.mesh.position.set(g.x, g.y, g.z);
    g.fuse -= dt;
    if (g.fuse <= 0) {
      explodeGrenade(S, g, world, fx);
      world.scene.remove(g.mesh);
      S.grenades.splice(i, 1);
    }
  }
}

// ---------------------------------------------------------- fixed-step sim
function step(dt) {
  S.time += dt;
  S.phaseT += dt;
  if (S.bannerT > 0) S.bannerT -= dt;
  if (S.phase === 'buy') {
    S.buyTime -= dt;
    if (S.buyTime <= 0) startRound();
    return;
  }
  if (S.phase === 'roundEnd') {
    if (S.phaseT > 4) nextRound();
    return;
  }
  if (S.phase !== 'live') return;
  S.roundClock -= dt;
  const p = S.player;
  // player movement + reload
  if (p.alive) {
    movePlayer(S, input, dt, vel);
    if (input.fire) tryFire();
    if (fireEdge) { fireEdge = false; tryFire(); }
    if (grenadeEdge) { grenadeEdge = false; throwGrenade(); }
    if (input.reload) { input.reload = false; startReload(); }
    if (p.reloading) {
      p.reloadT -= dt;
      if (p.reloadT <= 0) {
        p.reloading = false;
        const w = WEAPONS[p.weapon];
        const need = w.mag - p.mag;
        const take = Math.min(need, p.reserve);
        p.mag += take; p.reserve -= take;
      }
    }
    if (input.slot > 0) { storeAmmo(); switchWeapon(input.slot - 1); input.slot = 0; }
    if (p.hp < lastPlayerHp) { flashDamage(); sfx.hurt(); }
    lastPlayerHp = p.hp;
  }
  // bots
  S.plant.botDefusing = false;
  updateBots(S, world, dt, fx);
  updateGrenades(dt);
  // objective
  S.site = p.alive ? siteAt(p.x, p.z) : null;
  const planting = !!(input.plant && p.alive && S.plant.state === 'none' && S.site);
  if (planting && !S.plant.site) S.plant.site = S.site;
  const defusing = S.plant.botDefusing;
  const outcome = updateObjective(S, dt, planting, defusing);
  if (outcome === 'detonated') {
    const s = SITES[S.plant.site];
    explodeGrenade(S, { x: s.x, y: 0.5, z: s.z, owner: p }, world, fx);
    endRound('atk', 'charge detonated');
    return;
  }
  if (outcome === 'defused') { endRound('def', 'charge defused'); return; }
  // round end by elimination / clock
  const atkAlive = (p.alive ? 1 : 0) + S.bots.filter((b) => b.team === 'atk' && b.alive).length;
  const defAlive = S.bots.filter((b) => b.team === 'def' && b.alive).length;
  if (S.plant.state !== 'planted') {
    if (defAlive === 0) { endRound('atk', 'enemy squad eliminated'); return; }
    if (atkAlive === 0) { endRound('def', 'attackers eliminated'); return; }
    if (S.roundClock <= 0) { endRound('def', 'time expired'); return; }
  }
}

// ---------------------------------------------------------- render
function render() {
  const p = S.player;
  const eyeH = p.crouch ? CROUCH_EYE : EYE;
  camera.position.set(p.x, p.y + eyeH, p.z);
  camera.rotation.y = p.yaw;
  camera.rotation.x = p.pitch;
  // viewmodel bob + recoil
  const bob = p.moving && p.y === 0 ? Math.sin(S.time * 10) * 0.008 : 0;
  gun.position.y = -0.29 + bob;
  gun.position.z = -0.68 + p.recoil * 1.2;
  gun.visible = p.alive;
  // demo staging: the fight scene re-fires one real tracer every frame
  // (through the game's own effects path) so the screenshot shows live
  // gunfire, not a posed still — plus impact sparks on a slow tick.
  if (S.demo === 'fight' && demoFoe && demoFoe.alive) {
    demoFxTick += 1;
    muzzleTmp.set(0.3, -0.2, -1.1);
    camera.localToWorld(muzzleTmp);
    fx.tracer(muzzleTmp, { x: demoFoe.x, y: 1.2, z: demoFoe.z });
    if (demoFxTick % 12 === 0) fx.impact({ x: demoFoe.x + 0.4, y: 1.1, z: demoFoe.z }, false);
  }
  // player hitboxes follow the body
  world.playerBody.position.set(p.x, p.y + 0.95, p.z);
  world.playerHead.position.set(p.x, p.y + 1.66, p.z);
  for (const b of S.bots) syncBotMesh(world, b);
  fx.update(1 / 60);
  renderer.render(world.scene, camera);
}

// ---------------------------------------------------------- input
function bindInput() {
  const keymap = {
    KeyW: 'fwd', KeyS: 'back', KeyA: 'left', KeyD: 'right',
    ControlLeft: 'crouch', KeyC: 'crouch', Space: 'jump',
  };
  window.addEventListener('keydown', (e) => {
    ensureAudio();
    if (e.code in keymap) { input[keymap[e.code]] = true; if (e.code === 'Space') e.preventDefault(); }
    else if (e.code === 'KeyR') input.reload = true;
    else if (e.code === 'KeyB') { if (S.phase === 'buy') { S.buyOpen = !S.buyOpen; sfx.click(); } }
    else if (e.code === 'KeyE') input.plant = true;
    else if (e.code === 'KeyG') grenadeEdge = true;
    else if (e.code.startsWith('Digit')) {
      const n = Number(e.code.slice(5));
      if (n >= 1 && n <= 7 && S.phase === 'buy' && S.buyOpen) buyItem(BUY_MENU[n - 1].id);
      else if (n >= 1 && n <= 4) input.slot = n;
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.code in keymap) input[keymap[e.code]] = false;
    else if (e.code === 'KeyE') input.plant = false;
  });
  const canvas = () => renderer.domElement;
  document.addEventListener('mousedown', (e) => {
    ensureAudio();
    if (S.phase === 'menu' || S.phase === 'matchEnd') return;
    if (e.target !== canvas()) return;
    if (!S.demo && document.pointerLockElement !== canvas()) { canvas().requestPointerLock(); return; }
    if (e.button === 0) { input.fire = true; fireEdge = true; }
    if (e.button === 2) input.ads = true;
  });
  document.addEventListener('mouseup', (e) => {
    if (e.button === 0) input.fire = false;
    if (e.button === 2) input.ads = false;
  });
  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === renderer.domElement) {
      applyLook(S.player, e.movementX, e.movementY);
    }
  });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== renderer.domElement) input.fire = false;
  });
}

// ---------------------------------------------------------- demo mode
function setupDemo(kind) {
  S.demo = kind;
  S.arsenal = freshArsenal();
  S.arsenal.he = 1;
  if (kind === 'menu') { S.phase = 'menu'; return; }
  if (kind === 'buy') {
    S.money = 4100;
    S.player.owned = ['p250', 'smg'];
    S.player.weapon = 'smg';
    S.player.mag = WEAPONS.smg.mag;
    S.player.reserve = WEAPONS.smg.reserveMax;
    startBuy();
    S.buyOpen = true;
    S.buyTime = 9;
    S.banner = '';
    S.bannerT = 0;
    return;
  }
  // fight / site: a live round, scripted positions
  startBuy();
  startRound();
  S.money = 2350;
  S.player.owned = ['p250', 'rifle'];
  S.player.weapon = 'rifle';
  S.player.mag = 24;
  S.player.reserve = 90;
  S.player.armor = 50;
  S.player.helmet = true;
  if (kind === 'fight') {
    S.player.x = 0; S.player.z = 12; S.player.yaw = 0.05; S.player.pitch = 0;
    S.roundClock = 87;
    const def = S.bots.find((b) => b.id === 'def0');
    def.x = 1.0; def.z = 5.0; def.yaw = Math.PI;
    demoFoe = def;
    const ally = S.bots.find((b) => b.id === 'ally0');
    ally.x = -3.5; ally.z = 9; ally.yaw = 0;
    // a live firefight, staged through the real HUD/effects paths:
    // a kill already on the feed and the hitmarker up
    S.feed.push({ text: 'You eliminated Silt  +$300', t: 0 });
    const hm = document.getElementById('hitmarker');
    if (hm) hm.style.opacity = '1';
  } else if (kind === 'site') {
    S.player.x = -19; S.player.z = -4; S.player.yaw = 0.15; S.player.pitch = -0.02;
    S.roundClock = 64;
    S.plant.site = 'A';
    S.plant.state = 'planted';
    S.plant.timer = 31;
    const def = S.bots.find((b) => b.id === 'def0');
    def.x = -18; def.z = -13; def.yaw = Math.PI * 0.8;
  }
  S.banner = '';
  S.bannerT = 0;
}

// ---------------------------------------------------------- boot
function boot() {
  setupScene();
  spawnFighters();
  initHUD({
    onStart: () => { ensureAudio(); startMatch(); },
    onBuy: (id) => buyItem(id),
    onRestart: () => { if (S.phase === 'matchEnd') startMatch(); else nextRound(); },
  });
  bindInput();
  const params = new URLSearchParams(window.location.search);
  const demo = params.get('demo');
  if (demo) setupDemo(demo);
  else { S.phase = 'menu'; }
  window.addEventListener('error', (e) => {
    const st = document.getElementById('boot-status');
    if (st) st.textContent = 'ERROR: ' + e.message;
  });
  let acc = 0;
  let last = performance.now();
  let frames = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 5) { step(STEP); acc -= STEP; n += 1; }
    render();
    updateHUD(S, shotSpread(WEAPONS[S.player.weapon], S.player));
    frames += 1;
    if (frames === 3) {
      const st = document.getElementById('boot-status');
      if (st) st.textContent = 'READY';
      window.__saltline = { ready: true, phase: S.phase };
    }
  }
  requestAnimationFrame(loop);
}

boot();
