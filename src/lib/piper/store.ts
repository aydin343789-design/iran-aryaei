/**
 * Voice-model storage on the phone.
 *
 * A model can come from two places:
 *  • "bundled"  — shipped inside the APK (public/models/…), zero setup
 *  • "stored"   — downloaded once into the app's private storage (OPFS)
 */

import type { PiperVoiceDef } from "@/lib/voices";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type VoiceStatus = "checking" | "missing" | "stored" | "bundled";

const DIR_NAME = "avasaz-voices";

export function opfsSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "storage" in navigator &&
    typeof (navigator.storage as any)?.getDirectory === "function"
  );
}

async function voicesDir(create: boolean): Promise<any> {
  const root = await (navigator.storage as any).getDirectory();
  return root.getDirectoryHandle(DIR_NAME, { create });
}

async function fileSize(dir: any, name: string): Promise<number> {
  try {
    const handle = await dir.getFileHandle(name);
    return (await handle.getFile()).size as number;
  } catch {
    return 0;
  }
}

async function readFile(name: string): Promise<ArrayBuffer | null> {
  try {
    const dir = await voicesDir(false);
    const handle = await dir.getFileHandle(name);
    const file = await handle.getFile();
    return file.size > 0 ? await file.arrayBuffer() : null;
  } catch {
    return null;
  }
}

async function writeFile(name: string, blob: Blob): Promise<void> {
  const dir = await voicesDir(true);
  const handle = await dir.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

const modelName = (v: PiperVoiceDef) => `${v.piperId}.onnx`;
const configName = (v: PiperVoiceDef) => `${v.piperId}.onnx.json`;

/**
 * Voices shipped inside the APK are listed in /models/index.json
 * (written by scripts/fetch-voices.mjs). One probe instead of one per voice.
 */
let bundledIdsPromise: Promise<Set<string>> | null = null;
function bundledIds(): Promise<Set<string>> {
  if (!bundledIdsPromise) {
    bundledIdsPromise = (async () => {
      try {
        const res = await fetch("/models/index.json", { cache: "no-store" });
        if (!res.ok) return new Set<string>();
        if ((res.headers.get("content-type") || "").includes("html")) {
          return new Set<string>();
        }
        const parsed = JSON.parse(await res.text()) as { voices?: string[] };
        return new Set<string>(Array.isArray(parsed.voices) ? parsed.voices : []);
      } catch {
        return new Set<string>();
      }
    })();
  }
  return bundledIdsPromise;
}

async function bundledConfig(v: PiperVoiceDef): Promise<unknown | null> {
  if (!(await bundledIds()).has(v.piperId)) return null;
  try {
    const res = await fetch(`/models/${v.piperId}.onnx.json`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    if ((res.headers.get("content-type") || "").includes("html")) return null;
    return JSON.parse(await res.text());
  } catch {
    return null;
  }
}

export async function getVoiceStatus(v: PiperVoiceDef): Promise<VoiceStatus> {
  if (await bundledConfig(v)) return "bundled";
  if (!opfsSupported()) return "missing";
  try {
    const dir = await voicesDir(false);
    const model = await fileSize(dir, modelName(v));
    const cfg = await fileSize(dir, configName(v));
    if (model >= v.sizeBytes * 0.95 && cfg > 100) return "stored";
  } catch {
    /* nothing stored yet */
  }
  return "missing";
}

export async function removeVoice(v: PiperVoiceDef): Promise<void> {
  try {
    const dir = await voicesDir(false);
    await dir.removeEntry(modelName(v)).catch(() => {});
    await dir.removeEntry(configName(v)).catch(() => {});
  } catch {
    /* nothing stored */
  }
}

/** Download a voice model once; afterwards it works with no internet. */
export async function downloadVoice(
  v: PiperVoiceDef,
  onProgress: (percent: number) => void,
): Promise<void> {
  if (!opfsSupported()) {
    throw new Error("حافظهٔ داخلی برنامه در این مرورگر پشتیبانی نمی‌شود.");
  }
  onProgress(0);
  const cfgRes = await fetch(v.configUrl);
  if (!cfgRes.ok) throw new Error(`دانلود تنظیمات صدا ناموفق بود (${cfgRes.status})`);
  const cfgBlob = await cfgRes.blob();

  const res = await fetch(v.modelUrl);
  if (!res.ok || !res.body) {
    throw new Error(`دانلود مدل صدا ناموفق بود (${res.status})`);
  }
  const total = Number(res.headers.get("content-length")) || v.sizeBytes;
  const reader = res.body.getReader();
  const parts: BlobPart[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value as BlobPart);
    loaded += value.length;
    onProgress(Math.min(99, (loaded / total) * 100));
  }
  if (loaded < v.sizeBytes * 0.95) {
    throw new Error("دانلود ناقص ماند؛ اتصال اینترنت را بررسی و دوباره تلاش کنید.");
  }
  await writeFile(modelName(v), new Blob(parts));
  await writeFile(configName(v), cfgBlob); // written last = completion marker
  try {
    await (navigator.storage as any).persist?.();
  } catch {
    /* optional */
  }
  onProgress(100);
}

/** Read model + config (bundled or stored) for the worker. */
export async function loadVoiceFiles(
  v: PiperVoiceDef,
): Promise<{ model: ArrayBuffer; config: unknown }> {
  const bundled = await bundledConfig(v);
  if (bundled) {
    const res = await fetch(`/models/${v.piperId}.onnx`);
    if (!res.ok) throw new Error("فایل صدای همراه برنامه پیدا نشد.");
    return { model: await res.arrayBuffer(), config: bundled };
  }
  const [model, cfg] = await Promise.all([
    readFile(modelName(v)),
    readFile(configName(v)),
  ]);
  if (!model || !cfg) {
    throw new Error("VOICE_MISSING");
  }
  return { model, config: JSON.parse(new TextDecoder().decode(cfg)) };
}

export async function storageSummary(): Promise<string> {
  try {
    const est = await navigator.storage.estimate();
    if (est.usage) {
      return `${(est.usage / 1048576).toFixed(0)} مگابایت از حافظهٔ برنامه استفاده شده`;
    }
  } catch {
    /* optional */
  }
  return "";
}
