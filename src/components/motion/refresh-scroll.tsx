"use client";

import { ScrollTrigger, useGSAP } from "@/lib/gsap";

export function RefreshScrollTriggers() {
  useGSAP(() => {
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh).catch(() => {});
    window.addEventListener("load", refresh);
    return () => window.removeEventListener("load", refresh);
  }, []);
  return null;
}
