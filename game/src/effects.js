// SALTLINE effects — tracers, impacts, muzzle flash, explosions.
// Everything is pooled: a fixed set of objects is reused, so the hot
// loop never allocates.
import * as THREE from 'three';

const TRACERS = 14;
const SPARKS = 10;

export function initEffects(scene) {
  const tracers = [];
  for (let i = 0; i < TRACERS; i++) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: 0xffc46b, transparent: true, opacity: 0,
    }));
    line.frustumCulled = false;
    scene.add(line);
    tracers.push({ line, life: 0 });
  }
  const sparks = [];
  for (let i = 0; i < SPARKS; i++) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(24), 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffd27a, size: 0.14, transparent: true, opacity: 0,
    }));
    pts.frustumCulled = false;
    scene.add(pts);
    sparks.push({ pts, life: 0 });
  }
  const muzzle = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.34),
    new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0, side: THREE.DoubleSide }),
  );
  scene.add(muzzle);
  const boom = new THREE.Mesh(
    new THREE.SphereGeometry(1, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xff8c1c, transparent: true, opacity: 0 }),
  );
  scene.add(boom);
  const boomLight = new THREE.PointLight(0xff8c1c, 0, 18);
  scene.add(boomLight);
  let ti = 0, si = 0;
  return {
    tracer(a, b) {
      const t = tracers[ti]; ti = (ti + 1) % TRACERS;
      const pos = t.line.geometry.attributes.position.array;
      pos[0] = a.x; pos[1] = a.y; pos[2] = a.z;
      pos[3] = b.x; pos[4] = b.y; pos[5] = b.z;
      t.line.geometry.attributes.position.needsUpdate = true;
      t.line.material.opacity = 0.9;
      t.life = 0.07;
    },
    impact(p, head) {
      const s = sparks[si]; si = (si + 1) % SPARKS;
      const pos = s.pts.geometry.attributes.position.array;
      for (let k = 0; k < 8; k++) {
        pos[k * 3] = p.x + (Math.random() - 0.5) * 0.3;
        pos[k * 3 + 1] = p.y + (Math.random() - 0.5) * 0.3;
        pos[k * 3 + 2] = p.z + (Math.random() - 0.5) * 0.3;
      }
      s.pts.geometry.attributes.position.needsUpdate = true;
      s.pts.material.color.setHex(head ? 0xff5a5a : 0xffd27a);
      s.pts.material.opacity = 1;
      s.life = 0.25;
    },
    muzzle(origin, dir) {
      muzzle.position.set(origin.x + dir.x * 0.7, origin.y + dir.y * 0.7 - 0.12, origin.z + dir.z * 0.7);
      muzzle.lookAt(origin.x + dir.x * 2, origin.y + dir.y * 2, origin.z + dir.z * 2);
      muzzle.material.opacity = 0.95;
      muzzle.userData.life = 0.05;
    },
    explosion(x, y, z) {
      boom.position.set(x, y, z);
      boom.scale.setScalar(0.5);
      boom.material.opacity = 0.9;
      boom.userData.life = 0.6;
      boomLight.position.set(x, y + 1, z);
      boomLight.intensity = 60;
      boomLight.userData.life = 0.6;
    },
    update(dt) {
      for (const t of tracers) {
        if (t.life > 0) {
          t.life -= dt;
          t.line.material.opacity = Math.max(0, t.life / 0.07) * 0.9;
        }
      }
      for (const s of sparks) {
        if (s.life > 0) {
          s.life -= dt;
          s.pts.material.opacity = Math.max(0, s.life / 0.25);
        }
      }
      if (muzzle.userData.life > 0) {
        muzzle.userData.life -= dt;
        muzzle.material.opacity = Math.max(0, muzzle.userData.life / 0.05) * 0.95;
      }
      if (boom.userData.life > 0) {
        boom.userData.life -= dt;
        const k = Math.max(0, boom.userData.life / 0.6);
        boom.material.opacity = k * 0.9;
        boom.scale.setScalar(0.5 + (1 - k) * 6);
        boomLight.intensity = k * 60;
      }
    },
  };
}
