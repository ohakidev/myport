"use client";

import type { RefObject } from "react";
import { ctaPressScale } from "@/components/motion/press-intent";
import { gsap, useGSAP } from "@/lib/gsap";

const CTA = ".p-btn-primary[data-press], a.p-link[data-press]";

function pressTarget(root: HTMLElement, event: Event) {
  const node = event.target;
  if (!(node instanceof Element)) return null;
  const target = node.closest<HTMLElement>(CTA);
  if (!target || !root.contains(target)) return null;
  return target;
}

/** Hover lift and press-in for primary actions only. Transform only, no overshoot. */
export function usePressFeedback(scope: RefObject<HTMLElement | null>, motionEnabled: boolean) {
  useGSAP((_context, contextSafe) => {
    const root = scope.current;
    if (!root || !contextSafe) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      if (!motionEnabled) return;
      const enter = contextSafe((event: PointerEvent) => {
        const target = pressTarget(root, event);
        if (!target || event.pointerType === "touch") return;
        const from = event.relatedTarget;
        if (from instanceof Node && target.contains(from)) return;
        gsap.to(target, { y: -2, duration: 0.22, ease: "power2.out", overwrite: "auto" });
      });
      const leave = contextSafe((event: PointerEvent) => {
        const target = pressTarget(root, event);
        if (!target) return;
        const to = event.relatedTarget;
        if (to instanceof Node && target.contains(to)) return;
        gsap.to(target, { y: 0, scale: 1, duration: 0.2, ease: "power2.out", overwrite: "auto" });
      });
      const down = contextSafe((event: PointerEvent) => {
        const target = pressTarget(root, event);
        if (!target) return;
        gsap.to(target, { y: 1, scale: ctaPressScale(true), duration: 0.09, ease: "power2.out", overwrite: "auto" });
      });
      const up = contextSafe((event: PointerEvent) => {
        const target = pressTarget(root, event);
        if (!target) return;
        gsap.to(target, { y: -2, scale: ctaPressScale(false), duration: 0.16, ease: "power2.out", overwrite: "auto" });
      });
      root.addEventListener("pointerover", enter);
      root.addEventListener("pointerout", leave);
      root.addEventListener("pointerdown", down);
      root.addEventListener("pointerup", up);
      root.addEventListener("pointercancel", up);
      return () => {
        root.removeEventListener("pointerover", enter);
        root.removeEventListener("pointerout", leave);
        root.removeEventListener("pointerdown", down);
        root.removeEventListener("pointerup", up);
        root.removeEventListener("pointercancel", up);
      };
    });
  }, { scope, dependencies: [motionEnabled], revertOnUpdate: true });
}
