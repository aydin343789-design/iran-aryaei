/**
 * Saving / sharing the finished MP3.
 *  • Android app: native MediaStore plugin → file lands in
 *    «Download/Neday-Pahlavi» (visible in the Files app, no permission needed).
 *    Falls back to the system share sheet if anything goes wrong.
 *  • Browser: normal file download.
 */

import { Capacitor, registerPlugin } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

interface MediaSaverPlugin {
  saveToDownloads(options: {
    data: string;
    name: string;
    mime: string;
  }): Promise<{ uri: string; path: string }>;
}

const MediaSaver = registerPlugin<MediaSaverPlugin>("MediaSaver");

export interface SaveResult {
  ok: boolean;
  message: string;
}

export const isNativeApp = () => Capacitor.isNativePlatform();

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function browserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function shareAudio(
  blob: Blob,
  filename: string,
): Promise<SaveResult> {
  try {
    if (isNativeApp()) {
      const data = await blobToBase64(blob);
      const written = await Filesystem.writeFile({
        path: filename,
        data,
        directory: Directory.Cache,
      });
      await Share.share({
        title: "فایل صوتی ایران آریایی",
        url: written.uri,
        dialogTitle: "ارسال یا ذخیرهٔ فایل صوتی",
      });
      return { ok: true, message: "" };
    }
    const file = new File([blob], filename, { type: blob.type });
    const nav = navigator as Navigator & {
      canShare?: (d: { files: File[] }) => boolean;
    };
    if (nav.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "فایل صوتی ایران آریایی" });
      return { ok: true, message: "" };
    }
    browserDownload(blob, filename);
    return { ok: true, message: "فایل دانلود شد." };
  } catch {
    return { ok: false, message: "" };
  }
}

export async function saveAudio(
  blob: Blob,
  filename: string,
  mime?: string,
): Promise<SaveResult> {
  if (!isNativeApp()) {
    browserDownload(blob, filename);
    return { ok: true, message: "فایل دانلود شد." };
  }
  try {
    const data = await blobToBase64(blob);
    await MediaSaver.saveToDownloads({
      data,
      name: filename,
      mime: mime ?? blob.type ?? "audio/mpeg",
    });
    return {
      ok: true,
      message: `ذخیره شد: Download ← Neday-Pahlavi ← ${filename}`,
    };
  } catch {
    const shared = await shareAudio(blob, filename);
    return shared.ok
      ? { ok: true, message: "از منوی باز‌شده محل ذخیره را انتخاب کنید." }
      : { ok: false, message: "ذخیرهٔ فایل ممکن نشد. دوباره تلاش کنید." };
  }
}
