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
      <main className="app-main" dir="rtl">
        {section === "speech" ? <Studio /> : <IranAryaeiTools />}
      </main>
      <nav className="app-bottom-nav" dir="rtl" aria-label="ناوبری اصلی برنامه">
        <button type="button" className={section === "speech" ? "active" : ""} aria-pressed={section === "speech"} onClick={() => setSection("speech")}>
          <span className="app-bottom-icon">◉</span>
          <span>متن به صدا</span>
          <small>استودیو</small>
        </button>
        <button type="button" className={section === "tools" ? "active" : ""} aria-pressed={section === "tools"} onClick={() => setSection("tools")}>
          <span className="app-bottom-icon">✦</span>
          <span>ابزارهای ایران آریایی</span>
          <small>تصویر، QR و فایل</small>
        </button>
      </nav>
    </>
  );
}
