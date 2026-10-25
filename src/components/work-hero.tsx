"use client";

import { useRef } from "react";
import { ArrowUpRight } from "@phosphor-icons/react";
import { InkRule } from "@/components/motion/ink-rule";
import { MaskedChars } from "@/components/motion/masked-chars";
import { usePressFeedback } from "@/components/motion/use-press-feedback";
import { usePortfolioMotion } from "@/hooks/use-portfolio-motion";
import { gsap, useGSAP, whenMotion } from "@/lib/gsap";

export function WorkHero() {
  const hero = useRef<HTMLElement>(null);
  const [motionEnabled] = usePortfolioMotion();
  usePressFeedback(hero, motionEnabled);

  useGSAP(() => {
    const mm = whenMotion(motionEnabled, () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from("[data-char]", { yPercent: 110, duration: 0.72, stagger: 0.022 })
        .from("[data-ink]", { scaleX: 0, duration: 0.5, ease: "power2.inOut" }, 0.32)
        .from("[data-hero-copy]", { x: -28, duration: 0.48 }, 0.4)
        .from("[data-hero-link]", { x: -16, duration: 0.4 }, 0.5);
    });
    return () => mm.revert();
  }, { scope: hero, dependencies: [motionEnabled], revertOnUpdate: true });

  return (
    <header className="work-hero" ref={hero}>
      <h1 aria-label="Behind the build.">
        <MaskedChars text={"BEHIND\nTHE BUILD."} />
        <InkRule origin="end" className="ink-rule-hero" />
      </h1>
      <p data-hero-copy>Decisions, state transitions and trade-offs. Two projects, with the source beside the story.</p>
      <a className="p-link" data-hero-link data-press href="https://github.com/ohakidev" target="_blank" rel="noopener noreferrer">GitHub profile <ArrowUpRight size={16} aria-hidden="true" /></a>
    </header>
  );
}
