// SALTLINE bots — waypoint routes, holds, rotates, defuses. A bot is a
// small state machine: move along its route, hold an angle, engage what
// it can see, rotate to a planted charge, defuse when it gets there.
import * as THREE from 'three';
import { WAYPOINTS, findRoute, nearestWaypoint, hasLOS, collideCircle } from './map.js';
import { WEAPONS } from './weapons.js';
import { fireWeapon } from './combat.js';
import { PLAYER_RADIUS } from './config.js';

const BOT_SPEED = 3.8;
const SEE_RANGE = 46;
const TEAM_COLOR = { atk: 0xe86a1c, def: 0x1c7fe8 };

// Visible body + head; the same meshes are the bullet hitboxes.
export function buildBotMesh(scene, bot, world) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: TEAM_COLOR[bot.team], roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.05, 0.32), bodyMat);
  body.position.y = 0.95;
  body.castShadow = true;
  body.userData = { fighter: bot, part: 'body' };
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.21, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xd8cdb4, roughness: 0.7 }),
  );
  head.position.y = 1.66;
  head.castShadow = true;
  head.userData = { fighter: bot, part: 'head' };
  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.12, 0.85),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5, metalness: 0.4 }),
  );
  gun.position.set(0.2, 1.15, -0.4);
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.08, 0.05),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.6 }),
  );
  visor.position.set(0, 1.68, -0.19);
  g.add(body, head, gun, visor);
  g.position.set(bot.x, 0, bot.z);
  scene.add(g);
  world.hitMeshes.push(body, head);
  world.botGroups.set(bot.id, g);
  return g;
}

export function syncBotMesh(world, bot) {
  const g = world.botGroups.get(bot.id);
  if (!g) return;
  g.visible = bot.alive;
  g.position.set(bot.x, bot.y, bot.z);
  g.rotation.y = bot.yaw;
}

function nearestEnemy(S, bot) {
  const foes = bot.team === 'atk' ? [S.player, ...S.bots.filter((b) => b.team === 'def')]
    : [S.player, ...S.bots.filter((b) => b.team === 'atk')];
  let best = null, bd = Infinity;
  for (const f of foes) {
    if (!f.alive) continue;
    const dx = f.x - bot.x, dz = f.z - bot.z;
    const d = Math.hypot(dx, dz);
    if (d > SEE_RANGE || d > bd) continue;
    if (!hasLOS(bot.x, bot.z, f.x, f.z)) continue;
    best = f; bd = d;
  }
  return best ? { foe: best, dist: bd } : null;
}

function aimAt(bot, tx, tz, ty, err) {
  const dx = tx - bot.x, dz = tz - bot.z;
  const d = Math.max(0.5, Math.hypot(dx, dz));
  bot.yaw = Math.atan2(-dx, -dz) + (Math.random() - 0.5) * err;
  bot.pitch = Math.atan2(ty - 1.62, d) + (Math.random() - 0.5) * err * 0.5;
}

function setRoute(bot, toId) {
  const from = nearestWaypoint(bot.x, bot.z);
  bot.ai.path = findRoute(from, toId).map((id) => WAYPOINTS[id]);
  bot.ai.pathI = 0;
  bot.ai.mode = 'move';
}

function followPath(bot, dt) {
  const ai = bot.ai;
  if (ai.pathI >= ai.path.length) { ai.mode = 'hold'; ai.holdT = 1.5 + Math.random() * 2.5; return; }
  const wp = ai.path[ai.pathI];
  const dx = wp.x - bot.x, dz = wp.z - bot.z;
  const d = Math.hypot(dx, dz);
  if (d < 0.6) { ai.pathI += 1; return; }
  bot.yaw = Math.atan2(-dx, -dz);
  bot.x += (dx / d) * BOT_SPEED * dt;
  bot.z += (dz / d) * BOT_SPEED * dt;
  collideCircle(bot, PLAYER_RADIUS);
  bot.moving = true;
}

function pickObjective(S, bot) {
  const ai = bot.ai;
  const plant = S.plant;
  if (bot.team === 'def') {
    if (plant.state === 'planted') {
      // rotate to the planted site and defuse
      const site = plant.site === 'A' ? 6 : 17;
      setRoute(bot, site);
      ai.mode = 'move';
      return;
    }
    const hold = ai.site === 'A' ? 6 : 17;
    if (nearestWaypoint(bot.x, bot.z) !== hold) { setRoute(bot, hold); return; }
    ai.mode = 'hold';
    ai.holdT = 3 + Math.random() * 3;
    ai.holdYaw = ai.site === 'A' ? Math.PI * 0.85 : Math.PI * 0.15;
    return;
  }
  // attackers: escort the player — take the lane nearest the player,
  // then push toward the player's site
  const lane = S.player.x < -6 ? 6 : S.player.x > 6 ? 17 : 11;
  setRoute(bot, lane);
}

export function updateBot(S, bot, world, dt, fx) {
  const ai = bot.ai;
  if (!bot.alive) return;
  bot.moving = false;
  // stuck detection: no progress while walking a route
  if (ai.mode === 'move') {
    ai.stuckT += dt;
    if (ai.stuckT > 1.5) {
      const moved = Math.hypot(bot.x - ai.lastX, bot.z - ai.lastZ);
      if (moved < 0.4) { ai.pathI += 1; if (ai.pathI >= ai.path.length) pickObjective(S, bot); }
      ai.lastX = bot.x; ai.lastZ = bot.z; ai.stuckT = 0;
    }
  }
  const seen = nearestEnemy(S, bot);
  if (seen) {
    if (ai.target !== seen.foe.id) { ai.target = seen.foe.id; ai.reactT = 0.35 + Math.random() * 0.35; ai.burstLeft = 0; }
    ai.mode = 'engage';
  } else if (ai.mode === 'engage') {
    ai.target = null;
    pickObjective(S, bot);
  }
  if (ai.mode === 'engage' && seen) {
    const foe = seen.foe;
    const err = 0.02 + (seen.dist / 46) * 0.05 + (foe.moving ? 0.02 : 0);
    if (ai.reactT > 0) { ai.reactT -= dt; aimAt(bot, foe.x, foe.z, 1.1, 0.01); return; }
    aimAt(bot, foe.x, foe.z, 1.1, err);
    if (bot.reloading) {
      bot.reloadT -= dt;
      if (bot.reloadT <= 0) { bot.reloading = false; bot.mag = WEAPONS[bot.weapon].mag; }
      return;
    }
    if (bot.mag <= 0) { bot.reloading = true; bot.reloadT = WEAPONS[bot.weapon].reload; return; }
    ai.shootT -= dt;
    if (ai.shootT <= 0) {
      if (ai.burstLeft <= 0) { ai.burstLeft = 3 + Math.floor(Math.random() * 3); ai.shootT = 0.55 + Math.random() * 0.6; }
      else {
        ai.burstLeft -= 1;
        ai.shootT = 60 / WEAPONS[bot.weapon].rpm;
        fireWeapon(S, bot, world, fx);
      }
    }
    return;
  }
  if (ai.mode === 'move') { followPath(bot, dt); return; }
  if (ai.mode === 'hold') {
    ai.holdT -= dt;
    bot.yaw += Math.sin(S.time * 0.5 + bot.id.length) * 0.0015; // slow scan
    if (ai.holdT <= 0) pickObjective(S, bot);
    return;
  }
  // defuse: a defender standing on a planted site with no enemy in sight
  // flags the shared defuse clock (combat.updateObjective runs it).
  if (bot.team === 'def' && S.plant.state === 'planted') {
    const site = S.plant.site === 'A' ? { x: -20, z: -10.5 } : { x: 20, z: -10.5 };
    if (Math.hypot(bot.x - site.x, bot.z - site.z) < 2.5) {
      ai.mode = 'defuse';
      S.plant.botDefusing = true;
      return;
    }
  }
  pickObjective(S, bot);
}

export function updateBots(S, world, dt, fx) {
  for (const b of S.bots) updateBot(S, b, world, dt, fx);
}
