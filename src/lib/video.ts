/**
 * موتور ساخت ویدئو و عکس از متن و صدا — کاملاً روی دستگاه.
 *   عکس  : کارت پست از متن + برندینگ (PNG با کیفیت بالا)
 *   ویدئو: کلیپ «کارaoke» با متن همگام، پس‌زمینهٔ متحرک، موج‌نمای زنده
 *          و صدای فایل — خروجی WebM (استاندارد و سبک اندروید).
 * همه از API‌های استاندارد مرورگر (Canvas / Web Audio / MediaRecorder).
 */

import { stripMarkersForDisplay } from "./text";
import type { Clip } from "./idb";
import { toneById, voiceById } from "./voices";

export type MediaFormat = "reel" | "clip";
export type MediaStyle = "royal" | "night" | "tricolor" | "gold";

export interface MediaOptions {
  format: MediaFormat;
  style: MediaStyle;
}

export const MEDIA_FORMATS: { id: MediaFormat; label: string; hint: string }[] = [
  { id: "reel", label: "ریلز / استوری", hint: "عمودی ۹:۱۶" },
  { id: "clip", label: "کلیپ", hint: "افقی ۱۶:۹" },
];

export const MEDIA_STYLES: { id: MediaStyle; label: string; swatch: string }[] = [
  { id: "royal", label: "سلطنتی", swatch: "linear-gradient(135deg,#0a1226,#1c2c54 55%,#8a6d1f)" },
  { id: "night", label: "شب", swatch: "linear-gradient(135deg,#05070d,#0b2530 60%,#0f766e)" },
  { id: "tricolor", label: "ملی", swatch: "linear-gradient(135deg,#0b3d2e,#f5f2ea 50%,#7f1d1d)" },
  { id: "gold", label: "طلایی", swatch: "linear-gradient(135deg,#1a0f2e,#3b2a63 55%,#b8860b)" },
];

const SIZE: Record<MediaFormat, { w: number; h: number; img: number }> = {
  reel: { w: 720, h: 1280, img: 2 },
  clip: { w: 1280, h: 720, img: 1.5 },
};

/* ---------------- deterministic helpers ---------------- */

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

interface Particle {
  x: number;
  y: number;
  r: number;
  sp: number;
  ph: number;
}
function makeParticles(seed: number, w: number, h: number): Particle[] {
  const rand = mulberry32(seed);
  const n = Math.round((w * h) / 26000);
  const out: Particle[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      x: rand(),
      y: rand(),
      r: 1 + rand() * 2.4,
      sp: 0.008 + rand() * 0.02,
      ph: rand() * Math.PI * 2,
    });
  }
  return out;
}

/* ---------------- text layout ---------------- */

interface Layout {
  lines: string[];
  pages: number[][]; // line indices per page
  pageSeconds: number[];
  lineSeconds: number[];
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\n+/)) {
    const words = para.split(/\s+/).filter(Boolean);
    let cur = "";
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (ctx.measureText(test).width <= maxW || !cur) cur = test;
      else {
        out.push(cur);
        cur = w;
      }
    }
    if (cur) out.push(cur);
  }
  return out.slice(0, 60);
}

export function layoutClip(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
  durationSec: number,
  maxLinesPerPage: number,
): Layout {
  const lines = wrapText(ctx, text, maxW);
  if (lines.length === 0) {
    return { lines: ["…"], pages: [[0]], pageSeconds: [durationSec], lineSeconds: [durationSec] };
  }
  const totalChars = lines.reduce((s, l) => s + l.length + 2, 0);
  const lineSeconds = lines.map((l) => (durationSec * (l.length + 2)) / totalChars);
  const pages: number[][] = [];
  const pageSeconds: number[] = [];
  for (let i = 0; i < lines.length; i += maxLinesPerPage) {
    pages.push(lines.slice(i, i + maxLinesPerPage).map((_, k) => i + k));
    pageSeconds.push(
      lines.slice(i, i + maxLinesPerPage).reduce((s, l, k) => s + lineSeconds[i + k], 0),
    );
  }
  return { lines, pages, pageSeconds, lineSeconds };
}

/* ---------------- painting ---------------- */

function styleColors(s: MediaStyle): { top: string; mid: string; bot: string; accent: string; text: string } {
  switch (s) {
    case "royal":
      return { top: "#0a1226", mid: "#16234a", bot: "#0a0f1f", accent: "#e8bd55", text: "#f4efe4" };
    case "night":
      return { top: "#04070d", mid: "#0a222c", bot: "#051019", accent: "#2dd4bf", text: "#eef4f2" };
    case "tricolor":
      return { top: "#0b3d2e", mid: "#f3efe6", bot: "#7f1d1d", accent: "#e8bd55", text: "#f7f4ec" };
    case "gold":
      return { top: "#170e2b", mid: "#332457", bot: "#120a20", accent: "#e8bd55", text: "#f4efe4" };
  }
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  style: MediaStyle,
  t: number,
  particles: Particle[],
) {
  const c = styleColors(style);
  const g = ctx.createLinearGradient(0, 0, w * 0.35, h);
  g.addColorStop(0, c.top);
  g.addColorStop(0.55, c.mid);
  g.addColorStop(1, c.bot);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // slow moving glow
  const gx = w * (0.5 + 0.3 * Math.sin(t * 0.12));
  const gy = h * (0.28 + 0.1 * Math.cos(t * 0.09));
  const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, Math.max(w, h) * 0.55);
  rg.addColorStop(0, c.accent + "2e");
  rg.addColorStop(1, "transparent");
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, w, h);

  // tricolor gets a subtle central band
  if (style === "tricolor") {
    ctx.fillStyle = "rgba(243,239,230,0.10)";
    ctx.fillRect(0, h * 0.42, w, h * 0.16);
  }

  // drifting particles
  for (const p of particles) {
    const px = ((p.x + t * p.sp) % 1) * w;
    const py = (p.y - t * p.sp * 0.6) % 1;
    const pyy = (py + 1) % 1 * h;
    const a = 0.14 + 0.12 * Math.sin(t * 1.4 + p.ph);
    ctx.beginPath();
    ctx.arc(px, pyy, p.r, 0, Math.PI * 2);
    ctx.fillStyle = c.accent + Math.round(a * 255).toString(16).padStart(2, "0");
    ctx.fill();
  }
}

function drawChrome(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  style: MediaStyle,
  clip: Clip,
  bars: number[],
  progress: number,
) {
  const c = styleColors(style);
  const font = (weight: number, size: number) => `${weight} ${size}px Vazirmatn, sans-serif`;

  // top brand
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.font = font(800, Math.round(w * 0.034));
  ctx.fillStyle = c.accent;
  ctx.fillText("ندای پهلوی", w - w * 0.045, h * 0.062);
  ctx.font = font(500, Math.round(w * 0.02));
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText("تبدیل متن به صدا و ویدئو", w - w * 0.045, h * 0.062 + w * 0.026);

  // bottom waveform
  const n = bars.length;
  const bw = (w * 0.62) / n;
  const cx = w * 0.5;
  const baseY = h * 0.9;
  for (let i = 0; i < n; i++) {
    const bh = 4 + bars[i] * h * 0.035;
    const x = cx - (n * bw) / 2 + i * bw;
    ctx.fillStyle =
      (i / n <= progress ? c.accent : "rgba(255,255,255,0.28)") +
      (i / n <= progress ? "" : "");
    ctx.fillRect(x + bw * 0.18, baseY - bh, bw * 0.64, bh);
  }

  // caption
  const voice = voiceById(clip.voiceId);
  const tone = toneById(clip.toneId);
  ctx.textAlign = "center";
  ctx.font = font(600, Math.round(w * 0.022));
  ctx.fillStyle = "rgba(255,255,255,0.66)";
  ctx.fillText(
    `${voice.name}  ·  ${tone.title}  ·  ن_دای پهلوی`.replace("ن_دای", "ندای"),
    w / 2,
    h * 0.955,
  );

  // progress hairline
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fillRect(0, h - 6, w, 6);
  ctx.fillStyle = c.accent;
  ctx.fillRect(0, h - 6, w * progress, 6);
}

function drawTextBlock(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  style: MediaStyle,
  layout: Layout,
  t: number,
  durationSec: number,
) {
  const c = styleColors(style);
  // find active page & line
  let acc = 0;
  let pageIdx = 0;
  for (let i = 0; i < layout.pageSeconds.length; i++) {
    if (t < acc + layout.pageSeconds[i]) {
      pageIdx = i;
      break;
    }
    acc += layout.pageSeconds[i];
    pageIdx = i;
  }
  const page = layout.pages[pageIdx];
  let pageStart = 0;
  for (let i = 0; i < pageIdx; i++) pageStart += layout.pageSeconds[i];
  let activeLine = page[0];
  let lineAcc = pageStart;
  for (const li of page) {
    if (t < lineAcc + layout.lineSeconds[li]) {
      activeLine = li;
      break;
    }
    lineAcc += layout.lineSeconds[li];
  }

  const fs = w * (w > h ? 0.042 : 0.052);
  const lh = fs * 1.75;
  const blockH = page.length * lh;
  let y = (h - blockH) / 2 + fs * 0.9;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  for (const li of page) {
    const active = li === activeLine;
    const size = active ? fs * 1.06 : fs * 0.98;
    ctx.font = active ? `800 ${Math.round(size)}px Vazirmatn, sans-serif` : `600 ${Math.round(size)}px Vazirmatn, sans-serif`;
    // soft shadow for legibility
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = active ? 22 : 10;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = active ? c.accent : c.text + "d9";
    ctx.fillText(layout.lines[li], w / 2, y);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    y += lh;
  }
}

/* ---------------- public API ---------------- */

async function ensureFont() {
  try {
    await (document as Document & { fonts?: FontFaceSet }).fonts?.load(
      "800 64px Vazirmatn",
      "ندای پهلوی",
    );
  } catch {
    /* fallback font will be used */
  }
}

function buildCanvas(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function renderFrame(
  canvas: HTMLCanvasElement,
  opts: MediaOptions,
  clip: Clip,
  t: number,
  bars: number[],
  analyser?: AnalyserNode | null,
) {
  const S = SIZE[opts.format];
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const seed = hashStr(clip.id + opts.style);
  const particles = makeParticles(seed, S.w, S.h);
  drawBackground(ctx, S.w, S.h, opts.style, t, particles);

  const text = stripMarkersForDisplay(clip.text) || "…";
  ctx.font = "600 30px Vazirmatn, sans-serif";
  const maxW = S.w * (opts.format === "reel" ? 0.84 : 0.8);
  const maxLines = opts.format === "reel" ? 5 : 3;
  const layout = layoutClip(ctx, text, maxW, clip.durationSec || 1, maxLines);

  // live waveform bars from the analyser when available
  let bars2 = bars;
  if (analyser) {
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    bars2 = [];
    for (let i = 0; i < bars.length; i++) {
      const v = data[Math.floor((i / bars.length) * data.length * 0.6)] / 255;
      bars2.push(Math.max(0.06, v * 1.4));
    }
  }

  drawTextBlock(ctx, S.w, S.h, opts.style, layout, t, clip.durationSec || 1);
  drawChrome(ctx, S.w, S.h, opts.style, clip, bars2, (t / (clip.durationSec || 1)) % 1);
}

function seededBars(seed: string, n: number): number[] {
  const rand = mulberry32(hashStr(seed));
  let level = 0.5;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    level = Math.min(1, Math.max(0.12, level + (rand() - 0.5) * 0.4));
    out.push(level);
  }
  return out;
}

/** یک عکس (کارت پست) از متن و برندینگ — بدون صدا. */
export async function renderCover(clip: Clip, opts: MediaOptions): Promise<Blob> {
  await ensureFont();
  const S = SIZE[opts.format];
  const canvas = buildCanvas(Math.round(S.w * S.img), Math.round(S.h * S.img));
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.scale(S.img, S.img);
  const bars = seededBars(clip.id, 64);
  renderFrame(canvas, opts, clip, (clip.durationSec || 1) * 0.3, bars);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("ساخت عکس ممکن نشد."))),
      "image/png",
      1,
    );
  });
}

/** کلیپ ویدئو با صدا — به‌مدت واقعی صدا رندر می‌شود (پیشرفت زنده). */
export async function renderVideo(
  clip: Clip,
  opts: MediaOptions,
  audioBlob: Blob,
  onProgress: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  await ensureFont();
  const S = SIZE[opts.format];
  const canvas = buildCanvas(S.w, S.h);
  const durationSec = clip.durationSec || 1;

  const AC = window.AudioContext || (window as any).webkitAudioContext;
  const actx: AudioContext = new AC();
  let decoded: AudioBuffer;
  try {
    decoded = await actx.decodeAudioData(await audioBlob.arrayBuffer());
  } catch {
    await actx.close();
    throw new Error("پخش دوبارهٔ فایل صدا ممکن نشد.");
  }

  const stream = canvas.captureStream(30);
  const dest = actx.createMediaStreamDestination();
  const analyser = actx.createAnalyser();
  analyser.fftSize = 256;
  const src = actx.createBufferSource();
  src.buffer = decoded;
  src.connect(analyser);
  analyser.connect(dest);
  stream.addTrack(dest.stream.getAudioTracks()[0]);

  const mimeCandidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  const mime = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";
  if (!mime) {
    src.disconnect();
    await actx.close();
    throw new Error("مرورگر این دستگاه ویدئو WebM نمی‌سازد.");
  }
  const rec = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: 2_600_000,
  });
  const pieces: BlobPart[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size > 0) pieces.push(e.data);
  };

  const bars = seededBars(clip.id, 64);
  const t0 = performance.now();
  let done = false;
  let rafId = 0;
  let resolveOut: (b: Blob) => void = () => {};
  let rejectOut: (e: Error) => void = () => {};
  let settled = false;

  const cleanup = () => {
    stream.getTracks().forEach((tr) => tr.stop());
    actx.close().catch(() => {});
  };
  const settle = (ok: boolean, blob?: Blob, err?: Error) => {
    if (settled) return;
    settled = true;
    done = true;
    cancelAnimationFrame(rafId);
    try {
      src.stop();
    } catch {
      /* noop */
    }
    if (ok && blob) {
      resolveOut(blob);
      cleanup();
      return;
    }
    rejectOut(err ?? new Error("ساخت ویدئو ممکن نشد."));
    cleanup();
  };

  const stop = (ok: boolean) => {
    if (done) return;
    done = true;
    cancelAnimationFrame(rafId);
    try {
      src.stop();
    } catch {
      /* noop */
    }
    setTimeout(() => {
      if (rec.state !== "inactive") {
        rec.onstop = () => {
          const blob = new Blob(pieces, { type: "video/webm" });
          settle(ok, ok ? blob : undefined, ok ? undefined : new Error("ساخت ویدئو ناتمام ماند."));
        };
        rec.stop();
      } else {
        const blob = new Blob(pieces, { type: "video/webm" });
        settle(ok, ok ? blob : undefined, ok ? undefined : new Error("ساخت ویدئو ناتمام ماند."));
      }
    }, 300);
  };

  const loop = () => {
    const t = (performance.now() - t0) / 1000;
    renderFrame(canvas, opts, clip, Math.min(t, durationSec), bars, analyser);
    onProgress(Math.min(1, t / durationSec));
    if (t >= durationSec + 0.35) stop(true);
    else rafId = requestAnimationFrame(loop);
  };

  return await new Promise<Blob>((resolve, reject) => {
    resolveOut = resolve;
    rejectOut = reject;
    const onAbort = () => {
      done = true;
      cancelAnimationFrame(rafId);
      try {
        if (rec.state !== "inactive") rec.stop();
      } catch {
        /* noop */
      }
      reject(new Error("CANCELLED"));
      cleanup();
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    rec.onerror = () => {
      stop(false);
      rejectOut(new Error("ساخت ویدئو ممکن نشد."));
    };
    src.onended = () => stop(true);
    rec.start(250);
    src.start();
    rafId = requestAnimationFrame(loop);
  });
}
