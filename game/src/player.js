// SALTLINE player — pointer-lock look, acceleration movement, crouch,
// jump, ADS. Pure sim: reads `input`, writes the fighter, no DOM here.
import { ACCEL, CROUCH_SPEED, ADS_SPEED, FRICTION, GRAVITY, JUMP_VEL, PLAYER_RADIUS, WALK_SPEED } from './config.js';
import { collideCircle } from './map.js';

export function createInput() {
  return {
    fwd: false, back: false, left: false, right: false,
    crouch: false, jump: false, sprint: false,
    fire: false, ads: false, reload: false, plant: false,
    buy: false, slot: 0, grenade: false,
  };
}

// Fixed-step movement. `vel` is a persistent {x,z} object owned by the
// caller (main.js), so the hot loop allocates nothing.
export function movePlayer(S, input, dt, vel) {
  const p = S.player;
  if (!p.alive) return;
  const sin = Math.sin(p.yaw), cos = Math.cos(p.yaw);
  let ix = 0, iz = 0;
  if (input.fwd) { ix += -sin; iz += -cos; }
  if (input.back) { ix += sin; iz += cos; }
  if (input.left) { ix += -cos; iz += sin; }
  if (input.right) { ix += cos; iz += -sin; }
  const il = Math.hypot(ix, iz);
  if (il > 0) { ix /= il; iz /= il; }
  const maxSpeed = p.crouch ? CROUCH_SPEED : p.ads ? ADS_SPEED : WALK_SPEED;
  vel.x += ix * ACCEL * dt;
  vel.z += iz * ACCEL * dt;
  const sp = Math.hypot(vel.x, vel.z);
  if (sp > maxSpeed) { vel.x *= maxSpeed / sp; vel.z *= maxSpeed / sp; }
  if (il === 0) {
    const f = Math.max(0, 1 - FRICTION * dt);
    vel.x *= f; vel.z *= f;
    if (sp < 0.05) { vel.x = 0; vel.z = 0; }
  }
  p.x += vel.x * dt;
  p.z += vel.z * dt;
  collideCircle(p, PLAYER_RADIUS);
  p.moving = sp > 0.6;
  // vertical: jump + gravity, ground is y=0
  if (input.jump && p.y === 0) p.vy = JUMP_VEL;
  p.vy -= GRAVITY * dt;
  p.y += p.vy * dt;
  if (p.y <= 0) { p.y = 0; p.vy = 0; }
  p.airborne = p.y > 0.02;
  // recoil recovery + bloom decay (gunfeel lives in the sim, not the HUD)
  p.recoil = Math.max(0, p.recoil - dt * 0.22);
  p.bloom = Math.max(0, p.bloom - dt * 0.03);
}

// Mouse look: yaw around Y, pitch clamped. Recoil kicks the pitch up;
// the player pulls it back down.
export function applyLook(p, dx, dy) {
  p.yaw -= dx * 0.0021;
  p.pitch -= dy * 0.0021;
  const lim = 1.45;
  if (p.pitch > lim) p.pitch = lim;
  if (p.pitch < -lim) p.pitch = -lim;
}
