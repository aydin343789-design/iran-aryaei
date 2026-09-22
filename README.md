# ایران آریایی (Iran-e-Aryaei) — Step 1

Offline Persian toolkit. This step delivers: full RTL UI shell (hero agent,
quick actions, 33-tool workspace grid, activity + settings screens, bottom
sheet tool windows), the local intent-detection engine, and **10 fully
working offline tools** (image size reducer, image compressor/converter,
image crop, image edit, photo text adder, QR generator, QR scanner, image→PDF,
PDF merge, text→PDF). The remaining 23 tools are visible in the UI marked
"به‌زودی" (coming soon), per the priority order in the brief.

## Setup (on your own machine — needs internet once, for npm/Gradle)

```bash
cd iran-aryaei
npm install
npx cap add android      # generates the android/ Gradle project
npx cap sync android
npx cap open android     # or: cd android && ./gradlew assembleDebug
```

`.github/workflows/build-debug.yml` builds a debug APK on every push via
GitHub Actions and uploads it as a workflow artifact.

## Fonts (you need to add this yourself)

I don't have internet access in this environment, so no font binary is
bundled. Drop these two files in (exact names, referenced in `style.css`):

```
www/assets/fonts/Vazirmatn-Regular.woff2
www/assets/fonts/Vazirmatn-Medium.woff2
www/assets/fonts/Vazirmatn-Bold.woff2
```

Until you do, the UI falls back to Tahoma / system RTL fonts, so it still
looks correct — just not the exact Vazirmatn look.

## Honest limitations of this step (all because of no network access here)

- **QR Code Generator** (`www/vendor/qrcode.js`) is a from-scratch ISO 18004
  encoder I wrote myself — byte mode, EC level M, versions 1–10 (~200
  characters max). No external library was available to vendor in.
- **QR Code Scanner** uses the browser's native `BarcodeDetector` API
  (built into Android's Chromium WebView, fully offline, no library
  needed). On older WebView versions where it's unavailable, the tool shows
  a clear fallback message instead of failing silently.
- **PDF creation** (`www/vendor/pdf-lite.js`) is a minimal from-scratch PDF
  writer. "Text to PDF" renders text to a canvas first (so Persian displays
  correctly using the system font) and embeds it as an image — meaning the
  text isn't selectable/searchable in the PDF. Real embedded Persian text
  would need a bundled Vazirmatn `.ttf` and a Type0/CID font writer, which
  is a reasonable next step once you can supply the font file.
- **PDF Merger** only reliably handles simple, non-encrypted, classic-xref
  PDFs (which includes every PDF this app itself generates, plus most
  simple exports). It detects encrypted or structurally complex PDFs
  (e.g. cross-reference streams) and shows a clear error rather than
  producing a corrupt file. For bulletproof merging of arbitrary PDFs,
  drop a library like `pdf-lib` into `www/vendor/` later and swap the
  implementation.
- **Image Cropping** currently crops from the image's center at a chosen
  aspect ratio; a draggable crop-box UI is a natural next iteration.

## AndroidManifest permissions

Once `npx cap add android` generates the project, merge these into
`android/app/src/main/AndroidManifest.xml` (inside `<manifest>`, outside
`<application>`):

```xml
<uses-permission android:name="android.permission.INTERNET" /> <!-- optional, app works without it -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
```

## App icon (added from your uploaded image)

Your image is now wired in as the launcher icon:

- **`android-icon-assets/`** — mirrors the exact `android/app/src/main/res/` path
  structure with every density (mdpi → xxxhdpi) as both legacy icons
  (`ic_launcher.png`, `ic_launcher_round.png`) and Android 8+ adaptive-icon
  layers (`ic_launcher_background.png` / `ic_launcher_foreground.png` +
  the `mipmap-anydpi-v26/ic_launcher.xml` descriptors). The photo fills the
  full masked shape (circle/squircle/rounded-square, depending on the
  launcher) as the background layer; the foreground layer is transparent.
  I generated this into a **separate top-level folder instead of straight
  into `android/`** on purpose — `npx cap add android` refuses to run if
  `android/` already exists, so:

  ```bash
  npx cap add android
  cp -r android-icon-assets/app/src/main/res/mipmap-* android/app/src/main/res/
  npx cap sync android
  ```

  That's it — no AndroidManifest change needed, since Capacitor's template
  already points `<application android:icon="@mipmap/ic_launcher">` at
  these files by default.
- **`store-assets/playstore-icon-512.png`** — a 512×512 version for the
  Play Store listing itself (not used by the installed app).
- **`www/assets/icons/logo.png`**, **`logo-rounded.png`**, **`favicon-32.png`**
  — same image, used inside the app's own top bar and as the browser tab
  favicon during development.

One note on resolution: this source image is 1024×1024, plenty for every
size generated here (up to the 512×512 Play Store icon) without any
visible upscaling softness.

## Batch 2 — the remaining 15 JS tools (done, and verified)

Tools 11–25 are now active in the app: favicon generator, SVG→image,
password generator, notepad (IndexedDB), text analyzer, code
format/minify, regex tester, text diff, meta-tag generator, calendar,
date converter, age calculator, city distance, dictionary, and Hafez
fortune-telling. New data files: `www/cities.json`, `www/dictionary.json`,
`www/ghazal.json`.

Two things I actually tested rather than just wrote, because they're
easy to get subtly wrong:

- **The Jalali/Hijri calendar math** (`CAL` in `app.js`) — a naive
  "33-year cycle" leap-year rule (common online) silently gives the
  *wrong* Nowruz date in real recent years (1400, 1404), so I implemented
  the precise breaks-table algorithm instead and round-trip tested it:
  9,496 Gregorian↔Jalali day-conversions and 2,400 Hijri↔Gregorian
  conversions, 0 failures. The Hijri side is the arithmetic/tabular
  calendar (not moon-sighting), so it can be off by a day from an
  official religious announcement — same caveat every Islamic-calendar
  app gives.
- **The ZIP writer** (used by the favicon generator) — verified by
  actually unzipping its output with both the `unzip` CLI and Python's
  `zipfile` module, including UTF-8 filenames/content.

Two honesty notes on data quality — **update: resolved**, see below.

## Data update — real dictionary, cities, and Hafez ghazals

You supplied `data-final.js` (dictionary + cities) and the Hafez ghazal
collection, which replace the earlier starter datasets:

- **`www/dictionary.json`** — 3,202 English↔Persian word pairs (was ~150).
- **`www/cities.json`** — 397 Iranian cities with coordinates (was 40).
  Spot-checked: no duplicate city names, no duplicate dictionary entries,
  every coordinate falls inside a sanity bounding box for Iran.
- **`www/ghazal.json`** — 99 of the 100 Hafez ghazals, each with full text
  (not just an opening couplet) plus interpretation and category. One
  honest note: **ghazal #54 is missing from the source file you sent** —
  I fixed 7 separate spots where a comma was missing between entries
  (a formatting glitch from whatever generated the file, verified by
  parsing 0 syntax errors afterward), but #54 simply isn't in the data,
  and I didn't fabricate one to fill the gap since inventing "Hafez"
  text would be worse than a gap. If you have it, send it and I'll slot
  it in.

The Hafez tool now shows the full ghazal (all beyts) plus its category
tag, not just the opening two lines, and the dictionary tool's "starter
set" caveat is gone since this is now a real, sizeable dataset.


This is the one part of the project that genuinely could not be tested:
there's no Android SDK, JDK, or Gradle in this sandbox, so
`android-native-plugin/` is a real, idiomatic Kotlin **starting point**,
not verified-working code. Per-method confidence is written directly in
the code comments in
`android-native-plugin/src/main/java/ir/aryaei/tools/MediaToolsPlugin.kt`:

| Tool | API used | Confidence |
|---|---|---|
| PDF → Images (33) | `android.graphics.pdf.PdfRenderer` (built into Android, no library) | **High** |
| Remove background (32) | ML Kit Selfie Segmentation (on-device) | Medium-high |
| HEIC → JPG (31) | `ImageDecoder` (native HEIF decode since API 28) | Medium-high |
| Image → HEIC (30) | `androidx.heifwriter` | Medium |
| Audio trim (26) | `MediaExtractor` + `MediaMuxer`, stream-copy (no re-encode) | Medium |
| Audio compress (27) / "to MP3" (28) | `MediaCodec` transcode → **AAC (.m4a)**, not literal MP3 — Android has no built-in MP3 *encoder* and there's no network here to bundle LAME. Recommend relabeling the tool "Compress Audio (AAC)". | Low-medium |
| Video compress (29) | Sketch pointing at Jetpack Media3 `Transformer` — left unwired since the builder API shifts across versions and Gradle resolution can't be verified offline | Low |

To use it:

```bash
# after npx cap add android
cp -r android-native-plugin/src/main/java/ir/aryaei android/app/src/main/java/ir/aryaei/tools
```

Then in `android/app/build.gradle`, add the dependencies listed at the
top of `MediaToolsPlugin.kt`, and register the plugin in
`MainActivity.java`:

```java
import ir.aryaei.tools.MediaToolsPlugin;
// inside onCreate(), before super.onCreate() finishes registering plugins:
registerPlugin(MediaToolsPlugin.class);
```

Budget real debugging time in Android Studio for the audio/video
methods especially — expect to iterate. Once a method is confirmed
working on-device, say the word and I'll wire its tool from "به‌زودی"
over to active in the UI (`www/app.js`'s `TOOLS` array) and write the
JS-side bridge call for it.

## Status: all 33 tools accounted for

- **25 of 33 tools are active and working** in the web/Capacitor layer
  (tools 1–25) — built, and where correctness was non-obvious (QR
  encoding, PDF read/write, calendar math, ZIP), actually tested against
  independent verifiers (OpenCV, pypdf, unzip/zipfile), not just written
  and assumed correct.
- **8 of 33 tools (26–33) have real native Kotlin scaffolding** ready
  for you to build and test in Android Studio, with per-method
  confidence notes so you know where to expect smooth sailing (PDF→image)
  versus where to budget real debugging time (video compression).

## Bug-fix pass on the version you built and sent back

You reported two real problems after installing the APK from your own
GitHub Actions build: the app icon wasn't showing, and the save button
displayed a success message without actually saving anything. Both were
real bugs, found by diffing your actual repo against what should have
been there — not guessed at:

1. **App icon** — `android/app/src/main/res/` had **no `mipmap` folders
   at all**, and `AndroidManifest.xml`'s `<application>` tag had no
   `android:icon` attribute. The icon files existed (in
   `android-icon-assets/`) but were never copied into the real resource
   path or referenced, so Android fell back to a default icon. Fixed:
   copied the icon set into `android/app/src/main/res/mipmap-*/` and
   added `android:icon="@mipmap/ic_launcher"` /
   `android:roundIcon="@mipmap/ic_launcher_round"` to the manifest.

2. **Save button** — this repo actually has a genuinely good native
   `IranAryaeiPlugin.java` with correct `saveBase64`/`shareTempFile`
   methods that write to `MediaStore.Downloads` properly (whoever
   extended this did solid work here). The bug: **`www/app.js`'s
   `saveBlob()`/`shareBlob()` never called it.** They still used the
   browser-only `URL.createObjectURL` + `<a download>` trick, which does
   nothing inside a Capacitor Android WebView without native wiring —
   and the "saved" toast fired unconditionally regardless of whether
   anything actually happened. Fixed: both functions now detect the
   native `IranAryaei` plugin (`window.Capacitor.Plugins.IranAryaei`)
   and call its real save/share methods when running inside the app,
   only showing success after the native call actually resolves (and a
   real error message if it fails). The old browser-only behavior is
   kept as a fallback for when the page is opened outside the app (e.g.
   local development in a normal browser).

Also cleaned up along the way, since they were actively misleading:
- Removed `www/vendor/qr-lite.js` — a leftover 17-byte-payload QR stub
  that wasn't referenced by `index.html` (the real `qrcode.js`, tested
  against OpenCV's decoder, is what's actually used) but could have
  confused future edits.
- Removed `tests/static_test.py` and `TEST_REPORT.md` — these tested a
  *different* code structure (`{id:"...", if(id==="...")return`) that
  doesn't match this app.js's actual architecture (`TOOL_RENDERERS['id']
  = function...`), and checked stale data-file field names (`lon` /
  `entries`) against the current schema (`lng` / `words`). They'd have
  failed on the very first run against this codebase — better removed
  than left around looking authoritative.
- Refreshed the committed `android/app/src/main/assets/public/` (the
  synced build output) to match current `www/`, and added a
  `.gitignore` entry for it — your CI workflow already does a fresh
  `cp -r www/* .../assets/public/` on every build, so this staleness
  never affected your actual shipped APK, but an out-of-sync copy
  sitting in git is exactly the kind of thing that causes this class of
  confusion later.

**Verification**: re-ran the full Playwright interactive test suite
(21 tools, real clicks/uploads/form-fills, not just syntax checks)
against the fixed `www/app.js` — same 20/21 pass rate as before the fix
(the one "failure" is a test-script quirk with Persian-locale digit
formatting, not an app bug), confirming the save-function rewrite didn't
regress anything else. I can't runtime-test the native
`Capacitor.Plugins.IranAryaei` bridge itself from this sandbox (no
Android device/emulator here) — that needs a real install to confirm,
but the JS-side call signatures now match the Java method signatures
exactly (`saveBase64({name, mime, data})`,
`writeTempFile({name, data}) → {path}`, `shareTempFile({path, name,
mime})`), verified by reading both sides side by side.

## Tools 26–33 wired up — 33/33 active

The previous pass fixed the icon and the save bridge but left the 8
native tools showing "به‌زودی" — that was an oversight, not intentional
scoping; the native methods already existed and were already verified
matching. Fixed now: all 8 (`www/app.js`'s `TOOL_RENDERERS`) call the
real `IranAryaeiPlugin.java` methods directly —

- برش صدا → `trimAudio({inputPath, startSec, endSec})` (start/end read
  from the uploaded file's actual duration via `<audio>` metadata)
- کاهش حجم صدا → `compressAudio({inputPath, bitrate})` (64/96/128/192kbps)
- تبدیل صدا به MP3 → `audioToMp3({inputPath, bitrate})`
- کاهش حجم ویدیو → `compressVideo({inputPath, bitrate})` (low/med/high)
- تبدیل عکس به HEIC → `imageToHeic({inputPath})`
- تبدیل HEIC به JPG → `heicToJpg({inputPath})`
- حذف پس‌زمینه عکس → `removeBackground({inputPath, tolerance})`
- تبدیل PDF به تصویر → `pdfToImages({inputPath, format, scale})`

Every one uploads the file via `writeTempFile` first, then calls its
native method, then wires Save/Share to the same `saveTempFile` /
`shareTempFile` methods the rest of the app now uses. Outside the
installed app (e.g. opening the page in a plain browser) each one shows
a clear "this needs the installed Android app" message instead of
failing silently.

Verified with two separate Playwright passes:

1. **No bridge present** (real behavior in a browser, matching this dev
   sandbox): all 8 correctly show the fallback message, zero JS errors.
2. **Bridge mocked with the exact method signatures from the real Java
   plugin**: all 8 correctly call `writeTempFile` → their specific
   native method → render a result with working Save/Share buttons, and
   clicking Save correctly calls `saveTempFile`. This catches real
   wiring bugs (wrong argument names, wrong response field access) that
   reading the code alone wouldn't.

What I still can't do from this sandbox: actually run the compiled
Kotlin/Java on a device — no Android SDK/emulator here. So the native
*implementations themselves* (the MP3 frame parsing, the H.264
transcode loop, etc.) are only as tested as on-device runs have made
them; what's now verified end-to-end is that the JS layer calls them
correctly and handles their real responses correctly.
