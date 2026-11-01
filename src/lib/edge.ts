/**
 * بخش آنلاین: گفتار استودیویی فارسی (Dilara / Farid) از سرویس رایگان
 * Read-Aloud مایکروسافت — مستقیماً از گوشی/مرورگر، بدون سرور خودمان.
 * کلاینت سبک و خالص مرورگری؛ احراز هویت Sec-MS-GEC نسخهٔ v2
 * (الگوریتم متن‌باز، همان edge-tts 7.3 / msedge-tts 2.1).
 */

import {
  buildSpeechChunks,
  humanizeForSpeech,
  normalizePersian,
  applyPauseMarkers,
} from "./text";
import { mulberry32 } from "./audio/dsp";
import {
  toneById,
  voiceById,
  type ToneId,
  type VoiceId,
} from "./voices";

const TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const WSS_URL =
  "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1";
const OUT_FORMAT = "audio-24khz-96kbitrate-mono-mp3";

/* ---------------- Sec-MS-GEC v2 token (open algorithm) ---------------- */

const EDGE_COPYRIGHT =
  "Copyright (C) Microsoft Corporation. All rights reserved.";
const SWAP_FIRST_WORD = {
  swappedWord: 0xef0569fb,
  swappedSum: 0x76f50f34,
  swappedProduct: 0xc3efea97,
};
const SWAP_SECOND_WORD = {
  swappedWord: 0xc31713db,
  swappedSum: 0x1881ce3c,
  swappedProduct: 0x35bd1ec9,
};
const MIX_FIRST_WORD = [0xcf98b111, 0x87085b9f, 0x12ceb96d, 0x257e1d83];
const MIX_SECOND_WORD = [0xa27416f5, 0xd38396ff, 0x7c932b89, 0xbfa49f69];

function swapHalves(value: number): number {
  return ((value << 16) | (value >>> 16)) >>> 0;
}
function swapTerm(
  word: number,
  key: number,
  m: typeof SWAP_FIRST_WORD,
): number {
  const sum = Math.imul(word, key) + Math.imul(swapHalves(word), m.swappedWord);
  const product = Math.imul(swapHalves(sum), m.swappedSum) >>> 0;
  return (Math.imul(swapHalves(product), m.swappedProduct) + product) >>> 0;
}
function swapAndMultiply(value: number, multipliers: number[]): number {
  let v = value;
  for (const m of multipliers) v = Math.imul(swapHalves(v), m) >>> 0;
  return v;
}
function cs64(message: Uint8Array, digest: Uint8Array): Uint8Array {
  const dv = new DataView(digest.buffer, digest.byteOffset, digest.byteLength);
  const firstKey = (dv.getUint32(0, true) | 1) >>> 0;
  const secondKey = (dv.getUint32(4, true) | 1) >>> 0;
  const padded = new Uint8Array(Math.ceil(message.length / 8) * 8);
  padded.set(message);
  const words = new DataView(padded.buffer);
  let swapSum = 0;
  let lastSwap = 0;
  let mix = 0;
  let mixSum = 0;
  for (let offset = 0; offset < padded.length; offset += 8) {
    const firstWord = words.getUint32(offset, true);
    const secondWord = words.getUint32(offset + 4, true);
    const firstSwap = swapTerm(firstWord, firstKey, SWAP_FIRST_WORD);
    lastSwap = swapTerm(secondWord, secondKey, SWAP_SECOND_WORD);
    swapSum = (swapSum + firstSwap + lastSwap) >>> 0;
    mix = swapAndMultiply(Math.imul(mix + firstWord, firstKey), MIX_FIRST_WORD);
    mixSum = (mixSum + mix) >>> 0;
    mix = swapAndMultiply(Math.imul(mix + secondWord, secondKey), MIX_SECOND_WORD);
    mixSum = (mixSum + mix) >>> 0;
  }
  const checksum = new Uint8Array(8);
  const cv = new DataView(checksum.buffer);
  cv.setUint32(0, lastSwap ^ mix, true);
  cv.setUint32(4, swapSum ^ mixSum, true);
  return checksum;
}
const toUpperHex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

async function secMsGecV2(): Promise<string> {
  let ticks = Math.floor(Date.now() / 1000) + 11644473600;
  ticks -= ticks % 300;
  const message = new TextEncoder().encode(
    EDGE_COPYRIGHT + `${ticks * 10000000}${TOKEN}`,
  );
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", message),
  );
  return `${toUpperHex(cs64(message, digest))}-${toUpperHex(digest)}`;
}

/* ---------------- voices & tone prosody (studio feel, gentle) ---------------- */

const EDGE_BASE: Record<
  VoiceId,
  { name: string; pitchHz: number; rate: number }
> = {
  female: { name: "fa-IR-DilaraNeural", pitchHz: 0, rate: 0 },
  male: { name: "fa-IR-FaridNeural", pitchHz: 10, rate: 1 },
  narrator: { name: "fa-IR-FaridNeural", pitchHz: -55, rate: -7 },
};

const EDGE_TONES: Record<
  ToneId,
  { rate: number; pitchHz: number; volume: number }
> = {
  happy: { rate: 7, pitchHz: 18, volume: 3 },
  friendly: { rate: -2, pitchHz: 6, volume: 0 },
  news: { rate: 3, pitchHz: -12, volume: 2 },
  story: { rate: -9, pitchHz: -18, volume: 0 },
  emotional: { rate: -11, pitchHz: -8, volume: -2 },
};

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, Math.round(n)));

const signed = (n: number, unit: string) => `${n >= 0 ? "+" : ""}${n}${unit}`;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const randomHex = (bytes: number) => {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
};

/* ---------------- synthesis ---------------- */

export interface EdgeOptions {
  text: string;
  voiceId: VoiceId;
  toneId: ToneId;
  /** user fine-tune: -50..50 (%) */
  rate: number;
  /** user fine-tune: -100..100 */
  pitch: number;
  /** per-phrase micro-variation for a human feel */
  humanize: boolean;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

export interface EdgeResult {
  audio: Uint8Array;
  mime: string;
}

/**
 * Synthesise Persian speech over the Edge Read-Aloud websocket.
 * Returns concatenated MP3 bytes (24 kHz mono, 96 kbps).
 */
export async function synthesizeEdge(opts: EdgeOptions): Promise<EdgeResult> {
  const base = EDGE_BASE[opts.voiceId];
  const tone = EDGE_TONES[opts.toneId];
  const text = opts.humanize
    ? humanizeForSpeech(opts.text)
    : normalizePersian(applyPauseMarkers(opts.text));
  const chunks = buildSpeechChunks(text, { maxChars: 550, softChars: 220 });
  if (chunks.length === 0) throw new Error("متنی برای خواندن وجود ندارد.");

  const seed = randomHex(8);
  const rand = mulberry32(parseInt(seed.slice(0, 8), 16) || 1);

  const ssmls = chunks.map((c, i) => {
    let rate = base.rate + tone.rate + opts.rate;
    let pitchHz = base.pitchHz + tone.pitchHz + opts.pitch;
    let volume = tone.volume;
    if (opts.humanize) {
      rate += (rand() * 2 - 1) * 1.6;
      pitchHz += (rand() * 2 - 1) * 3;
      if (c.endMark === "؟") rate += 1;
      if (i === chunks.length - 1) {
        rate -= 3;
        pitchHz -= 6;
      }
    }
    rate = clamp(rate, -50, 50);
    pitchHz = clamp(pitchHz, -180, 180);
    volume = clamp(volume, -40, 40);
    return (
      `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" ` +
      `xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="fa-IR">` +
      `<voice name="${base.name}">` +
      `<prosody rate="${signed(rate, "%")}" pitch="${signed(pitchHz, "Hz")}" volume="${signed(volume, "%")}">` +
      `${escapeXml(c.text)}` +
      `</prosody></voice></speak>`
    );
  });

  const gec = await secMsGecV2();
  const connId = randomHex(16);
  const url =
    `${WSS_URL}?TrustedClientToken=${TOKEN}` +
    `&Sec-MS-GEC=${gec}&Sec-MS-GEC-Version=2-143.0.3650.96&ConnectionId=${connId}`;

  return await new Promise<EdgeResult>((resolve, reject) => {
    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch (e) {
      reject(e instanceof Error ? e : new Error("اتصال برقرار نشد."));
      return;
    }
    ws.binaryType = "arraybuffer";

    const parts: Uint8Array[] = [];
    let chunkIdx = 0;
    let finished = false;
    let settled = false;

    const fail = (msg: string) => {
      if (settled) return;
      settled = true;
      finished = true;
      try {
        ws.close();
      } catch {
        /* noop */
      }
      reject(new Error(msg));
    };
    const finish = () => {
      if (settled || !finished) return;
      if (parts.length === 0) {
        reject(new Error("خروجی صوتی خالی بود؛ دوباره تلاش کنید."));
        return;
      }
      settled = true;
      const total = parts.reduce((s, p) => s + p.length, 0);
      const out = new Uint8Array(total);
      let o = 0;
      for (const p of parts) {
        out.set(p, o);
        o += p.length;
      }
      resolve({ audio: out, mime: "audio/mpeg" });
      try {
        ws.close();
      } catch {
        /* noop */
      }
    };

    const sendChunk = (idx: number) => {
      const requestId = randomHex(16);
      const req =
        `X-RequestId:${requestId}\r\n` +
        `Content-Type:application/ssml+xml\r\n` +
        `X-Timestamp:${new Date().toUTCString()}Z\r\n` +
        `Path:ssml\r\n\r\n${ssmls[idx]}`;
      ws.send(req);
      // remember which requestId belongs to this chunk
      chunkRequestIds[idx] = requestId;
    };
    const chunkRequestIds: (string | null)[] = chunks.map(() => null);

    const timer = setTimeout(() => fail("زمان اتصال به سرویس تمام شد."), 60000);

    ws.onopen = () => {
      ws.send(
        `Content-Type:application/json; charset=utf-8\r\n` +
          `Path:speech.config\r\n\r\n` +
          `{"context":{"synthesis":{"audio":{"metadataoptions":` +
          `{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},` +
          `"outputFormat":"${OUT_FORMAT}"}}}}`,
      );
      setTimeout(() => {
        if (settled || ws.readyState !== WebSocket.OPEN) return;
        chunkIdx = 0;
        sendChunk(0);
        opts.onProgress?.(0.02);
      }, 150);
    };

    ws.onmessage = (ev) => {
      if (typeof ev.data === "string") {
        const msg = ev.data;
        const m = /X-RequestId:([0-9a-f]{32})/.exec(msg);
        const requestId = m ? m[1] : null;
        if (msg.includes("Path:turn.end") && requestId) {
          const idx = chunkRequestIds.indexOf(requestId);
          if (idx >= 0 && idx === chunkIdx) {
            chunkIdx += 1;
            opts.onProgress?.(0.02 + 0.96 * (chunkIdx / chunks.length));
            if (chunkIdx < chunks.length) {
              sendChunk(chunkIdx);
            } else {
              finished = true;
              clearTimeout(timer);
              finish();
            }
          }
        }
        return;
      }
      // binary audio frame: "Path:audio\r\n<mp3 bytes>"
      const buf = new Uint8Array(ev.data as ArrayBuffer);
      const delim = "Path:audio\r\n";
      const head = new TextDecoder()
        .decode(buf.subarray(0, Math.min(buf.length, delim.length + 16)))
        .indexOf(delim);
      if (head === 0) {
        parts.push(buf.slice(delim.length));
      }
    };

    ws.onerror = () => {
      clearTimeout(timer);
      fail("اتصال به سرویس آنلاین برقرار نشد؛ اینترنت را بررسی کنید.");
    };
    ws.onclose = () => {
      clearTimeout(timer);
      if (!settled) {
        if (parts.length > 0 && finished) finish();
        else fail("اتصال به سرویس آنلاین قطع شد؛ دوباره تلاش کنید.");
      }
    };

    opts.signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      try {
        ws.close();
      } catch {
        /* noop */
      }
      if (!settled) {
        settled = true;
        reject(new Error("CANCELLED"));
      }
    });
  });
}

/** Quick one-line preview of an online voice (same tone it will read in). */
export async function previewEdgeVoice(
  voiceId: VoiceId,
  toneId: ToneId,
): Promise<EdgeResult> {
  return synthesizeEdge({
    text: voiceById(voiceId).sampleText,
    voiceId,
    toneId,
    rate: 0,
    pitch: 0,
    humanize: false,
  });
}

export const toneTitle = (id: ToneId) => toneById(id).title;
