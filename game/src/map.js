// SALTLINE map — Whitewash Station. A noon salt-evaporation yard:
// white ground, teal steel, orange site markers. Three lanes run
// south (attackers) to north (defenders): A-long west, mid, B east.
// Sites: A = Pump House (west), B = Crystallizer (east).
import * as THREE from 'three';
import { PALETTE } from './config.js';

// Axis-aligned colliders {x0,z0,x1,z1,h}. h>1.4 blocks sight at eye level;
// lower boxes are cover you can shoot over.
export const COLLIDERS = [
  // perimeter (h 4)
  { x0: -27, z0: -19, x1: 27, z1: -18, h: 4 },
  { x0: -27, z0: 18, x1: 27, z1: 19, h: 4 },
  { x0: -27, z0: -19, x1: -26, z1: 19, h: 4 },
  { x0: 26, z0: -19, x1: 27, z1: 19, h: 4 },
  // mid doors: one wall across z=0 with two gaps
  { x0: -6, z0: -0.6, x1: -3.5, z1: 0.6, h: 3 },
  { x0: -1, z0: -0.6, x1: 1.5, z1: 0.6, h: 3 },
  { x0: 3.5, z0: -0.6, x1: 6, z1: 0.6, h: 3 },
  // site A (west) back + side walls
  { x0: -24, z0: -14.5, x1: -16, z1: -13.5, h: 3 },
  { x0: -16.5, z0: -14.5, x1: -15.5, z1: -8, h: 3 },
  // site B (east) back + side walls
  { x0: 16, z0: -14.5, x1: 24, z1: -13.5, h: 3 },
  { x0: 15.5, z0: -14.5, x1: 16.5, z1: -8, h: 3 },
  // brine tanks (cylinders, squared off as colliders)
  { x0: -12, z0: -14, x1: -8, z1: -10, h: 3.2 },
  { x0: 8, z0: -14, x1: 12, z1: -10, h: 3.2 },
  // crates: cover, low enough to shoot over standing
  { x0: -20.5, z0: 1, x1: -18.5, z1: 3, h: 1.2 },
  { x0: -20.5, z0: -7, x1: -18.5, z1: -5, h: 1.2 },
  { x0: 18.5, z0: 1, x1: 20.5, z1: 3, h: 1.2 },
  { x0: 18.5, z0: -7, x1: 20.5, z1: -5, h: 1.2 },
  { x0: -1, z0: 5, x1: 1, z1: 7, h: 1.2 },
  { x0: -9, z0: 7, x1: -7, z1: 9, h: 1.2 },
  { x0: 7, z0: 7, x1: 9, z1: 9, h: 1.2 },
  { x0: -1, z0: -9, x1: 1, z1: -7, h: 1.2 },
  { x0: -22, z0: -11, x1: -20, z1: -9, h: 1.2 },
  { x0: 20, z0: -11, x1: 22, z1: -9, h: 1.2 },
];

export const SITES = {
  A: { x: -20, z: -10.5, r: 4.2, color: PALETTE.siteA, label: 'A' },
  B: { x: 20, z: -10.5, r: 4.2, color: PALETTE.siteB, label: 'B' },
};

export const SPAWNS = {
  atk: [[0, 15], [-3, 15.5], [3, 15.5]],
  def: [[-18, -14.5], [18, -14.5], [-6, -15], [6, -15]],
};

// Waypoint graph the bots walk. Nodes are open ground; edges are straight
// walkable runs (checked against colliders when the graph was laid out).
export const WAYPOINTS = [
  { id: 0, x: 0, z: 15 }, { id: 1, x: -3, z: 15 }, { id: 2, x: 3, z: 15 },
  { id: 3, x: -19, z: 10 }, { id: 4, x: -19, z: 2 }, { id: 5, x: -19, z: -5 },
  { id: 6, x: -20, z: -10.5 }, { id: 7, x: -14, z: -11 },
  { id: 8, x: 0, z: 10 }, { id: 9, x: -2.2, z: 0 }, { id: 10, x: 2.4, z: 0 },
  { id: 11, x: 0, z: -5 }, { id: 12, x: -5, z: -8 }, { id: 13, x: 5, z: -8 },
  { id: 14, x: 19, z: 10 }, { id: 15, x: 19, z: 2 }, { id: 16, x: 19, z: -5 },
  { id: 17, x: 20, z: -10.5 }, { id: 18, x: 14, z: -11 },
  { id: 19, x: -10, z: -15.5 }, { id: 20, x: 10, z: -15.5 },
  { id: 21, x: 0, z: -15.5 }, { id: 22, x: -11, z: -6 }, { id: 23, x: 11, z: -6 },
  { id: 24, x: -8, z: 12 }, { id: 25, x: 8, z: 12 },
];
const EDGES = [
  [0, 1], [0, 2], [0, 8], [1, 24], [2, 25], [24, 3], [25, 14],
  [3, 4], [4, 5], [5, 6], [6, 7], [7, 22], [22, 12], [12, 11],
  [8, 9], [8, 10], [8, 24], [8, 25], [9, 11], [10, 11], [11, 12],
  [11, 13], [12, 22], [13, 23], [14, 15], [15, 16], [16, 17], [17, 18],
  [18, 23], [23, 13], [19, 21], [20, 21], [21, 22], [21, 23],
  [19, 7], [20, 18], [19, 12], [20, 13], [5, 22], [16, 23],
];
export const ADJ = WAYPOINTS.map(() => []);
for (const [a, b] of EDGES) { ADJ[a].push(b); ADJ[b].push(a); }

// Breadth-first route between waypoint ids. Small graph, no allocation
// beyond the returned id list.
export function findRoute(fromId, toId) {
  if (fromId === toId) return [toId];
  const prev = new Array(WAYPOINTS.length).fill(-1);
  const queue = [fromId];
  prev[fromId] = fromId;
  for (let head = 0; head < queue.length; head++) {
    const cur = queue[head];
    for (const nb of ADJ[cur]) {
      if (prev[nb] === -1) {
        prev[nb] = cur;
        if (nb === toId) {
          const path = [toId];
          let n = toId;
          while (n !== fromId) { n = prev[n]; path.push(n); }
          return path.reverse();
        }
        queue.push(nb);
      }
    }
  }
  return [toId];
}

export function nearestWaypoint(x, z) {
  let best = 0, bd = Infinity;
  for (const w of WAYPOINTS) {
    const d = (w.x - x) * (w.x - x) + (w.z - z) * (w.z - z);
    if (d < bd) { bd = d; best = w.id; }
  }
  return best;
}

// Circle-vs-AABB collision. Moves pos in place, sliding along walls.
export function collideCircle(p, r) {
  for (const c of COLLIDERS) {
    const cx = Math.max(c.x0, Math.min(p.x, c.x1));
    const cz = Math.max(c.z0, Math.min(p.z, c.z1));
    const dx = p.x - cx, dz = p.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 1e-9) {
        const d = Math.sqrt(d2);
        p.x = cx + (dx / d) * r;
        p.z = cz + (dz / d) * r;
      } else {
        // centre inside the box: push out along the smallest penetration
        const pl = p.x - c.x0, pr = c.x1 - p.x, pt = p.z - c.z0, pb = c.z1 - p.z;
        const m = Math.min(pl, pr, pt, pb);
        if (m === pl) p.x = c.x0 - r; else if (m === pr) p.x = c.x1 + r;
        else if (m === pt) p.z = c.z0 - r; else p.z = c.z1 + r;
      }
    }
  }
  p.x = Math.max(-25.5, Math.min(25.5, p.x));
  p.z = Math.max(-17.5, Math.min(17.5, p.z));
}

// 2D segment-vs-collider sight test. Tall cover blocks sight; low crates
// (h<=1.4) do not block a standing eye line.
export function hasLOS(ax, az, bx, bz) {
  for (const c of COLLIDERS) {
    if (c.h <= 1.4) continue;
    if (segmentHitsBox(ax, az, bx, bz, c)) return false;
  }
  return true;
}

function segmentHitsBox(ax, az, bx, bz, c) {
  const dx = bx - ax, dz = bz - az;
  let t0 = 0, t1 = 1;
  for (const [o, d, lo, hi] of [[ax, dx, c.x0, c.x1], [az, dz, c.z0, c.z1]]) {
    if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return false; }
    else {
      let ta = (lo - o) / d, tb = (hi - o) / d;
      if (ta > tb) { const t = ta; ta = tb; tb = t; }
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
      if (t0 > t1) return false;
    }
  }
  return true;
}

function saltTexture() {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 512;
  const g = cv.getContext('2d');
  g.fillStyle = '#e8e4d8'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5200; i++) {
    const v = 210 + Math.floor(Math.random() * 40);
    g.fillStyle = `rgb(${v},${v - 4},${v - 18})`;
    g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  g.strokeStyle = '#cfc8b4'; g.lineWidth = 2;
  for (let i = 0; i <= 8; i++) {
    g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 512); g.stroke();
    g.beginPath(); g.moveTo(0, i * 64); g.lineTo(512, i * 64); g.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 4);
  return tex;
}

function letterTexture(letter, color) {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = color; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#ffffff'; g.font = 'bold 84px sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(letter, 64, 70);
  return new THREE.CanvasTexture(cv);
}

// Builds the visible map. Returns { wallMeshes } — the meshes bullets
// raycast against for occlusion.
export function buildMap(scene) {
  const wallMeshes = [];
  const box = (x0, z0, x1, z1, h, mat) => {
    const w = x1 - x0, d = z1 - z0;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2);
    m.castShadow = true; m.receiveShadow = true;
    scene.add(m); wallMeshes.push(m);
    return m;
  };

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(54, 38),
    new THREE.MeshStandardMaterial({ map: saltTexture(), roughness: 0.95 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const wallMat = new THREE.MeshStandardMaterial({ color: PALETTE.wall, roughness: 0.7 });
  const darkMat = new THREE.MeshStandardMaterial({ color: PALETTE.wallDark, roughness: 0.75 });
  const crateMat = new THREE.MeshStandardMaterial({ color: PALETTE.crate, roughness: 0.85 });
  const tankMat = new THREE.MeshStandardMaterial({ color: PALETTE.tank, roughness: 0.5, metalness: 0.25 });

  for (const c of COLLIDERS) {
    const isPerimeter = c.h === 4;
    const isCrate = c.h === 1.2;
    if (c.x0 === -12 && c.z0 === -14) { /* tank A: cylinder below */ continue; }
    if (c.x0 === 8 && c.z0 === -14) { /* tank B: cylinder below */ continue; }
    box(c.x0, c.z0, c.x1, c.z1, c.h, isPerimeter ? darkMat : isCrate ? crateMat : wallMat);
  }
  // brine tanks as cylinders (colliders above stay square)
  for (const [cx, cz] of [[-10, -12], [10, -12]]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 3.2, 20), tankMat);
    t.position.set(cx, 1.6, cz);
    t.castShadow = true; t.receiveShadow = true;
    scene.add(t); wallMeshes.push(t);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.15, 0.25, 20),
      new THREE.MeshStandardMaterial({ color: PALETTE.accent, roughness: 0.6 }));
    cap.position.set(cx, 3.3, cz);
    scene.add(cap);
  }
  // site markers: flat coloured ring + letter board on a post
  for (const key of ['A', 'B']) {
    const s = SITES[key];
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(s.r - 0.35, s.r, 40),
      new THREE.MeshBasicMaterial({ color: s.color, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(s.x, 0.03, s.z);
    scene.add(ring);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(s.r - 0.4, 40),
      new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.1, side: THREE.DoubleSide }),
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(s.x, 0.02, s.z);
    scene.add(disc);
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.4),
      new THREE.MeshBasicMaterial({ map: letterTexture(key, key === 'A' ? '#e86a1c' : '#1c7fe8') }),
    );
    board.position.set(s.x, 4.6, s.z);
    board.rotation.y = key === 'A' ? 0.5 : -0.5;
    scene.add(board);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 3.4, 0.18), darkMat);
    post.position.set(s.x, 1.7, s.z);
    scene.add(post);
  }
  // orange guide stripes along the two outer lanes
  for (const x of [-19, 19]) {
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 30),
      new THREE.MeshBasicMaterial({ color: PALETTE.accent, transparent: true, opacity: 0.35 }),
    );
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(x, 0.025, 0);
    scene.add(stripe);
  }
  return { wallMeshes };
}
