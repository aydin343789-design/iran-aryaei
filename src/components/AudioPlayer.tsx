"use client";

import {
  Download,
  Gauge,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Share2,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { formatClock, toFaDigits } from "@/lib/format";

export const PLAY_EVENT = "avasaz:exclusive-play";
const SPEEDS = [1, 1.25, 1.5, 2, 0.75];

function seededBars(seedSource: string, count: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seedSource.length; i++) {
    h ^= seedSource.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  const rand = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const bars: number[] = [];
  let level = 0.55;
  for (let i = 0; i < count; i++) {
    level += (rand() - 0.5) * 0.5;
    level = Math.min(1, Math.max(0.16, level));
    const arch = 0.72 + 0.28 * Math.sin((i / (count - 1)) * Math.PI);
    bars.push(Math.min(1, Math.max(0.14, level * arch + rand() * 0.12)));
  }
  return bars;
}

export interface AudioPlayerProps {
  src: string;
  /** known duration (seconds) shown until the audio reports its own */
  durationHint?: number;
  variant?: "full" | "compact";
  /** increment to request autoplay */
  autoPlayKey?: number;
  onDownload: () => void;
  onShare?: () => void;
}

export default function AudioPlayer({
  src,
  durationHint = 0,
  variant = "full",
  autoPlayKey = 0,
  onDownload,
  onShare,
}: AudioPlayerProps) {
  const playerId = useId();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveRef = useRef<HTMLDivElement | null>(null);
  const scrubbingRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(0);
  const [finished, setFinished] = useState(false);

  const full = variant === "full";
  const bars = useMemo(() => seededBars(src, full ? 64 : 40), [src, full]);
  const effectiveDuration =
    Number.isFinite(duration) && duration > 0 ? duration : durationHint;
  const progress = effectiveDuration > 0 ? current / effectiveDuration : 0;

  /* pause when another player (or a voice sample) starts */
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail;
      if (detail?.id !== playerId) audioRef.current?.pause();
    };
    window.addEventListener(PLAY_EVENT, handler);
    return () => window.removeEventListener(PLAY_EVENT, handler);
  }, [playerId]);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    window.dispatchEvent(
      new CustomEvent(PLAY_EVENT, { detail: { id: playerId } }),
    );
    if (finished) {
      audio.currentTime = 0;
      setFinished(false);
    }
    try {
      await audio.play();
    } catch {
      /* autoplay restrictions — user can press play */
    }
  }, [playerId, finished]);

  useEffect(() => {
    if (autoPlayKey > 0) void play();
  }, [autoPlayKey, play]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void play();
    else audio.pause();
  };

  const seekFromPointer = (clientX: number) => {
    const audio = audioRef.current;
    const wave = waveRef.current;
    if (!audio || !wave || !Number.isFinite(audio.duration) || !audio.duration)
      return;
    const rect = wave.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (rect.right - clientX) / rect.width));
    audio.currentTime = ratio * audio.duration;
    setCurrent(audio.currentTime);
    setFinished(false);
  };

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next];
  };

  const iconBox = full ? "h-11 w-11" : "h-9 w-9";

  return (
    <div
      className={`flex w-full items-center ${full ? "gap-3 sm:gap-4" : "gap-2.5"}`}
      dir="rtl"
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onCanPlay={() => setWaiting(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration || 0);
          e.currentTarget.playbackRate = SPEEDS[speedIdx];
        }}
        onEnded={() => {
          setPlaying(false);
          setFinished(true);
        }}
      />

      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "توقف پخش" : "پخش صدا"}
        className={`grid shrink-0 place-items-center rounded-full bg-teal-400 text-ink-950 shadow-[0_10px_30px_rgba(45,212,191,0.35)] transition hover:bg-teal-300 active:scale-95 ${
          full ? "h-14 w-14 sm:h-16 sm:w-16" : "h-11 w-11"
        } ${playing ? "" : "animate-ring-pulse"}`}
      >
        {waiting ? (
          <Loader2 className={`${full ? "h-7 w-7" : "h-5 w-5"} animate-spin`} />
        ) : playing ? (
          <Pause className={full ? "h-7 w-7" : "h-5 w-5"} fill="currentColor" />
        ) : finished ? (
          <RotateCcw className={full ? "h-6 w-6" : "h-5 w-5"} />
        ) : (
          <Play
            className={`${full ? "h-7 w-7" : "h-5 w-5"} -scale-x-100`}
            fill="currentColor"
          />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div
          ref={waveRef}
          role="slider"
          aria-label="نوار پخش"
          aria-valuemin={0}
          aria-valuemax={Math.round(effectiveDuration)}
          aria-valuenow={Math.round(current)}
          className={`flex cursor-pointer touch-none items-center gap-[2px] select-none ${
            full ? "h-14 sm:h-16" : "h-9"
          }`}
          onPointerDown={(e) => {
            scrubbingRef.current = true;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            seekFromPointer(e.clientX);
          }}
          onPointerMove={(e) => {
            if (scrubbingRef.current) seekFromPointer(e.clientX);
          }}
          onPointerUp={() => (scrubbingRef.current = false)}
          onPointerCancel={() => (scrubbingRef.current = false)}
        >
          {bars.map((h, i) => {
            const ratio = i / bars.length;
            const played = ratio <= progress;
            const isHead =
              Math.abs(ratio - progress) < 1 / bars.length && progress > 0;
            return (
              <span
                key={i}
                className={`min-w-[2px] flex-1 rounded-full transition-colors duration-150 ${
                  isHead ? "bg-amber-400" : played ? "bg-teal-400" : "bg-ink-600"
                }`}
                style={{ height: `${Math.round(h * 100)}%` }}
              />
            );
          })}
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 tabular-nums">
          <span className="flex items-center gap-2">
            <span>{formatClock(current)}</span>
            {playing && (
              <span className="flex h-3 items-end gap-[2px]" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="eq-bar w-[3px] rounded-full bg-teal-300"
                    style={{
                      height: "100%",
                      animationDelay: `${i * 0.13}s`,
                      animationDuration: `${0.7 + i * 0.09}s`,
                    }}
                  />
                ))}
              </span>
            )}
          </span>
          <span>{formatClock(effectiveDuration)}</span>
        </div>
      </div>

      <div className={`flex shrink-0 items-center ${full ? "gap-1.5" : "gap-1"}`}>
        <button
          type="button"
          onClick={cycleSpeed}
          aria-label="سرعت پخش"
          title="سرعت پخش"
          className={`grid place-items-center gap-0.5 rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-teal-400/50 hover:text-teal-300 ${iconBox}`}
        >
          <Gauge className="h-3.5 w-3.5 opacity-70" />
          <span className="text-[10px] leading-none font-bold">
            {toFaDigits(SPEEDS[speedIdx])}×
          </span>
        </button>
        {onShare && full && (
          <button
            type="button"
            onClick={onShare}
            aria-label="اشتراک‌گذاری فایل صوتی"
            title="اشتراک‌گذاری"
            className={`grid place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:border-teal-400/50 hover:text-teal-300 ${iconBox}`}
          >
            <Share2 className="h-5 w-5" />
          </button>
        )}
        <button
          type="button"
          onClick={onDownload}
          aria-label="ذخیرهٔ فایل MP3 در گوشی"
          title="ذخیره در گوشی"
          className={`grid place-items-center rounded-xl bg-amber-400 font-bold text-ink-950 shadow-[0_8px_24px_rgba(245,158,11,0.3)] transition hover:bg-amber-300 active:scale-95 ${iconBox}`}
        >
          <Download className={full ? "h-5 w-5" : "h-4 w-4"} />
        </button>
      </div>
    </div>
  );
}
