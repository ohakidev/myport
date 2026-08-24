"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Export, RocketLaunch, X } from "@phosphor-icons/react";
import gsap from "gsap";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import SpotlightCard from "@/components/SpotlightCard";
import BlurText from "@/components/BlurText";
import { languageColor } from "./palette";
import { useIsMobile } from "@/hooks/use-media-query";
import type { Project } from "@/lib/github";

function PanelBody({ project }: { project: Project }) {
  return (
    <SpotlightCard spotlightColor="rgba(100, 232, 255, 0.16)" className="flex h-full flex-col gap-5 p-6 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <span className="hud-label">Repository landmark</span>
        <Badge variant="outline" className="gap-1.5 font-mono text-[11px] text-white/70">
          <i className="h-2 w-2 rounded-full" style={{ background: languageColor(project.language) }} />
          {project.language ?? "Mixed stack"}
        </Badge>
      </div>
      <div>
        <span className="font-mono text-sm font-semibold tracking-wider text-[#64e8ff]">{new Date(project.createdAt).getFullYear()}</span>
        <BlurText as="h2" className="mt-1 text-3xl font-extrabold tracking-tight text-wrap-balance sm:text-4xl" text={project.name} animateBy="words" delay={52} direction="bottom" stepDuration={0.22} />
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">{project.description}</p>
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="font-mono">★ {project.stars}</Badge>
        <Badge variant="secondary" className="font-mono">⑂ {project.forks}</Badge>
        <Badge variant="secondary" className="font-mono">updated {new Date(project.pushedAt).toLocaleDateString("en", { month: "short", year: "numeric" })}</Badge>
      </div>
      <div className="mt-auto grid gap-2.5 pt-2">
        <Button asChild size="lg" className="justify-between rounded-xl bg-[#ffd166] font-bold text-[#07101d] hover:bg-[#ffd166]/90">
          <a href={project.url} target="_blank" rel="noreferrer">Explore source <Export size={16} weight="bold" /></a>
        </Button>
        {project.homepage && (
          <Button asChild size="lg" variant="outline" className="justify-between rounded-xl border-[#64e8ff]/40 hover:text-[#64e8ff]">
            <a href={project.homepage} target="_blank" rel="noreferrer">Launch live build <RocketLaunch size={16} weight="bold" /></a>
          </Button>
        )}
        <p className="pt-1 font-mono text-[10px] tracking-wider text-white/40">PUBLIC GITHUB API / REAL REPOSITORY DATA</p>
      </div>
    </SpotlightCard>
  );
}

export function ProjectPanel({ project, close }: { project: Project; close: () => void }) {
  const isMobile = useIsMobile();
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isMobile) return;
    const context = gsap.context(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .from(ref.current, { xPercent: 110, duration: 0.55 })
        .from(".project-panel .hud-label, .project-panel .project-card > div, .project-panel .project-card > p", { y: 14, opacity: 0, stagger: 0.06, duration: 0.34 }, "-=.28");
    }, ref);
    return () => context.revert();
  }, [project.name, isMobile]);

  if (isMobile) {
    return (
      <Sheet open>
        <SheetContent side="bottom" showClose={false} className="h-[78vh] overflow-y-auto rounded-t-3xl border-white/15 bg-[--card] p-0">
          <div className="mx-auto mt-3 h-1 w-12 rounded-full bg-white/20" aria-hidden="true" />
          <SheetHeader className="sr-only"><SheetTitle>{project.name}</SheetTitle></SheetHeader>
          <Button type="button" variant="ghost" size="icon" onClick={close} aria-label="Close project detail" className="absolute right-4 top-4 z-20 rounded-full text-white/70 hover:bg-white/10 hover:text-foreground">
            <X size={18} weight="bold" />
          </Button>
          <PanelBody project={project} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <motion.aside
      ref={ref}
      role="dialog"
      aria-label={`${project.name} project detail`}
      className="project-panel fixed right-6 top-1/2 z-40 flex h-[min(34rem,calc(100vh-8rem))] w-[min(26rem,calc(100vw-3rem))] -translate-y-1/2 flex-col"
    >
      <div className="glass-panel flex h-full flex-col overflow-hidden rounded-3xl">
        <Button variant="ghost" size="icon" onClick={close} aria-label="Close project detail" className="absolute right-4 top-4 z-10 rounded-full text-white/70 hover:bg-white/10 hover:text-foreground">
          <X size={18} weight="bold" />
        </Button>
        <PanelBody project={project} />
      </div>
      <p className="sr-only">{project.name} repository detail panel</p>
    </motion.aside>
  );
}
