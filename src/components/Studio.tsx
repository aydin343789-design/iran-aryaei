"use client";

import {
  AudioLines,
  BookOpen,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardPaste,
  Clapperboard,
  Download,
  Eraser,
  FileAudio,
  Gauge,
  Heart,
  HeartHandshake,
  History,
  Info,
  Loader2,
  Menu,
  Mic2,
  Minus,
  Newspaper,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  SpellCheck,
  Square,
  Star,
  Sun,
  Trash2,
  TriangleAlert,
  Waves,
  Wifi,
  WifiOff,
  Wind,
  X,
  Zap,
} from "lucide-react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import AudioPlayer, { PLAY_EVENT } from "@/components/AudioPlayer";
import VideoStudio from "@/components/VideoStudio";
import { previewEdgeVoice, synthesizeEdge } from "@/lib/edge";
import {
  formatBytesFa,
  formatClock,
  formatDateFa,
  toFaDigits,
  toFaNumber,
} from "@/lib/format";
import { generateSpeech, type GenerateProgress } from "@/lib/generate";
import {
  deleteClip,
  listClips,
  newClipId,
  putClip,
  setFavorite,
  type Clip,
} from "@/lib/idb";
import {
  downloadVoice,
  getVoiceStatus,
  opfsSupported,
  removeVoice,
  type VoiceStatus,
} from "@/lib/piper/store";
import { saveAudio, shareAudio } from "@/lib/save";
import { stripMarkersForDisplay } from "@/lib/text";
import {
  MAX_TEXT_LENGTH,
  PIPER_VOICES,
  SAMPLE_TEXTS,
  TONES,
  VOICES,
  estimateSeconds,
  piperByCharacter,
  toneById,
  voiceById,
  type ToneId,
  type VoiceId,
} from "@/lib/voices";

const TONE_ICONS: Record<ToneId, typeof Sun> = {
  happy: Sun,
  friendly: HeartHandshake,
  news: Newspaper,
  story: BookOpen,
  emotional: Heart,
};

const TONE_DEMO_TEXT =
  "امروز خبر مهمی داریم! [مکث] آیا برای شنیدن ادامهٔ قصه آماده‌اید؟";

const DIACRITICS: { label: string; ch: string; show: string }[] = [
  { label: "فتحه", ch: "َ", show: "ـَ" },
  { label: "کسره", ch: "ِ", show: "ـِ" },
  { label: "ضمه", ch: "ُ", show: "ـُ" },
  { label: "تشدید", ch: "ّ", show: "ـّ" },
  { label: "سکون", ch: "ْ", show: "ـْ" },
  { label: "تنوین فتح", ch: "ً", show: "ـً" },
  { label: "تنوین کسر", ch: "ٍ", show: "ـٍ" },
  { label: "تنوین ضم", ch: "ٌ", show: "ـٌ" },
];

type DrawerTab = "library" | "settings" | "about";

interface ClipView {
  clip: Clip;
  url: string;
}

interface VoiceState {
  status: VoiceStatus;
  progress: number | null;
  error: string | null;
}

function signedFa(n: number, unit = ""): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${toFaDigits(sign + Math.abs(n))}${unit}`;
}

function fileNameFor(clip: Clip): string {
  const d = new Date(clip.createdAt);
  const p = (n: number) => String(n).padStart(2, "0");
  return `nedaye-pahlavi-${clip.voiceId}-${clip.toneId}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.mp3`;
}

function ToneSlider({
  label,
  icon,
  value,
  min,
  max,
  minLabel,
  maxLabel,
  format,
  onChange,
}: {
  label: string;
  icon: ReactNode;
  value: number;
  min: number;
  max: number;
  minLabel: string;
  maxLabel: string;
  format: (n: number) => string;
  onChange: (n: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const zero = ((0 - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-bold text-slate-200">
          {icon}
          {label}
        </span>
        <span className="rounded-lg bg-teal-400/10 px-2 py-0.5 text-xs font-bold text-teal-200 tabular-nums">
          {format(value)}
        </span>
      </div>
      <div className="relative flex h-7 items-center" dir="ltr">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-ink-600" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-teal-400"
          style={{ left: `${Math.min(pct, zero)}%`, width: `${Math.abs(pct - zero)}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-[2px] -translate-x-1/2 -translate-y-1/2 rounded bg-slate-500"
          style={{ left: `${zero}%` }}
        />
        <input
          type="range"
          className="slider relative z-10"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
        />
      </div>
      <div className="flex justify-between text-[11px] text-slate-500">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

function SettingToggle({
  checked,
  onChange,
  icon,
  title,
  desc,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  icon: ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-right transition active:scale-[0.99] ${
        checked
          ? "border-teal-400/45 bg-teal-400/[0.06]"
          : "border-white/8 bg-white/[0.02]"
      }`}
    >
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-teal-400" : "bg-ink-600"
        }`}
      >
        <span
          className="absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all"
          style={{ right: checked ? "4px" : "24px" }}
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 text-sm font-extrabold">
          {icon}
          {title}
        </span>
        <span className="mt-0.5 block text-[11px] leading-5 text-slate-400">
          {desc}
        </span>
      </span>
    </button>
  );
}

export default function Studio() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("library");
  const [isOnline, setIsOnline] = useState(true);
  const [storageOk, setStorageOk] = useState(true);

  const [text, setText] = useState("");
  const [voiceId, setVoiceId] = useState<VoiceId>("female");
  const [toneId, setToneId] = useState<ToneId>("friendly");
  const [rate, setRate] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [humanize, setHumanize] = useState(true);
  const [breaths, setBreaths] = useState(true);
  const [warmth, setWarmth] = useState(true);

  const [voiceStates, setVoiceStates] = useState<Record<string, VoiceState>>({});
  const [confirmRemoveVoice, setConfirmRemoveVoice] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerateProgress>({ fraction: 0, label: "" });
  const [error, setError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  const [clips, setClips] = useState<ClipView[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [resultId, setResultId] = useState<string | null>(null);
  const [autoPlayKey, setAutoPlayKey] = useState(0);
  const [favFilter, setFavFilter] = useState<"all" | "fav">("all");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [samplePlaying, setSamplePlaying] = useState<VoiceId | null>(null);
  const [tonePreview, setTonePreview] = useState<"idle" | "loading" | "playing">("idle");
  const [toast, setToast] = useState<string | null>(null);

  // top-level section + speech engine mode
  const [section, setSection] = useState<"speech" | "media">("speech");
  const [ttsMode, setTtsMode] = useState<"online" | "offline">("offline");
  // The online studio endpoint only accepts a User-Agent containing "Edg/".
  // The Android APK patches its WebView UA (see android-src/MainActivity.java),
  // Microsoft Edge qualifies natively; plain browsers cannot spoof the UA.
  const [edgeCapable] = useState<boolean>(() =>
    typeof navigator !== "undefined"
      ? /Edg\/[\d.]+/.test(navigator.userAgent)
      : false,
  );
  const [onlineSample, setOnlineSample] = useState<VoiceId | null>(null);
  const [onlineSampleLoading, setOnlineSampleLoading] = useState<VoiceId | null>(null);
  const onlineCacheRef = useRef<Map<string, string>>(new Map());
  const onlineAudioRef = useRef<HTMLAudioElement | null>(null);

  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const previewAbortRef = useRef<AbortController | null>(null);
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);
  const toneAudioRef = useRef<HTMLAudioElement | null>(null);
  const toneObjectUrlRef = useRef<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const urlsRef = useRef<Set<string>>(new Set());

  const wordCount = useMemo(
    () => (text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0),
    [text],
  );
  const estSec = useMemo(() => estimateSeconds(text, rate), [text, rate]);
  const visibleClips = useMemo(
    () => (favFilter === "fav" ? clips.filter((c) => c.clip.favorite) : clips),
    [clips, favFilter],
  );
  const result = clips.find((c) => c.clip.id === resultId) ?? null;

  const showToast = useCallback((message: string) => {
    if (!message) return;
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  const openDrawer = (tab: DrawerTab) => {
    setDrawerTab(tab);
    setDrawerOpen(true);
  };

  useEffect(() => {
    setIsOnline(navigator.onLine);
    setStorageOk(opfsSupported());
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  const refreshVoiceStatus = useCallback(async () => {
    await Promise.all(
      PIPER_VOICES.map(async (pv) => {
        const status = await getVoiceStatus(pv);
        setVoiceStates((s) => ({ ...s, [pv.piperId]: { status, progress: null, error: null } }));
      }),
    );
  }, []);

  useEffect(() => {
    setVoiceStates(
      Object.fromEntries(
        PIPER_VOICES.map((pv) => [pv.piperId, { status: "checking", progress: null, error: null } as VoiceState]),
      ),
    );
    void refreshVoiceStatus();
  }, [refreshVoiceStatus]);

  useEffect(() => {
    const urls = urlsRef.current;
    (async () => {
      try {
        const all = await listClips();
        setClips(
          all.map((clip) => {
            const url = URL.createObjectURL(clip.blob);
            urls.add(url);
            return { clip, url };
          }),
        );
      } catch {
        /* local storage may be unavailable in private mode */
      } finally {
        setLibraryLoading(false);
      }
    })();
    return () => {
      urls.forEach((u) => URL.revokeObjectURL(u));
      urls.clear();
      if (toneObjectUrlRef.current) URL.revokeObjectURL(toneObjectUrlRef.current);
    };
  }, []);

  const stopSample = useCallback(() => {
    sampleAudioRef.current?.pause();
    sampleAudioRef.current = null;
    setSamplePlaying(null);
  }, []);

  const stopTonePreview = useCallback(() => {
    previewAbortRef.current?.abort();
    previewAbortRef.current = null;
    toneAudioRef.current?.pause();
    toneAudioRef.current = null;
    if (toneObjectUrlRef.current) URL.revokeObjectURL(toneObjectUrlRef.current);
    toneObjectUrlRef.current = null;
    setTonePreview("idle");
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id !== "sample") stopSample();
      if (id !== "tone-preview") stopTonePreview();
    };
    window.addEventListener(PLAY_EVENT, handler);
    return () => {
      window.removeEventListener(PLAY_EVENT, handler);
      sampleAudioRef.current?.pause();
      toneAudioRef.current?.pause();
    };
  }, [stopSample, stopTonePreview]);

  async function playSample(id: VoiceId) {
    if (samplePlaying === id) {
      stopSample();
      return;
    }
    stopTonePreview();
    stopOnlineSample();
    stopSample();
    window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: { id: "sample" } }));
    const audio = new Audio(voiceById(id).sampleUrl);
    sampleAudioRef.current = audio;
    audio.onended = () => setSamplePlaying(null);
    audio.onpause = () => setSamplePlaying(null);
    try {
      await audio.play();
      setSamplePlaying(id);
    } catch {
      setSamplePlaying(null);
    }
  }

  const stopOnlineSample = useCallback(() => {
    onlineAudioRef.current?.pause();
    onlineAudioRef.current = null;
    setOnlineSample(null);
    setOnlineSampleLoading(null);
  }, []);

  const onlineOnlyNote =
    "حالت آنلاین فقط در اپلیکیشن اندروید و مرورگر Microsoft Edge در دسترس است (محدودیت سرویس مایکروسافت). در همین مرورگر، حالت «آفلاین» را استفاده کنید.";

  async function playOnlineSample(id: VoiceId) {
    if (onlineSample === id) {
      stopOnlineSample();
      return;
    }
    if (!edgeCapable) {
      setError(onlineOnlyNote);
      return;
    }
    if (!isOnline) {
      setError("حالت آنلاین به اینترنت نیاز دارد؛ برای لحظهٔ آفلاین، «آفلاین» را انتخاب کنید.");
      return;
    }
    stopTonePreview();
    stopSample();
    stopOnlineSample();
    window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: { id: "online-sample" } }));
    setOnlineSampleLoading(id);
    try {
      const key = `${id}:${toneId}:${ttsMode}`;
      let url = onlineCacheRef.current.get(key);
      if (!url) {
        const res = await previewEdgeVoice(id, toneId);
        url = URL.createObjectURL(
          new Blob([res.audio as unknown as BlobPart], { type: res.mime }),
        );
        onlineCacheRef.current.set(key, url);
      }
      const audio = new Audio(url);
      onlineAudioRef.current = audio;
      audio.onended = () => setOnlineSample(null);
      audio.onpause = () => setOnlineSample(null);
      await audio.play();
      setOnlineSample(id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg !== "CANCELLED") setError(msg || "پخش نمونهٔ آنلاین ممکن نشد.");
    } finally {
      setOnlineSampleLoading(null);
    }
  }

  // stop the online sample when another player starts
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      if (id && id !== "online-sample") stopOnlineSample();
    };
    window.addEventListener(PLAY_EVENT, handler);
    return () => window.removeEventListener(PLAY_EVENT, handler);
  }, [stopOnlineSample]);

  useEffect(
    () => () => {
      onlineAudioRef.current?.pause();
      onlineCacheRef.current.forEach((u) => URL.revokeObjectURL(u));
      onlineCacheRef.current.clear();
    },
    [],
  );

  async function downloadFor(
    characterId: VoiceId,
    onProgress?: (percent: number) => void,
  ): Promise<boolean> {
    const pv = piperByCharacter(characterId);
    const set = (v: VoiceState) =>
      setVoiceStates((s) => ({ ...s, [pv.piperId]: v }));
    set({ status: "missing", progress: 0, error: null });
    try {
      await downloadVoice(pv, (pct) => {
        set({ status: "missing", progress: pct, error: null });
        onProgress?.(pct);
      });
      set({ status: "stored", progress: null, error: null });
      return true;
    } catch (e) {
      set({
        status: "missing",
        progress: null,
        error: e instanceof Error && e.message ? e.message : "دانلود ناموفق بود. دوباره تلاش کنید.",
      });
      return false;
    }
  }

  async function handleRemoveVoice(characterId: VoiceId) {
    await removeVoice(piperByCharacter(characterId));
    setConfirmRemoveVoice(null);
    await refreshVoiceStatus();
  }

  async function insertAtCursor(snippet: string) {
    const ta = taRef.current;
    if (!ta) {
      setText((t) => (t + snippet).slice(0, MAX_TEXT_LENGTH));
      return;
    }
    const start = ta.selectionStart ?? text.length;
    const end = ta.selectionEnd ?? text.length;
    const next = text.slice(0, start) + snippet + text.slice(end);
    if (next.length > MAX_TEXT_LENGTH) return;
    setText(next);
    requestAnimationFrame(() => {
      ta.focus();
      const cursor = start + snippet.length;
      ta.setSelectionRange(cursor, cursor);
    });
  }

  async function pasteFromClipboard() {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) setText(clip.slice(0, MAX_TEXT_LENGTH));
    } catch {
      setError("متن را با نگه‌داشتن انگشت روی کادر بچسبانید.");
    }
  }

  function applySample(sample: (typeof SAMPLE_TEXTS)[number]) {
    setText(sample.text);
    setVoiceId(sample.voice);
    setToneId(sample.tone);
    setError(null);
  }

  async function ensureVoiceReady(
    characterId: VoiceId,
    onProgress?: (percent: number) => void,
  ): Promise<boolean> {
    const pv = piperByCharacter(characterId);
    let status = voiceStates[pv.piperId]?.status;
    if (!status || status === "checking") {
      status = await getVoiceStatus(pv);
      setVoiceStates((s) => ({ ...s, [pv.piperId]: { status, progress: null, error: null } }));
    }
    if (status === "stored" || status === "bundled") return true;
    if (!isOnline) {
      setError(`برای اولین استفاده باید مدل صدای «${voiceById(characterId).name}» را یک‌بار دانلود کنید.`);
      openDrawer("settings");
      return false;
    }
    return downloadFor(characterId, onProgress);
  }

  async function playTonePreview() {
    if (tonePreview === "playing") {
      stopTonePreview();
      return;
    }
    if (tonePreview === "loading") {
      previewAbortRef.current?.abort();
      return;
    }
    stopSample();
    stopTonePreview();
    window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: { id: "tone-preview" } }));
    setTonePreview("loading");
    setError(null);
    const controller = new AbortController();
    previewAbortRef.current = controller;
    try {
      let previewBlob: Blob;
      if (ttsMode === "online") {
        if (!edgeCapable) {
          setError(onlineOnlyNote);
          setTonePreview("idle");
          return;
        }
        if (!isOnline) {
          setError("نمونهٔ آنلاین به اینترنت نیاز دارد.");
          setTonePreview("idle");
          return;
        }
        const res = await synthesizeEdge({
          text: TONE_DEMO_TEXT,
          voiceId,
          toneId,
          rate,
          pitch,
          humanize: true,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        previewBlob = new Blob([res.audio as unknown as BlobPart], { type: res.mime });
      } else {
        const ready = await ensureVoiceReady(voiceId);
        if (!ready) {
          setTonePreview("idle");
          return;
        }
        const preview = await generateSpeech(
          {
            text: TONE_DEMO_TEXT,
            voiceId,
            toneId,
            rate,
            pitch,
            humanize: true,
            breaths: false,
            warmth,
          },
          () => {},
          controller.signal,
        );
        if (controller.signal.aborted) return;
        previewBlob = preview.blob;
      }
      const url = URL.createObjectURL(previewBlob);
      toneObjectUrlRef.current = url;
      const audio = new Audio(url);
      toneAudioRef.current = audio;
      audio.onended = () => stopTonePreview();
      audio.onpause = () => setTonePreview("idle");
      await audio.play();
      setTonePreview("playing");
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      if (message !== "CANCELLED" && message) setError(message);
      setTonePreview("idle");
    } finally {
      if (previewAbortRef.current === controller) previewAbortRef.current = null;
    }
  }

  async function handleGenerate() {
    if (generating) return;
    if (!text.trim()) {
      setError("ابتدا متن فارسی خود را بنویسید یا یکی از نمونه‌ها را انتخاب کنید.");
      setShakeKey((k) => k + 1);
      taRef.current?.focus();
      return;
    }
    setError(null);
    stopSample();
    stopTonePreview();
    stopOnlineSample();
    setGenerating(true);
    setProgress({ fraction: 0.015, label: "در حال آماده‌سازی…" });
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      let blob: Blob;
      let durationSec: number;
      if (ttsMode === "online") {
        if (!edgeCapable) {
          setError(onlineOnlyNote);
          return;
        }
        if (!isOnline) {
          setError("برای ساخت آنلاین به اینترنت نیاز دارید؛ «آفلاین» را انتخاب کنید.");
          return;
        }
        const res = await synthesizeEdge({
          text,
          voiceId,
          toneId,
          rate,
          pitch,
          humanize,
          onProgress: (f) =>
            setProgress({
              fraction: 0.05 + 0.9 * f,
              label: `خواندن استودیویی — ${voiceById(voiceId).name}…`,
            }),
          signal: controller.signal,
        });
        blob = new Blob([res.audio as unknown as BlobPart], { type: res.mime });
        // 24 kHz mono @ 96 kbps → duration from byte size
        durationSec = Math.max(1, Math.round((res.audio.length * 8) / 96000));
      } else {
        const ready = await ensureVoiceReady(voiceId, (downloadPercent) =>
          setProgress({
            fraction: 0.02 + 0.42 * (downloadPercent / 100),
            label: `دانلود یک‌بارهٔ صدای ${currentVoice.name}…`,
          }),
        );
        if (!ready) return;
        setProgress({ fraction: 0.45, label: "در حال آماده‌سازی موتور گفتار…" });
        const out = await generateSpeech(
          { text, voiceId, toneId, rate, pitch, humanize, breaths, warmth },
          setProgress,
          controller.signal,
        );
        blob = out.blob;
        durationSec = out.durationSec;
      }
      const clip: Clip = {
        id: newClipId(),
        text,
        voiceId,
        toneId,
        blob,
        mime: "audio/mpeg",
        durationSec,
        sizeBytes: blob.size,
        favorite: false,
        createdAt: Date.now(),
      };
      try {
        await putClip(clip);
      } catch {
        /* keep the generated clip playable even if storage is full */
      }
      const url = URL.createObjectURL(clip.blob);
      urlsRef.current.add(url);
      setClips((prev) => [{ clip, url }, ...prev]);
      setResultId(clip.id);
      setAutoPlayKey((k) => k + 1);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "CANCELLED") showToast("ساخت صدا لغو شد.");
      else if (msg !== "AbortError") setError(msg || "ساخت صدا ممکن نشد؛ دوباره تلاش کنید.");
    } finally {
      abortRef.current = null;
      setGenerating(false);
    }
  }

  async function handleSave(view: ClipView) {
    const r = await saveAudio(view.clip.blob, fileNameFor(view.clip));
    showToast(r.message);
  }

  async function handleShare(view: ClipView) {
    const r = await shareAudio(view.clip.blob, fileNameFor(view.clip));
    if (r.message) showToast(r.message);
  }

  async function handleDelete(view: ClipView) {
    setConfirmDeleteId(null);
    URL.revokeObjectURL(view.url);
    urlsRef.current.delete(view.url);
    setClips((prev) => prev.filter((c) => c.clip.id !== view.clip.id));
    if (resultId === view.clip.id) setResultId(null);
    await deleteClip(view.clip.id).catch(() => {});
  }

  async function handleFavorite(view: ClipView) {
    const favorite = !view.clip.favorite;
    setClips((prev) => prev.map((c) => c.clip.id === view.clip.id ? { ...c, clip: { ...c.clip, favorite } } : c));
    await setFavorite(view.clip.id, favorite).catch(() => {});
  }

  function reuseClip(view: ClipView) {
    setText(view.clip.text);
    setVoiceId(view.clip.voiceId as VoiceId);
    setToneId(view.clip.toneId as ToneId);
    setDrawerOpen(false);
  }

  const nearLimit = text.length > MAX_TEXT_LENGTH * 0.9;
  const pct = Math.round(progress.fraction * 100);
  const currentVoice = voiceById(voiceId);
  const currentTone = toneById(toneId);
  const currentVoiceState = voiceStates[piperByCharacter(voiceId).piperId];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6">
      {/* compact, app-like header */}
      <header className="sticky top-0 z-40 -mx-4 border-b border-white/[0.06] bg-ink-950/80 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-2xl sm:-mx-6 sm:px-6">
        <div className="mx-auto flex h-[68px] max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => openDrawer("library")}
              aria-label="باز کردن منو"
              className="relative grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-200 transition hover:border-teal-300/40 hover:text-teal-200 active:scale-95"
            >
              <Menu className="h-5 w-5" />
              {clips.length > 0 && (
                <span className="absolute -top-1.5 -left-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-amber-400 px-1 text-[10px] font-black text-ink-950">
                  {toFaDigits(clips.length)}
                </span>
              )}
            </button>
            <Image
              src="/logo/logo-round-1024.png"
              alt="لوگوی ندای پهلوی"
              width={44}
              height={44}
              className="h-11 w-11 rounded-full object-cover shadow-[0_6px_22px_rgba(201,152,37,.28)] ring-1 ring-amber-300/30"
            />
            <span className="leading-tight">
              <b className="block text-[17px] font-black tracking-tight">ندای پهلوی</b>
              <span className="block text-[10px] text-slate-500">استودیوی صدای فارسی</span>
            </span>
          </div>
          {section === "speech" &&
            (ttsMode === "online" ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-400/25 bg-teal-400/[0.08] px-2.5 py-1.5 text-[10px] font-bold text-teal-200 sm:text-[11px]">
                <Wifi className="h-3.5 w-3.5" />
                آنلاین · استودیویی
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-400/20 bg-teal-400/[0.06] px-2.5 py-1.5 text-[10px] font-bold text-teal-200 sm:text-[11px]">
                <ShieldCheck className="h-3.5 w-3.5" />
                روی دستگاه شما
              </span>
            ))}
        </div>
      </header>

      {/* top-level section switcher */}
      <div className="sticky top-[68px] z-30 -mx-4 border-b border-white/[0.06] bg-ink-950/85 px-4 backdrop-blur-2xl sm:-mx-6 sm:px-6">
        <div className="mx-auto flex max-w-5xl gap-2 py-2.5">
          <button
            type="button"
            onClick={() => setSection("speech")}
            aria-pressed={section === "speech"}
            className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-extrabold transition active:scale-[0.99] ${
              section === "speech"
                ? "bg-teal-400 text-ink-950 shadow-[0_8px_24px_rgba(45,212,191,.25)]"
                : "border border-white/10 bg-white/[0.03] text-slate-300 hover:text-white"
            }`}
          >
            <Mic2 className="h-4.5 w-4.5" />
            متن به صدا
          </button>
          <button
            type="button"
            onClick={() => setSection("media")}
            aria-pressed={section === "media"}
            className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-extrabold transition active:scale-[0.99] ${
              section === "media"
                ? "bg-amber-400 text-ink-950 shadow-[0_8px_24px_rgba(245,158,11,.25)]"
                : "border border-white/10 bg-white/[0.03] text-slate-300 hover:text-white"
            }`}
          >
            <Clapperboard className="h-4.5 w-4.5" />
            ویدئو و عکس
          </button>
        </div>
      </div>

      {/* drawer */}
      <div className={`fixed inset-0 z-50 ${drawerOpen ? "" : "pointer-events-none"}`} aria-hidden={!drawerOpen}>
        <div
          onClick={() => setDrawerOpen(false)}
          className={`absolute inset-0 bg-black/65 backdrop-blur-[2px] transition-opacity duration-300 ${drawerOpen ? "opacity-100" : "opacity-0"}`}
        />
        <aside
          className="absolute inset-y-0 right-0 flex w-[94vw] max-w-[430px] flex-col border-l border-white/10 bg-[#0b1018] shadow-[-30px_0_80px_rgba(0,0,0,.62)] transition-transform duration-300 ease-out"
          style={{ transform: drawerOpen ? "translateX(0)" : "translateX(106%)" }}
        >
          <div className="flex items-center justify-between border-b border-white/[0.07] px-5 pt-[calc(1rem+env(safe-area-inset-top))] pb-4">
            <div className="flex items-center gap-3">
              <Image
                src="/logo/logo-round-1024.png"
                alt="لوگوی ندای پهلوی"
                width={44}
                height={44}
                className="h-11 w-11 rounded-full object-cover ring-1 ring-amber-300/30"
              />
              <div>
                <b className="block text-[15px] font-black">ندای پهلوی</b>
                <span className="text-[10px] text-slate-500">همه‌چیز در همین دستگاه</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="بستن منو"
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          <nav className="grid grid-cols-3 gap-1.5 border-b border-white/[0.07] p-3" aria-label="بخش‌های منو">
            {([
              { id: "library", label: "کتابخانه", icon: History },
              { id: "settings", label: "تنظیمات", icon: Settings2 },
              { id: "about", label: "دربارهٔ ما", icon: Info },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setDrawerTab(id)}
                aria-current={drawerTab === id ? "page" : undefined}
                className={`flex h-11 items-center justify-center gap-2 rounded-xl text-xs font-bold transition ${
                  drawerTab === id
                    ? "bg-teal-400 text-ink-950 shadow-[0_6px_18px_rgba(45,212,191,.2)]"
                    : "border border-transparent bg-white/[0.035] text-slate-400 hover:bg-white/[0.07] hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
                {id === "library" && clips.length > 0 && (
                  <span className={`text-[10px] ${drawerTab === id ? "text-ink-800" : "text-slate-500"}`}>
                    {toFaDigits(clips.length)}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {drawerTab === "library" && (
              <LibraryPanel
                clips={visibleClips}
                total={clips.length}
                loading={libraryLoading}
                favFilter={favFilter}
                setFavFilter={setFavFilter}
                confirmDeleteId={confirmDeleteId}
                setConfirmDeleteId={setConfirmDeleteId}
                onDelete={handleDelete}
                onFavorite={handleFavorite}
                onReuse={reuseClip}
                onSave={handleSave}
              />
            )}
            {drawerTab === "settings" && (
              <SettingsPanel
                voiceId={voiceId}
                voiceStates={voiceStates}
                confirmRemoveVoice={confirmRemoveVoice}
                setConfirmRemoveVoice={setConfirmRemoveVoice}
                isOnline={isOnline}
                storageOk={storageOk}
                humanize={humanize}
                setHumanize={setHumanize}
                breaths={breaths}
                setBreaths={setBreaths}
                warmth={warmth}
                setWarmth={setWarmth}
                rate={rate}
                setRate={setRate}
                pitch={pitch}
                setPitch={setPitch}
                onDownload={downloadFor}
                onRemove={handleRemoveVoice}
              />
            )}
            {drawerTab === "about" && <AboutPanel />}
          </div>
        </aside>
      </div>

      {section === "media" ? (
        <div className="mx-auto w-full max-w-3xl">
          <section className="pt-6 pb-4 text-center sm:pt-8 sm:pb-5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-300/[0.07] px-3 py-1 text-[10px] font-bold tracking-wide text-amber-200">
              <Clapperboard className="h-3.5 w-3.5" />
              ویدئو و عکس از صدای شما
            </span>
            <h1 className="mt-3 text-[27px] leading-tight font-black tracking-tight sm:text-4xl">
              از متن تا <span className="text-amber-300">ویدئو</span>
            </h1>
            <p className="mx-auto mt-2 max-w-md text-xs leading-6 text-slate-400">
              کارت عکسی و ویدئوی همگام با صدای فایل‌های خودتان — متن، موج‌نما
              و برند ندای پهلوی؛ کاملاً روی همین دستگاه.
            </p>
          </section>
          <VideoStudio clips={clips} onToast={showToast} />
        </div>
      ) : (
        <>
          {/* concise title; explanations live in the About menu */}
          <section className="pt-5 pb-3 text-center sm:pt-6 sm:pb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-300/20 bg-teal-300/[0.06] px-3 py-1 text-[10px] font-bold tracking-wide text-teal-200">
              <Mic2 className="h-3.5 w-3.5" />
              گفتار فارسی
            </span>
            <h1 className="mt-2.5 text-[26px] leading-tight font-black tracking-tight sm:text-4xl">
              از متن تا <span className="text-amber-300">صدا</span>
            </h1>
          </section>

          {/* online / offline engine switch */}
          <div className="mx-auto mb-3.5 w-full max-w-3xl">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTtsMode("online")}
                aria-pressed={ttsMode === "online"}
                className={`flex flex-col items-center gap-0.5 rounded-2xl border px-3 py-2.5 transition active:scale-[0.99] ${
                  ttsMode === "online"
                    ? "border-teal-300/60 bg-teal-400/[0.1] shadow-[0_0_0_2px_rgba(45,212,191,.1)]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20"
                }`}
              >
                <span className={`flex items-center gap-1.5 text-[13px] font-extrabold ${ttsMode === "online" ? "text-teal-100" : "text-slate-200"}`}>
                  <Wifi className="h-4 w-4 text-teal-300" />
                  آنلاین
                  <Zap className="h-3 w-3 text-amber-300" />
                  {!edgeCapable && (
                    <span className="rounded-full border border-white/15 bg-white/[0.06] px-1.5 py-0.5 text-[8px] font-bold text-slate-400">
                      فقط در اپ و Edge
                    </span>
                  )}
                </span>
                <span className="text-[10px] text-slate-400">
                  {edgeCapable
                    ? "کیفیت استودیویی‌تر · نیاز به اینترنت"
                    : "در مرورگرهای عادی محدود است"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTtsMode("offline")}
                aria-pressed={ttsMode === "offline"}
                className={`flex flex-col items-center gap-0.5 rounded-2xl border px-3 py-2.5 transition active:scale-[0.99] ${
                  ttsMode === "offline"
                    ? "border-teal-300/60 bg-teal-400/[0.1] shadow-[0_0_0_2px_rgba(45,212,191,.1)]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20"
                }`}
              >
                <span className={`flex items-center gap-1.5 text-[13px] font-extrabold ${ttsMode === "offline" ? "text-teal-100" : "text-slate-200"}`}>
                  <ShieldCheck className="h-4 w-4 text-teal-300" />
                  آفلاین
                </span>
                <span className="text-[10px] text-slate-400">روی گوشی · بدون اینترنت</span>
              </button>
            </div>
            {ttsMode === "online" && !isOnline && (
              <p className="animate-pop mt-2 flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/[0.07] px-3 py-2 text-[11px] leading-5 text-amber-100">
                <WifiOff className="h-4 w-4 shrink-0 text-amber-300" />
                الان به اینترنت وصل نیستید؛ برای ساخت آنلاین وصل شوید یا حالت «آفلاین» را بزنید.
              </p>
            )}
          </div>

          <main className="mx-auto flex w-full max-w-3xl flex-col gap-3.5">
        {/* quick voice picker */}
        <section className="rounded-2xl border border-white/[0.07] bg-ink-850/85 p-3.5 shadow-[0_16px_44px_rgba(0,0,0,.25)] sm:rounded-3xl sm:p-4">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[13px] font-extrabold text-slate-200">
              <Mic2 className="h-4 w-4 text-teal-300" />
              گوینده
            </h2>
            <button
              type="button"
              onClick={() => openDrawer("settings")}
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 transition hover:text-teal-200"
            >
              مدیریت صداها <ChevronDown className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {VOICES.map((voice) => {
              const selected = voiceId === voice.id;
              const pv = piperByCharacter(voice.id);
              const status = voiceStates[pv.piperId]?.status;
              const ready =
                ttsMode === "online"
                  ? isOnline
                  : status === "stored" || status === "bundled";
              const isPlaying =
                ttsMode === "online"
                  ? onlineSample === voice.id
                  : samplePlaying === voice.id;
              const isSampleLoading =
                ttsMode === "online" ? onlineSampleLoading === voice.id : false;
              return (
                <div
                  key={voice.id}
                  className={`flex min-w-0 items-center gap-2 rounded-xl border p-2 transition sm:rounded-2xl sm:p-2.5 ${
                    selected
                      ? "border-teal-300/55 bg-teal-300/[0.08] shadow-[0_0_0_2px_rgba(45,212,191,.08)]"
                      : "border-white/[0.07] bg-white/[0.02] hover:border-white/15"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setVoiceId(voice.id)}
                    aria-pressed={selected}
                    className="flex min-w-0 flex-1 items-center gap-2 text-right"
                  >
                    <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl sm:h-11 sm:w-11">
                      <Image src={voice.image} alt={voice.name} fill sizes="44px" className="object-cover" />
                    </span>
                    <span className="min-w-0">
                      <b className={`block truncate text-xs sm:text-sm ${selected ? "text-teal-100" : "text-slate-100"}`}>
                        {voice.name}
                      </b>
                      <span className="mt-0.5 flex items-center gap-1 text-[9px] text-slate-500 sm:text-[10px]">
                        {voice.title}
                        {ready && <Check className="h-3 w-3 text-teal-400" />}
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      ttsMode === "online"
                        ? void playOnlineSample(voice.id)
                        : void playSample(voice.id)
                    }
                    aria-label={`${isPlaying ? "توقف" : "شنیدن نمونهٔ صدای"} ${voice.name}`}
                    title={ttsMode === "online" ? "نمونهٔ آنلاین (استودیویی)" : "نمونهٔ آفلاین (روی گوشی)"}
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition active:scale-90 sm:h-9 sm:w-9 ${
                      isPlaying
                        ? "border-amber-300 bg-amber-300 text-ink-950"
                        : "border-white/10 bg-white/[0.04] text-teal-200 hover:border-teal-300/40"
                    }`}
                  >
                    {isSampleLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="h-3.5 w-3.5" fill="currentColor" />
                    ) : (
                      <Play className="h-3.5 w-3.5 -scale-x-100" fill="currentColor" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* quick tone picker */}
        <section className="rounded-2xl border border-white/[0.07] bg-ink-850/85 p-3.5 shadow-[0_16px_44px_rgba(0,0,0,.2)] sm:rounded-3xl sm:p-4">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[13px] font-extrabold text-slate-200">
              <SlidersHorizontal className="h-4 w-4 text-amber-300" />
              لحن
            </h2>
            <button
              type="button"
              onClick={() => void playTonePreview()}
              disabled={generating}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-300/25 bg-amber-300/[0.07] px-2.5 text-[10px] font-bold text-amber-100 transition hover:border-amber-300/50 hover:bg-amber-300/[0.13] disabled:opacity-50 sm:text-[11px]"
            >
              {tonePreview === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : tonePreview === "playing" ? <Pause className="h-3.5 w-3.5" fill="currentColor" /> : <Play className="h-3.5 w-3.5 -scale-x-100" fill="currentColor" />}
              {tonePreview === "loading" ? "در حال ساخت نمونه…" : tonePreview === "playing" ? "توقف نمونه" : "شنیدن نمونهٔ لحن"}
            </button>
          </div>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {TONES.map((tone) => {
              const Icon = TONE_ICONS[tone.id];
              const selected = toneId === tone.id;
              return (
                <button
                  key={tone.id}
                  type="button"
                  onClick={() => setToneId(tone.id)}
                  aria-pressed={selected}
                  title={tone.desc}
                  className={`flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 transition active:scale-[0.97] sm:min-h-[64px] sm:rounded-2xl ${
                    selected
                      ? "border-amber-300/60 bg-amber-300/[0.11] text-amber-100 shadow-[0_0_0_2px_rgba(252,211,77,.08)]"
                      : "border-white/[0.06] bg-white/[0.02] text-slate-400 hover:border-white/15 hover:text-slate-200"
                  }`}
                >
                  <Icon className={`h-4 w-4 sm:h-[18px] sm:w-[18px] ${selected ? "text-amber-300" : ""}`} />
                  <span className="max-w-full truncate text-[9px] font-bold leading-tight sm:text-[10px]">{tone.title.split(" و ")[0]}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* writing surface */}
        <section
          ref={editorRef}
          className="rounded-2xl border border-white/[0.08] bg-ink-850/95 p-3.5 shadow-[0_22px_60px_rgba(0,0,0,.3)] sm:rounded-3xl sm:p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-300/[0.1] text-teal-200">
                <FileAudio className="h-4 w-4" />
              </span>
              <label htmlFor="persian-text" className="text-sm font-extrabold text-slate-100">متن شما</label>
            </div>
            <div className="text-[10px] text-slate-500 tabular-nums sm:text-[11px]">
              {toFaNumber(wordCount)} واژه <span className="mx-1 text-slate-700">·</span> {formatClock(estSec)}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <span className="shrink-0 text-[10px] font-semibold text-slate-500">نمونه:</span>
            {SAMPLE_TEXTS.map((sample) => (
              <button
                key={sample.title}
                type="button"
                onClick={() => applySample(sample)}
                className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.035] px-2.5 py-1 text-[10px] font-semibold text-slate-300 transition hover:border-teal-300/35 hover:text-teal-100"
              >
                {sample.title}
              </button>
            ))}
          </div>

          <textarea
            id="persian-text"
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT_LENGTH))}
            rows={5}
            placeholder="متن فارسی‌تان را اینجا بنویسید…"
            className={`mt-2 min-h-36 w-full resize-y rounded-2xl border bg-ink-900/80 p-3.5 text-[16px] leading-8 text-cream shadow-inner transition placeholder:text-slate-600 focus:outline-none focus:ring-2 sm:min-h-40 sm:p-4 sm:text-[17px] ${
              shakeKey > 0 && !text.trim()
                ? "animate-shake border-rose-400/60 focus:ring-rose-400/20"
                : "border-white/[0.08] focus:border-teal-300/45 focus:ring-teal-300/10"
            }`}
          />

          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => void insertAtCursor(" [مکث] ")}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-teal-300/20 bg-teal-300/[0.05] px-2 text-[10px] font-bold text-teal-100 hover:bg-teal-300/[0.1]"
                title="در این نقطه مکث و نفس‌گیری"
              >
                <Wind className="h-3.5 w-3.5" /> مکث
              </button>
              <button
                type="button"
                onClick={() => void insertAtCursor(" [مکث طولانی] ")}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.025] px-2 text-[10px] font-semibold text-slate-300 hover:text-white"
                title="مکث بلند بین بخش‌ها"
              >
                مکث بلند
              </button>
              <details className="group relative">
                <summary className="flex h-8 cursor-pointer list-none items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.025] px-2 text-[10px] font-semibold text-slate-300 hover:text-white">
                  <SpellCheck className="h-3.5 w-3.5 text-amber-300" />
                  اعراب <ChevronDown className="h-3 w-3 transition group-open:rotate-180" />
                </summary>
                <div className="absolute bottom-10 right-0 z-20 flex max-w-[calc(100vw-3rem)] flex-wrap gap-1 rounded-xl border border-white/10 bg-ink-800 p-2 shadow-xl">
                  {DIACRITICS.map((d) => (
                    <button
                      key={d.label}
                      type="button"
                      title={d.label}
                      onClick={(e) => {
                        void insertAtCursor(d.ch);
                        const parent = (e.currentTarget as HTMLElement).closest("details");
                        if (parent) parent.open = false;
                      }}
                      className="grid h-8 min-w-8 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.04] px-1 text-base text-slate-100 hover:border-amber-300/40"
                    >
                      {d.show}
                    </button>
                  ))}
                  <button type="button" onClick={() => void insertAtCursor("‌")} className="h-8 rounded-lg border border-white/[0.08] px-2 text-[10px] text-slate-200">نیم‌فاصله</button>
                </div>
              </details>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] tabular-nums ${nearLimit ? "text-amber-300" : "text-slate-600"}`}>
                {toFaNumber(text.length)}/{toFaNumber(MAX_TEXT_LENGTH)}
              </span>
              {text.length > 0 && (
                <button type="button" onClick={() => setText("")} aria-label="پاک‌کردن متن" title="پاک‌کردن متن" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-rose-400/[0.08] hover:text-rose-300">
                  <Eraser className="h-4 w-4" />
                </button>
              )}
              <button type="button" onClick={pasteFromClipboard} aria-label="چسباندن متن" title="چسباندن متن" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-white/[0.06] hover:text-slate-200">
                <ClipboardPaste className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[10px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
              {currentVoice.name} <span className="text-slate-700">/</span> {currentTone.title}
            </span>
            <button type="button" onClick={() => openDrawer("settings")} className="inline-flex items-center gap-1 text-slate-500 transition hover:text-teal-200">
              تنظیمات صدا <Settings2 className="h-3 w-3" />
            </button>
          </div>
        </section>

        {/* generation */}
        <div className="sticky bottom-2 z-30">
          {error && (
            <div role="alert" className="animate-pop mb-2 flex items-start gap-2 rounded-xl border border-rose-400/35 bg-rose-500/10 px-3 py-2.5 text-xs leading-5 text-rose-100 shadow-lg">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
              <span className="flex-1">{error}</span>
              <button type="button" onClick={() => setError(null)} aria-label="بستن پیام" className="text-rose-200/70"><X className="h-4 w-4" /></button>
            </div>
          )}
          <div className="rounded-2xl border border-white/10 bg-ink-900/90 p-2 shadow-[0_14px_45px_rgba(0,0,0,.48)] backdrop-blur-xl sm:rounded-3xl sm:p-2.5">
            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={generating || tonePreview === "loading"}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-teal-300 to-teal-400 px-3 text-[15px] font-black text-ink-950 shadow-[0_8px_25px_rgba(45,212,191,.22)] transition hover:brightness-105 active:scale-[.99] disabled:cursor-wait disabled:opacity-80 sm:h-[52px] sm:rounded-2xl sm:text-base"
            >
              {generating ? (
                <><Loader2 className="h-5 w-5 animate-spin" /><span className="truncate">{toFaDigits(pct)}٪ — {progress.label}</span></>
              ) : (
                <><Sparkles className="h-5 w-5" />ساخت فایل صوتی MP3</>
              )}
            </button>
            {generating && (
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-600" dir="ltr">
                <div className="h-full rounded-full bg-amber-300 transition-[width] duration-300" style={{ width: `${Math.max(3, pct)}%` }} />
              </div>
            )}
          </div>
        </div>
      </main>

      {result && (
        <section ref={resultRef} className="animate-pop mx-auto mt-5 mb-4 max-w-3xl scroll-mt-24 overflow-hidden rounded-2xl border border-teal-300/25 bg-ink-850 shadow-[0_24px_65px_rgba(0,0,0,.4)] sm:rounded-3xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.07] bg-teal-300/[0.045] px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-300 text-ink-950"><Check className="h-5 w-5" strokeWidth={3} /></span>
              <div><b className="block text-sm font-black">فایل آماده است</b><span className="text-[10px] text-slate-500">{ttsMode === "online" ? "کیفیت استودیویی آنلاین" : "ساخته‌شده روی همین دستگاه"}</span></div>
            </div>
            <span className="rounded-full bg-amber-300/[0.1] px-2.5 py-1 text-[10px] font-bold text-amber-100">{toneById(result.clip.toneId).title}</span>
          </div>
          <div className="p-4 sm:p-5">
            <AudioPlayer
              src={result.url}
              durationHint={result.clip.durationSec}
              variant="full"
              autoPlayKey={autoPlayKey}
              onDownload={() => void handleSave(result)}
              onShare={() => void handleShare(result)}
            />
            <p className="mt-3 line-clamp-2 rounded-xl border border-white/[0.06] bg-ink-900/70 px-3 py-2 text-xs leading-6 text-slate-400">«{stripMarkersForDisplay(result.clip.text)}»</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => void handleSave(result)} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 text-sm font-black text-ink-950 transition hover:bg-amber-200 active:scale-[.99]">
                <Download className="h-4.5 w-4.5" />ذخیرهٔ MP3 در گوشی
              </button>
              <button type="button" onClick={() => openDrawer("library")} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-xs font-bold text-slate-200 hover:border-teal-300/30">
                <History className="h-4 w-4" />کتابخانه
              </button>
            </div>
          </div>
        </section>
      )}
        </>
      )}

      <footer className="mx-auto max-w-3xl py-5 text-center text-[10px] text-slate-600">
        ندای پهلوی <span className="mx-1 text-slate-700">·</span> گفتار فارسی روی دستگاه شما
      </footer>

      {toast && (
        <div role="status" className="animate-pop fixed inset-x-4 bottom-20 z-[60] mx-auto max-w-md rounded-xl border border-teal-300/30 bg-ink-900/95 px-4 py-3 text-center text-xs leading-5 font-bold text-teal-100 shadow-2xl backdrop-blur-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function LibraryPanel({
  clips,
  total,
  loading,
  favFilter,
  setFavFilter,
  confirmDeleteId,
  setConfirmDeleteId,
  onDelete,
  onFavorite,
  onReuse,
  onSave,
}: {
  clips: ClipView[];
  total: number;
  loading: boolean;
  favFilter: "all" | "fav";
  setFavFilter: (filter: "all" | "fav") => void;
  confirmDeleteId: string | null;
  setConfirmDeleteId: (id: string | null) => void;
  onDelete: (view: ClipView) => void;
  onFavorite: (view: ClipView) => void;
  onReuse: (view: ClipView) => void;
  onSave: (view: ClipView) => void;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-1.5">
          {([
            { id: "all", label: "همه" },
            { id: "fav", label: "برگزیده‌ها" },
          ] as const).map((f) => (
            <button key={f.id} type="button" onClick={() => setFavFilter(f.id)} className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${favFilter === f.id ? "bg-teal-300 text-ink-950" : "border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:text-white"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-slate-500">{toFaNumber(total)} فایل</span>
      </div>
      {loading ? (
        <div className="flex flex-col gap-2.5">{[0, 1].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-ink-850" />)}</div>
      ) : clips.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-12 text-center">
          <History className="mx-auto h-9 w-9 text-slate-600" />
          <p className="mt-3 text-sm font-bold text-slate-300">{favFilter === "fav" ? "فایل برگزیده‌ای ندارید" : "کتابخانه خالی است"}</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">فایل‌های ساخته‌شده به‌طور خودکار روی همین دستگاه می‌مانند.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {clips.map((view) => {
            const voice = voiceById(view.clip.voiceId);
            const tone = toneById(view.clip.toneId);
            const confirm = confirmDeleteId === view.clip.id;
            return (
              <article key={view.clip.id} className="rounded-2xl border border-white/[0.07] bg-ink-850/75 p-3">
                <div className="flex items-start gap-2.5">
                  <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl"><Image src={voice.image} alt={voice.name} fill sizes="40px" className="object-cover" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-xs leading-5 text-slate-100">{stripMarkersForDisplay(view.clip.text)}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[9px] text-slate-500">
                      <span>{voice.name}</span><span>·</span><span>{tone.title}</span><span>·</span><span>{formatClock(view.clip.durationSec)}</span><span>·</span><span>{formatDateFa(new Date(view.clip.createdAt).toISOString())}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" aria-label="برگزیده" onClick={() => onFavorite(view)} className={`grid h-8 w-8 place-items-center rounded-lg border ${view.clip.favorite ? "border-amber-300/40 bg-amber-300/10 text-amber-200" : "border-white/[0.08] text-slate-500"}`}><Star className="h-3.5 w-3.5" fill={view.clip.favorite ? "currentColor" : "none"} /></button>
                    <button type="button" aria-label="ویرایش متن" onClick={() => onReuse(view)} className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.08] text-slate-500 hover:text-teal-200"><Settings2 className="h-3.5 w-3.5" /></button>
                    <button type="button" aria-label="حذف فایل" onClick={() => setConfirmDeleteId(view.clip.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.08] text-slate-500 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                {confirm ? (
                  <div className="mt-2 flex items-center justify-between rounded-xl border border-rose-400/25 bg-rose-500/[0.08] px-3 py-2 text-[10px] text-rose-100">
                    <span>این فایل حذف شود؟</span><span className="flex gap-2">
                      <button type="button" onClick={() => onDelete(view)} className="font-black text-rose-200">حذف</button>
                      <button type="button" onClick={() => setConfirmDeleteId(null)} className="text-slate-300">انصراف</button>
                    </span>
                  </div>
                ) : (
                  <div className="mt-2.5 border-t border-white/[0.06] pt-2.5">
                    <AudioPlayer src={view.url} durationHint={view.clip.durationSec} variant="compact" onDownload={() => onSave(view)} />
                    <div className="mt-1 flex items-center justify-between text-[9px] text-slate-600">
                      <span>{formatBytesFa(view.clip.sizeBytes)}</span><span>{voice.title}</span>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function SettingsPanel({
  voiceId,
  voiceStates,
  confirmRemoveVoice,
  setConfirmRemoveVoice,
  isOnline,
  storageOk,
  humanize,
  setHumanize,
  breaths,
  setBreaths,
  warmth,
  setWarmth,
  rate,
  setRate,
  pitch,
  setPitch,
  onDownload,
  onRemove,
}: {
  voiceId: VoiceId;
  voiceStates: Record<string, VoiceState>;
  confirmRemoveVoice: string | null;
  setConfirmRemoveVoice: (id: string | null) => void;
  isOnline: boolean;
  storageOk: boolean;
  humanize: boolean;
  setHumanize: (value: boolean) => void;
  breaths: boolean;
  setBreaths: (value: boolean) => void;
  warmth: boolean;
  setWarmth: (value: boolean) => void;
  rate: number;
  setRate: (value: number) => void;
  pitch: number;
  setPitch: (value: number) => void;
  onDownload: (id: VoiceId) => Promise<boolean>;
  onRemove: (id: VoiceId) => Promise<void>;
}) {
  const IconStyle = (id: ToneId) => TONE_ICONS[id];
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/[0.07] bg-ink-850/75 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div><h3 className="text-sm font-black">پیشرفتهٔ صدا</h3><p className="mt-0.5 text-[10px] text-slate-500">تغییرها فقط روی فایل‌های بعدی اعمال می‌شوند</p></div>
          {(rate !== 0 || pitch !== 0) && <button type="button" onClick={() => { setRate(0); setPitch(0); }} className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] px-2 py-1 text-[10px] text-slate-400 hover:text-white"><RotateCcw className="h-3 w-3" />بازنشانی</button>}
        </div>
        <div className="space-y-2">
          <SettingToggle checked={humanize} onChange={setHumanize} icon={<Wind className="h-4 w-4 text-teal-300" />} title="اجرای انسانی" desc="تنوع جمله‌به‌جمله و مکث‌های متغیر؛ خاموش‌کردن این گزینه اجرای یکنواخت‌تری می‌دهد." />
          <SettingToggle checked={breaths} onChange={setBreaths} icon={<AudioLines className="h-4 w-4 text-teal-300" />} title="نفس‌گیری" desc="دم‌های آرام در مکث‌های بلند و میان جمله‌های طولانی." />
          <SettingToggle checked={warmth} onChange={setWarmth} icon={<Sparkles className="h-4 w-4 text-teal-300" />} title="گرمای اتاق ضبط" desc="پژواک بسیار ملایم؛ برای خبر می‌توانید خاموشش کنید." />
        </div>
        <div className="mt-4 space-y-4 border-t border-white/[0.06] pt-4">
          <ToneSlider label="سرعت خواندن" icon={<Gauge className="h-4 w-4 text-teal-300" />} value={rate} min={-50} max={50} minLabel="آهسته‌تر" maxLabel="تندتر" format={(n) => n === 0 ? "معمولی" : `${signedFa(n)}٪`} onChange={setRate} />
          <ToneSlider label="زیر و بمی" icon={<Waves className="h-4 w-4 text-teal-300" />} value={pitch} min={-100} max={100} minLabel="بم‌تر" maxLabel="زیرتر" format={(n) => n === 0 ? "طبیعی" : signedFa(n)} onChange={setPitch} />
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-ink-850/75 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div><h3 className="text-sm font-black">مدیریت صداهای آفلاین</h3><p className="mt-0.5 text-[10px] text-slate-500">مدل‌ها فقط یک‌بار دانلود می‌شوند</p></div>
          <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${isOnline ? "bg-teal-300/[0.08] text-teal-200" : "bg-amber-300/[0.08] text-amber-200"}`}>{isOnline ? "آنلاین" : "آفلاین"}</span>
        </div>
        {!storageOk && <p className="mb-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.06] p-2.5 text-[10px] leading-5 text-amber-100">حافظهٔ دائمی در این مرورگر در دسترس نیست؛ برای ذخیرهٔ همیشگی از APK یا Chrome استفاده کنید.</p>}
        <div className="space-y-2">
          {VOICES.map((voice) => {
            const pv = piperByCharacter(voice.id);
            const state = voiceStates[pv.piperId];
            const selected = voice.id === voiceId;
            const downloading = state?.progress != null;
            const ready = state?.status === "stored" || state?.status === "bundled";
            return (
              <div key={voice.id} className={`rounded-xl border p-2.5 ${selected ? "border-teal-300/25 bg-teal-300/[0.035]" : "border-white/[0.06] bg-white/[0.015]"}`}>
                <div className="flex items-center gap-2.5">
                  <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg"><Image src={voice.image} alt={voice.name} fill sizes="36px" className="object-cover" /></span>
                  <div className="min-w-0 flex-1"><b className="text-xs text-slate-100">{voice.name}</b><span className="mr-1.5 text-[9px] text-slate-500">{voice.title}</span></div>
                  {downloading ? (
                    <span className="text-[10px] font-bold text-amber-200 tabular-nums">{toFaDigits(Math.round(state.progress ?? 0))}٪</span>
                  ) : ready ? (
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-teal-300"><Check className="h-3 w-3" />{state?.status === "bundled" ? "همراه اپ" : "ذخیره شد"}</span>
                      {state?.status === "stored" && (confirmRemoveVoice === pv.piperId ? (
                        <span className="flex gap-1"><button type="button" onClick={() => void onRemove(voice.id)} className="text-[9px] font-bold text-rose-300">حذف</button><button type="button" onClick={() => setConfirmRemoveVoice(null)} className="text-[9px] text-slate-500">لغو</button></span>
                      ) : <button type="button" aria-label={`حذف مدل ${voice.name}`} onClick={() => setConfirmRemoveVoice(pv.piperId)} className="grid h-7 w-7 place-items-center rounded-lg text-slate-600 hover:bg-rose-400/[0.08] hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button>)}
                    </div>
                  ) : state?.status === "checking" || !state ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-600" />
                  ) : (
                    <button type="button" disabled={!isOnline || downloading} onClick={() => void onDownload(voice.id)} className="rounded-lg bg-amber-300 px-2.5 py-1.5 text-[9px] font-black text-ink-950 disabled:opacity-40">دانلود · {toFaDigits(Math.round(pv.sizeBytes / 1048576))} مگابایت</button>
                  )}
                </div>
                {downloading && <div className="mt-2 h-1 overflow-hidden rounded-full bg-ink-600" dir="ltr"><div className="h-full bg-amber-300 transition-[width]" style={{ width: `${state.progress ?? 0}%` }} /></div>}
                {state?.error && <p className="mt-1 text-[9px] leading-4 text-rose-300">{state.error}</p>}
                <p className="mt-1 text-[9px] text-slate-600" dir="ltr">{pv.piperId}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-ink-850/75 p-4">
        <h3 className="mb-2 text-sm font-black">امضای هر لحن</h3>
        <div className="space-y-1.5">
          {TONES.map((tone) => {
            const Icon = IconStyle(tone.id);
            return <div key={tone.id} className="flex items-start gap-2 rounded-xl bg-white/[0.02] p-2.5"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><div><b className="text-[11px] text-slate-200">{tone.title}</b><p className="mt-0.5 text-[10px] leading-4 text-slate-500">{tone.desc}</p></div></div>;
          })}
        </div>
      </section>
    </div>
  );
}

function AboutPanel() {
  return (
    <div className="space-y-3">
      <section className="overflow-hidden rounded-2xl border border-teal-300/20 bg-gradient-to-br from-teal-300/[0.09] via-ink-850 to-amber-300/[0.045] p-5 text-center">
        <Image
          src="/logo/logo-round-1024.png"
          alt="لوگوی ندای پهلوی"
          width={88}
          height={88}
          className="mx-auto h-24 w-24 rounded-full object-cover shadow-[0_14px_40px_rgba(201,152,37,.3)] ring-2 ring-amber-300/40"
        />
        <h2 className="mt-3 text-2xl font-black tracking-tight">دربارهٔ ندای پهلوی</h2>
        <p className="mt-2 text-[12px] leading-6 text-slate-300">استودیوی آفلاین تبدیل متن فارسی به گفتار. صدای متن شما روی دستگاه ساخته می‌شود؛ متن به سرور فرستاده نمی‌شود.</p>
      </section>
      <section className="rounded-2xl border border-white/[0.07] bg-ink-850/75 p-4">
        <h3 className="flex items-center gap-2 text-sm font-black"><ShieldCheck className="h-4 w-4 text-teal-300" />حریم خصوصی و فناوری</h3>
        <ul className="mt-3 space-y-2 text-[11px] leading-5 text-slate-400">
          <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-300" />ساخت گفتار، پردازش صدا و تاریخچه کاملاً روی همین دستگاه است.</li>
          <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-300" />نه از صدای مرورگر استفاده می‌شود و نه به سرویس ابری وصل می‌شویم.</li>
          <li className="flex gap-2"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-300" />موتور گفتار Piper/VITS، واج‌خوان eSpeak-NG و اجرای ONNX همگی متن‌باز هستند.</li>
        </ul>
      </section>
      <section className="rounded-2xl border border-white/[0.07] bg-ink-850/75 p-4">
        <h3 className="mb-3 text-sm font-black">سپاس از سازندگان مدل‌های فارسی</h3>
        <div className="space-y-2">
          {PIPER_VOICES.map((pv) => {
            const voice = voiceById(pv.characterId);
            return <div key={pv.piperId} className="flex items-center gap-2.5 rounded-xl border border-white/[0.05] bg-white/[0.02] p-2.5"><span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg"><Image src={voice.image} alt={voice.name} fill sizes="36px" className="object-cover" /></span><div><b className="block text-[11px] text-slate-200">{voice.name} · {voice.title}</b><span className="text-[9px] leading-4 text-slate-500">{pv.credit}</span></div></div>;
          })}
        </div>
        <p className="mt-3 text-[10px] leading-5 text-slate-600">مدل‌ها با مجوزهای متن‌باز منتشر شده‌اند؛ نام سازندگان و مجوز هر مدل در توضیحات مخزن پروژه آمده است.</p>
      </section>
      <div className="flex items-center justify-between px-1 text-[9px] text-slate-600"><span>ندای پهلوی</span><span>ساخته‌شده برای زبان فارسی</span></div>
    </div>
  );
}
