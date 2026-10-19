"use client";

import { useState } from "react";
import { ArrowUpRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ArchitectureInspector } from "@/components/architecture-inspector";
import { caseStudies } from "@/lib/case-studies";

export function WorkStudies() {
  const [filter, setFilter] = useState("all");
  return (
    <div id="work-content">
      <div className="work-filters p-filters" role="group" aria-label="Filter case studies">
        <Button className="p-btn p-filter" variant="ghost" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All case studies</Button>
        {caseStudies.map(study => <Button key={study.id} className="p-btn p-filter" variant="ghost" aria-pressed={filter === study.id} onClick={() => setFilter(study.id)}>{study.name}</Button>)}
      </div>
      {caseStudies.filter(study => filter === "all" || study.id === filter).map(study => (
        <section className="p-section work-case p-enter" id={study.id === "myport" ? "myport" : "activity"} key={study.id} aria-labelledby={`${study.id}-title`}>
          <header><p className="p-mono work-category">{study.category}</p><h2 id={`${study.id}-title`}>{study.title}</h2><p>{study.summary}</p></header>
          <div className="work-case-grid">
            <aside className="work-decision">
              <h3>The decision</h3><p>{study.decision}</p>
              <dl><div><dt>Project</dt><dd>{study.id}</dd></div><div><dt>Stack</dt><dd>{study.stack}</dd></div><div><dt>Source snapshot</dt><dd><a href={`${study.source}/commit/${study.commit}`} target="_blank" rel="noopener noreferrer">{study.commit.slice(0, 7)} <ArrowUpRight size={13} aria-hidden="true" /></a></dd></div></dl>
              <p className="work-source-note">{study.sourceNote}</p>
              <a className="p-link" href={study.source} target="_blank" rel="noopener noreferrer">Open repository <ArrowUpRight size={16} aria-hidden="true" /></a>
            </aside>
            <ArchitectureInspector study={study} />
          </div>
        </section>
      ))}
    </div>
  );
}
