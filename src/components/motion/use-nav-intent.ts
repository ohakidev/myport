"use client";

import type { RefObject } from "react";
import { navLineScale } from "@/components/motion/press-intent";
import { gsap, useGSAP } from "@/lib/gsap";

function navHit(root: HTMLElement, event: Event) {
  const node = event.target;
  if (!(node instanceof Element)) return null;
  const link = node.closest<HTMLElement>("[data-nav-link]");
  if (!link || !root.contains(link)) return null;
  const line = link.querySelector<HTMLElement>(".nav-line");
  if (!line) return null;
  return { link, line };
}

/** Draw the link line on hover and press the link down. No bounce. */
export function useNavIntent(scope: RefObject<HTMLElement | null>, motionEnabled: boolean) {
  useGSAP((_context, contextSafe) => {
    const root = scope.current;
    if (!root || !contextSafe || !motionEnabled) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const over = contextSafe((event: PointerEvent) => {
        if (event.pointerType === "touch") return;
        const hit = navHit(root, event);
        if (!hit) return;
        const from = event.relatedTarget;
        if (from instanceof Node && hit.link.contains(from)) return;
        const current = hit.link.getAttribute("aria-current") === "page";
        gsap.to(hit.line, { scaleX: navLineScale(current, true), duration: 0.22, ease: "power2.out", overwrite: "auto" });
      });
      const out = contextSafe((event: PointerEvent) => {
        const hit = navHit(root, event);
        if (!hit) return;
        const to = event.relatedTarget;
        if (to instanceof Node && hit.link.contains(to)) return;
        const current = hit.link.getAttribute("aria-current") === "page";
        gsap.to(hit.line, { scaleX: navLineScale(current, false), duration: 0.18, ease: "power2.out", overwrite: "auto" });
        gsap.to(hit.link, { y: 0, duration: 0.16, ease: "power2.out", overwrite: "auto" });
      });
      const down = contextSafe((event: PointerEvent) => {
        const hit = navHit(root, event);
        if (!hit) return;
        gsap.to(hit.link, { y: 1, duration: 0.08, ease: "power2.out", overwrite: "auto" });
      });
      const up = contextSafe((event: PointerEvent) => {
        const hit = navHit(root, event);
        if (!hit) return;
        gsap.to(hit.link, { y: 0, duration: 0.16, ease: "power2.out", overwrite: "auto" });
      });
      root.addEventListener("pointerover", over);
      root.addEventListener("pointerout", out);
      root.addEventListener("pointerdown", down);
      root.addEventListener("pointerup", up);
      root.addEventListener("pointercancel", up);
      return () => {
        root.removeEventListener("pointerover", over);
        root.removeEventListener("pointerout", out);
        root.removeEventListener("pointerdown", down);
        root.removeEventListener("pointerup", up);
        root.removeEventListener("pointercancel", up);
      };
    });
    return () => mm.revert();
  }, { scope, dependencies: [motionEnabled], revertOnUpdate: true });
}
