import { Mp3Encoder } from "@breezystack/lamejs";

const BLOCK = 1152;

/** Encode mono float PCM to MP3 (runs on the phone, yields to keep UI alive). */
export async function encodeMp3(
  pcm: Float32Array,
  sampleRate: number,
  kbps = 96,
  onProgress?: (fraction: number) => void,
): Promise<Uint8Array<ArrayBuffer>> {
  const encoder = new Mp3Encoder(1, sampleRate, kbps);
  const chunks: Uint8Array[] = [];
  let total = 0;

  const int16 = new Int16Array(BLOCK * 16);
  let blocksSinceYield = 0;

  for (let start = 0; start < pcm.length; start += int16.length) {
    const end = Math.min(pcm.length, start + int16.length);
    const len = end - start;
    for (let i = 0; i < len; i++) {
      const v = Math.max(-1, Math.min(1, pcm[start + i]));
      int16[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
    }
    const slice = len === int16.length ? int16 : int16.subarray(0, len);
    const buf = encoder.encodeBuffer(slice);
    if (buf.length) {
      const copy = new Uint8Array(buf);
      chunks.push(copy);
      total += copy.length;
    }
    blocksSinceYield++;
    if (blocksSinceYield >= 6) {
      blocksSinceYield = 0;
      onProgress?.(end / pcm.length);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  const tail = encoder.flush();
  if (tail.length) {
    chunks.push(new Uint8Array(tail));
    total += tail.length;
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  onProgress?.(1);
  return out;
}
