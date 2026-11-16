// SALTLINE combat — hitscan rays against body/head hitboxes, grenade
// blasts, and the plant/defuse clock. No per-frame allocation here:
// the raycaster and the temp vectors are module scope.
import * as THREE from 'three';
import { WEAPONS, applyDamage, shotSpread } from './weapons.js';
import { EYE, CROUCH_EYE } from './config.js';
import { sfx } from './audio.js';

const ray = new THREE.Raycaster();
const tmpDir = new THREE.Vector3();
const tmpOrigin = new THREE.Vector3();
const tmpEnd = new THREE.Vector3();

// Fire one trigger pull from `shooter` (player or bot). `world` carries
// the scene hitboxes: world.hitMeshes (bot/player body+head meshes) and
// world.wallMeshes (occlusion). Returns {hit, head, target} or null.
export function fireWeapon(S, shooter, world, fx) {
  const w = WEAPONS[shooter.weapon];
  if (shooter.mag <= 0 || shooter.reloading) return null;
  shooter.mag -= 1;
  shooter.bloom = Math.min(0.06, shooter.bloom + w.bloom);
  shooter.recoil = Math.min(0.09, shooter.recoil + w.recoil);
  const eyeH = shooter.crouch ? CROUCH_EYE : EYE;
  tmpOrigin.set(shooter.x, shooter.y + eyeH, shooter.z);
  let result = null;
  for (let p = 0; p < w.pellets; p++) {
    const spread = shotSpread(w, shooter);
    // forward = (-sin yaw, tan pitch, -cos yaw), plus a spread jitter
    tmpDir.set(-Math.sin(shooter.yaw), Math.tan(shooter.pitch), -Math.cos(shooter.yaw));
    tmpDir.x += (Math.random() - 0.5) * 2 * spread;
    tmpDir.y += (Math.random() - 0.5) * 2 * spread;
    tmpDir.z += (Math.random() - 0.5) * 2 * spread;
    tmpDir.normalize();
    ray.set(tmpOrigin, tmpDir);
    ray.far = w.range;
    const wallHits = ray.intersectObjects(world.wallMeshes, false);
    const wallD = wallHits.length ? wallHits[0].distance : Infinity;
    const hits = ray.intersectObjects(world.hitMeshes, false);
    for (const h of hits) {
      if (h.distance > wallD) break; // a wall eats the shot first
      const mesh = h.object;
      const target = mesh.userData.fighter;
      if (!target || !target.alive || target === shooter) continue;
      const isHead = mesh.userData.part === 'head';
      const dmg = applyDamage(target, w.damage, isHead);
      fx.impact(h.point, isHead);
      if (target.hp <= 0) killFighter(S, target, shooter);
      result = { hit: true, head: isHead, target, dmg };
      break; // one pellet, one victim
    }
    const end = tmpEnd.copy(tmpDir).multiplyScalar(Math.min(wallD, w.range)).add(tmpOrigin);
    fx.tracer(tmpOrigin, end);
  }
  fx.muzzle(tmpOrigin, tmpDir);
  if (shooter.id !== 'you') sfx.enemyShot();
  return result;
}

export function killFighter(S, victim, killer) {
  victim.alive = false;
  victim.hp = 0;
  if (killer && killer.team !== victim.team) {
    if (killer.id === 'you') {
      S.money += 300;
      S.stats.kills += 1;
      S.feed.push({ text: `You eliminated ${victim.name}  +$300`, t: S.time });
    } else if (killer.team === 'atk') {
      S.feed.push({ text: `${killer.name} eliminated ${victim.name}`, t: S.time });
    } else {
      S.feed.push({ text: `${victim.name} was eliminated by ${killer.name}`, t: S.time });
    }
  }
  if (victim.id === 'you') S.stats.deaths += 1;
}

// Grenade blast: falloff damage in a radius, through no walls (simple
// and readable; the fuse and bounce are the skill, not wall math).
export function explodeGrenade(S, g, world, fx) {
  fx.explosion(g.x, g.y, g.z);
  sfx.explosion();
  const fighters = [S.player, ...S.bots];
  for (const f of fighters) {
    if (!f.alive) continue;
    const dx = f.x - g.x, dy = (f.y + 1) - g.y, dz = f.z - g.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d < 6.5) {
      const dmg = 90 * (1 - d / 6.5) + 10;
      applyDamage(f, dmg, false);
      if (f.hp <= 0) killFighter(S, f, g.owner);
    }
  }
}

// Plant/defuse progress while E is held near a site (attackers plant,
// defenders defuse). Called every fixed step from the sim.
export function updateObjective(S, dt, planting, defusing) {
  const p = S.plant;
  if (S.phase !== 'live') return;
  if (p.state === 'none' && planting) {
    p.progress += dt / 3.5;
    if (p.progress >= 1) {
      p.state = 'planted'; p.timer = 35; p.progress = 0;
      S.stats.plants += 1;
      S.money += 300;
      S.banner = 'CHARGE PLANTED — defend it!';
      S.bannerT = 3;
      S.feed.push({ text: 'Charge planted at site ' + p.site + '  +$300', t: S.time });
    }
  } else if (p.state === 'none') {
    p.progress = Math.max(0, p.progress - dt * 2);
  }
  if (p.state === 'planted') {
    p.timer -= dt;
    if (defusing) {
      p.progress += dt / 5;
      if (p.progress >= 1) {
        p.state = 'defused'; p.progress = 0;
        S.stats.defuses += 1;
        return 'defused';
      }
    } else {
      p.progress = Math.max(0, p.progress - dt * 2);
    }
    if (p.timer <= 0) { p.state = 'detonated'; return 'detonated'; }
  }
  return null;
}

// Which site is the player standing in (for the plant prompt)?
export function siteAt(x, z) {
  for (const key of ['A', 'B']) {
    const s = { A: { x: -20, z: -10.5, r: 4.2 }, B: { x: 20, z: -10.5, r: 4.2 } }[key];
    const dx = x - s.x, dz = z - s.z;
    if (dx * dx + dz * dz < s.r * s.r) return key;
  }
  return null;
}
