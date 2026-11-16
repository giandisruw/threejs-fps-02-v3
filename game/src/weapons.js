// SALTLINE weapons — one table, one fire model. Damage, spread and
// recoil all live here so the sim never hard-codes a gun.
export const WEAPONS = {
  p250: {
    name: 'P250 Dune', price: 0, kind: 'pistol',
    damage: 34, headMult: 2.0, pellets: 1, rpm: 320,
    mag: 12, reserveMax: 36, reload: 1.5,
    spread: 0.011, moveSpread: 0.03, airSpread: 0.05, adsSpread: 0.005,
    recoil: 0.011, bloom: 0.006, range: 60, auto: false,
  },
  smg: {
    name: 'SMG Squall', price: 1500, kind: 'smg',
    damage: 26, headMult: 2.0, pellets: 1, rpm: 780,
    mag: 32, reserveMax: 96, reload: 2.1,
    spread: 0.017, moveSpread: 0.038, airSpread: 0.06, adsSpread: 0.009,
    recoil: 0.008, bloom: 0.005, range: 45, auto: true,
  },
  rifle: {
    name: 'Longshore Rifle', price: 2700, kind: 'rifle',
    damage: 33, headMult: 2.0, pellets: 1, rpm: 600,
    mag: 30, reserveMax: 90, reload: 2.4,
    spread: 0.008, moveSpread: 0.032, airSpread: 0.055, adsSpread: 0.003,
    recoil: 0.013, bloom: 0.007, range: 70, auto: true,
  },
  shotgun: {
    name: 'Breaker Shotgun', price: 1800, kind: 'shotgun',
    damage: 9, headMult: 2.0, pellets: 8, rpm: 72,
    mag: 6, reserveMax: 24, reload: 2.8,
    spread: 0.05, moveSpread: 0.065, airSpread: 0.08, adsSpread: 0.04,
    recoil: 0.05, bloom: 0.02, range: 22, auto: false,
  },
  he: {
    name: 'HE Charge', price: 300, kind: 'grenade',
    damage: 90, headMult: 1, pellets: 1, rpm: 60,
    mag: 1, reserveMax: 2, reload: 0, spread: 0,
    moveSpread: 0, airSpread: 0, adsSpread: 0,
    recoil: 0, bloom: 0, range: 0, auto: false,
  },
};

export const BUY_MENU = [
  { id: 'rifle', label: 'Longshore Rifle — $2700', price: 2700 },
  { id: 'shotgun', label: 'Breaker Shotgun — $1800', price: 1800 },
  { id: 'smg', label: 'SMG Squall — $1500', price: 1500 },
  { id: 'armor', label: 'Kevlar Vest — $650', price: 650 },
  { id: 'helmet', label: 'Helmet — $350', price: 350 },
  { id: 'he', label: 'HE Charge — $300', price: 300 },
  { id: 'ammo', label: 'Ammo refill — $200', price: 200 },
];

// Spread (radians) for one shot: standing still and aimed pays, moving
// or jumping punishes. ADS and crouch tighten it.
export function shotSpread(w, f) {
  let s = w.spread + f.bloom;
  if (f.moving) s += w.moveSpread;
  if (f.airborne) s += w.airSpread;
  if (f.ads) s = Math.min(s, w.adsSpread + f.bloom * 0.5);
  if (f.crouch) s *= 0.7;
  return s;
}

// Damage after armour and helmet. Armour absorbs half of what is left;
// a helmet cuts a headshot multiplier from 2.0 to 1.4.
export function applyDamage(target, raw, isHead) {
  let dmg = raw;
  if (isHead) dmg *= target.helmet ? 1.4 : 2.0;
  if (target.armor > 0) {
    const absorbed = Math.min(target.armor, dmg * 0.5);
    target.armor -= absorbed;
    dmg -= absorbed;
  }
  target.hp -= dmg;
  return dmg;
}
