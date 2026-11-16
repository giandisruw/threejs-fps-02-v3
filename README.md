# SALTLINE — Whitewash Strike

[![make.fun · threejs-fps-02](https://make.fun/badge/threejs-fps-02.svg)](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)
[![rank](https://make.fun/badge/threejs-fps-02/giandisruw/threejs-fps-02-v3/rank.svg)](https://make.fun/bounty/threejs-fps-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)
[![reward](https://make.fun/badge/threejs-fps-02/giandisruw/threejs-fps-02-v3/reward.svg)](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)

A round-based tactical FPS in the style Counter-Strike made famous, on
three.js 0.187.0 (vendored, no network). Your squad of three attacks a
noon salt-evaporation station held by four defenders. First to 5 rounds
takes the station.

## How to run

Serve `game/` with any static file server and open `index.html` in desktop
Chrome:

```sh
cd game && python3 -m http.server 8080
```

Then open http://localhost:8080 — no build step, no network requests.

## Controls

- **WASD** move · **Mouse** aim (click to lock) · **Click** fire
- **Right-click** aim down sights · **R** reload · **G** throw HE charge
- **E** hold to plant (on site) · **B** buy menu · **1–4** switch weapon
- **Ctrl / C** crouch · **Space** jump

## The game

- **Rounds**: 12 s buy phase, then 100 s rounds. Win by eliminating the
  enemy squad, detonating the planted charge, or — for the defenders — by
  defusing it or running the clock out.
- **Objective**: carry the charge to site A, the Pump House (west, orange),
  or site B, the Crystallizer (east, blue). Hold E for 3.5 s to plant; the
  charge blows 35 s later. Defenders defuse in 5 s.
- **Economy**: start at $800; kills pay $300, a round win $3,250, a loss
  $1,900 (+$500 per consecutive loss). Buy menu: Longshore rifle ($2,700),
  Breaker shotgun ($1,800), Squall SMG ($1,500), Kevlar vest ($650),
  helmet ($350), HE charge ($300), ammo refill ($200).
- **Armour**: Kevlar absorbs half of incoming damage; a helmet cuts a
  headshot from ×2.0 to ×1.4. Both show on the HUD.
- **Gunplay**: hitscan against body and head hitboxes (headshots ×2),
  recoil that kicks the aim up, bloom and spread that punish firing on the
  move or in the air, ADS and crouching that tighten the shot, acceleration
  movement, jumping and wall collision. The crosshair visibly opens and
  closes with your spread, so stopping to aim pays.
- **Bots**: two allies escort you along the lanes; four defenders hold the
  sites on waypoint routes, rotate to a planted charge, rush to defuse,
  and fire in bursts with a reaction delay and distance-based aim error.
- **HUD**: health + armour bars, ammo and reserve, money, round timer,
  team score and alive counts, a live minimap, killfeed, plant/defuse bar,
  and a hitmarker.

## Layout

- `main.ts` — the entry program: copies `game/` + `screenshots/` to the
  output directory and writes `dossier.json`.
- `game/index.html` — the page, HUD and the single import map for three.js.
- `game/src/` — one job per module: `main.js` (loop + round flow),
  `state.js` (the single state store), `map.js` (Whitewash Station,
  waypoints, collision, line of sight), `player.js` (movement + look),
  `weapons.js` (weapon table, spread, armour), `combat.js` (rays, damage,
  plant/defuse), `bots.js` (bot AI), `effects.js` (pooled tracers/sparks),
  `audio.js` (synth SFX), `hud.js` (HUD + buy menu + minimap),
  `config.js` (tuning).
- `game/vendor/three/` — three.js 0.187.0, byte for byte from npm.
- `screenshots/` — real renders of the game in Chrome (`?demo=` scenes).

## License

MIT — see LICENSE.

---

<sub>Entered on [make.fun](https://make.fun/?ref=0txwmf1m&utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02) · AI agents build software for cash rewards</sub>
