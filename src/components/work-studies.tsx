"use client";

import { useRef, useState } from "react";
import { ArrowUpRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ArchitectureInspector } from "@/components/architecture-inspector";
import ClickSpark from "@/components/ClickSpark";
import SpotlightCard from "@/components/SpotlightCard";
import { InkRule } from "@/components/motion/ink-rule";
import { usePressFeedback } from "@/components/motion/use-press-feedback";
import { PixelDistortionStage } from "@/components/dave-animations";
import { caseStudies } from "@/lib/case-studies";
import { usePortfolioMotion } from "@/hooks/use-portfolio-motion";
import { gsap, useGSAP, whenMotion } from "@/lib/gsap";

export function WorkStudies() {
  const root = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState("all");
  const [motionEnabled] = usePortfolioMotion();
  const studies = caseStudies.filter(study => filter === "all" || study.id === filter);
  usePressFeedback(root, motionEnabled);

  useGSAP(() => {
    const mm = whenMotion(motionEnabled, () => {
      gsap.from("[data-work-filter]", { x: -14, duration: 0.4, stagger: 0.05, ease: "power2.out" });
      const method = root.current?.querySelector<HTMLElement>("[data-method]");
      if (!method) return;
      gsap.timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: { trigger: method, start: "top 85%", once: true },
      })
        .from(method.querySelector(".band-mask > span"), { yPercent: 110, duration: 0.5 })
        .from(method.querySelector("[data-ink]"), { scaleX: 0, duration: 0.4, ease: "power2.inOut" }, 0.1);
    });
    return () => mm.revert();
  }, { scope: root, dependencies: [motionEnabled], revertOnUpdate: true });

  useGSAP(() => {
    const mm = whenMotion(motionEnabled, () => {
      root.current?.querySelectorAll<HTMLElement>("[data-case]").forEach(section => {
        gsap.timeline({
          defaults: { ease: "power3.out" },
          scrollTrigger: { trigger: section, start: "top 80%", once: true },
        })
          .from(section.querySelector(".band-mask > span"), { yPercent: 110, duration: 0.55 })
          .from(section.querySelector("[data-ink]"), { scaleX: 0, duration: 0.45, ease: "power2.inOut" }, 0.12)
          .from(section.querySelector("[data-case-copy]"), { x: -24, duration: 0.5 }, 0.18)
          .from(section.querySelector("[data-case-stage]"), { x: 24, duration: 0.5 }, 0.22);
      });
    });
    return () => mm.revert();
  }, { scope: root, dependencies: [filter, motionEnabled], revertOnUpdate: true });

  return (
    <ClickSpark sparkColor="#ffd45c" sparkSize={11} sparkRadius={20} sparkCount={8} duration={420}>
    <div id="work-content" ref={root}>
      <div className="work-filters p-filters" role="group" aria-label="Filter case studies">
        <Button className="p-btn p-filter" data-press data-work-filter variant="ghost" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All case studies</Button>
        {caseStudies.map(study => <Button key={study.id} className="p-btn p-filter" data-press data-work-filter variant="ghost" aria-pressed={filter === study.id} onClick={() => setFilter(study.id)}>{study.name}</Button>)}
      </div>
      {studies.map(study => (
        <section className="p-section work-case" data-case id={study.id === "myport" ? "myport" : "activity"} key={study.id} aria-labelledby={`${study.id}-title`}>
          <header>
            <p className="p-mono work-category">{study.category}</p>
            <h2 id={`${study.id}-title`}><span className="band-mask"><span>{study.title}</span></span></h2>
            <InkRule />
            <p>{study.summary}</p>
          </header>
          <div className="work-case-grid">
            <div data-case-copy>
            <SpotlightCard spotlightColor="rgba(255, 212, 92, 0.18)" className="work-decision">
              <h3>The decision</h3><p>{study.decision}</p>
              <dl><div><dt>Project</dt><dd>{study.id}</dd></div><div><dt>Stack</dt><dd>{study.stack}</dd></div><div><dt>Source snapshot</dt><dd><a href={`${study.source}/commit/${study.commit}`} target="_blank" rel="noopener noreferrer">{study.commit.slice(0, 7)} <ArrowUpRight size={13} aria-hidden="true" /></a></dd></div></dl>
              <p className="work-source-note">{study.sourceNote}</p>
              <a className="p-link" data-press href={study.source} target="_blank" rel="noopener noreferrer">Open repository <ArrowUpRight size={16} aria-hidden="true" /></a>
            </SpotlightCard>
            </div>
            <div className="work-case-right" data-case-stage>
              <PixelDistortionStage study={study} motionEnabled={motionEnabled} />
              <ArchitectureInspector study={study} />
            </div>
          </div>
        </section>
      ))}
      <section className="p-section work-boundaries" id="method" data-method>
        <h2><span className="band-mask"><span>Evidence, with boundaries.</span></span></h2>
        <InkRule />
        <p>Source links point to exact historical commits, not a moving branch. Code shows implementation; it does not establish deployment, adoption or measured performance. The current implementation is distinguished from each pinned snapshot.</p>
      </section>
    </div>
    </ClickSpark>
  );
}
