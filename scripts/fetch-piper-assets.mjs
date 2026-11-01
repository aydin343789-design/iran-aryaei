/**
 * دانلود مجدد فایل‌های اجرایی موتور آفلاین (Piper) داخل public/piper
 * این فایل‌ها از قبل در مخزن هستند؛ فقط برای به‌روزرسانی یا بازیابی لازم‌اند:
 *
 *   node scripts/fetch-piper-assets.mjs
 *
 * منابع (همگی متن‌باز):
 * - piper_phonemize.js / .wasm / .data : تبدیل متن به واج با eSpeak-NG
 *     (@mintplex-labs/piper-tts-web  و  @diffusionstudio/piper-wasm)
 * - ort.wasm.min.js / ort-wasm-simd.wasm : ONNX Runtime Web نسخهٔ 1.18.0 (MIT)
 *
 * توجه: eSpeak-NG با مجوز GPL-3.0 است؛ ANDROID.md را ببینید.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "piper");

const NPM = "https://cdn.jsdelivr.net/npm";
const ASSETS = [
  {
    url: `${NPM}/@mintplex-labs/piper-tts-web@1.0.5/dist/piper-o91UDS6e.js`,
    file: "piper_phonemize.js",
  },
  {
    url: `${NPM}/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.wasm`,
    file: "piper_phonemize.wasm",
  },
  {
    url: `${NPM}/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize.data`,
    file: "piper_phonemize.data",
  },
  { url: `${NPM}/onnxruntime-web@1.18.0/dist/ort.wasm.min.js`, file: "ort.wasm.min.js" },
  { url: `${NPM}/onnxruntime-web@1.18.0/dist/ort-wasm-simd.wasm`, file: "ort-wasm-simd.wasm" },
];

await mkdir(outDir, { recursive: true });
for (const asset of ASSETS) {
  process.stdout.write(`Downloading ${asset.file} ... `);
  const res = await fetch(asset.url);
  if (!res.ok) throw new Error(`${asset.url} -> HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(path.join(outDir, asset.file), buf);
  console.log(`${(buf.length / 1048576).toFixed(1)} MB`);
}
console.log("Done. Assets are in public/piper/ (worker.js is ours, not downloaded).");
