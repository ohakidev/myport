"use client";

import type { RefObject } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

const FINE_POINTER = "(prefers-reduced-motion: no-preference) and (pointer: fine)";

/** Magnetic offset and a small tilt. Transform only. Off for touch, coarse pointers, and reduced motion. */
export function usePointerTilt(scope: RefObject<HTMLElement | null>, motionEnabled: boolean, selector: string, revision: unknown = selector) {
  useGSAP((_context, contextSafe) => {
    const root = scope.current;
    if (!root || !contextSafe || !motionEnabled) return;
    const mm = gsap.matchMedia();
    mm.add(FINE_POINTER, () => {
      const cards = gsap.utils.toArray<HTMLElement>(selector, root);
      const cleanups: Array<() => void> = [];
      cards.forEach(card => {
        const xTo = gsap.quickTo(card, "x", { duration: 0.45, ease: "power3.out" });
        const yTo = gsap.quickTo(card, "y", { duration: 0.45, ease: "power3.out" });
        const rxTo = gsap.quickTo(card, "rotationX", { duration: 0.5, ease: "power3.out" });
        const ryTo = gsap.quickTo(card, "rotationY", { duration: 0.5, ease: "power3.out" });
        const rest = () => {
          xTo(0);
          yTo(0);
          rxTo(0);
          ryTo(0);
        };
        const move = contextSafe((event: PointerEvent) => {
          if (event.pointerType === "touch" || event.buttons > 0) return;
          const bounds = card.getBoundingClientRect();
          if (bounds.width < 1 || bounds.height < 1) return;
          const px = (event.clientX - bounds.left) / bounds.width - 0.5;
          const py = (event.clientY - bounds.top) / bounds.height - 0.5;
          xTo(gsap.utils.clamp(-6, 6, px * 12));
          yTo(gsap.utils.clamp(-5, 5, py * 10));
          ryTo(gsap.utils.clamp(-3.5, 3.5, px * 7));
          rxTo(gsap.utils.clamp(-3.5, 3.5, py * -7));
        });
        const leave = contextSafe(() => rest());
        card.addEventListener("pointermove", move);
        card.addEventListener("pointerleave", leave);
        card.addEventListener("pointercancel", leave);
        cleanups.push(() => {
          card.removeEventListener("pointermove", move);
          card.removeEventListener("pointerleave", leave);
          card.removeEventListener("pointercancel", leave);
          rest();
        });
      });
      return () => cleanups.forEach(cleanup => cleanup());
    });
    return () => mm.revert();
  }, { scope, dependencies: [motionEnabled, selector, revision], revertOnUpdate: true });
}
