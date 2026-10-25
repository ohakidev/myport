"use client";

import { useRef } from "react";
import { inkScale } from "@/components/motion/ink-scale";
import { usePortfolioMotion } from "@/hooks/use-portfolio-motion";
import { gsap, useGSAP } from "@/lib/gsap";

/** The about rule draws with scroll progress. Other rules stay still. */
export function SignatureInk() {
  const rule = useRef<HTMLSpanElement>(null);
  const [motionEnabled] = usePortfolioMotion();

  useGSAP(() => {
    const node = rule.current;
    const section = node?.closest("section");
    if (!node || !section) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      if (!motionEnabled) return;
      const draw = { progress: 0 };
      gsap.fromTo(draw, { progress: 0 }, {
        progress: 1,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top 78%",
          end: "top 42%",
          scrub: true,
        },
        onUpdate: () => {
          gsap.set(node, { scaleX: inkScale(draw.progress) });
        },
      });
    });
    return () => mm.revert();
  }, { dependencies: [motionEnabled], revertOnUpdate: true });

  return (
    <span
      ref={rule}
      className="ink-rule ink-rule-hero ink-rule-signature"
      data-ink
      data-scrub="about"
      aria-hidden="true"
    />
  );
}
