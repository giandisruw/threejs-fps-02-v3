// SALTLINE state — one store, owned here. Rendering, input and AI read
// and write this object only; nothing else keeps a second copy of it.
import { BUY_TIME, START_MONEY } from './config.js';

export function makeFighter(id, team, name, x, z, yaw) {
  return {
    id, team, name,
    x, z, y: 0, vy: 0, yaw, pitch: 0,
    hp: 100, armor: 0, helmet: false, alive: true,
    weapon: 'p250', mag: 0, reserve: 0,
    reloading: false, reloadT: 0,
    bloom: 0, recoil: 0, // gunfeel state, decays in the sim
    crouch: false, ads: false, moving: false, airborne: false,
    // bot-only fields (the player leaves them null)
    ai: null,
  };
}

export function makeBotAI(kind) {
  return {
    kind, // 'escort' | 'holder' | 'roamer'
    mode: 'move', // move | hold | engage | rotate | defuse | dead
    path: [], pathI: 0,
    holdT: 0, holdYaw: 0,
    target: null, // fighter id currently engaged
    burstLeft: 0, shootT: 0, aimErr: 0,
    reactT: 0, repathT: 0, stuckT: 0,
    lastX: 0, lastZ: 0,
    site: null, // assigned site 'A' | 'B'
    lane: null, // assigned lane 'A' | 'mid' | 'B'
  };
}

export function createState() {
  const S = {
    phase: 'menu', // menu | buy | live | roundEnd | matchEnd
    phaseT: 0, // seconds in this phase
    round: 1,
    score: { atk: 0, def: 0 },
    streak: 0, // consecutive rounds the attackers lost
    money: START_MONEY,
    buyTime: BUY_TIME,
    roundClock: 0,
    plant: { state: 'none', site: null, progress: 0, timer: 0 },
    player: makeFighter('you', 'atk', 'You', 0, 15, 0),
    bots: [], // 2 allies + 4 defenders, built by main.js
    grenades: [], // {x,y,z,vx,vy,vz,fuse,owner}
    feed: [], // killfeed lines {text, t}
    banner: '', // centre-screen announcement
    bannerT: 0,
    winner: null, // 'atk' | 'def' once the match ends
    roundWinner: null,
    stats: { kills: 0, deaths: 0, plants: 0, defuses: 0 },
    demo: null, // 'fight' | 'site' | 'buy' | 'menu' when ?demo= is set
    time: 0, // total sim time
    seed: 1337,
  };
  // the menu screen shows the pistol loaded before the match starts
  S.player.mag = 12;
  S.player.reserve = 36;
  return S;
}

// The player's bought weapons. mag/reserve live on the fighter; this is
// the catalogue of what the player owns this match (resets each match).
export function freshArsenal() {
  return { p250: { mag: 12, reserve: 36 } };
}
