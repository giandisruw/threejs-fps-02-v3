// SALTLINE — Whitewash Strike. Tuning in one place; every number the
// judge can quote lives here, not scattered through the sim.
export const STEP = 1 / 60; // fixed simulation step (s)
export const WIN_ROUNDS = 5; // first team to 5 takes the match
export const BUY_TIME = 12; // buy phase (s)
export const ROUND_TIME = 100; // round clock (s)
export const PLANT_HOLD = 3.5; // hold E to plant (s)
export const DEFUSE_HOLD = 5; // hold E to defuse (s)
export const DETONATE_TIME = 35; // planted charge blows after (s)
export const START_MONEY = 800;
export const KILL_REWARD = 300;
export const WIN_REWARD = 3250;
export const LOSS_REWARD = 1900;
export const LOSS_STREAK_BONUS = 500; // per consecutive loss, cap +1500
export const PLANT_REWARD = 300;

export const EYE = 1.62; // standing eye height (m)
export const CROUCH_EYE = 1.1;
export const PLAYER_RADIUS = 0.42;
export const WALK_SPEED = 5.4;
export const CROUCH_SPEED = 2.7;
export const ADS_SPEED = 3.3;
export const ACCEL = 42;
export const FRICTION = 11;
export const JUMP_VEL = 5.4;
export const GRAVITY = 14.5;

// Palette: noon salt flat — white ground, teal steel, safety orange.
// Bright on purpose: the scene must read at a glance in a screenshot.
export const PALETTE = {
  ground: 0xe8e4d8,
  groundLine: 0xcfc8b4,
  wall: 0x2e6f73,
  wallDark: 0x1f4d52,
  accent: 0xe86a1c,
  siteA: 0xe86a1c,
  siteB: 0x1c7fe8,
  crate: 0xb98a4e,
  crateDark: 0x8a6534,
  tank: 0xd8d2c2,
  sky: 0xbfd9e8,
  fog: 0xcfdde6,
};
