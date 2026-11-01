"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

const DURATION = 2600; // ms — normal entrance
const EXIT = 550; // ms — fade out
const FULL_CAP = 4500; // ms — never keep the user waiting

/**
 * Animated entrance: the round «ندای پهلوی» emblem pops in with a golden
 * glow, the title fades up, the sound bars dance, then the whole screen
 * dissolves into the app. Tap anywhere to skip.
 */
export default function Splash() {
  const [phase, setPhase] = useState<"show" | "exit" | "done">("show");
  const reduced =
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const finished = useRef(false);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setPhase("exit");
    setTimeout(() => setPhase("done"), EXIT + 60);
  }, []);

  useEffect(() => {
    const t1 = setTimeout(finish, reduced ? 1100 : DURATION);
    const t2 = setTimeout(finish, FULL_CAP); // hard cap
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [finish, reduced]);

  // keep the page behind still while the splash is on screen
  useEffect(() => {
    if (phase === "done") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div
      role="status"
      aria-label="ندای پهلوی در حال آماده‌سازی است"
      onPointerDown={finish}
      className={`fixed inset-0 z-[80] flex select-none flex-col items-center justify-center overflow-hidden bg-[#05070d] ${
        phase === "exit" ? "splash-exit" : "splash-enter"
      }`}
    >
      {/* ambient golden glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_38%,rgba(212,164,55,0.16),transparent_70%)]" />
      <div className="splash-ring pointer-events-none absolute top-[31%] left-1/2 h-[46vmin] w-[46vmin] -translate-x-1/2 rounded-full" />

      {/* emblem */}
      <div className="splash-logo relative h-[42vmin] max-h-64 w-[42vmin] max-w-64">
        <Image
          src="/logo/logo-round-1024.png"
          alt="لوگوی ندای پهلوی"
          fill
          sizes="280px"
          priority
          className="object-contain drop-shadow-[0_18px_50px_rgba(201,152,37,0.35)]"
        />
      </div>

      {/* title + tagline + bars */}
      <div className="mt-5 flex flex-col items-center px-6 text-center">
        <h1 className="splash-title text-[34px] font-black tracking-tight sm:text-4xl">
          ندای پهلوی
        </h1>
        <p className="splash-tagline mt-2 text-[13px] font-semibold text-slate-300">
          تبدیل متن به فایل صوتی MP3
        </p>
        <div
          className="splash-bars mt-5 flex h-6 items-end gap-[5px]"
          aria-hidden
        >
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <span
              key={i}
              className="splash-bar w-[5px] rounded-full"
              style={{
                animationDelay: `${0.9 + i * 0.09}s`,
                animationDuration: `${0.72 + (i % 3) * 0.12}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* bottom progress hairline */}
      <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/5">
        <div className="splash-progress" />
      </div>
      <p className="splash-tagline absolute bottom-5 text-[11px] text-slate-500">
        لمس برای رد کردن
      </p>
    </div>
  );
}
