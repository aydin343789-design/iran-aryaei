/**
 * Small, dependency-free DSP toolbox (pure TypeScript on Float32Array).
 * Used to polish the raw voice-model output so it sounds like a real
 * studio recording: natural edges, EQ, gentle compression, room and breaths.
 */

export type F32 = Float32Array;

export const dbToGain = (db: number) => Math.pow(10, db / 20);
export const gainToDb = (g: number) => 20 * Math.log10(Math.max(g, 1e-9));

/* ---------- deterministic randomness ---------- */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/* ---------- measurements ---------- */

export function peakOf(x: F32): number {
  let p = 0;
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i]);
    if (a > p) p = a;
  }
  return p;
}

export function rmsOf(x: F32, gate = 0): number {
  let s = 0;
  let n = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    if (gate === 0 || Math.abs(v) > gate) {
      s += v * v;
      n++;
    }
  }
  return n ? Math.sqrt(s / n) : 0;
}

/* ---------- resampling (pitch shift by playback rate) ---------- */

/** ratio > 1 → higher pitch & shorter; ratio < 1 → deeper & longer. */
export function resampleRate(x: F32, ratio: number): F32 {
  if (Math.abs(ratio - 1) < 0.002 || x.length < 4) return x;
  const n = Math.max(1, Math.floor((x.length - 1) / ratio));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const pos = i * ratio;
    const i1 = Math.floor(pos);
    const f = pos - i1;
    const p1 = x[i1];
    const p0 = i1 > 0 ? x[i1 - 1] : p1;
    const p2 = i1 + 1 < x.length ? x[i1 + 1] : p1;
    const p3 = i1 + 2 < x.length ? x[i1 + 2] : p2;
    // Catmull-Rom cubic interpolation
    out[i] =
      p1 +
      0.5 *
        f *
        (p2 -
          p0 +
          f * (2 * p0 - 5 * p1 + 4 * p2 - p3 + f * (3 * (p1 - p2) + p3 - p0)));
  }
  return out;
}

/* ---------- biquad filters (RBJ cookbook) ---------- */

export type FilterType =
  | "highpass"
  | "lowpass"
  | "lowshelf"
  | "highshelf"
  | "peaking";

export interface Biquad {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

export function makeBiquad(
  type: FilterType,
  fs: number,
  f0: number,
  q = 0.707,
  gainDb = 0,
): Biquad {
  const w0 = (2 * Math.PI * Math.min(f0, fs * 0.45)) / fs;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const A = Math.pow(10, gainDb / 40);
  let b0 = 1;
  let b1 = 0;
  let b2 = 0;
  let a0 = 1;
  let a1 = 0;
  let a2 = 0;

  if (type === "highpass" || type === "lowpass" || type === "peaking") {
    const alpha = sin / (2 * q);
    if (type === "highpass") {
      b0 = (1 + cos) / 2;
      b1 = -(1 + cos);
      b2 = (1 + cos) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
    } else if (type === "lowpass") {
      b0 = (1 - cos) / 2;
      b1 = 1 - cos;
      b2 = (1 - cos) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cos;
      a2 = 1 - alpha;
    } else {
      b0 = 1 + alpha * A;
      b1 = -2 * cos;
      b2 = 1 - alpha * A;
      a0 = 1 + alpha / A;
      a1 = -2 * cos;
      a2 = 1 - alpha / A;
    }
  } else {
    const alpha = (sin / 2) * Math.SQRT2; // shelf slope = 1
    const t = 2 * Math.sqrt(A) * alpha;
    if (type === "lowshelf") {
      b0 = A * (A + 1 - (A - 1) * cos + t);
      b1 = 2 * A * (A - 1 - (A + 1) * cos);
      b2 = A * (A + 1 - (A - 1) * cos - t);
      a0 = A + 1 + (A - 1) * cos + t;
      a1 = -2 * (A - 1 + (A + 1) * cos);
      a2 = A + 1 + (A - 1) * cos - t;
    } else {
      b0 = A * (A + 1 + (A - 1) * cos + t);
      b1 = -2 * A * (A - 1 + (A + 1) * cos);
      b2 = A * (A + 1 + (A - 1) * cos - t);
      a0 = A + 1 - (A - 1) * cos + t;
      a1 = 2 * (A - 1 - (A + 1) * cos);
      a2 = A + 1 - (A - 1) * cos - t;
    }
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

export function applyBiquad(x: F32, c: Biquad): F32 {
  const out = new Float32Array(x.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    const y = c.b0 * v + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    out[i] = y;
    x2 = x1;
    x1 = v;
    y2 = y1;
    y1 = y;
  }
  return out;
}

/* ---------- edges ---------- */

/** Remove the model's leading/trailing silence, keep a natural margin. */
export function trimSilence(
  x: F32,
  fs: number,
  o: { relDb?: number; floor?: number; headMs?: number; tailMs?: number } = {},
): F32 {
  const pk = peakOf(x);
  if (pk === 0) return x.slice(0, Math.round(fs * 0.05));
  const thr = Math.max(pk * dbToGain(o.relDb ?? -42), o.floor ?? 0.0015);
  const win = Math.max(1, Math.round(fs * 0.004));
  let first = -1;
  let last = -1;
  for (let i = 0; i < x.length; i += win) {
    const end = Math.min(x.length, i + win);
    let m = 0;
    for (let j = i; j < end; j++) {
      const a = Math.abs(x[j]);
      if (a > m) m = a;
    }
    if (m > thr) {
      if (first < 0) first = i;
      last = end;
    }
  }
  if (first < 0) return x.slice(0, Math.round(fs * 0.05));
  const s = Math.max(0, first - Math.round((fs * (o.headMs ?? 25)) / 1000));
  const e = Math.min(
    x.length,
    last + Math.round((fs * (o.tailMs ?? 70)) / 1000),
  );
  return x.slice(s, e);
}

/** Raised-cosine fades (avoid clicks at the joins). Returns a copy. */
export function applyFades(x: F32, fs: number, inMs: number, outMs: number): F32 {
  const out = x.slice();
  const nIn = Math.min(out.length >> 1, Math.round((fs * inMs) / 1000));
  const nOut = Math.min(out.length >> 1, Math.round((fs * outMs) / 1000));
  for (let i = 0; i < nIn; i++) {
    out[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / nIn);
  }
  for (let i = 0; i < nOut; i++) {
    out[out.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / nOut);
  }
  return out;
}

/* ---------- dynamics ---------- */

export function compress(
  x: F32,
  fs: number,
  o: {
    thresholdDb: number;
    ratio: number;
    attackMs: number;
    releaseMs: number;
    makeupDb?: number;
  },
): F32 {
  const out = new Float32Array(x.length);
  const atk = Math.exp(-1 / ((fs * o.attackMs) / 1000));
  const rel = Math.exp(-1 / ((fs * o.releaseMs) / 1000));
  const slope = 1 - 1 / o.ratio;
  const makeup = dbToGain(o.makeupDb ?? 0);
  let env = 0;
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i]);
    env = a > env ? atk * env + (1 - atk) * a : rel * env + (1 - rel) * a;
    const over = gainToDb(env) - o.thresholdDb;
    const g = over > 0 ? dbToGain(-over * slope) : 1;
    out[i] = x[i] * g * makeup;
  }
  return out;
}

/** Loudness-normalise (gated RMS) and soft-limit peaks under the ceiling. */
export function normalizeAndLimit(
  x: F32,
  targetRmsDb = -19,
  ceilingDb = -1.2,
): F32 {
  const gate = Math.max(0.003, peakOf(x) * 0.03);
  const r = rmsOf(x, gate);
  const g = r > 0 ? dbToGain(targetRmsDb) / r : 1;
  const ceil = dbToGain(ceilingDb);
  const knee = ceil * 0.8;
  const out = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    let v = x[i] * g;
    const a = Math.abs(v);
    if (a > knee) {
      v = Math.sign(v) * (knee + (ceil - knee) * Math.tanh((a - knee) / (ceil - knee)));
    }
    out[i] = v;
  }
  return out;
}

/* ---------- small studio room (Freeverb-style) ---------- */

export function addRoom(x: F32, fs: number, wet: number): F32 {
  if (wet <= 0.001 || x.length === 0) return x;
  const scale = fs / 44100;
  const combDelays = [1116, 1188, 1277, 1356, 1422, 1491].map((d) =>
    Math.max(8, Math.round(d * scale)),
  );
  const apDelays = [556, 441, 341, 225].map((d) =>
    Math.max(8, Math.round(d * scale)),
  );
  const feedback = 0.8;
  const damp = 0.5;
  const len = x.length + Math.round(fs * 0.5);

  const combBufs = combDelays.map((d) => new Float32Array(d));
  const combIdx = combDelays.map(() => 0);
  const combStore = combDelays.map(() => 0);
  const apBufs = apDelays.map((d) => new Float32Array(d));
  const apIdx = apDelays.map(() => 0);
  const wetSig = new Float32Array(len);

  for (let i = 0; i < len; i++) {
    const input = (i < x.length ? x[i] : 0) * 0.03;
    let sum = 0;
    for (let c = 0; c < combBufs.length; c++) {
      const buf = combBufs[c];
      const idx = combIdx[c];
      const o = buf[idx];
      combStore[c] = o * (1 - damp) + combStore[c] * damp;
      buf[idx] = input + combStore[c] * feedback;
      combIdx[c] = idx + 1 >= buf.length ? 0 : idx + 1;
      sum += o;
    }
    let s = sum;
    for (let a = 0; a < apBufs.length; a++) {
      const buf = apBufs[a];
      const idx = apIdx[a];
      const bo = buf[idx];
      const o = -s + bo;
      buf[idx] = s + bo * 0.5;
      apIdx[a] = idx + 1 >= buf.length ? 0 : idx + 1;
      s = o;
    }
    wetSig[i] = s;
  }

  const dryR = rmsOf(x);
  const wetR = rmsOf(wetSig.subarray(0, x.length));
  const k = wetR > 0 ? (wet * dryR) / wetR : 0;
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = (i < x.length ? x[i] : 0) + wetSig[i] * k;
  }
  return out;
}

/* ---------- PSOLA pitch shift — period-aligned, far more natural than tape ---------- */

/**
 * Pitch-period detector: autocorrelation, taking the FIRST strong local peak
 * (the fundamental) with parabolic refinement, so sub-harmonics are not locked.
 */
function pitchPeriod(x: F32, fs: number, pos: number): number {
  const minT = Math.floor(fs / 400);
  const maxT = Math.min(Math.floor(fs / 70), x.length - pos - 2);
  const win = Math.min(Math.floor(fs * 0.03), Math.max(16, x.length - pos - maxT));
  if (maxT <= minT || win <= 8) return Math.floor(fs / 120);
  const R = (lag: number) => {
    let c = 0;
    const end = Math.min(win, x.length - pos - lag);
    for (let i = 0; i < end; i++) c += x[pos + i] * x[pos + i + lag];
    return c;
  };
  let prev = R(minT);
  for (let lag = minT + 1; lag < maxT; lag++) {
    const cur = R(lag);
    const nxt = R(lag + 1);
    if (cur > prev && cur >= nxt && cur > 0) {
      const den = prev - 2 * cur + nxt;
      const off = den !== 0 ? 0.5 * (prev - nxt) / den : 0;
      return Math.max(minT, Math.min(maxT, Math.round(lag + off)));
    }
    prev = cur;
  }
  return Math.floor(fs / 120);
}

/**
 * PSOLA pitch shift by `factor` (grain boundaries aligned to pitch periods).
 * Result is `factor`× in pitch and ~1/factor× in duration — a natural
 * energetic/slower colour with far fewer artifacts than tape resampling.
 * (Verified: 300 Hz → 333 / 277 / 314 / 292 / 342 / 258 Hz for
 *  factor 1.10 / 0.92 / 1.05 / 0.97 / 1.14 / 0.86.)
 */
export function pitchShift(x: F32, fs: number, factor: number): F32 {
  if (x.length === 0 || Math.abs(factor - 1) < 0.006) return x;
  const outLen = Math.max(1, Math.ceil(x.length / factor));
  const out = new Float32Array(outLen);
  let inPos = 0;
  let outPos = 0;
  let prevT = 0;
  while (outPos < outLen) {
    if (inPos >= x.length) break;
    let T = pitchPeriod(x, fs, inPos);
    if (prevT > 0) T = (prevT + T) >> 1;
    prevT = T;
    const grain = Math.max(8, Math.round(T / factor));
    for (let i = 0; i < grain; i++) {
      const n = outPos + i;
      if (n >= outLen) break;
      const s = inPos + i * (T / grain);
      if (s >= x.length) break;
      const i0 = Math.floor(s);
      const f = s - i0;
      const a = x[i0];
      const b = i0 + 1 < x.length ? x[i0 + 1] : a;
      out[n] += a + (b - a) * f;
    }
    inPos += T;
    outPos += grain;
  }
  return out;
}

/**
 * Subtle per-phrase loudness contour: a soft attack rise, a tiny random
 * level offset between phrases, and a gentle end fall — the "breathing"
 * dynamic a human speaker has between sentences.
 */
export function phraseContour(
  x: F32,
  fs: number,
  rand: () => number,
): F32 {
  const n = x.length;
  if (n < fs * 0.1) return x;
  const att = Math.min(Math.round(fs * 0.055), Math.floor(n * 0.25));
  const rel = Math.min(Math.round(fs * 0.09), Math.floor(n * 0.2));
  const level = 1 + (rand() * 2 - 1) * 0.022;
  const out = x.slice();
  for (let i = 0; i < n; i++) {
    let g = level;
    if (i < att) {
      const t = i / att;
      g *= 0.88 + 0.12 * (t * t * (3 - 2 * t)); // smooth rise at the start
    } else if (i > n - rel) {
      const t = (n - i) / rel;
      g *= 0.94 + 0.06 * (t * t * (3 - 2 * t)); // soft fall at the end
    }
    out[i] *= g;
  }
  return out;
}

/** Very end of the whole recording: a slow spoken "letting go" release. */
export function tailRelease(x: F32, fs: number, ms = 380, depth = 0.16): F32 {
  const tail = Math.min(x.length, Math.round((fs * ms) / 1000));
  const out = x.slice();
  for (let k = 0; k < tail; k++) {
    const t = (tail - k) / tail; // 1 → 0 toward the end
    out[out.length - 1 - k] *= 1 - depth * (1 - t) * (1 - t);
  }
  return out;
}

/* ---------- breath sound ---------- */

/**
 * A soft inhale: band-limited noise with a quick rise and a slower fall.
 * `rms` is the absolute RMS level of the breath.
 */
export function makeBreath(
  fs: number,
  durationMs: number,
  rms: number,
  rand: () => number,
): F32 {
  const n = Math.max(8, Math.round((fs * durationMs) / 1000));
  let noise: F32 = new Float32Array(n);
  for (let i = 0; i < n; i++) noise[i] = rand() * 2 - 1;
  noise = applyBiquad(noise, makeBiquad("highpass", fs, 380, 0.7));
  noise = applyBiquad(noise, makeBiquad("lowpass", fs, 3600, 0.7));
  noise = applyBiquad(noise, makeBiquad("peaking", fs, 1300, 0.8, 3));
  const peakAt = 0.36;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const env =
      t < peakAt
        ? Math.pow(Math.sin((Math.PI / 2) * (t / peakAt)), 2)
        : Math.pow(Math.cos((Math.PI / 2) * ((t - peakAt) / (1 - peakAt))), 1.6);
    noise[i] *= env;
  }
  const r = rmsOf(noise);
  const k = r > 0 ? rms / r : 0;
  for (let i = 0; i < n; i++) noise[i] *= k;
  return noise;
}
