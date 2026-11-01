"use client";

import {
  Clapperboard,
  Download,
  Film,
  Image as ImageIcon,
  Loader2,
  Music4,
  Square,
  TriangleAlert,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Clip } from "@/lib/idb";
import { saveAudio } from "@/lib/save";
import { formatClock } from "@/lib/format";
import { voiceById, toneById } from "@/lib/voices";
import {
  MEDIA_FORMATS,
  MEDIA_STYLES,
  renderCover,
  renderVideo,
  type MediaFormat,
  type MediaStyle,
} from "@/lib/video";

export interface ClipView {
  clip: Clip;
  url: string;
}

type Job = "idle" | "image" | "video";

export default function VideoStudio({
  clips,
  onToast,
}: {
  clips: ClipView[];
  onToast: (msg: string) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(clips[0]?.clip.id ?? null);
  const [format, setFormat] = useState<MediaFormat>("reel");
  const [style, setStyle] = useState<MediaStyle>("royal");
  const [job, setJob] = useState<Job>("idle");
  const [progress, setProgress] = useState(0);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const selected = clips.find((c) => c.clip.id === selectedId) ?? clips[0] ?? null;

  // keep a valid selection when the list changes
  useEffect(() => {
    if (!selected && clips[0]) setSelectedId(clips[0].clip.id);
  }, [clips, selected]);

  // revoke object URLs on unmount
  useEffect(
    () => () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    },
    [imageUrl, videoUrl],
  );

  const busy = job !== "idle";
  const fileNameBase = useCallback(() => {
    if (!selected) return "neday";
    return `neday-pahlavi-${selected.clip.voiceId}-${selected.clip.toneId}`;
  }, [selected]);

  async function makeImage() {
    if (!selected || busy) return;
    setError(null);
    setJob("image");
    setProgress(0.15);
    try {
      const blob = await renderCover(selected.clip, { format, style });
      setImageBlob(blob);
      setImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      setVideoBlob(null);
      setVideoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setProgress(1);
      onToast("عکس ساخته شد؛ می‌توانید آن را ذخیره کنید.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "ساخت عکس ممکن نشد.");
    } finally {
      setJob("idle");
    }
  }

  async function makeVideo() {
    if (!selected || busy) return;
    setError(null);
    setJob("video");
    setProgress(0);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const blob = await renderVideo(
        selected.clip,
        { format, style },
        selected.clip.blob,
        setProgress,
        controller.signal,
      );
      setVideoBlob(blob);
      setVideoUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      setImageBlob(null);
      setImageUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      onToast("ویدئو ساخته شد؛ می‌توانید آن را ذخیره کنید.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg !== "CANCELLED") setError(msg || "ساخت ویدئو ممکن نشد.");
    } finally {
      abortRef.current = null;
      setJob("idle");
    }
  }

  async function save(kind: "image" | "video") {
    const blob = kind === "image" ? imageBlob : videoBlob;
    if (!blob) return;
    const name =
      kind === "image"
        ? `${fileNameBase()}.png`
        : `${fileNameBase()}.webm`;
    const r = await saveAudio(blob, name, kind === "image" ? "image/png" : "video/webm");
    onToast(r.message || "ذخیره شد.");
  }

  const recent = clips.slice(0, 40);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3.5">
      {/* source picker */}
      <section className="rounded-2xl border border-white/8 bg-ink-850/90 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)] sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-100">
            <Music4 className="h-4.5 w-4.5 text-amber-300" />
            ۱) یک فایل صوتی بچینید
          </h2>
          <span className="text-[10px] text-slate-500">از کتابخانهٔ شما</span>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/12 bg-white/[0.02] px-4 py-8 text-center">
            <Clapperboard className="mx-auto h-8 w-8 text-slate-600" />
            <p className="mt-2 text-xs leading-5 text-slate-400">
              هنوز فایل صوتی‌ای ندارید. اول در بخش «متن به صدا» یک فایل بسازید تا
              بتوانید از آن ویدئو و عکس تهیه کنید.
            </p>
          </div>
        ) : (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {recent.map((c) => {
              const active = selected?.clip.id === c.clip.id;
              const v = voiceById(c.clip.voiceId);
              return (
                <button
                  key={c.clip.id}
                  type="button"
                  onClick={() => setSelectedId(c.clip.id)}
                  className={`w-44 shrink-0 rounded-xl border p-2.5 text-right transition active:scale-[0.98] ${
                    active
                      ? "border-amber-400/70 bg-amber-400/[0.08]"
                      : "border-white/10 bg-white/[0.03] hover:border-white/20"
                  }`}
                >
                  <p className="line-clamp-2 h-8 text-[11px] leading-4 text-slate-200">
                    {c.clip.text.slice(0, 60)}
                  </p>
                  <p className="mt-1.5 flex items-center justify-between text-[9px] text-slate-500">
                    <span>{v.name}</span>
                    <span className="tabular-nums">{formatClock(c.clip.durationSec)}</span>
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* look */}
      <section className="rounded-2xl border border-white/8 bg-ink-850/90 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.35)] sm:rounded-3xl">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-100">
          <Film className="h-4.5 w-4.5 text-amber-300" />
          ۲) شکل و فرم
        </h2>
        <div className="mb-3">
          <p className="mb-1.5 text-[11px] text-slate-400">فرمت</p>
          <div className="flex gap-2">
            {MEDIA_FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFormat(f.id)}
                className={`flex-1 rounded-xl border px-3 py-2 text-right transition ${
                  format === f.id
                    ? "border-amber-400/70 bg-amber-400/[0.08]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20"
                }`}
              >
                <span className="block text-xs font-bold text-slate-100">{f.label}</span>
                <span className="block text-[10px] text-slate-500">{f.hint}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] text-slate-400">پس‌زمینه</p>
          <div className="grid grid-cols-4 gap-2">
            {MEDIA_STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStyle(s.id)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-2 transition ${
                  style === s.id
                    ? "border-amber-400/70 bg-amber-400/[0.08]"
                    : "border-white/10 bg-white/[0.03] hover:border-white/20"
                }`}
              >
                <span
                  className="h-9 w-full rounded-lg"
                  style={{ background: s.swatch }}
                />
                <span className="text-[10px] font-semibold text-slate-200">
                  {s.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* actions */}
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <button
          type="button"
          onClick={() => void makeImage()}
          disabled={!selected || busy}
          className="flex h-13 flex-1 items-center justify-center gap-2 rounded-2xl border border-teal-400/40 bg-teal-400/10 px-4 text-sm font-black text-teal-100 transition hover:bg-teal-400/20 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {job === "image" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ImageIcon className="h-5 w-5" />
          )}
          ساخت عکس (کارت)
        </button>
        <button
          type="button"
          onClick={() => void makeVideo()}
          disabled={!selected || busy}
          className="flex h-13 flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 text-sm font-black text-ink-950 transition hover:bg-amber-300 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {job === "video" ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Clapperboard className="h-5 w-5" />
          )}
          ساخت ویدئو با صدا
        </button>
      </div>
      {selected && (
        <p className="-mt-1 text-center text-[10px] leading-4 text-slate-500">
          ویدئو به‌اندازهٔ مدت صدا ({formatClock(selected.clip.durationSec)}) و
          با کیفیت واقعی رندر می‌شود.
        </p>
      )}

      {job === "video" && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-400/30 bg-amber-400/[0.06] px-3 py-2.5">
          <Loader2 className="h-4 w-4 animate-spin text-amber-300" />
          <div className="flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-ink-600">
              <div
                className="h-full rounded-full bg-amber-400 transition-[width]"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-amber-100">
              در حال رندر ویدئو… {toPct(progress)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/15 text-slate-300"
            aria-label="لغو رندر"
          >
            <Square className="h-3.5 w-3.5" fill="currentColor" />
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-400/40 bg-rose-500/12 px-3 py-2.5 text-xs leading-5 text-rose-100"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="بستن">
            <X className="h-4 w-4 text-rose-200/70" />
          </button>
        </div>
      )}

      {/* results */}
      {imageUrl && (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-ink-850/90 shadow-[0_18px_50px_rgba(0,0,0,0.4)] sm:rounded-3xl">
          <div className="flex max-h-[52vh] items-center justify-center bg-black/40 p-3">
            <img
              src={imageUrl}
              alt="عکس ساخته‌شده"
              className="max-h-[48vh] w-auto rounded-lg"
            />
          </div>
          <div className="flex gap-2 p-3">
            <button
              type="button"
              onClick={() => void save("image")}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 text-sm font-black text-ink-950 transition hover:bg-amber-300"
            >
              <Download className="h-5 w-5" />
              ذخیرهٔ عکس در گوشی
            </button>
          </div>
        </section>
      )}

      {videoUrl && (
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-ink-850/90 shadow-[0_18px_50px_rgba(0,0,0,0.4)] sm:rounded-3xl">
          <div className="flex items-center justify-center bg-black/40 p-3">
            <video
              src={videoUrl}
              controls
              playsInline
              className="max-h-[52vh] w-auto rounded-lg"
            />
          </div>
          <div className="flex flex-col gap-2 p-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void save("video")}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 text-sm font-black text-ink-950 transition hover:bg-amber-300"
            >
              <Download className="h-5 w-5" />
              ذخیرهٔ ویدئو در گوشی
            </button>
            <button
              type="button"
              onClick={() => {
                setVideoBlob(null);
                setVideoUrl((prev) => {
                  if (prev) URL.revokeObjectURL(prev);
                  return null;
                });
              }}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 text-xs font-bold text-slate-200 transition hover:text-rose-200"
            >
              <X className="h-4 w-4" />
              بستن
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function toPct(f: number) {
  return `${toFa(Math.round(f * 100))}٪`;
}
function toFa(n: number) {
  return String(n).replace(/[0-9]/g, (d) => "۰۱۲۳۴۵۶۸۹"[Number(d)]);
}
