// SALTLINE audio — synthesised WebAudio, no asset files. The context
// is created on the first user gesture; headless/demo runs stay silent.
let ctx = null;
let noiseBuf = null;

export function ensureAudio() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { ctx = null; }
}

function noise(dur, freq, gain) {
  if (!ctx) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  src.connect(f); f.connect(g); g.connect(ctx.destination);
  src.start(); src.stop(ctx.currentTime + dur);
}

function tone(freq, dur, gain, type = 'sine') {
  if (!ctx) return;
  const o = ctx.createOscillator();
  o.type = type; o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(); o.stop(ctx.currentTime + dur);
}

export const sfx = {
  shot(kind) {
    if (kind === 'shotgun') noise(0.22, 900, 0.5);
    else if (kind === 'rifle') noise(0.12, 1600, 0.35);
    else if (kind === 'smg') noise(0.07, 2200, 0.22);
    else noise(0.1, 1200, 0.3);
  },
  enemyShot() { noise(0.1, 900, 0.12); },
  reload() { tone(420, 0.07, 0.12, 'square'); setTimeout(() => tone(620, 0.07, 0.12, 'square'), 140); },
  hit(head) { tone(head ? 1400 : 1000, 0.06, 0.18, 'square'); },
  kill() { tone(880, 0.1, 0.2, 'square'); setTimeout(() => tone(1320, 0.14, 0.2, 'square'), 90); },
  hurt() { tone(160, 0.18, 0.3, 'sawtooth'); },
  plantBeep() { tone(1050, 0.09, 0.15, 'square'); },
  explosion() { noise(0.9, 320, 0.8); tone(55, 0.8, 0.5); },
  buy() { tone(740, 0.08, 0.15, 'square'); setTimeout(() => tone(990, 0.1, 0.15, 'square'), 80); },
  round() { tone(523, 0.15, 0.18, 'square'); setTimeout(() => tone(784, 0.2, 0.18, 'square'), 150); },
  click() { tone(700, 0.04, 0.1, 'square'); },
};
