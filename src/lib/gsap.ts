"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export { gsap, ScrollTrigger, useGSAP };

/** Portfolio toggle plus the OS media query. Animations revert with the hook context. */
export function whenMotion(motionEnabled: boolean, play: () => void) {
  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    if (!motionEnabled) return;
    play();
  });
  return mm;
}
