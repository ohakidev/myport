"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowRight } from "@phosphor-icons/react";
import ClickSpark from "@/components/ClickSpark";
import type { GitHubPortfolio, Project } from "@/lib/github";
import { GameWorld } from "@/components/journey/world";
import { Intro } from "@/components/journey/intro";
import { ProjectPanel } from "@/components/journey/project-panel";
import { ChapterStory, ControlsHint, InteractionPrompt, LoopToast, MobileControls, QuestRail, TopBar } from "@/components/journey/hud";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Journey({ portfolio }: { portfolio: GitHubPortfolio }) {
  const shellRef = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [nearby, setNearby] = useState<Project | null>(null);
  const [selected, setSelected] = useState<Project | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [loopCount, setLoopCount] = useState(0);
  const [loopDirection, setLoopDirection] = useState(1);
  const [seamActive, setSeamActive] = useState(false);
  const projects = useMemo(
    () => [...portfolio.projects].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)),
    [portfolio.projects],
  );

  useEffect(() => {
    if (!started) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => {
      gsap.timeline({
        defaults: { ease: "expo.inOut" },
        onStart: () => setTransitioning(true),
        onComplete: () => setTransitioning(false),
      })
        .set(".chapter-wipe", { transformOrigin: "left center", skewX: -8 })
        .fromTo(".chapter-wipe", { scaleX: 0, autoAlpha: 0 }, { scaleX: 1, autoAlpha: 0.68, duration: 0.34 })
        .set(".chapter-wipe", { transformOrigin: "right center" })
        .to(".chapter-wipe", { scaleX: 0, autoAlpha: 0, skewX: 8, duration: 0.48 })
        .fromTo(".chapter-story", { x: -44, y: 10, autoAlpha: 0, scale: 0.96 }, { x: 0, y: 0, autoAlpha: 1, scale: 1, duration: 0.58, ease: "power4.out" }, "-=.32");
    }, shellRef);
    return () => context.revert();
  }, [chapter, started]);

  const start = () => {
    const intro = shellRef.current?.querySelector(".game-intro");
    if (intro && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.timeline({ onComplete: () => setStarted(true) })
        .to(".intro-content, .intro-orbit", { x: -90, autoAlpha: 0, stagger: 0.04, duration: 0.36, ease: "power3.in" })
        .to(".intro-aurora", { scale: 1.3, autoAlpha: 0, duration: 0.55, ease: "power2.in" }, "-=.3")
        .to(intro, { clipPath: "inset(0 0 100% 0)", duration: 0.78, ease: "expo.inOut" }, "-=.5");
    } else setStarted(true);
  };

  const travelTo = (index: number) => {
    setTransitioning(true);
    window.setTimeout(() => setTransitioning(false), 920);
    window.dispatchEvent(new CustomEvent("ohaki:travel", { detail: index }));
  };

  const closeProject = () => {
    setSelected(null);
    window.requestAnimationFrame(() => {
      shellRef.current?.querySelector<HTMLCanvasElement>("canvas[data-game-canvas='true']")?.focus();
    });
  };

  const handleLoop = useMemo(() => (loop: number, direction: number) => {
    setLoopCount(loop);
    setLoopDirection(direction);
    setSeamActive(true);
    window.setTimeout(() => setSeamActive(false), 820);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => {
      gsap.timeline({ defaults: { ease: "expo.inOut" } })
        .set(".loop-seam-flash", { transformOrigin: direction > 0 ? "right center" : "left center" })
        .fromTo(".loop-seam-flash", { scaleX: 0, scaleY: 0.78, autoAlpha: 0 }, { scaleX: 1, scaleY: 1, autoAlpha: 0.7, duration: 0.28 })
        .to(".loop-seam-flash", { scaleX: 0, scaleY: 1.15, autoAlpha: 0, duration: 0.58 })
        .fromTo(".loop-toast", { y: 28, rotation: -2, autoAlpha: 0, scale: 0.88 }, { y: 0, rotation: 0, autoAlpha: 1, scale: 1, duration: 0.42, ease: "back.out(1.5)" }, "-=.5")
        .to(".loop-toast", { y: -16, autoAlpha: 0, duration: 0.28 }, "+=.16");
    }, shellRef);
    window.setTimeout(() => context.revert(), 1100);
  }, []);

  return (
    <TooltipProvider delayDuration={150}>
      <main
        className="game-shell"
        ref={shellRef}
        data-started={started}
        data-chapter={chapter}
        data-transition="gsap"
        data-gsap-active={transitioning}
        data-loop-count={loopCount}
        data-seam-active={seamActive}
        data-testid="game-shell"
      >
      <GameWorld started={started} projects={projects} selectedProject={selected} onActiveChapter={setChapter} onNearbyProject={setNearby} onProject={setSelected} onLoop={handleLoop} />

      {!started && <Intro start={start} />}

      {started && <TopBar profileUrl={portfolio.profileUrl} isLive={portfolio.isLive} loopCount={loopCount} />}

      {started && <ChapterStory chapter={chapter} project={nearby} />}
      <div className="chapter-wipe" aria-hidden="true" />
      <div className="loop-seam-flash" aria-hidden="true" />
      {seamActive && <LoopToast loop={loopCount} direction={loopDirection} />}

      {started && <QuestRail projects={projects} chapter={chapter} onTravel={travelTo} />}

      {started && nearby && !selected && (
        <ClickSpark sparkColor="#64e8ff" sparkRadius={22} sparkCount={8}>
          <InteractionPrompt project={nearby} onInspect={() => setSelected(nearby)} />
        </ClickSpark>
      )}

      {selected && <ProjectPanel project={selected} close={closeProject} />}

      {started && <MobileControls canInteract={Boolean(nearby && !selected)} />}
      {started && <ControlsHint />}

      {started && <p className="hud-label pointer-events-none fixed bottom-5 right-6 z-30 hidden items-center gap-1.5 md:flex">
        Three.js world <ArrowRight size={10} className="-rotate-45 opacity-70" /> React Bits UI <ArrowRight size={10} className="-rotate-45 opacity-70" /> {projects.length} repos <ArrowRight size={10} className="-rotate-45 opacity-70" /> endless trail
      </p>}
      </main>
    </TooltipProvider>
  );
}
