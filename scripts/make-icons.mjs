/**
 * ساخت آیکون‌های اپ از لوگوی اصلی (public/logo/*).
 * اجرا: node scripts/make-icons.mjs
 */
import { Jimp } from "jimp";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const square = path.join(root, "public", "logo", "logo-square-1024.png");
const round = path.join(root, "public", "logo", "logo-round-1024.png");

async function resize(src, dst, size) {
  const img = await Jimp.read(src);
  img.resize({ w: size, h: size });
  await img.write(dst);
  console.log("✓", path.relative(root, dst), `${size}x${size}`);
}

export async function buildAll() {
  // web manifest icons
  await mkdir(path.join(root, "public", "icons"), { recursive: true });
  await resize(square, path.join(root, "public", "icons", "icon-192.png"), 192);
  await resize(square, path.join(root, "public", "icons", "icon-512.png"), 512);

  // android launcher icons (copied into the project by scripts/patch-android.mjs)
  const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [density, size] of Object.entries(densities)) {
    const dir = path.join(root, "android-src", "icons", density);
    await mkdir(dir, { recursive: true });
    await resize(square, path.join(dir, "ic_launcher.png"), size);
    await resize(round, path.join(dir, "ic_launcher_round.png"), size);
  }
  console.log("done");
}

const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;
if (isMain) buildAll();
