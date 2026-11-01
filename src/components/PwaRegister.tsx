"use client";

import { Capacitor } from "@capacitor/core";
import { useEffect } from "react";

/**
 * Registers the service worker for the WEB version only (production).
 * Inside the Android app everything is already local, so it is skipped.
 */
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (Capacitor.isNativePlatform()) return;
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* PWA is a progressive enhancement */
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
