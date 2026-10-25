"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, GithubLogo, MagnifyingGlass } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { PortfolioNav } from "@/components/portfolio-nav";
import { ArchitectureInspector } from "@/components/architecture-inspector";
import { AtelierCharacter } from "@/components/atelier-character";
import { RepositoryDeck } from "@/components/repository-deck";
import Aurora from "@/components/Aurora";
import BlurText from "@/components/BlurText";
import ClickSpark from "@/components/ClickSpark";
import SpotlightCard from "@/components/SpotlightCard";
import { InkRule } from "@/components/motion/ink-rule";
import { MaskedChars } from "@/components/motion/masked-chars";
import { usePressFeedback } from "@/components/motion/use-press-feedback";
import { usePointerTilt } from "@/components/motion/use-pointer-tilt";
import {
  GuitarStringsAndCurveStage,
  LoadingSequenceOverlay,
  PixelDistortionStage,
  ServiceWavePendulumStage,
  StadiumArenaStage,
} from "@/components/dave-animations";
import { caseStudies } from "@/lib/case-studies";
import type { GitHubPortfolio, Project } from "@/lib/github";
import { usePortfolioMotion } from "@/hooks/use-portfolio-motion";
import { gsap, useGSAP, whenMotion } from "@/lib/gsap";

const filters = ["All repos", "TypeScript", "Web & systems", "Interactive 3D"] as const;
type Filter = (typeof filters)[number];

function matchesFilter(project: Project, filter: Filter) {
  const spatial = project.name.toLowerCase() === "myport" || project.topics.some(topic => /^(threejs|three-js|webgl|3d)$/.test(topic));
  if (filter === "TypeScript") return project.language === "TypeScript";
  if (filter === "Interactive 3D") return spatial;
  if (filter === "Web & systems") return !spatial && ["TypeScript", "JavaScript", "HTML", "CSS"].includes(project.language ?? "");
  return true;
}

export function PortfolioHome({ portfolio }: { portfolio: GitHubPortfolio }) {
  const [studyIndex, setStudyIndex] = useState(0);
  const [filter, setFilter] = useState<Filter>("All repos");
  const [query, setQuery] = useState("");
  const [motionEnabled, setMotionEnabled] = usePortfolioMotion();
  const [replayCount, setReplayCount] = useState(0);
  const hero = useRef<HTMLElement>(null);
  const frame = useRef<HTMLElement>(null);
  const spotlight = useRef<HTMLElement>(null);
  const archive = useRef<HTMLElement>(null);
  const studyPanel = useRef<HTMLDivElement>(null);
  const studySwap = useRef(false);
  const study = caseStudies[studyIndex];
  const search = query.trim().toLowerCase();
  const projects = useMemo(() => portfolio.projects.filter(project => matchesFilter(project, filter) &&
    [project.name, project.description, project.language ?? "", ...project.topics].join(" ").toLowerCase().includes(search)), [portfolio.projects, filter, search]);
  usePressFeedback(frame, motionEnabled);
  usePointerTilt(studyPanel, motionEnabled, ".home-study-copy", studyIndex);

  useGSAP(() => {
    const mm = whenMotion(motionEnabled, () => {
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .from("[data-char]", { yPercent: 110, duration: 0.7, stagger: 0.02 }, 0.42)
        .from("[data-ink]", { scaleX: 0, duration: 0.5, ease: "power2.inOut" }, 0.72)
        .from("[data-art]", { y: 36, rotation: -3, duration: 0.7 }, 0.5)
        .from("[data-intro]", { x: 24, duration: 0.45, stagger: 0.08 }, 0.62);
    });
    return () => mm.revert();
  }, { scope: hero, dependencies: [motionEnabled], revertOnUpdate: true });

  useGSAP(() => {
    const mm = whenMotion(motionEnabled, () => {
      gsap.timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: { trigger: spotlight.current, start: "top 72%", once: true },
      })
        .from(".band-mask > span", { yPercent: 110, duration: 0.6, stagger: 0.08 })
        .from("[data-ink]", { scaleX: 0, duration: 0.45, ease: "power2.inOut" }, 0.16)
        .from("[data-band-copy]", { x: -28, duration: 0.45 }, 0.22)
        .from("[data-study-copy]", { x: -28, duration: 0.5 }, 0.24)
        .from("[data-study-stage]", { x: 28, duration: 0.55 }, 0.28);
    });
    return () => mm.revert();
  }, { scope: spotlight, dependencies: [motionEnabled], revertOnUpdate: true });

  useGSAP(() => {
    if (!studySwap.current) return;
    studySwap.current = false;
    const mm = whenMotion(motionEnabled, () => {
      gsap.fromTo("[data-study-swap]", { x: 18 }, { x: 0, duration: 0.38, ease: "power2.out", overwrite: "auto", clearProps: "transform" });
    });
    return () => mm.revert();
  }, { scope: studyPanel, dependencies: [studyIndex, motionEnabled], revertOnUpdate: true });

  useGSAP(() => {
    const mm = whenMotion(motionEnabled, () => {
      gsap.timeline({
        defaults: { ease: "power3.out" },
        scrollTrigger: { trigger: archive.current, start: "top 75%", once: true },
      })
        .from(".band-mask > span", { yPercent: 110, duration: 0.6, stagger: 0.08 })
        .from("[data-ink]", { scaleX: 0, duration: 0.45, ease: "power2.inOut" }, 0.15)
        .from("[data-repo-tool]", { x: -16, duration: 0.4, stagger: 0.06 }, 0.2)
        .from(".home-repo", { x: 24, rotation: -2, duration: 0.55, stagger: 0.04, clearProps: "transform" }, 0.28);
    });
    return () => mm.revert();
  }, { scope: archive, dependencies: [motionEnabled], revertOnUpdate: true });

  return (
    <div className="p-shell" data-motion={motionEnabled ? "full" : "reduced"}>
      <ClickSpark sparkColor="#ffd45c" sparkSize={12} sparkRadius={22} sparkCount={10} duration={460}>
      <a className="p-skip" href="#portfolio-content">Skip to content</a>
      <PortfolioNav current="home" />
      <main id="portfolio-content" className="home-frame" ref={frame}>
        <section className="home-hero" ref={hero} aria-labelledby="portfolio-title">
          <div className="home-aurora-bg" data-testid="hero-aurora" aria-hidden="true">
            <Aurora colorStops={["#2944eb", "#ffd45c", "#5cf2ff"]} amplitude={1.15} blend={0.55} speed={1.1} />
          </div>
          <div className="home-intro-bar" data-intro>
            <p className="home-intro p-mono">Ohaki / Web developer & creative technologist</p>
            <LoadingSequenceOverlay motionEnabled={motionEnabled} replayCount={replayCount} onReplay={() => setReplayCount(c => c + 1)} />
          </div>
          <h1 id="portfolio-title" aria-label="Code with character.">
            <MaskedChars text={"CODE WITH\nCHARACTER."} />
            <InkRule className="ink-rule-hero" />
          </h1>
          <div className="home-hero-bottom">
            <div className="home-hero-copy" data-intro>
              <div data-testid="blur-text-tagline">
                <BlurText text="Thoughtful interfaces. Playful interactions. Real systems behind every pixel." delay={55} animateBy="words" direction="bottom" className="home-blur-lead" />
              </div>
              <div className="p-actions">
                <Button asChild className="p-btn p-btn-primary" data-press><a href="#spotlight">Selected work <ArrowRight size={20} aria-hidden="true" /></a></Button>
                <Link className="p-link" data-press href="/work">Read the case studies <ArrowUpRight size={16} aria-hidden="true" /></Link>
                <Button variant="ghost" className="home-motion-toggle p-mono" data-press aria-label="Animations" aria-pressed={motionEnabled} onClick={() => setMotionEnabled(!motionEnabled)}>Animations: {motionEnabled ? "on" : "reduced"}<span aria-hidden="true">{motionEnabled ? "−" : "+"}</span></Button>
              </div>
            </div>
            <AtelierCharacter motionEnabled={motionEnabled} />
          </div>
        </section>

        <div className="home-facts" aria-label="Portfolio overview">
          <div><span className="p-mono">{portfolio.isLive ? "Public GitHub data" : "Saved GitHub snapshot"}</span><strong>{portfolio.publicRepos.toString().padStart(2, "0")} public repositories</strong></div>
          <div><span className="p-mono">Primary tools</span><strong>Next.js + TypeScript</strong></div>
          <div><span className="p-mono">Interactive medium</span><strong>Three.js</strong></div>
          <div><span className="p-mono">Go deeper</span><a className="p-link" href="#archive">Repository index <ArrowRight size={16} aria-hidden="true" /></a></div>
        </div>

        <section id="spotlight" className="p-section" ref={spotlight} aria-labelledby="spotlight-title">
          <header>
            <h2 id="spotlight-title">
              <span className="band-mask"><span>GOOD IDEAS.</span></span>
              <span className="band-mask"><span>WORKING CODE.</span></span>
            </h2>
            <InkRule />
            <p data-band-copy>From a world you can walk through to a workflow you can rely on. Pick a project. Look under the hood.</p>
          </header>
          <div className="p-filters home-study-filters" role="group" aria-label="Select a featured project">
            {caseStudies.map((item, index) => <Button variant="ghost" className="p-btn p-filter" data-press key={item.id} aria-pressed={studyIndex === index} data-testid={`flagship-tab-${item.id}`} onClick={() => { studySwap.current = true; setStudyIndex(index); }}>{item.name}</Button>)}
          </div>
          <div className="home-study" ref={studyPanel}>
            <div data-study-copy data-study-swap>
            <SpotlightCard spotlightColor="rgba(255, 212, 92, 0.2)" className="home-study-copy" key={`${study.id}-copy`}>
              <span className="p-mono">{study.category}</span>
              <h3>{study.title}</h3>
              <p>{study.summary}</p>
              <p className="home-stack p-mono">{study.stack}</p>
              <Button asChild className="p-btn"><Link href={`/work#${study.id === "myport" ? "myport" : "activity"}`}>Read case study <ArrowRight size={16} aria-hidden="true" /></Link></Button>
              <a className="p-link" href={study.source} target="_blank" rel="noopener noreferrer"><GithubLogo size={17} aria-hidden="true" /> Open repository</a>
              <details className="home-snapshot"><summary>About this source snapshot</summary><p><a href={`${study.source}/commit/${study.commit}`} target="_blank" rel="noopener noreferrer">{study.commit.slice(0, 7)}</a>. {study.sourceNote}</p></details>
            </SpotlightCard>
            </div>
            <div className="home-study-right" data-study-stage data-study-swap>
              <PixelDistortionStage study={study} motionEnabled={motionEnabled} />
              <ArchitectureInspector key={study.id} study={study} />
            </div>
          </div>
        </section>

        <ServiceWavePendulumStage motionEnabled={motionEnabled} />

        <section id="archive" className="p-section" ref={archive} aria-labelledby="archive-title">
          <header>
            <h2 id="archive-title">
              <span className="band-mask"><span>THE OPEN</span></span>
              <span className="band-mask"><span>SOURCE SIDE.</span></span>
            </h2>
            <InkRule />
            <p data-band-copy>Experiments, applications and ongoing work. Search the public repository index.</p>
          </header>
          <div className="home-repo-tools" data-repo-tool>
            <div className="p-filters" role="group" aria-label="Filter repositories">{filters.map(item => <Button variant="ghost" className="p-btn p-filter" data-press key={item} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</Button>)}</div>
            <label className="home-search"><span className="p-mono">Search repositories</span><span><MagnifyingGlass size={18} aria-hidden="true" /><input type="search" data-testid="repo-search-input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Name, language, topic..." /></span></label>
          </div>
          <p className="home-result-count p-mono" data-repo-tool role="status">{projects.length} of {portfolio.projects.length} loaded repositories{!portfolio.isLive && " / saved snapshot"}</p>
          {projects.length > 0 && <RepositoryDeck projects={projects} motionEnabled={motionEnabled} />}
          {projects.length === 0 && <div className="home-empty"><h3>No matching repositories.</h3><p>Try a different search or clear the filters.</p><Button className="p-btn" data-press onClick={() => { setQuery(""); setFilter("All repos"); }}>Reset filters <ArrowRight size={16} aria-hidden="true" /></Button></div>}
        </section>

        <section id="about" className="p-section home-about" aria-labelledby="about-title">
          <div><h2 id="about-title">CURIOUS MIND.<br />HANDS-ON BUILDER.</h2><p>I'm Ohaki. I turn ideas into interfaces, connect them to real data, and make room for a little play.</p></div>
          <div className="home-principles">
            <details open><summary>Interfaces that make sense.</summary><p>Clear hierarchy, useful feedback and keyboard-friendly controls. The next action should feel obvious.</p></details>
            <details><summary>Systems you can inspect.</summary><p>Typed data, explicit states and source-backed decisions. Explore the architecture in each case study.</p></details>
            <details><summary>A little room for play.</summary><p>The rooftop is an optional Three.js experiment. You can always read the work without loading a 3D world.</p></details>
          </div>
          <div className="home-about-span">
            <StadiumArenaStage motionEnabled={motionEnabled} />
            <GuitarStringsAndCurveStage motionEnabled={motionEnabled} />
          </div>
          <a className="home-contact" href={portfolio.profileUrl} target="_blank" rel="noopener noreferrer"><span>Find me on GitHub<strong>LET'S CONNECT.</strong><span>@{portfolio.login}</span></span><ArrowUpRight size={64} weight="bold" aria-hidden="true" /></a>
        </section>
      </main>
      <footer className="p-footer"><span>ohaki / Built with care, shared in public.</span><div><Link href="/work">Work</Link><Link href="/play" prefetch={false}>Playground</Link><a href="#portfolio-content">Back to top ↑</a></div></footer>
      </ClickSpark>
    </div>
  );
}
