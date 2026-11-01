/* ندای پهلوی — موتور صدای روی‌دستگاه (Web Worker)
 *
 * Piper (VITS, متن‌باز) با ONNX Runtime Web + eSpeak-NG (WebAssembly).
 * همهٔ فایل‌های اجرایی کنار همین فایل در پوشهٔ /piper/ همراه خود اپ هستند؛
 * هیچ سرور یا اینترنتی برای اجرا لازم نیست.
 *
 * پیام‌ها:
 *   → {type:"load",  id, voiceId, model:ArrayBuffer, config}
 *   → {type:"synth", id, voiceId, items:[{text, lengthScale, noiseScale, noiseW}]}
 *   → {type:"cancel", id}
 *   ← {type:"loaded"|"chunk"|"done"|"cancelled"|"error", id, ...}
 */
"use strict";

const BASE = new URL("./", self.location.href).href;

let runtimeReady = null;
let phonemizeFactory = null;
let session = null;
let config = null;
let loadedVoice = null;
const cancelled = new Set();

function post(message, transfer) {
  self.postMessage(message, transfer || []);
}

function ensureRuntime() {
  if (!runtimeReady) {
    runtimeReady = (async () => {
      importScripts(BASE + "ort.wasm.min.js");
      const ort = self.ort;
      if (!ort) throw new Error("ONNX Runtime failed to load");
      ort.env.wasm.wasmPaths = BASE;
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;
      const mod = await import(BASE + "piper_phonemize.js");
      phonemizeFactory = mod.createPiperPhonemize || mod.default;
      if (typeof phonemizeFactory !== "function") {
        throw new Error("Phonemizer failed to load");
      }
    })().catch((error) => {
      runtimeReady = null;
      throw error;
    });
  }
  return runtimeReady;
}

/** eSpeak-NG phonemisation of many phrases in ONE wasm instance. */
async function phonemizeBatch(texts, espeakVoice) {
  const results = [];
  const mod = await phonemizeFactory({
    print: (line) => {
      try {
        const parsed = JSON.parse(line);
        if (parsed && Array.isArray(parsed.phoneme_ids)) {
          results.push(parsed.phoneme_ids);
        }
      } catch (e) {
        /* not a JSON line */
      }
    },
    printErr: () => {},
    locateFile: (url) => {
      if (url.endsWith(".wasm")) return BASE + "piper_phonemize.wasm";
      if (url.endsWith(".data")) return BASE + "piper_phonemize.data";
      return url;
    },
  });
  mod.callMain([
    "-l",
    espeakVoice,
    "--input",
    JSON.stringify(texts.map((text) => ({ text }))),
    "--espeak_data",
    "/espeak-ng-data",
  ]);
  return results;
}

async function loadVoice(voiceId, model, cfg) {
  await ensureRuntime();
  if (session && loadedVoice === voiceId) return;
  if (session) {
    try {
      await session.release();
    } catch (e) {
      /* ignore */
    }
    session = null;
    loadedVoice = null;
  }
  session = await self.ort.InferenceSession.create(new Uint8Array(model), {
    executionProviders: ["wasm"],
  });
  config = cfg;
  loadedVoice = voiceId;
}

async function synth(id, voiceId, items) {
  if (!session || loadedVoice !== voiceId) {
    throw new Error("Voice model is not loaded");
  }
  const ort = self.ort;
  const sampleRate = (config.audio && config.audio.sample_rate) || 22050;
  const espeakVoice = (config.espeak && config.espeak.voice) || "fa";
  const hasSpeakers =
    config.speaker_id_map && Object.keys(config.speaker_id_map).length > 0;

  const texts = items.map((i) => i.text);
  let ids = await phonemizeBatch(texts, espeakVoice);
  if (ids.length !== texts.length) {
    // rare: some phrase produced no output → fall back to one by one
    ids = [];
    for (const t of texts) {
      const one = await phonemizeBatch([t], espeakVoice);
      ids.push(one[0] || []);
    }
  }

  for (let i = 0; i < items.length; i++) {
    if (cancelled.has(id)) {
      cancelled.delete(id);
      post({ type: "cancelled", id });
      return;
    }
    const phonemeIds = ids[i];
    if (!phonemeIds || phonemeIds.length === 0) {
      post({ type: "chunk", id, index: i, pcm: new Float32Array(0), sampleRate });
      continue;
    }
    const item = items[i];
    const feeds = {
      input: new ort.Tensor("int64", BigInt64Array.from(phonemeIds, BigInt), [
        1,
        phonemeIds.length,
      ]),
      input_lengths: new ort.Tensor(
        "int64",
        BigInt64Array.from([BigInt(phonemeIds.length)]),
        [1],
      ),
      scales: new ort.Tensor(
        "float32",
        Float32Array.from([item.noiseScale, item.lengthScale, item.noiseW]),
        [3],
      ),
    };
    if (hasSpeakers) {
      feeds.sid = new ort.Tensor("int64", BigInt64Array.from([BigInt(0)]), [1]);
    }
    const result = await session.run(feeds);
    const pcm = Float32Array.from(result.output.data);
    post({ type: "chunk", id, index: i, pcm, sampleRate }, [pcm.buffer]);
  }
  post({ type: "done", id });
}

self.onmessage = async (event) => {
  const msg = event.data || {};
  try {
    if (msg.type === "load") {
      await loadVoice(msg.voiceId, msg.model, msg.config);
      post({ type: "loaded", id: msg.id });
    } else if (msg.type === "synth") {
      await synth(msg.id, msg.voiceId, msg.items);
    } else if (msg.type === "cancel") {
      cancelled.add(msg.id);
    }
  } catch (error) {
    post({
      type: "error",
      id: msg.id,
      message: error && error.message ? error.message : String(error),
    });
  }
};
