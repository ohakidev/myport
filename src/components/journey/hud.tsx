"use client";

import { ArrowRight, CaretLeft, CaretRight, GameController, GitBranch, MapPin, Sparkle, WifiHigh, WifiX, GithubLogo } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { chapterColor } from "./palette";
import type { Project } from "@/lib/github";

const hudChip =
  "pointer-events-auto inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-[rgba(8,17,31,.62)] px-3.5 backdrop-blur-md shadow-[0_8px_28px_rgba(2,8,18,.35),inset_0_1px_0_rgba(255,255,255,.08)]";

export function TopBar({ profileUrl, isLive, loopCount }: { profileUrl: string; isLive: boolean; loopCount: number }) {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex min-h-16 items-center justify-between gap-3 px-4 pt-3 sm:px-6">
        <a
          href={profileUrl}
          target="_blank"
          rel="noreferrer"
          className="group pointer-events-auto flex items-center gap-2.5 rounded-full border border-white/15 bg-[rgba(8,17,31,.62)] py-1.5 pl-2 pr-4 backdrop-blur-md transition-colors hover:border-[#64e8ff] hover:text-[#64e8ff]"
        >
          <span className="grid h-8 w-8 place-items-center rounded-[.65rem] bg-[#64e8ff] font-mono text-sm font-extrabold text-[#07101d] shadow-[0_0_18px_rgba(100,232,255,.5)] transition-transform group-hover:-rotate-6">O</span>
          <span className="font-mono text-[11px] font-bold tracking-[.14em]">OHAKI / SIDE QUEST</span>
        </a>
        <div className="flex items-center gap-2">
          <span className={cn(hudChip, "hidden sm:inline-flex")} aria-live="polite">
            {isLive ? <WifiHigh size={16} weight="bold" className="text-[#a7f46a]" /> : <WifiX size={16} weight="bold" className="text-[#ffd166]" />}
            <i className={cn("h-1.5 w-1.5 rounded-full", isLive ? "animate-[status-pulse_1.8s_ease-in-out_infinite] bg-[#a7f46a] shadow-[0_0_10px_#a7f46a]" : "bg-[#ffd166]")} />
            <span className="hud-label">{isLive ? "GitHub live" : "Cached trail"}</span>
          </span>
          <span className={hudChip}>
            <Sparkle size={16} weight="duotone" className="text-[#64e8ff]" />
            <span className="hud-label">Loop</span>
            <b className="font-mono text-xs tabular-nums text-[#64e8ff]">{String(Math.abs(loopCount)).padStart(2, "0")}</b>
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <a href={profileUrl} target="_blank" rel="noreferrer" aria-label="Open ohakidev on GitHub" className={cn(hudChip, "px-2.5 hover:text-[#64e8ff]")}>
                <GithubLogo size={20} weight="duotone" />
              </a>
            </TooltipTrigger>
            <TooltipContent side="bottom">View the source on GitHub</TooltipContent>
          </Tooltip>
        </div>
      </header>
  );
}

export function ChapterStory({ chapter, project }: { chapter: number; project: Project | null }) {
  const stories = [
    ["00 · Origin", "Curiosity became a route.", "The GitHub trail starts in 2019: research broadly, keep what makes life better."],
    ["01 · Campus systems", "Friction became software.", "Student activity experiments turned a real university workflow into a product problem."],
    ["02 · Full-stack market", "Products became connected.", "Data, interfaces, commerce and deployment moved into one end-to-end practice."],
    ["03 · Web3 observatory", "Signals became systems.", "Public experiments expanded into real-time data and blockchain-facing products."],
    ["04 · Alpha exchange", "Operations became automatic.", "Market research, monitoring and delivery were combined into a live tool."],
    ["05 · Current world", "The portfolio became playable.", "The newest repository is this world: an explorable record of the work itself."],
  ][Math.min(chapter, 5)] as [string, string, string];

  return (
    <aside key={chapter} className="pointer-events-none fixed left-4 top-1/2 z-30 w-[min(21rem,calc(100vw-2rem))] -translate-y-1/2 sm:left-6">
      <div className="glass-panel rounded-2xl p-5 pl-6 [border-left:3px_solid_var(--cyan)]">
        <span className="hud-label">{stories[0]}</span>
        <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-wrap-balance">{project?.name ?? stories[1]}</h2>
        <p className="mt-1 hidden text-sm leading-relaxed text-muted-foreground md:block">{project?.description ?? stories[2]}</p>
      </div>
    </aside>
  );
}

export function QuestRail({ projects, chapter, onTravel }: { projects: Project[]; chapter: number; onTravel: (index: number) => void }) {
  return (
    <nav aria-label="Repository timeline" className="fixed right-3 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-2.5 sm:right-5">
      <span className="grid h-7 w-7 place-items-center rounded-full border border-[#64e8ff]/40 text-[#64e8ff]" aria-hidden="true">
        <GameController size={14} weight="duotone" />
      </span>
      {projects.map((project, index) => {
        const active = chapter === index;
        const color = chapterColor(index);
        return (
          <Tooltip key={project.name}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onTravel(index)}
                aria-label={"Travel to " + project.name}
                className={cn(
                  "group relative h-9 w-9 rounded-full border transition-all duration-200",
                  active ? "scale-110 border-white/40 bg-[rgba(100,232,255,.14)]" : "border-white/15 bg-[rgba(8,17,31,.5)] hover:border-white/30",
                )}
              >
                <i
                  className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform group-hover:scale-125"
                  style={{ background: color, boxShadow: active ? "0 0 12px " + color : undefined }}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-56 text-left">
              <b className="block">{project.name}</b>
              <span className="font-normal opacity-80">{new Date(project.createdAt).getFullYear()} · {project.language ?? "mixed stack"}</span>
            </TooltipContent>
          </Tooltip>
        );
      })}
      <span className="hud-label mt-1 hidden [writing-mode:vertical-rl] sm:block" aria-hidden="true">Timeline</span>
    </nav>
  );
}

export function InteractionPrompt({ project, onInspect }: { project: Project; onInspect: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-28 z-30 flex justify-center md:bottom-24">
      <Button size="lg" onClick={onInspect} className="gap-2 rounded-full border border-[#64e8ff]/45 bg-[rgba(100,232,255,.12)] text-sm font-semibold tracking-wide text-foreground shadow-[0_0_34px_rgba(100,232,255,.28)] backdrop-blur-md hover:bg-[#64e8ff] hover:text-[#07101d]">
        <MapPin size={17} weight="duotone" />
        <span className="max-w-52 truncate">Inspect {project.name}</span>
        <kbd className="hidden md:inline-grid">E</kbd>
      </Button>
    </div>
  );
}

export function MobileControls({ canInteract }: { canInteract: boolean }) {
  const dispatch = (detail: string) => window.dispatchEvent(new CustomEvent("ohaki:mobile", { detail }));
  const hold = (direction: "left" | "right") => ({
    onPointerDown: () => dispatch(direction),
    onPointerUp: () => dispatch(direction + "-up"),
    onPointerCancel: () => dispatch(direction + "-up"),
  });
  const padButton =
    "pointer-events-auto grid h-16 w-16 touch-none select-none place-items-center rounded-2xl border border-white/20 bg-[rgba(8,17,31,.68)] text-xl font-extrabold backdrop-blur-lg transition active:scale-90 active:bg-[#64e8ff] active:text-[#07101d]";
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-40 flex items-end justify-between md:hidden" aria-label="Mobile game controls">
      <div className="flex gap-2.5">
        <button type="button" aria-label="Move left" className={padButton} {...hold("left")}><CaretLeft weight="bold" /></button>
        <button type="button" aria-label="Move right" className={padButton} {...hold("right")}><CaretRight weight="bold" /></button>
      </div>
      <div className="flex items-end gap-2.5">
        {canInteract && (
          <button type="button" aria-label="Inspect repository" className="pointer-events-auto grid h-16 w-16 touch-manipulation place-items-center rounded-2xl bg-[#ffd166] text-[#07101d] shadow-[0_0_26px_rgba(255,209,102,.45)] transition active:scale-90" onClick={() => dispatch("interact")}>
            <MapPin size={24} weight="duotone" />
          </button>
        )}
        <button type="button" aria-label="Jump" className={cn(padButton, "h-[4.5rem] w-[4.5rem] rounded-full")} onClick={() => dispatch("jump")}>
          <ArrowRight className="-rotate-90" size={24} weight="bold" />
        </button>
      </div>
    </div>
  );
}

export function ControlsHint() {
  return (
    <div className="pointer-events-none fixed bottom-5 left-6 z-30 hidden items-center gap-4 md:flex" aria-hidden="true">
      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-[.08em] text-white/70"><GameController size={14} weight="duotone" className="text-[#64e8ff]" /><kbd>A</kbd><kbd>D</kbd> run</span>
      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-[.08em] text-white/70"><CaretRight className="-rotate-90 text-[#64e8ff]" size={13} /><kbd>Space</kbd> jump</span>
      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-[.08em] text-white/70"><MapPin size={14} weight="duotone" className="text-[#64e8ff]" /><kbd>E</kbd> inspect</span>
      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tracking-[.08em] text-white/70"><GitBranch size={14} weight="duotone" className="text-[#64e8ff]" /><kbd>F</kbd> fullscreen</span>
    </div>
  );
}

export function LoopToast({ loop, direction }: { loop: number; direction: number }) {
  return (
    <div className="loop-toast fixed left-1/2 top-[12%] z-50 -translate-x-1/2" role="status" aria-live="polite">
      <div className="glass-panel flex items-center gap-3 rounded-full px-5 py-2.5">
        <Sparkle size={18} weight="duotone" className="text-[#ffd166]" />
        <span className="font-mono text-[11px] font-bold tracking-[.16em]">{direction > 0 ? "NOW BECOMES ORIGIN" : "ORIGIN BECOMES NOW"}</span>
        <b className="font-mono text-sm tabular-nums text-[#64e8ff]">LOOP {String(Math.abs(loop)).padStart(2, "0")}</b>
      </div>
    </div>
  );
}
