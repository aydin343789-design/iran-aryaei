/**
 * Main-thread client of the on-device voice engine (Web Worker).
 * Keeps the UI responsive while the neural model is running.
 */

import type { PiperVoiceDef } from "@/lib/voices";
import { loadVoiceFiles } from "./store";

export interface SynthItem {
  text: string;
  lengthScale: number;
  noiseScale: number;
  noiseW: number;
}

interface Pending {
  resolve: (value: void) => void;
  reject: (error: Error) => void;
  onChunk?: (index: number, pcm: Float32Array, sampleRate: number) => void;
}

export class PiperEngine {
  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<number, Pending>();
  private loadedVoice: string | null = null;

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker("/piper/worker.js");
    worker.onmessage = (event: MessageEvent) => {
      const msg = event.data as {
        type: string;
        id: number;
        index?: number;
        pcm?: Float32Array;
        sampleRate?: number;
        message?: string;
      };
      const p = this.pending.get(msg.id);
      if (!p) return;
      if (msg.type === "chunk") {
        p.onChunk?.(msg.index ?? 0, msg.pcm ?? new Float32Array(0), msg.sampleRate ?? 22050);
      } else if (msg.type === "loaded" || msg.type === "done") {
        this.pending.delete(msg.id);
        p.resolve();
      } else if (msg.type === "cancelled") {
        this.pending.delete(msg.id);
        p.reject(new Error("CANCELLED"));
      } else if (msg.type === "error") {
        this.pending.delete(msg.id);
        p.reject(new Error(msg.message || "خطای موتور صدا"));
      }
    };
    worker.onerror = (event) => {
      const error = new Error(event.message || "موتور صدا اجرا نشد");
      for (const p of this.pending.values()) p.reject(error);
      this.pending.clear();
      this.worker?.terminate();
      this.worker = null;
      this.loadedVoice = null;
    };
    this.worker = worker;
    return worker;
  }

  private call(
    message: Record<string, unknown>,
    transfer: Transferable[] = [],
    onChunk?: Pending["onChunk"],
  ): { id: number; promise: Promise<void> } {
    const worker = this.ensureWorker();
    const id = ++this.seq;
    const promise = new Promise<void>((resolve, reject) => {
      this.pending.set(id, { resolve, reject, onChunk });
      worker.postMessage({ ...message, id }, transfer);
    });
    return { id, promise };
  }

  /** Make sure this voice's model is loaded inside the worker. */
  async ensureVoice(voice: PiperVoiceDef): Promise<void> {
    if (this.loadedVoice === voice.piperId) return;
    const { model, config } = await loadVoiceFiles(voice);
    await this.call(
      { type: "load", voiceId: voice.piperId, model, config },
      [model],
    ).promise;
    this.loadedVoice = voice.piperId;
  }

  async synthesize(
    voice: PiperVoiceDef,
    items: SynthItem[],
    onChunk: (index: number, pcm: Float32Array, sampleRate: number) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const { id, promise } = this.call(
      { type: "synth", voiceId: voice.piperId, items },
      [],
      onChunk,
    );
    const onAbort = () => this.worker?.postMessage({ type: "cancel", id });
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      await promise;
    } finally {
      signal?.removeEventListener("abort", onAbort);
    }
  }

  /** Free the (large) model memory, e.g. after a long idle time. */
  dispose() {
    this.worker?.terminate();
    this.worker = null;
    this.loadedVoice = null;
    this.pending.clear();
  }
}

let engine: PiperEngine | null = null;
export function getEngine(): PiperEngine {
  if (!engine) engine = new PiperEngine();
  return engine;
}
