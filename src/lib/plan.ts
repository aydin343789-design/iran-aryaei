import { hashString, mulberry32 } from "./audio/dsp";
import {
  applyPauseMarkers,
  buildSpeechChunks,
  forPiper,
  humanizeForSpeech,
  normalizePersian,
  type EndMark,
} from "./text";
import { toneById, voiceById, type ToneId, type VoiceId } from "./voices";

export interface ChunkPlan {
  /** text exactly as shown/read (normalised) */
  text: string;
  /** text sent to the voice model */
  modelText: string;
  endMark: EndMark;
  paragraphBreakAfter: boolean;
  lengthScale: number;
  noiseScale: number;
  noiseW: number;
  /** a subtle per-phrase pitch bend; bounded to preserve clear pronunciation */
  pitchRatio: number;
}

export interface SpeechPlan {
  chunks: ChunkPlan[];
  /** base pitch ratio, before the per-phrase intonation contour */
  pitchRatio: number;
  seed: number;
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/**
 * Turns user text + settings into a concrete synthesis plan:
 * one entry per spoken phrase with its own (slightly varied) voice-model
 * parameters — so no two sentences are delivered identically, like a human.
 */
export function planSpeech(input: {
  text: string;
  voiceId: VoiceId;
  toneId: ToneId;
  /** user speed: -50 … +50 (%) */
  rate: number;
  /** user pitch: -100 … +100 */
  pitch: number;
  humanize: boolean;
}): SpeechPlan {
  const voice = voiceById(input.voiceId);
  const tone = toneById(input.toneId);
  const seed = hashString(`${input.text}|${input.voiceId}|${input.toneId}`);
  const rand = mulberry32(seed);

  const prepared = input.humanize
    ? humanizeForSpeech(input.text)
    : normalizePersian(applyPauseMarkers(input.text));
  // Keeping ordinary sentences separate gives each style its own cadence.
  // Very short phrases are still joined to avoid a choppy, word-by-word read.
  const raw = buildSpeechChunks(prepared, { maxChars: 260, softChars: 56 });

  const basePitchRatio = clamp(
    voice.pitchRatio * tone.pitchRatio * (1 + input.pitch / 1000),
    0.86,
    1.14,
  );
  const baseLength =
    (voice.lengthScale * tone.lengthScale) / (1 + input.rate / 100);

  const chunks: ChunkPlan[] = raw.map((c, i) => {
    let length = baseLength;
    let noise = tone.noiseScale;
    let noiseW = tone.noiseW;
    const endingLift =
      c.endMark === "؟"
        ? tone.questionLift
        : c.endMark === "!"
          ? tone.exclamationLift
          : 0;
    // Intonation differs by tone and by sentence. News stays measured; a
    // story rises on questions; cheerful lines lift on exclamations. The
    // maximum contour remains small enough to keep Persian phonemes clear.
    const contour = input.humanize
      ? (rand() * 2 - 1) * tone.contourRange
      : 0;
    let phrasePitchRatio = clamp(
      basePitchRatio * (1 + endingLift + contour),
      0.86,
      1.14,
    );
    if (input.humanize && i === raw.length - 1) {
      // tiny pitch-and-pace fall at the end of the final sentence
      phrasePitchRatio = clamp(phrasePitchRatio * 0.992, 0.86, 1.14);
    }
    if (input.humanize) {
      length *= 1 + (rand() * 2 - 1) * (tone.id === "news" ? 0.012 : 0.035);
      noise += (rand() * 2 - 1) * 0.025;
      noiseW *= 1 + (rand() * 2 - 1) * (tone.id === "news" ? 0.015 : 0.04);
      if (c.endMark === "؟" && tone.id !== "news") length *= 1.025;
      if (i === raw.length - 1) {
        length *= 1.05;
        // a subtle final fall, not a pitch shift large enough to blur words
      }
    }
    // The grain-based pitch shift preserves duration, so no compensation
    // of the model's speaking pace is needed here.
    return {
      text: c.text,
      modelText: forPiper(c.text),
      endMark: c.endMark,
      paragraphBreakAfter: c.paragraphBreakAfter,
      lengthScale: clamp(length, 0.55, 2.2),
      noiseScale: clamp(noise, 0.3, 0.95),
      noiseW: clamp(noiseW, 0.3, 1.1),
      pitchRatio: phrasePitchRatio,
    };
  });

  return { chunks, pitchRatio: basePitchRatio, seed };
}
