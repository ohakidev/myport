"use client";

import { useSyncExternalStore } from "react";

const preferenceKey = "ohaki-portfolio-motion";
let sessionPreference: boolean | undefined;

function getSnapshot() {
  if (sessionPreference !== undefined) return sessionPreference;
  try {
    const saved = localStorage.getItem(preferenceKey);
    if (saved === "full" || saved === "reduced") return saved === "full";
  } catch { /* OS preference remains available without storage. */ }
  return !matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function subscribe(update: () => void) {
  const media = matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", update);
  window.addEventListener("portfolio-motion", update);
  window.addEventListener("storage", update);
  return () => {
    media.removeEventListener("change", update);
    window.removeEventListener("portfolio-motion", update);
    window.removeEventListener("storage", update);
  };
}

function setMotionEnabled(enabled: boolean) {
  sessionPreference = enabled;
  try { localStorage.setItem(preferenceKey, enabled ? "full" : "reduced"); } catch { /* Session-only fallback. */ }
  window.dispatchEvent(new Event("portfolio-motion"));
}

export function usePortfolioMotion() {
  const motionEnabled = useSyncExternalStore(subscribe, getSnapshot, () => false);
  return [motionEnabled, setMotionEnabled] as const;
}
