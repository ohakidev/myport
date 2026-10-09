"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import dynamic from "next/dynamic";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  Check,
  GearSix,
  Moon,
  Play,
  Sun,
  X,
} from "@phosphor-icons/react";
import BlurText from "@/components/BlurText";
import type { GitHubPortfolio, Project } from "@/lib/github";
import { ProjectPanel } from "@/components/journey/project-panel";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { initialGardenState, sendGardenCommand, storyFor, type GardenState, type StoryBeat } from "@/components/journey/story";
import "./journey/game-interface.css";

type JourneyState = GardenState;

const send = sendGardenCommand;
const sendMovement = (detail: "up" | "down" | "left" | "right" | "up-up" | "down-up" | "left-up" | "right-up") => {
  window.dispatchEvent(new CustomEvent("ohaki:garden", { detail }));
};

const GameWorld = dynamic(
  () => import("@/components/journey/world").then((module) => module.GameWorld),
  {
    ssr: false,
    loading: () => <div className="side-world game-world-loading" role="status" aria-label="Loading the 3D workshop" />,
  },
);

function StoryProgress({ progress }: { progress: number }) {
  return (
    <div className="game-progress">
      <progress value={progress} max={3} aria-label="Chapter progress" />
      <span>{progress}/3</span>
    </div>
  );
}

type ObjectiveCardProps = {
  state: JourneyState;
  current?: Project;
  story: StoryBeat | null;
  resumable: boolean;
  completedProject?: Project;
  travelling: boolean;
  travellingProject?: Project;
  onStart: () => void;
  onResume: () => void;
  onTarget: (index: number) => void;
  onCancel: () => void;
  onOpenProject: (project: Project) => void;
  onNext: () => void;
};

function ObjectiveCard({
  state,
  current,
  story,
  resumable,
  completedProject,
  travelling,
  travellingProject,
  onStart,
  onResume,
  onTarget,
  onCancel,
  onOpenProject,
  onNext,
}: ObjectiveCardProps) {
  if (completedProject) {
    const completedStory = storyFor(completedProject);
    return (
      <aside className="game-objective-card" data-phase="complete" aria-labelledby="game-objective-title">
        <span className="game-objective-kicker"><Check size={15} aria-hidden="true" /> Chapter complete</span>
        <h2 id="game-objective-title">{completedStory.title}</h2>
        <p className="game-objective-status" role="status">Chapter saved · source available in the journal.</p>
        <div className="game-objective-actions">
          <Button type="button" className="game-button game-button--primary" aria-label={`Inspect ${completedProject.name}`} onClick={() => onOpenProject(completedProject)}>
            Source <ArrowUpRight size={16} aria-hidden="true" />
          </Button>
          <Button type="button" variant="outline" className="game-button" aria-label="Continue exploring" onClick={onNext}>
            Next <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </div>
      </aside>
    );
  }

  if (state.active >= 0 && current && story) {
    const nextIndex = story.mode === "deliver"
      ? state.carrying ? 2 : 0
      : story.mode === "sequence"
        ? Math.min(state.progress, 2)
        : [0, 1, 2].find((index) => !state.collected.includes(index)) ?? 2;
    const nextAction = story.mode === "deliver"
      ? state.carrying ? "Go to the display stand" : "Go to the book tray"
      : story.mode === "sequence" ? `Go to pad ${nextIndex + 1}` : `Go to idea ${nextIndex + 1}`;
    const nextStep = story.mode === "deliver"
      ? state.carrying ? "Deliver the book" : "Pick up the book"
      : story.mode === "sequence" ? `Connect pad ${nextIndex + 1}` : `Collect idea ${nextIndex + 1}`;
    const status = state.message === story.premise || state.message.startsWith("Story resumed")
      ? `Next · ${nextStep}`
      : state.message;

    return (
      <aside className="game-objective-card" data-phase="active" aria-labelledby="game-objective-title">
        <div className="game-objective-heading">
          <span className="game-objective-kicker">CH {String(state.active + 1).padStart(2, "0")}</span>
          <StoryProgress progress={state.progress} />
          <Button type="button" variant="ghost" size="icon" className="game-button game-button--quiet game-chapter-exit" aria-label="Leave chapter" title="Leave chapter" onClick={onCancel}>
            <X size={17} aria-hidden="true" />
          </Button>
        </div>
        <h2 id="game-objective-title">{story.title}</h2>
        <p className="game-objective-status" role="status" aria-atomic="true">{status}</p>
        <div className="game-objective-actions">
          <Button type="button" className="game-button game-button--primary" onClick={() => onTarget(nextIndex)}>
            {nextAction} <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </div>
      </aside>
    );
  }

  if (travelling && travellingProject) {
    const travellingStory = storyFor(travellingProject);
    return (
      <aside className="game-objective-card" data-phase="travelling" aria-labelledby="game-objective-title">
        <span className="game-objective-kicker">Following a route</span>
        <h2 id="game-objective-title">{travellingStory.title}</h2>
        <p className="game-objective-status" role="status">Walking to the workshop · move any time to choose your own path.</p>
        <Button type="button" variant="outline" className="game-button" onClick={onCancel}>Stop route</Button>
      </aside>
    );
  }

  if (resumable) {
    const unavailable = state.resumeProject === -1;
    return (
      <aside className="game-objective-card" data-phase={unavailable ? "unavailable" : "resumable"} aria-labelledby="game-objective-title">
        <span className="game-objective-kicker">Saved progress</span>
        <h2 id="game-objective-title">{unavailable ? "Saved story needs its source" : "Your story is waiting"}</h2>
        <p className="game-objective-status" role="status">{state.message}</p>
        {unavailable ? (
          <div className="game-objective-actions">
            <Button type="button" variant="outline" className="game-button" onClick={onCancel}>Discard saved story</Button>
            <Button type="button" className="game-button game-button--primary" asChild><a href="/work">Read the work</a></Button>
          </div>
        ) : (
          <Button type="button" className="game-button game-button--primary" onClick={onResume}>
            Resume story <ArrowRight size={16} aria-hidden="true" />
          </Button>
        )}
      </aside>
    );
  }

  return (
    <aside className="game-objective-card" data-phase="explore" aria-labelledby="game-objective-title">
      <span className="game-objective-kicker">Next</span>
      <h2 id="game-objective-title">{story?.title ?? "Find a workshop"}</h2>
      <p className="game-objective-status" role="status">
        {current ? "At the workshop · press E or use the button below." : "Move with the pad, WASD or arrows · tap ground to walk."}
      </p>
      {current && (
        <Button type="button" className="game-button game-button--primary" onClick={onStart}>
          Begin chapter <Play size={16} weight="fill" aria-hidden="true" />
        </Button>
      )}
      {!state.storage && <p className="game-storage-note">Progress lasts for this visit only.</p>}
    </aside>
  );
}

function IntroPanel({
  ready,
  onEnter,
}: {
  ready: boolean;
  onEnter: () => void;
}) {
  return (
    <section className="game-intro-panel" aria-label="Start the interactive portfolio expedition">
      <div className="game-intro-copy">
        <BlurText as="h1" text="Real work, made walkable." delay={65} stepDuration={0.25} />
        <p>Explore at your own pace. Your saved story and optional project chapters are ready in the Journal.</p>
        <div className="game-entry-actions">
          <Button
            type="button"
            size="lg"
            className="game-button game-button--primary"
            disabled={!ready}
            onClick={onEnter}
          >
            <Play size={18} weight="fill" aria-hidden="true" />
            {!ready ? "Opening the expedition…" : "Start exploring"}
          </Button>
        </div>
        <p className="game-entry-hint">Move with WASD, arrows or touch controls <span aria-hidden="true">·</span> choose a guide in the journal</p>
      </div>
    </section>
  );
}

function ProjectJournal({
  projects,
  state,
  open,
  ready,
  triggerRef,
  onOpenChange,
  onPlay,
  onOpenProject,
}: {
  projects: Project[];
  state: JourneyState;
  open: boolean;
  ready: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onOpenChange: (open: boolean) => void;
  onPlay: (index: number) => void;
  onOpenProject: (project: Project, trigger?: HTMLElement | null) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showClose={false}
        className="game-sheet game-journal-sheet"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
        }}
      >
        <div className="game-sheet-heading">
          <SheetHeader>
            <SheetTitle className="game-sheet-title">Project journal</SheetTitle>
            <SheetDescription className="game-sheet-description">Play a chapter or inspect its project. Nothing is locked behind the game.</SheetDescription>
          </SheetHeader>
          <Button type="button" variant="ghost" size="icon" className="game-dialog-close" aria-label="Close project journal" onClick={() => onOpenChange(false)}>
            <X size={20} aria-hidden="true" />
          </Button>
        </div>
        {projects.length ? (
          <>
            <div className="game-journal-summary" role="status">
              <span>{state.completed.length}/{projects.length} chapters restored</span>
              <span>{state.active >= 0 ? "Finish the current chapter to switch." : "Open any project directly."}</span>
            </div>
            <ol className="game-project-list">
              {projects.map((project, index) => {
                const complete = state.completed.includes(project.name);
                const active = state.active === index;
                const chapter = storyFor(project);
                return (
                  <li key={project.name} className={`game-project-item${active ? " is-active" : ""}`}>
                    <div className="game-project-item-heading">
                      <span className="game-project-index" aria-hidden="true">{complete ? <Check size={16} /> : String(index + 1).padStart(2, "0")}</span>
                      <div>
                        <h3>{chapter.title}</h3>
                        <p>{project.name} · {new Date(project.createdAt).getFullYear()}</p>
                      </div>
                      {complete && <span className="game-project-status">Complete</span>}
                    </div>
                    <div className="game-project-actions">
                      <Button type="button" variant="outline" className="game-button" onClick={(event) => onOpenProject(project, event.currentTarget)}>
                        View project <ArrowUpRight size={15} aria-hidden="true" />
                      </Button>
                      <Button type="button" className="game-button game-button--primary" disabled={!ready || state.active >= 0} onClick={() => onPlay(index)}>
                        {complete ? "Replay" : "Play chapter"} <Play size={15} weight="fill" aria-hidden="true" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ol>
          </>
        ) : (
          <div className="game-journal-empty">
            <p>No project entries are available in the journal yet.</p>
            <a className="game-sheet-link" href="/work">Browse the work page <ArrowUpRight size={16} aria-hidden="true" /></a>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function SettingsSheet({
  open,
  triggerRef,
  fullEffects,
  evening,
  started,
  onOpenChange,
  onToggleMotion,
  onToggleLight,
}: {
  open: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  fullEffects: boolean;
  evening: boolean;
  started: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleMotion: () => void;
  onToggleLight: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showClose={false}
        className="game-sheet game-settings-sheet"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
        }}
      >
        <div className="game-sheet-heading">
          <SheetHeader>
            <SheetTitle className="game-sheet-title">Experience settings</SheetTitle>
            <SheetDescription className="game-sheet-description">Tune the atmosphere without changing your saved chapters.</SheetDescription>
          </SheetHeader>
          <Button type="button" variant="ghost" size="icon" className="game-dialog-close" aria-label="Close experience settings" onClick={() => onOpenChange(false)}>
            <X size={20} aria-hidden="true" />
          </Button>
        </div>
        <div className="game-settings-list">
          <div className="game-settings-row">
            <div><h3>Animation</h3><p>Use full motion or a calmer experience.</p></div>
            <Button type="button" variant="outline" className="game-button" aria-pressed={fullEffects} onClick={onToggleMotion}>{fullEffects ? "Full effects" : "Calm mode"}</Button>
          </div>
          <div className="game-settings-row">
            <div><h3>Lighting</h3><p>Change the scenic world while exploring.</p></div>
            <Button type="button" variant="outline" className="game-button" disabled={!started} aria-pressed={evening} onClick={onToggleLight}>
              {evening ? <Moon size={17} aria-hidden="true" /> : <Sun size={17} aria-hidden="true" />}
              {evening ? "Evening" : "Daylight"}
            </Button>
          </div>
        </div>
        <a className="game-sheet-link" href="/work">Prefer a regular portfolio? Read the work <ArrowUpRight size={16} aria-hidden="true" /></a>
      </SheetContent>
    </Sheet>
  );
}

export function Journey({ portfolio }: { portfolio: GitHubPortfolio }) {
  const shell = useRef<HTMLElement>(null);
  const journalTriggerRef = useRef<HTMLButtonElement>(null);
  const settingsTriggerRef = useRef<HTMLButtonElement>(null);
  const projectReturnFocusRef = useRef<HTMLElement | null>(null);
  const [started, setStarted] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [evening, setEvening] = useState(false);
  const [fullEffects, setFullEffects] = useState(false);
  const motionPreference = useRef<boolean | null>(null);
  const initialLightPending = useRef(false);
  const [journal, setJournal] = useState(false);
  const [settings, setSettings] = useState(false);
  const [selected, setSelected] = useState<Project | null>(null);
  const [state, setState] = useState<JourneyState>(initialGardenState);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      if (motionPreference.current !== null) return;
      try {
        const saved = window.localStorage.getItem("ohaki-garden-preferences-v1");
        const preferences = saved ? JSON.parse(saved) as { fullEffects?: boolean; evening?: boolean } : null;
        if (typeof preferences?.fullEffects === "boolean") {
          motionPreference.current = preferences.fullEffects;
          setFullEffects(preferences.fullEffects);
          setEvening(Boolean(preferences.evening));
          send(preferences.fullEffects ? "motion-full" : "motion-system");
          if (preferences.evening) initialLightPending.current = true;
          return;
        }
      } catch {
        // Storage is optional; OS motion preference remains the safe fallback.
      }
      setFullEffects(!media.matches);
      send(media.matches ? "motion-system" : "motion-full");
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!ready) return;
    send(fullEffects ? "motion-full" : "motion-system");
    if (initialLightPending.current) {
      initialLightPending.current = false;
      send("light");
    }
  }, [ready, fullEffects]);

  useEffect(() => {
    if (ready || failed) return;
    const timeout = window.setTimeout(() => setFailed(true), 15000);
    return () => window.clearTimeout(timeout);
  }, [ready, failed]);

  const projects = useMemo(() => [...portfolio.projects].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)), [portfolio.projects]);
  const onState = useCallback((next: GardenState) => setState(next as JourneyState), []);
  const onReady = useCallback(() => { setReady(true); setFailed(false); }, []);
  const onError = useCallback(() => setFailed(true), []);
  const focusWorld = useCallback(() => requestAnimationFrame(() => shell.current?.querySelector<HTMLCanvasElement>("canvas")?.focus()), []);
  const enterExpedition = useCallback(() => { setStarted(true); focusWorld(); }, [focusWorld]);
  const focusFallback = useCallback(() => {
    const candidate = projectReturnFocusRef.current;
    if (candidate?.isConnected) candidate.focus();
    else focusWorld();
  }, [focusWorld]);
  const toggleMotion = () => {
    const next = !fullEffects;
    motionPreference.current = next;
    setFullEffects(next);
    send(next ? "motion-full" : "motion-system");
    try {
      const saved = JSON.parse(window.localStorage.getItem("ohaki-garden-preferences-v1") ?? "{}") as object;
      window.localStorage.setItem("ohaki-garden-preferences-v1", JSON.stringify({ ...saved, fullEffects: next, evening }));
    } catch {
      // Preferences are best-effort and never block play.
    }
  };
  const tour = useCallback((index: number) => {
    setStarted(true);
    setJournal(false);
    requestAnimationFrame(() => {
      send(`tour:${index}`);
      focusWorld();
    });
  }, [focusWorld]);
  const continueJourney = useCallback(() => {
    setStarted(true);
    setJournal(false);
    requestAnimationFrame(() => {
      send("resume");
      focusWorld();
    });
  }, [focusWorld]);
  const openProject = useCallback((project: Project, trigger?: HTMLElement | null) => {
    projectReturnFocusRef.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setJournal(false);
    setSelected(project);
  }, []);
  const closeProject = useCallback(() => setSelected(null), []);
  const nextIndex = projects.findIndex((project) => !state.completed.includes(project.name));
  const activeIndex = state.active >= 0 ? state.active : state.nearby;
  const current = projects[activeIndex];
  const story = current ? storyFor(current) : null;
  const completedProject = state.completedProject == null ? undefined : projects[state.completedProject];
  const travelling = state.guiding !== null && state.active < 0 && !completedProject;
  const travellingProject = state.guiding == null ? undefined : projects[state.guiding];
  const resumable = Boolean(state.resumable);
  const objectiveKey = completedProject
    ? `complete:${completedProject.name}`
    : state.active >= 0
      ? `active:${state.active}:${state.progress}:${state.carrying}`
      : travelling
        ? `route:${state.guiding}`
        : resumable
          ? `resume:${state.resumeProject}`
          : `explore:${current?.name ?? ""}`;

  return (
    <main className="game-shell garden-shell studio-shell game-interface-shell" ref={shell} data-testid="game-shell" data-started={started} data-full-effects={fullEffects} data-resumable={resumable} data-menu-open={journal || settings || Boolean(selected)}>
      <GameWorld started={started} projects={projects} paused={journal || Boolean(selected) || settings || failed} onState={onState} onReady={onReady} onError={onError} />

      <header className="game-interface-header">
        <a href="/" className="game-interface-brand" aria-label="Return to Ohaki home">ohaki</a>
        <small className="game-source-note">{portfolio.isLive ? "Live from GitHub" : "Showing saved data"}</small>
        <nav className="game-interface-nav" aria-label="Expedition navigation">
          <a href="/work" className="game-work-link">Read the work <ArrowUpRight size={15} aria-hidden="true" /></a>
          <Button ref={journalTriggerRef} type="button" variant="ghost" className="game-button game-journal-trigger" aria-label="Open project journal" title="Project journal" onClick={() => setJournal(true)}>
            <BookOpen size={18} aria-hidden="true" /><span>Journal</span>
          </Button>
          <Button ref={settingsTriggerRef} type="button" variant="ghost" size="icon" className="game-button game-settings-trigger" aria-label="Experience settings" title="Experience settings" onClick={() => setSettings(true)}>
            <GearSix size={20} aria-hidden="true" />
          </Button>
        </nav>
      </header>

      {!started && !failed && (
        <IntroPanel
          ready={ready}
          onEnter={enterExpedition}
        />
      )}

      {failed && (
        <section className="game-error-panel" role="alert" aria-labelledby="game-error-title">
          <h1 id="game-error-title">The 3D view is unavailable.</h1>
          <p>You can still read every project. Saved chapters are safe, and the journal remains available.</p>
          <div className="game-error-actions">
            <Button type="button" className="game-button game-button--primary" onClick={() => location.reload()}>Try the 3D view again</Button>
            <Button type="button" variant="outline" className="game-button" asChild><a href="/work">Read the work</a></Button>
          </div>
        </section>
      )}

      {started && !failed && (
        <>
          <ObjectiveCard
            key={objectiveKey}
            state={state}
            current={current}
            story={story}
            resumable={resumable}
            completedProject={completedProject}
            travelling={travelling}
            travellingProject={travellingProject}
            onStart={() => { send("start"); focusWorld(); }}
            onResume={continueJourney}
            onTarget={(index) => { send(`target:${index}`); focusWorld(); }}
            onCancel={() => { send("cancel"); focusWorld(); }}
            onOpenProject={openProject}
            onNext={() => nextIndex >= 0 ? tour(nextIndex) : setJournal(true)}
          />

          <div className="game-touch-controls garden-touch" aria-label="Movement controls">
            {(["up", "left", "down", "right"] as const).map((direction) => {
              const Glyph = direction === "up" ? ArrowUp : direction === "down" ? ArrowDown : direction === "left" ? ArrowLeft : ArrowRight;
              return (
                <Button
                  key={direction}
                  type="button"
                  variant="outline"
                  className={`game-button game-touch-button game-touch-${direction}`}
                  aria-label={`Walk ${direction}`}
                  onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); sendMovement(direction); }}
                  onPointerUp={() => sendMovement(`${direction}-up`)}
                  onPointerCancel={() => sendMovement(`${direction}-up`)}
                  onLostPointerCapture={() => sendMovement(`${direction}-up`)}
                  onKeyDown={(event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); sendMovement(direction); } }}
                  onKeyUp={() => sendMovement(`${direction}-up`)}
                  onBlur={() => sendMovement(`${direction}-up`)}
                >
                  <Glyph size={20} aria-hidden="true" />
                </Button>
              );
            })}
          </div>
          <Button type="button" variant="outline" className="game-button game-touch-hop" aria-label="Hop" onClick={() => { send("jump"); focusWorld(); }}>Hop</Button>
          <details className="game-control-guide">
            <summary>Controls</summary>
            <p><kbd>WASD</kbd> or arrows move · <kbd>E</kbd> interact · <kbd>Space</kbd> hop · click ground to walk</p>
          </details>
        </>
      )}

      <ProjectJournal
        projects={projects}
        state={state}
        open={journal}
        ready={ready && !failed}
        triggerRef={journalTriggerRef}
        onOpenChange={setJournal}
        onPlay={tour}
        onOpenProject={openProject}
      />
      <SettingsSheet
        open={settings}
        triggerRef={settingsTriggerRef}
        fullEffects={fullEffects}
        evening={evening}
        started={started}
        onOpenChange={setSettings}
        onToggleMotion={toggleMotion}
        onToggleLight={() => {
          const next = !evening;
          setEvening(next);
          send("light");
          try {
            const saved = JSON.parse(window.localStorage.getItem("ohaki-garden-preferences-v1") ?? "{}") as object;
            window.localStorage.setItem("ohaki-garden-preferences-v1", JSON.stringify({ ...saved, fullEffects, evening: next }));
          } catch {
            // Preferences are best-effort and never block play.
          }
        }}
      />
      {selected && <ProjectPanel project={selected} close={closeProject} returnFocusRef={projectReturnFocusRef} onFocusFallback={focusFallback} />}
    </main>
  );
}
