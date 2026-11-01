import type { NextConfig } from "next";

/**
 * «ندای پهلوی» is a 100% client-side app (no server needed).
 * When STATIC_EXPORT=1 it is built as a static site (folder `out`) that
 * Capacitor packages into the Android APK — see ANDROID.md.
 * (The GitHub Actions workflow moves `src/app/api`, which only holds the
 * platform health-check, aside for that build.)
 */
const isStaticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  // Images are local files; unoptimized keeps the static export working.
  images: { unoptimized: true },
  ...(isStaticExport ? { output: "export" as const } : {}),
};

export default nextConfig;
