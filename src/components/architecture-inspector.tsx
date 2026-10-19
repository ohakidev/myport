"use client";

import { useId, useState } from "react";
import { ArrowUpRight, ArrowRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { caseSourceUrl, type CaseStudy } from "@/lib/case-studies";

export function ArchitectureInspector({ study }: { study: CaseStudy }) {
  const [selected, setSelected] = useState(0);
  const id = useId();
  const layer = study.layers[selected];
  return (
    <div className="p-inspector">
      <header><span className="p-mono">Explore the architecture</span><ArrowRight size={16} aria-hidden="true" /></header>
      <div className="p-layer-list" role="group" aria-label={`${study.name} architecture layers`}>
        {study.layers.map((item, index) => (
          <Button variant="ghost" key={item.label} className="p-btn p-layer" id={`${id}-${index}`} aria-pressed={selected === index} aria-controls={`${id}-detail`} onClick={() => setSelected(index)}>
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
