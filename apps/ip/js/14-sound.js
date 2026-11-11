/* apps/ip/js/14-sound.js — sound: the descent tone and the rest, off until asked.
 * One of the files ip used to be. Read ../MAP.md first: it lists what
 * every file defines and uses. All files share one global scope and
 * load in numeric order from index.html. */

'use strict';

/* ══ SOUND ════════════════════════════════════════════════
 * The descent, sounded. Synthesised, never sampled: zero bytes shipped,
 * and it keeps the rule the whole app is built on -- a sampled chime is
 * decoration, a tone computed from the address is the same kind of object
 * as every mark on screen.
 *
 * layers() was already a Shepard tone and nobody noticed for weeks. Its
 * octaves are superposed, each fading in as the one before fades out, and
 * the weights sum to one. That is the equation, built for visual reasons.
 * So this does not invent an envelope: it reads layerAlpha, the same array
 * the picture is drawn from, and hands it to oscillators. The picture and
 * the sound are the same mathematics read twice.
 *
 * A rung's octave is its index on the ladder, wrapped at OCTAVES. The wrap
 * is the illusion -- pitch descends forever without getting lower -- and it
 * is honest here rather than a trick, because every rung really does look
 * like every other rung: 64x64 cells, whatever depth you are at. The rail
 * carries the true count for anyone who wants it.
 *
 * Nothing decorates idle time, and that applies to the ears. There is no
 * loop. The master gain is pushed up by movement and left with a decay
 * scheduled, so silence returns on its own without needing a frame to
 * arrive -- which matters, because frames stop when the axis does. */

var OCTAVES = 4;
var SOUND_KEY = 'ip.v1.sound';
var snd = null;      /* the audio graph, once a gesture has allowed one */

function soundRemembered() {
  try { return localStorage.getItem(SOUND_KEY) === '1'; } catch (_) { return false; }
}
function rememberSound(on) {
  try { localStorage.setItem(SOUND_KEY, on ? '1' : '0'); } catch (_) { }
}

/* The visitor's own note. Two people hear different ones, and rotating
 * your address changes yours -- a fact about addresses, delivered through
 * the ears rather than written down. */
function baseHz() {
  if (!S.home) return 523.25;
  var n = Number(S.home.big % BigInt(12));
  return 523.25 * Math.pow(2, n / 12);
}

function soundStart() {
  if (snd) return true;
  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  try {
    var ctx = new AC();
    var master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    var voices = [], i, o, g;
    for (i = 0; i < OCTAVES; i++) {
      o = ctx.createOscillator(); g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = baseHz() / Math.pow(2, i);
      g.gain.value = 0;
      o.connect(g); g.connect(master); o.start();
      voices.push({ osc: o, gain: g });
    }
    snd = { ctx: ctx, master: master, voices: voices };
    return true;
  } catch (_) { snd = null; return false; }
}

/* Called from the frame, after layers(), because that is what computes the
 * weights this reads. */
/* Wrapped, and deliberately. This runs inside the frame, and the first
 * cut of it threw -- voices[i].gain is the GainNode, its .gain is the
 * AudioParam -- which took the exception straight out of tick() and
 * stopped the picture dead. Sound is the most optional thing in the
 * product and it does not get to do that. Same principle as the renderer
 * falling back without the address ever noticing. */
function soundFrame() {
  if (!S.sound || !snd) return;
  try { soundFrameInner(); } catch (_) { S.sound = false; }
}
function soundFrameInner() {
  var ctx = snd.ctx, t = ctx.currentTime, i, k, r, w;
  if (ctx.state === 'suspended') { try { ctx.resume(); } catch (_) { } }
  var acc = new Array(OCTAVES);
  for (i = 0; i < OCTAVES; i++) acc[i] = 0;
  for (i = 0; i < SLOTS; i++) {
    r = S.rungs[i];
    if (!r) continue;
    w = layerAlpha[LY.SLOT0 + i];
    if (!(w > 0)) continue;
    /* ladder index, not slot: slots are a recycled ring and carry no
     * pitch meaning, while the ladder index IS the depth */
    k = ((r.k % OCTAVES) + OCTAVES) % OCTAVES;
    acc[k] += w;
  }
  for (i = 0; i < OCTAVES; i++) {
    snd.voices[i].gain.gain.setTargetAtTime(Math.min(acc[i], 1) * 0.22, t, 0.05);
  }
  /* up now, and down by itself shortly after. Re-pushed on every frame the
   * axis moves, so holding a drag holds the tone and letting go ends it
   * without anything having to notice that it stopped. */
  snd.master.gain.cancelScheduledValues(t);
  snd.master.gain.setTargetAtTime(1, t, 0.04);
  snd.master.gain.setTargetAtTime(0, t + 0.10, 0.09);
}

/* THE STRIKE. One clear hit, on the visitor's own note two octaves up, so
 * the celebration belongs to the same instrument as the descent rather
 * than being a sound effect laid over it. Lands with the flare. */
function strike() {
  if (!S.sound || !snd) return;
  try {
    var ctx = snd.ctx, t = ctx.currentTime;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(baseHz() * 4, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    o.connect(g); g.connect(snd.master);
    /* straight past the master's movement gate: this is an event, and it
     * has to be heard whether or not the axis happens to be moving */
    snd.master.gain.cancelScheduledValues(t);
    snd.master.gain.setTargetAtTime(1, t, 0.01);
    snd.master.gain.setTargetAtTime(0, t + 1.0, 0.12);
    o.start(t); o.stop(t + 1.2);
  } catch (_) { }
}

function setSound(on) {
  if (on && !soundStart()) return;
  S.sound = !!on;
  rememberSound(S.sound);
  if (!S.sound && snd) {
    var t = snd.ctx.currentTime;
    snd.master.gain.cancelScheduledValues(t);
    snd.master.gain.setTargetAtTime(0, t, 0.05);
  }
  if (el.sound) {
    el.sound.setAttribute('aria-pressed', S.sound ? 'true' : 'false');
    el.sound.textContent = S.sound ? 'Sound on' : 'Sound';
  }
}
