/**
 * ✅ جایگذاری دقیق عکس‌های خودتان در اپلیکیشن
 *
 * مرحله ۱) دو عکس اصلی‌تان را در پوشهٔ `my-logos/` بگذارید:
 *    my-logos/square.png   ← نسخهٔ مربعی (برای آیکون اپ)
 *    my-logos/round.png    ← نسخهٔ دایروی (برای صفحهٔ ورود)
 *    (پس‌بندی jpg هم پذیرفته می‌شود؛ اگر هر دو را ندارید، هر دو فایل را
 *     کپی همان عکس بگذارید — اسکریپت خودش اندازه‌ها را درست می‌کند.)
 *
 * مرحله ۲) فقط همین دستور را اجرا کنید:
 *    node scripts/use-my-logos.mjs
 *
 * اسکریپت عکس‌ها را به public/logo می‌کوبد و تمام اندازه‌های آیکون
 * (وب + لاندر اندروید در همهٔ تراکم‌ها) را دوباره می‌سازد.
 */
import { readdir, stat, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Jimp } from "jimp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = path.join(root, "my-logos");
const outDir = path.join(root, "public", "logo");

const TARGETS = [
  { key: "square", dest: "logo-square-1024.png" },
  { key: "round", dest: "logo-round-1024.png" },
];

async function findFile(key) {
  if (!existsSync(srcDir)) return null;
  const files = await readdir(srcDir);
  const hit = files.find((f) =>
    new RegExp(`^${key}\\.(png|jpe?g)$`, "i").test(f),
  );
  return hit ? path.join(srcDir, hit) : null;
}

let missing = [];
for (const t of TARGETS) {
  const src = await findFile(t.key);
  const dest = path.join(outDir, t.dest);
  if (!src) {
    missing.push(`my-logos/${t.key}.png`);
    continue;
  }
  const info = await stat(src);
  if (info.size < 10_000) {
    missing.push(`my-logos/${t.key}.png (فایل کوچک‌تر از حد انتظار)`);
    continue;
  }
  const img = await Jimp.read(src);
  const size = Math.min(img.width, img.height);
  if (size < 1024) {
    img.resize({ w: size, h: size });
    // crop center square to exactly 1024
    img.crop(0, 0, size, size);
  } else if (img.width !== img.height) {
    img.crop(
      Math.round((img.width - size) / 2),
      Math.round((img.height - size) / 2),
      size,
      size,
    );
  }
  img.resize({ w: 1024, h: 1024 });
  await img.write(dest);
  console.log(`✓ ${t.key}: ${path.relative(root, src)} → ${t.dest}`);
}

if (missing.length) {
  console.error("\n❌ این فایل‌ها پیدا نشدند، دوباره بررسی کنید:");
  for (const m of missing) console.error("   -", m);
  console.error(
    "\nدستور: دو عکس اصلی را به‌عنوان my-logos/square.png و my-logos/round.png بگذارید.",
  );
  process.exit(1);
}

const { buildAll } = await import("./make-icons.mjs");
await buildAll();
console.log(
  "\n✅ تمام شد. عکس‌های شما در صفحهٔ ورود، سرعنوان، بخش «درباره» و آیکون اپ جایگزین شدند.",
);
