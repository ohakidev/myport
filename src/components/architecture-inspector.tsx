"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { ArrowUpRight, ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { layerFillBox } from "@/components/motion/layer-fill";
import { caseSourceUrl, type CaseStudy } from "@/lib/case-studies";
import { usePortfolioMotion } from "@/hooks/use-portfolio-motion";
import { gsap } from "@/lib/gsap";
import { Flip } from "gsap/Flip";

gsap.registerPlugin(Flip);

export function ArchitectureInspector({ study }: { study: CaseStudy }) {
  const [selected, setSelected] = useState(0);
  const [motionEnabled] = usePortfolioMotion();
  const id = useId();
  const list = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const flip = useRef<Flip.FlipState | null>(null);
  const layer = study.layers[selected];

  const choose = (index: number) => {
    if (index === selected) return;
    if (motionEnabled && fill.current) flip.current = Flip.getState(fill.current);
    setSelected(index);
  };

  useLayoutEffect(() => {
    const listNode = list.current;
    const fillNode = fill.current;
    const button = listNode?.querySelectorAll<HTMLElement>(".p-layer")[selected];
    if (!listNode || !fillNode || !button) return;
    const state = flip.current;
    flip.current = null;
    gsap.set(fillNode, layerFillBox(listNode.getBoundingClientRect(), button.getBoundingClientRect()));
    if (!state || !motionEnabled) return;
    const tween = Flip.from(state, { duration: 0.45, ease: "power3.out" });
    return () => {
      tween.kill();
    };
  }, [selected, motionEnabled, study.id]);

  return (
    <div className="p-inspector">
      <header><span className="p-mono">Explore the architecture</span><ArrowRight size={16} aria-hidden="true" /></header>
      <div className="p-layer-list" ref={list} role="group" aria-label={`${study.name} architecture layers`}>
        <span ref={fill} className="p-layer-fill" data-layer-fill aria-hidden="true" />
        {study.layers.map((item, index) => (
          <Button variant="ghost" key={item.label} className="p-btn p-layer" id={`${id}-${index}`} aria-pressed={selected === index} aria-controls={`${id}-detail`} onClick={() => choose(index)}>
            <span className="p-mono">0{index + 1}</span><strong>{item.label}</strong>
          </Button>
        ))}
      </div>
      <div id={`${id}-detail`} role="region" aria-labelledby={`${id}-${selected}`} aria-live="polite" data-testid="layer-detail-panel">
        <div className="p-layer-detail p-enter" key={selected}>
          <code>{layer.path}</code>
          <h3>{layer.title}</h3>
          <p>{layer.detail}</p>
          <p className="p-tradeoff"><strong>Trade-off / </strong>{layer.tradeoff}</p>
          <a className="p-link" href={caseSourceUrl(study, layer.path)} target="_blank" rel="noopener noreferrer">Inspect pinned source <ArrowUpRight size={15} aria-hidden="true" /></a>
          <p className="p-mono">{layer.snapshot}</p>
        </div>
      </div>
    </div>
  );
}
