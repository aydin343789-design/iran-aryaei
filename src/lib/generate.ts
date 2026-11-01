/**
 * The whole text → MP3 pipeline, running on the phone:
 *   plan (text, breathing, per-phrase variation)
 *   → neural voice model in a Web Worker (Piper / VITS)
 *   → mastering (natural timing, breaths, EQ, dynamics, room)
 *   → MP3 encoding.
 */

import { pitchShift } from "./audio/dsp";
import { masterSpeech, type MasterPiece } from "./audio/master";
import { encodeMp3 } from "./audio/mp3";
import { getEngine } from "./piper/client";
import { planSpeech } from "./plan";
import { piperByCharacter, type ToneId, type VoiceId } from "./voices";

export interface GenerateInput {
  text: string;
  voiceId: VoiceId;
  toneId: ToneId;
  /** -50 … +50 (%) */
  rate: number;
  /** -100 … +100 */
  pitch: number;
  humanize: boolean;
  breaths: boolean;
  warmth: boolean;
}

export interface GenerateProgress {
  fraction: number;
  label: string;
}

export interface GenerateResult {
  blob: Blob;
  durationSec: number;
  sizeBytes: number;
}

const toFa = (n: number) =>
  String(n).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);

export async function generateSpeech(
  input: GenerateInput,
  onProgress: (p: GenerateProgress) => void,
  signal?: AbortSignal,
): Promise<GenerateResult> {
  const plan = planSpeech(input);
  const total = plan.chunks.length;
  if (total === 0) throw new Error("متنی برای خواندن وجود ندارد.");

  const voice = piperByCharacter(input.voiceId);
  const engine = getEngine();

  onProgress({ fraction: 0.02, label: "در حال بارگذاری مدل صدا روی دستگاه…" });
  await engine.ensureVoice(voice);

  onProgress({ fraction: 0.1, label: "گوینده در حال خواندن متن است…" });
  const pcms: Float32Array[] = new Array(total);
  let sampleRate = 22050;
  let done = 0;
  await engine.synthesize(
    voice,
    plan.chunks.map((c) => ({
      text: c.modelText,
      lengthScale: c.lengthScale,
      noiseScale: c.noiseScale,
      noiseW: c.noiseW,
    })),
    (index, pcm, sr) => {
      pcms[index] = pcm;
      sampleRate = sr;
      done++;
      onProgress({
        fraction: 0.1 + 0.75 * (done / total),
        label:
          total > 1
            ? `در حال خواندن… جملهٔ ${toFa(done)} از ${toFa(total)}`
            : "در حال خواندن…",
      });
    },
    signal,
  );

  onProgress({ fraction: 0.87, label: "تنظیم نفس‌گیری، مکث‌ها و رنگ صدا…" });
  await new Promise((r) => setTimeout(r, 16));
  const pieces: MasterPiece[] = plan.chunks.map((c, i) => ({
    // grain-based shift: the tone's pitch colour without tape artifacts
    pcm: pitchShift(pcms[i] ?? new Float32Array(0), sampleRate, c.pitchRatio),
    endMark: c.endMark,
    paragraphBreakAfter: c.paragraphBreakAfter,
  }));
  const mastered = masterSpeech(pieces, sampleRate, {
    toneId: input.toneId,
    humanize: input.humanize,
    breaths: input.breaths,
    warmth: input.warmth,
    seed: plan.seed,
  });
  if (mastered.pcm.length === 0) {
    throw new Error("صدایی تولید نشد؛ متن را بررسی کنید و دوباره تلاش کنید.");
  }

  const mp3 = await encodeMp3(mastered.pcm, sampleRate, 96, (f) =>
    onProgress({ fraction: 0.9 + 0.1 * f, label: "در حال ساخت فایل MP3…" }),
  );
  const blob = new Blob([mp3], { type: "audio/mpeg" });
  return {
    blob,
    durationSec: mastered.pcm.length / sampleRate,
    sizeBytes: blob.size,
  };
}
