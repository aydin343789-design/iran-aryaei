"use client";

import { useState } from "react";
import Splash from "@/components/Splash";
import Studio from "@/components/Studio";
import IranAryaeiTools from "@/components/IranAryaeiTools";

export default function HomePage() {
  const [section, setSection] = useState<"speech" | "tools">("speech");

  return (
    <>
      <Splash />
      <header className="app-switcher" dir="rtl">
        <div className="app-switcher-inner">
          <div className="app-brand">
            <span className="app-brand-mark">ای</span>
            <span>
              <strong>ایران آریایی</strong>
              <small>استودیو و جعبه‌ابزار هوشمند</small>
            </span>
          </div>
          <nav className="app-tabs" aria-label="بخش‌های برنامه">
            <button type="button" className={section === "speech" ? "active" : ""} aria-pressed={section === "speech"} onClick={() => setSection("speech")}>
              <span>◉</span> متن به صدا
            </button>
            <button type="button" className={section === "tools" ? "active" : ""} aria-pressed={section === "tools"} onClick={() => setSection("tools")}>
              <span>✦</span> ابزارهای ایران آریایی
            </button>
          </nav>
        </div>
      </header>
      {section === "speech" ? <Studio /> : <IranAryaeiTools />}
    </>
  );
}
