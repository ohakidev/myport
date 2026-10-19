"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/github";

export function RepositoryDeck({ projects, motionEnabled }: { projects: Project[]; motionEnabled: boolean }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const update = () => {
      const start = element.scrollLeft <= 2;
      const end = element.scrollLeft + element.clientWidth >= element.scrollWidth - 2;
      setEdges(current => current.start === start && current.end === end ? current : { start, end });
    };
    element.scrollLeft = 0;
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener("scroll", update, { passive: true });
    let disposed = false;
    let cleanup: (() => void) | undefined;
    if (motionEnabled) void Promise.all([import("gsap"), import("gsap/Draggable"), import("gsap/InertiaPlugin")]).then(([{ gsap }, { Draggable }, { InertiaPlugin }]) => {
      if (disposed) return;
      gsap.registerPlugin(Draggable, InertiaPlugin);
      const context = gsap.context(() => {
        const cards = element.querySelectorAll(".home-repo");
        const swing = gsap.quickTo(cards, "rotation", { duration: .25, ease: "power2.out" });
        const settle = () => { gsap.to(cards, { rotation: 0, duration: .9, ease: "elastic.out(1,.35)", overwrite: true }); };
        const [drag] = Draggable.create(element, {
          type: "scrollLeft", inertia: true, dragClickables: true, minimumMovement: 8,
          edgeResistance: .85, allowNativeTouchScrolling: true,
          onDrag() { swing(gsap.utils.clamp(-5, 5, this.deltaX * .35)); },
          onRelease: settle, onThrowComplete: settle,
        });
        const resize = () => { drag.update(true); update(); };
        const bounds = new ResizeObserver(resize);
        bounds.observe(element);
        const stop = (event: Event) => { if (document.hidden) { drag.endDrag(event); drag.tween?.kill(); gsap.set(cards, { rotation: 0 }); } };
        document.addEventListener("visibilitychange", stop);
        return () => { bounds.disconnect(); document.removeEventListener("visibilitychange", stop); drag.kill(); gsap.killTweensOf(cards); };
      });
      cleanup = () => context.revert();
    }).catch(() => { /* Native horizontal scrolling and buttons are the fallback. */ });
    return () => { disposed = true; cleanup?.(); observer.disconnect(); element.removeEventListener("scroll", update); };
  }, [projects, motionEnabled]);

  const step = (direction: number) => {
    const element = viewport.current;
    if (!element) return;
    const card = element.querySelector("li");
    element.scrollBy({ left: direction * ((card?.getBoundingClientRect().width ?? element.clientWidth) + 24), behavior: motionEnabled ? "smooth" : "instant" });
  };

  return <div className="home-deck">
    <div className="home-deck-controls"><p className="p-mono" id="repo-deck-help">Drag to explore. Or use the arrows.</p><div>
      <Button variant="ghost" className="p-btn" aria-label="Previous repositories" disabled={edges.start} onClick={() => step(-1)}><ArrowLeft size={20} aria-hidden="true" /></Button>
      <Button variant="ghost" className="p-btn" aria-label="Next repositories" disabled={edges.end} onClick={() => step(1)}><ArrowRight size={20} aria-hidden="true" /></Button>
    </div></div>
    <div className="home-deck-viewport" ref={viewport} role="region" aria-label="Repository cards" aria-describedby="repo-deck-help" tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && ["ArrowLeft", "ArrowRight"].includes(event.key)) { event.preventDefault(); step(event.key === "ArrowRight" ? 1 : -1); } }}>
      <ul className="home-repo-grid">
        {projects.map((project, index) => <li key={project.url}><a className="home-repo" href={project.url} target="_blank" rel="noopener noreferrer" onFocus={event => { if (event.currentTarget.matches(":focus-visible")) event.currentTarget.scrollIntoView({ block: "nearest", inline: "nearest" }); }}>
          <span className="home-repo-number p-mono">{(index + 1).toString().padStart(2, "0")} / PUBLIC SOURCE</span>
          <div><h3>{project.name}</h3><ArrowUpRight size={20} aria-hidden="true" /></div>
          <p>{project.description?.replace(/\s*[—–]\s*/g, ", ") || "Explore the source and development history on GitHub."}</p>
          <div className="p-mono"><span>{project.language ?? "Repository"}</span><span>Updated <time dateTime={project.pushedAt}>{new Date(project.pushedAt).getUTCFullYear()}</time></span></div>
        </a></li>)}
      </ul>
    </div>
  </div>;
}
