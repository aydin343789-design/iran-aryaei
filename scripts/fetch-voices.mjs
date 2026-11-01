/**
 * دانلود مدل‌های صوتی فارسی داخل public/models تا همراه APK بسته شوند
 * (در این حالت کاربر هیچ دانلودی لازم ندارد و اپ از همان لحظهٔ اول آفلاین کار می‌کند).
 *
 *   node scripts/fetch-voices.mjs            ← هر سه صدا
 *   node scripts/fetch-voices.mjs female     ← فقط یک صدا (female | male | narrator)
 *   node scripts/fetch-voices.mjs --list     ← فقط فهرست
 *
 * نشانی‌ها باید با src/lib/voices.ts هماهنگ بمانند.
 */
import { createWriteStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const RHASSPY = "https://huggingface.co/rhasspy/piper-voices/resolve/main/fa/fa_IR";
const MANA = "https://huggingface.co/MahtaFetrat/Mana-Persian-Piper/resolve/main";

const VOICES = {
  female: { id: "fa_IR-mana-medium", base: MANA, size: 63531379 },
  male: { id: "fa_IR-amir-medium", base: `${RHASSPY}/amir/medium`, size: 63531379 },
  narrator: { id: "fa_IR-ganji_adabi-medium", base: `${RHASSPY}/ganji_adabi/medium`, size: 63516050 },
};

const args = process.argv.slice(2);
const listOnly = args.includes("--list");
const wanted = args.filter((a) => !a.startsWith("--"));
const selected = Object.entries(VOICES).filter(([key]) => wanted.length === 0 || wanted.includes(key));

const outDir = path.join(process.cwd(), "public", "models");

async function download(url, file, attempts = 4) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      await pipeline(Readable.fromWeb(res.body), createWriteStream(file));
      return;
    } catch (error) {
      console.warn(`  attempt ${i}/${attempts} failed: ${error.message}`);
      if (i === attempts) throw error;
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
}

async function writeIndex() {
  // list every voice whose model file is present → the app reads this one file
  const present = [];
  for (const v of Object.values(VOICES)) {
    try {
      const { size } = await stat(path.join(outDir, `${v.id}.onnx`));
      if (size >= v.size * 0.95) present.push(v.id);
    } catch {
      /* not downloaded */
    }
  }
  await writeFile(path.join(outDir, "index.json"), JSON.stringify({ voices: present }));
  console.log("index.json:", present.join(", ") || "(empty)");
}

await mkdir(outDir, { recursive: true });
for (const [key, v] of selected) {
  const model = path.join(outDir, `${v.id}.onnx`);
  const config = `${model}.json`;
  console.log(`${key}: ${v.id}`);
  if (listOnly) {
    console.log(`  ${v.base}/${v.id}.onnx`);
    continue;
  }
  await download(`${v.base}/${v.id}.onnx.json`, config);
  await download(`${v.base}/${v.id}.onnx`, model);
  const { size } = await stat(model);
  if (size < v.size * 0.95) throw new Error(`${v.id}: incomplete download (${size} bytes)`);
  console.log(`  ✓ ${(size / 1048576).toFixed(1)} MB`);
}
if (!listOnly) await writeIndex();
