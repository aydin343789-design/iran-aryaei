import {
  addRoom,
  applyBiquad,
  applyFades,
  compress,
  dbToGain,
  makeBiquad,
  makeBreath,
  mulberry32,
  normalizeAndLimit,
  phraseContour,
  rmsOf,
  tailRelease,
  trimSilence,
  peakOf,
  type F32,
  type FilterType,
} from "./dsp";
import type { EndMark } from "../text";
import type { ToneId } from "../voices";

export interface MasterPiece {
  pcm: F32;
  endMark: EndMark;
  paragraphBreakAfter: boolean;
}

interface EqBand {
  type: FilterType;
  f: number;
  q?: number;
  gain: number;
}

interface ToneMaster {
  /** base gap after a sentence (ms) */
  gapMs: number;
  /** multiplier for a paragraph break */
  paragraphMul: number;
  /** tone-specific pause after punctuation */
  pauseMarks: Partial<Record<EndMark, number>>;
  /** deterministic jitter in sentence gaps (0 = measured/formal) */
  pauseJitter: number;
  /** how many seconds of speech between natural inhalations */
  breathAfterSec: number;
  /** min / max breath duration (ms) */
  breathDurationMs: [number, number];
  /** breath RMS relative to speech (dB) */
  breathDb: number;
  /** output loudness is kept even, with only a gentle style-specific offset */
  targetRmsDb: number;
  compressorThresholdDb: number;
  compressorRatio: number;
  eq: EqBand[];
  /** small studio room amount (0…0.2) */
  room: number;
}

export const TONE_MASTER: Record<ToneId, ToneMaster> = {
  happy: {
    gapMs: 255,
    paragraphMul: 1.9,
    pauseMarks: { "!": 0.62, "؟": 0.86, "…": 1.12, ".": 0.82, "،": 0.38, "؛": 0.55, ":": 0.62, "": 0.5 },
    pauseJitter: 0.23,
    breathAfterSec: 8.5,
    breathDurationMs: [230, 330],
    breathDb: -34,
    targetRmsDb: -18.5,
    compressorThresholdDb: -23,
    compressorRatio: 2.3,
    eq: [
      { type: "highshelf", f: 3400, gain: 3.2 },
      { type: "peaking", f: 2600, q: 0.9, gain: 2.0 },
    ],
    room: 0.025,
  },
  friendly: {
    gapMs: 385,
    paragraphMul: 2.15,
    pauseMarks: { "!": 0.9, "؟": 1.08, "…": 1.55, ".": 1.0, "،": 0.68, "؛": 0.8, ":": 0.85, "": 0.72 },
    pauseJitter: 0.13,
    breathAfterSec: 6.8,
    breathDurationMs: [280, 400],
    breathDb: -30,
    targetRmsDb: -19.2,
    compressorThresholdDb: -24,
    compressorRatio: 1.9,
    eq: [
      { type: "lowshelf", f: 190, gain: 2.6 },
      { type: "peaking", f: 900, q: 0.8, gain: 1.1 },
    ],
    room: 0.055,
  },
  news: {
    gapMs: 315,
    paragraphMul: 1.85,
    pauseMarks: { "!": 0.82, "؟": 1.02, "…": 1.15, ".": 1.18, "،": 0.48, "؛": 0.75, ":": 0.78, "": 0.75 },
    pauseJitter: 0.035,
    breathAfterSec: 12,
    breathDurationMs: [220, 300],
    breathDb: -38,
    targetRmsDb: -20.1,
    compressorThresholdDb: -22,
    compressorRatio: 2.7,
    eq: [
      { type: "peaking", f: 2400, q: 0.9, gain: 2.7 },
      { type: "lowshelf", f: 140, gain: -2.2 },
      { type: "highshelf", f: 6800, gain: 0.8 },
    ],
    room: 0.008,
  },
  story: {
    gapMs: 585,
    paragraphMul: 2.65,
    pauseMarks: { "!": 1.12, "؟": 1.62, "…": 2.0, ".": 1.42, "،": 0.82, "؛": 1.0, ":": 1.28, "": 0.82 },
    pauseJitter: 0.2,
    breathAfterSec: 4.8,
    breathDurationMs: [390, 520],
    breathDb: -26,
    targetRmsDb: -19.5,
    compressorThresholdDb: -25,
    compressorRatio: 1.75,
    eq: [
      { type: "lowshelf", f: 175, gain: 3.2 },
      { type: "peaking", f: 1050, q: 0.75, gain: 1.2 },
      { type: "highshelf", f: 5900, gain: -2.0 },
    ],
    room: 0.115,
  },
  emotional: {
    gapMs: 760,
    paragraphMul: 2.95,
    pauseMarks: { "!": 1.08, "؟": 1.5, "…": 2.45, ".": 1.72, "،": 0.92, "؛": 1.15, ":": 1.34, "": 1.0 },
    pauseJitter: 0.17,
    breathAfterSec: 4.2,
    breathDurationMs: [390, 520],
    breathDb: -31,
    targetRmsDb: -21.5,
    compressorThresholdDb: -27,
    compressorRatio: 1.55,
    eq: [
      { type: "lowshelf", f: 185, gain: 1.1 },
      { type: "peaking", f: 1450, q: 0.8, gain: 2.2 },
      { type: "highshelf", f: 5900, gain: 0.3 },
    ],
    room: 0.075,
  },
};

const MARK_MUL: Record<string, number> = {
  ".": 1,
  "!": 0.95,
  "؟": 1.1,
  "…": 1.55,
  ":": 0.8,
  "؛": 0.7,
  "،": 0.55,
  "": 0.65,
};

export interface MasterOptions {
  toneId: ToneId;
  /** natural pause lengths with variation (otherwise fixed gaps) */
  humanize: boolean;
  /** insert real, soft breath sounds at breath points */
  breaths: boolean;
  /** subtle studio room ambience */
  warmth: boolean;
  seed: number;
}

export interface MasterResult {
  pcm: F32;
  breathCount: number;
  /** total silence inserted between phrases (seconds) */
  pauseSeconds: number;
}

/** Assemble phrases with human timing, add breaths, EQ, dynamics, room. */
export function masterSpeech(
  pieces: MasterPiece[],
  fs: number,
  opt: MasterOptions,
): MasterResult {
  const tone = TONE_MASTER[opt.toneId];
  const rand = mulberry32(opt.seed ^ 0x9e3779b9);

  const contourRand = mulberry32(opt.seed ^ 0x51ed2701);
  const prepared = pieces
    .map((p) => ({
      ...p,
      pcm: phraseContour(
        applyFades(trimSilence(p.pcm, fs), fs, 6, 28),
        fs,
        opt.humanize ? contourRand : () => 0.5,
      ),
    }))
    .filter((p) => p.pcm.length > 0);

  if (prepared.length === 0) {
    return { pcm: new Float32Array(0), breathCount: 0, pauseSeconds: 0 };
  }

  // reference speech level for breath loudness
  let sq = 0;
  let cnt = 0;
  for (const p of prepared) {
    const gate = Math.max(0.003, peakOf(p.pcm) * 0.03);
    const r = rmsOf(p.pcm, gate);
    sq += r * r * p.pcm.length;
    cnt += p.pcm.length;
  }
  const speechRms = Math.sqrt(sq / Math.max(1, cnt));

  type Placed = { data: F32; start: number };
  const placed: Placed[] = [];
  let cursor = 0;
  let sinceBreath = 0;
  let breathCount = 0;
  let pauseSamples = 0;
  const ms = (v: number) => Math.round((fs * v) / 1000);

  for (let i = 0; i < prepared.length; i++) {
    const p = prepared[i];
    placed.push({ data: p.pcm, start: cursor });
    cursor += p.pcm.length;
    sinceBreath += p.pcm.length / fs;
    if (i === prepared.length - 1) break;

    const markMul = tone.pauseMarks[p.endMark] ?? MARK_MUL[p.endMark] ?? 0.8;
    const pauseVariation = opt.humanize
      ? 1 + (rand() * 2 - 1) * tone.pauseJitter
      : 1;
    let gap = tone.gapMs * markMul * pauseVariation;
    if (p.paragraphBreakAfter) {
      gap = Math.max(gap, tone.gapMs) * tone.paragraphMul;
    }
    gap = Math.max(gap, 90);

    const wantBreath =
      opt.breaths &&
      (p.paragraphBreakAfter ||
        p.endMark === "…" ||
        (sinceBreath > tone.breathAfterSec + (opt.humanize ? rand() * 1.4 : 0) && gap >= 300));

    if (wantBreath) {
      const [breathMin, breathMax] = tone.breathDurationMs;
      const dur = p.paragraphBreakAfter
        ? breathMin + rand() * (breathMax - breathMin)
        : breathMin * 0.82 + rand() * (breathMax - breathMin); 
      gap = Math.max(gap, dur + 170);
      const breath = makeBreath(
        fs,
        dur,
        speechRms * dbToGain(tone.breathDb) * (0.9 + rand() * 0.2),
        rand,
      );
      placed.push({ data: breath, start: cursor + ms(gap - dur - 70) });
      breathCount++;
      sinceBreath = 0;
    }
    cursor += ms(gap);
    pauseSamples += ms(gap);
  }

  const total = cursor + ms(150);
  let mix: F32 = new Float32Array(total);
  for (const { data, start } of placed) {
    const end = Math.min(total, start + data.length);
    for (let k = start; k < end; k++) mix[k] += data[k - start];
  }

  // ---- mastering chain ----
  mix = applyBiquad(mix, makeBiquad("highpass", fs, 70, 0.7));
  // gently tames any grain-edge brightness from the pitch shifter
  mix = applyBiquad(mix, makeBiquad("highshelf", fs, 8200, 0.707, -1.1));
  for (const b of tone.eq) {
    mix = applyBiquad(mix, makeBiquad(b.type, fs, b.f, b.q ?? 0.707, b.gain));
  }
  mix = compress(mix, fs, {
    thresholdDb: tone.compressorThresholdDb,
    ratio: tone.compressorRatio,
    attackMs: 8,
    releaseMs: 120,
  });
  if (opt.warmth) mix = addRoom(mix, fs, tone.room);
  mix = normalizeAndLimit(mix, tone.targetRmsDb, -1.2);
  mix = tailRelease(mix, fs, 380, 0.16);
  mix = applyFades(mix, fs, 4, 60);

  return { pcm: mix, breathCount, pauseSeconds: pauseSamples / fs };
}
