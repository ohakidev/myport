"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { Sparkle, Play, MusicNotes, SoccerBall, Waves } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import SpotlightCard from "@/components/SpotlightCard";
import type { CaseStudy } from "@/lib/case-studies";
import { createAnimationLoop } from "@/lib/animation-loop";

/* -------------------------------------------------------------------------- */
/* 1. LoadingSequenceOverlay (4-column split curtain reveal + Replay trigger) */
/* -------------------------------------------------------------------------- */
export function LoadingSequenceOverlay({
  motionEnabled,
  replayCount,
  onReplay,
}: {
  motionEnabled: boolean;
  replayCount: number;
  onReplay: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"splitting" | "open">("splitting");
  const [runs, setRuns] = useState(1);

  useEffect(() => {
    const root = overlayRef.current;
    if (!root) return;
    setRuns((r) => (replayCount > 0 ? replayCount + 1 : r));

    const cols = root.querySelectorAll<HTMLElement>(".dave-loader-col");
    const badge = root.querySelector<HTMLElement>(".dave-loader-badge");

    if (!motionEnabled) {
      gsap.set(cols, { yPercent: (i) => (i < 2 ? -100 : 100) });
      if (badge) gsap.set(badge, { autoAlpha: 0, scale: 0.9 });
      setPhase("open");
      return;
    }

    setPhase("splitting");
    const tl = gsap.timeline({
      onComplete: () => setPhase("open"),
    });

    gsap.set(cols, { yPercent: 0 });
    if (badge) gsap.set(badge, { autoAlpha: 1, scale: 0.88, y: 12 });

    if (badge) {
      tl.to(badge, {
        autoAlpha: 1,
        scale: 1,
        y: 0,
        duration: 0.22,
        ease: "back.out(1.7)",
      }).to(
        badge,
        {
          autoAlpha: 0,
          scale: 1.06,
          y: -14,
          duration: 0.2,
          ease: "power2.in",
        },
        "+=0.1"
      );
    }

    tl.to(
      cols,
      {
        yPercent: (i) => (i % 2 === 0 ? -102 : 102),
        duration: 0.52,
        stagger: 0.055,
        ease: "power4.inOut",
      },
      badge ? "-=0.08" : 0
    );

    return () => {
      tl.kill();
    };
  }, [motionEnabled, replayCount]);

  return (
    <>
      <div
        ref={overlayRef}
        data-testid="loading-curtain"
        data-phase={phase}
        data-runs={runs}
        aria-hidden="true"
        className={`dave-loader-overlay ${phase === "open" ? "is-open" : "is-active"}`}
      >
        {[0, 1, 2, 3].map((col) => (
          <div key={col} className="dave-loader-col" data-col={col}>
            <span className="p-mono">0{col + 1} // ATELIER SPLIT</span>
          </div>
        ))}
        <div className="dave-loader-badge">
          <span className="p-mono">OHAKI // ELECTRIC ATELIER</span>
          <strong>CODE WITH CHARACTER.</strong>
        </div>
      </div>
      <Button
        variant="ghost"
        className="p-btn dave-mini-trigger p-mono"
        data-testid="replay-intro-btn"
        onClick={onReplay}
      >
        <Play size={14} weight="fill" aria-hidden="true" />
        <span>Replay 4-Column Intro ({runs})</span>
      </Button>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. PageWipeTransition (5-row horizontal + 4-col vertical staggered wipe)   */
/* -------------------------------------------------------------------------- */
export function PageWipeTransition({
  motionEnabled,
  wipeSeed,
  mode = "horizontal",
  onComplete,
}: {
  motionEnabled: boolean;
  wipeSeed: number;
  mode?: "horizontal" | "vertical";
  onComplete?: () => void;
}) {
  const wipeRef = useRef<HTMLDivElement>(null);
  const [wipeState, setWipeState] = useState<"idle" | "wiping">("idle");
  const [completedWipes, setCompletedWipes] = useState(0);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    if (wipeSeed === 0) return;
    const el = wipeRef.current;
    if (!el) return;

    if (!motionEnabled) {
      setWipeState("idle");
      setCompletedWipes((c) => c + 1);
      completeRef.current?.();
      return;
    }

    setWipeState("wiping");
    const rows = el.querySelectorAll<HTMLElement>(".dave-wipe-bar");
    const prop = mode === "horizontal" ? "xPercent" : "yPercent";

    const tl = gsap.timeline({
      onComplete: () => {
        setWipeState("idle");
        setCompletedWipes((c) => c + 1);
        completeRef.current?.();
      },
    });

    gsap.set(rows, { xPercent: 0, yPercent: 0, [prop]: -102, autoAlpha: 1 });
    tl.to(rows, {
      [prop]: 0,
      duration: 0.3,
      stagger: 0.04,
      ease: "power3.out",
    }).to(
      rows,
      {
        [prop]: 102,
        duration: 0.32,
        stagger: 0.04,
        ease: "power3.in",
      },
      "+=0.05"
    );

    return () => {
      tl.kill();
    };
  }, [wipeSeed, motionEnabled, mode]);

  return (
    <div
      ref={wipeRef}
      data-testid="page-wipe-overlay"
      data-wipe-state={wipeState}
      data-wipe-count={completedWipes}
      data-wipe-mode={mode}
      aria-hidden="true"
      className={`dave-wipe-overlay is-${mode} ${wipeState === "wiping" ? "is-active" : ""}`}
    >
      {[0, 1, 2, 3, 4].map((index) => (
        <div key={index} className="dave-wipe-bar" data-bar={index}>
          <span className="p-mono">TRANSITION // 0{index + 1}</span>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. PixelDistortionStage (Interactive velocity grid displacement + RGB)     */
/* -------------------------------------------------------------------------- */
interface GridCell {
  ox: number;
  oy: number;
  dx: number;
  dy: number;
  vx: number;
  vy: number;
}

export function PixelDistortionStage({
  study,
  motionEnabled,
}: {
  study: CaseStudy;
  motionEnabled: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cellsRef = useRef<GridCell[]>([]);
  const pointerRef = useRef<{ x: number; y: number; vx: number; vy: number; active: boolean }>({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    active: false,
  });
  const [burstCount, setBurstCount] = useState(0);
  const [energy, setEnergy] = useState(0);
  const loopRef = useRef<ReturnType<typeof createAnimationLoop> | null>(null);

  const triggerBurst = useCallback(() => {
    const cells = cellsRef.current;
    const cols = 14;
    const rows = 9;
    for (let i = 0; motionEnabled && i < cells.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const nx = (col / (cols - 1)) * 2 - 1;
      const ny = (row / (rows - 1)) * 2 - 1;
      const angle = Math.atan2(ny, nx);
      const mag = Math.max(0.25, Math.hypot(nx, ny));
      cells[i].vx += Math.cos(angle) * (18 / mag) + (Math.random() - 0.5) * 8;
      cells[i].vy += Math.sin(angle) * (18 / mag) + (Math.random() - 0.5) * 8;
    }
    setBurstCount((c) => c + 1);
    setEnergy(motionEnabled ? 100 : 0);
    loopRef.current?.start();
  }, [motionEnabled]);

  useEffect(() => {
    const cols = 14;
    const rows = 9;
    const nextCells: GridCell[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        nextCells.push({ ox: c, oy: r, dx: 0, dy: 0, vx: 0, vy: 0 });
      }
    }
    cellsRef.current = nextCells;
    if (motionEnabled) {
      triggerBurst();
    }
  }, [study.id, motionEnabled, triggerBurst]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    const cols = 14;
    const rows = 9;

    const render = () => {
      frame++;
      const w = canvas.width;
      const h = canvas.height;
      const cellW = w / cols;
      const cellH = h / rows;

      ctx.fillStyle = study.id === "myport" ? "#13239e" : "#1a1746";
      ctx.fillRect(0, 0, w, h);

      let totalEnergy = 0;
      const cells = cellsRef.current;

      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        if (motionEnabled) {
          cell.dx += cell.vx;
          cell.dy += cell.vy;
          cell.vx += -cell.dx * 0.14;
          cell.vy += -cell.dy * 0.14;
          cell.vx *= 0.82;
          cell.vy *= 0.82;
        } else {
          cell.dx = 0;
          cell.dy = 0;
          cell.vx = 0;
          cell.vy = 0;
        }

        const speed = Math.hypot(cell.dx, cell.dy);
        totalEnergy += speed;

        const x = cell.ox * cellW + cell.dx;
        const y = cell.oy * cellH + cell.dy;

        const isAccentTile = (cell.ox + cell.oy) % 3 === 0;
        if (speed > 0.6) {
          ctx.fillStyle = "rgba(255, 77, 121, 0.42)";
          ctx.fillRect(x - cell.dx * 0.35 + 2, y + 2, cellW - 4, cellH - 4);
          ctx.fillStyle = "rgba(92, 242, 255, 0.42)";
          ctx.fillRect(x + cell.dx * 0.35 + 2, y - 2, cellW - 4, cellH - 4);
        }

        ctx.fillStyle = isAccentTile
          ? study.id === "myport"
            ? "rgba(250, 249, 244, 0.16)"
            : "rgba(255, 212, 92, 0.18)"
          : "rgba(250, 249, 244, 0.06)";
        ctx.fillRect(x + 1.5, y + 1.5, cellW - 3, cellH - 3);

        ctx.strokeStyle = "rgba(250, 249, 244, 0.18)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1.5, y + 1.5, cellW - 3, cellH - 3);
      }

      ctx.save();
      ctx.fillStyle = "#faf9f4";
      ctx.font = "700 22px sans-serif";
      ctx.fillText(`${study.name.toUpperCase()} // PIXEL VELOCITY MATRIX`, 20, 38);
      ctx.font = "12px monospace";
      ctx.fillStyle = "rgba(250, 249, 244, 0.82)";
      ctx.fillText(
        `COMMIT ${study.commit.slice(0, 7)}  |  LAYERS: 0${study.layers.length}  |  GRID: ${cols}x${rows}  |  BURSTS: ${burstCount}`,
        20,
        62
      );
      ctx.restore();

      if (frame % 6 === 0) {
        setEnergy(Math.min(100, Math.round(totalEnergy * 1.4)));
      }

      return totalEnergy > 0.05;
    };

    const loop = createAnimationLoop(canvas, render, motionEnabled);
    loopRef.current = loop;
    return () => { loop.dispose(); loopRef.current = null; };
  }, [study, motionEnabled, burstCount]);

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!motionEnabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const py = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const vx = px - pointerRef.current.x;
    const vy = py - pointerRef.current.y;
    pointerRef.current = { x: px, y: py, vx, vy, active: true };

    const cols = 14;
    const rows = 9;
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;

    for (const cell of cellsRef.current) {
      const cx = (cell.ox + 0.5) * cellW;
      const cy = (cell.oy + 0.5) * cellH;
      const dist = Math.hypot(px - cx, py - cy);
      if (dist < 130) {
        const factor = (1 - dist / 130) * 0.45;
        cell.vx += Math.max(-18, Math.min(18, vx)) * factor;
        cell.vy += Math.max(-18, Math.min(18, vy)) * factor;
      }
    }
    setEnergy((prev) => Math.max(prev, 64));
    loopRef.current?.start();
  };

  return (
    <div className="dave-pixel-stage" data-testid="pixel-distortion-stage">
      <div className="dave-pixel-header">
        <div>
          <span className="p-mono">INTERACTIVE SHADER / PIXEL DISTORTION PREVIEW</span>
          <strong className="p-mono" data-testid="pixel-energy-readout">
            Displacement Energy: {energy}% • Bursts: {burstCount}
          </strong>
        </div>
        <Button
          variant="ghost"
          className="p-btn dave-mini-trigger p-mono"
          data-testid="pixel-burst-btn"
          onClick={triggerBurst}
        >
          <Sparkle size={14} weight="fill" aria-hidden="true" />
          <span>Pulse Distortion</span>
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        width={680}
        height={220}
        data-testid="pixel-distortion-canvas"
        onPointerMove={handlePointerMove}
        onClick={triggerBurst}
        className="dave-pixel-canvas"
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. ServiceWavePendulumStage (5 morphing SVG waves + swinging cards)        */
/* -------------------------------------------------------------------------- */
const CAPABILITY_CARDS = [
  {
    id: "motion-craft",
    index: "01",
    tag: "GSAP + WEBGL",
    title: "Kinetic Interfaces & Choreographed Motion",
    summary:
      "Curtain reveals, pointer-driven card pendulums, SVG waves, and tactile feedback with a reduced-motion alternative.",
    metrics: "GSAP 3.13 + Custom Physics",
  },
  {
    id: "spatial-3d",
    index: "02",
    tag: "THREE.JS + OGL SHADERS",
    title: "Spatial 3D Worlds & Aurora Shaders",
    summary:
      "Interactive rooftop worlds, OGL fragment shaders, pixel displacement grids, and progressive WebGL fallbacks for every device.",
    metrics: "Three.js 0.170 + OGL 1.0",
  },
  {
    id: "systems-architecture",
    index: "03",
    tag: "NEXT.JS 15 + TYPESCRIPT",
    title: "Commit-Pinned Full-Stack Engineering",
    summary:
      "Explicit server/client boundaries, typed GitHub snapshots, source-linked case studies, and responsive editorial grids.",
    metrics: "React 19 + Strict TS",
  },
  {
    id: "reverse-engineering",
    index: "04",
    tag: "REA MCP + VERIFIED EVIDENCE",
    title: "Evidence-Backed Reconstruction & Audits",
    summary:
      "Static AST graph reconstruction, runtime CDP verification, and reproducible engineering case studies with exact commit links.",
    metrics: "Source-linked decisions",
  },
] as const;

function buildWavePath(phase: number, amplitude: number, yBase: number, freq: number): string {
  const points: string[] = ["M 0 140", `L 0 ${yBase.toFixed(1)}`];
  const steps = 12;
  for (let i = 1; i <= steps; i++) {
    const x = (i / steps) * 1440;
    const prevX = ((i - 0.5) / steps) * 1440;
    const cy = yBase + Math.sin(phase + i * freq) * amplitude;
    const y = yBase + Math.cos(phase + i * freq * 0.85) * (amplitude * 0.75);
    points.push(`Q ${prevX.toFixed(1)} ${cy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  points.push("L 1440 140", "Z");
  return points.join(" ");
}

export function ServiceWavePendulumStage({ motionEnabled }: { motionEnabled: boolean }) {
  const waveSvgRef = useRef<SVGSVGElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const anglesRef = useRef<number[]>([0, 0, 0, 0]);
  const velocitiesRef = useRef<number[]>([0, 0, 0, 0]);
  const [swingAngle, setSwingAngle] = useState(0);
  const [swingCount, setSwingCount] = useState(0);

  const impulseCards = useCallback((strength = 14) => {
    velocitiesRef.current = velocitiesRef.current.map(
      (v, idx) => v + (idx % 2 === 0 ? strength : -strength * 0.9)
    );
    setSwingAngle(Math.round(Math.abs(strength)));
    setSwingCount((c) => c + 1);
  }, []);

  useEffect(() => {
    let t = 0;

    const tick = () => {
      t += 0.035;

      if (waveSvgRef.current) {
        const paths = waveSvgRef.current.querySelectorAll<SVGPathElement>("path[data-wave]");
        paths.forEach((p, idx) => {
          const amp = 12 + idx * 4.5;
          const yBase = 34 + idx * 16;
          const freq = 0.65 + idx * 0.12;
          p.setAttribute("d", buildWavePath(t * (1 + idx * 0.18), amp, yBase, freq));
        });
      }

      if (scrollerRef.current) {
        const cards = scrollerRef.current.querySelectorAll<HTMLElement>(".dave-pendulum-card");
        let maxAbs = 0;
        cards.forEach((card, idx) => {
          if (motionEnabled) {
            const angle = anglesRef.current[idx] ?? 0;
            let vel = velocitiesRef.current[idx] ?? 0;
            const idleSway = Math.sin(t * 0.9 + idx * 1.1) * 0.18;
            vel += (-angle * 0.12 + idleSway) * 0.65;
            vel *= 0.88;
            const nextAngle = Math.max(-22, Math.min(22, angle + vel * 0.35));
            anglesRef.current[idx] = nextAngle;
            velocitiesRef.current[idx] = vel;
            maxAbs = Math.max(maxAbs, Math.abs(nextAngle));
            card.style.transform = `rotate(${nextAngle.toFixed(2)}deg)`;
          } else {
            anglesRef.current[idx] = 0;
            velocitiesRef.current[idx] = 0;
            card.style.transform = "rotate(0deg)";
          }
        });
        if (Math.round(t * 100) % 7 === 0) setSwingAngle(Number(maxAbs.toFixed(1)));
      }

      return true;
    };

    if (!waveSvgRef.current) return;
    const loop = createAnimationLoop(waveSvgRef.current.closest('section')!, tick, motionEnabled);
    return () => loop.dispose();
  }, [motionEnabled]);

  return (
    <section
      id="capabilities"
      className="p-section dave-service-section"
      data-testid="service-pendulum-stage"
      data-swing-angle={swingAngle}
      data-swing-count={swingCount}
      aria-labelledby="capabilities-title"
    >
      <div className="dave-wave-divider" aria-hidden="true">
        <svg
          ref={waveSvgRef}
          data-testid="service-wave-svg"
          viewBox="0 0 1440 140"
          preserveAspectRatio="none"
          className="dave-wave-svg"
        >
          {[1, 2, 3, 4, 5].map((layer) => (
            <path
              key={layer}
              data-wave={layer}
              className={`dave-wave-path dave-wave-path-${layer}`}
              d={buildWavePath(layer * 0.7, 12 + layer * 4, 34 + layer * 16, 0.75)}
            />
          ))}
        </svg>
      </div>

      <header className="dave-section-header">
        <div>
          <p className="p-mono">CAPABILITIES & PENDULUM RIG // DAVE HOLLOWAY INSPIRED</p>
          <h2 id="capabilities-title">
            BUILT TO SWING.<br />ENGINEERED TO SHIP.
          </h2>
          <p>
            Move across the cards or trigger an impulse to explore how motion can make an interface feel tactile.
          </p>
        </div>
        <div className="dave-stage-controls">
          <span className="p-mono" data-testid="pendulum-telemetry">
            Max Pendulum Angle: {swingAngle.toFixed(1)}° • Impulses: {swingCount}
          </span>
          <Button
            variant="ghost"
            className="p-btn"
            data-testid="swing-cards-btn"
            onClick={() => impulseCards(16)}
          >
            <Waves size={18} aria-hidden="true" />
            <span>Swing Hanging Cards</span>
          </Button>
        </div>
      </header>

      <div
        ref={scrollerRef}
        className="dave-pendulum-grid"
        onPointerMove={(e) => {
          if (!motionEnabled) return;
          const delta = Math.max(-14, Math.min(14, e.movementX * 0.45));
          if (Math.abs(delta) > 0.5) {
            velocitiesRef.current = velocitiesRef.current.map((v, i) => v + delta * (i % 2 === 0 ? 0.35 : -0.3));
          }
        }}
      >
        {CAPABILITY_CARDS.map((item, idx) => (
          <div key={item.id} className="dave-pendulum-rail">
            <div className="dave-rail-pin" aria-hidden="true" />
            <article
              data-testid={`pendulum-card-${idx}`}
              className="dave-pendulum-card"
              onClick={() => impulseCards(idx % 2 === 0 ? 15 : -15)}
              role="button"
              tabIndex={0}
              aria-label={`Swing ${item.title}`}
              onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); impulseCards(idx % 2 === 0 ? 15 : -15); } }}
            >
              <SpotlightCard spotlightColor="rgba(250, 249, 244, 0.22)" className="dave-pendulum-inner">
                <div className="dave-card-hole-row">
                  <span className="p-mono">{item.index} // RIGGED</span>
                  <span className="dave-card-hole" aria-hidden="true" />
                  <span className="p-mono">{item.tag}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
                <div className="dave-card-footer p-mono">
                  <span>{item.metrics}</span>
                  <span>CLICK TO IMPULSE ↻</span>
                </div>
              </SpotlightCard>
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. StadiumArenaStage (3D Tilted Stadium Cube + 2D Physics Ball + Ticker)   */
/* -------------------------------------------------------------------------- */
const TICKER_ITEMS = [
  "OHAKI ELECTRIC ATELIER",
  "GSAP 3.13 + INERTIA PHYSICS",
  "OGL FRAGMENT AURORA",
  "THREE.JS SPATIAL ROOFTOP",
  "COMMIT-PINNED ARCHITECTURE",
  "REA MCP VERIFIED BUNDLE",
  "INTERACTIVE STADIUM ARENA",
  "WEB AUDIO HARMONIC STRINGS",
] as const;

export function StadiumArenaStage({ motionEnabled }: { motionEnabled: boolean }) {
  const ballCanvasRef = useRef<HTMLCanvasElement>(null);
  const ballRef = useRef({
    x: 260,
    y: 90,
    vx: 5.5,
    vy: -3.2,
    r: 16,
    gravity: 0.28,
    rotation: 0,
  });
  const [score, setScore] = useState({ home: 0, away: 0 });
  const [kickCount, setKickCount] = useState(0);
  const [gravityInverted, setGravityInverted] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [cubeTilt, setCubeTilt] = useState({ rx: -16, ry: 24 });
  const [tickerOffset, setTickerOffset] = useState(0);

  const kickBall = useCallback((impulseX?: number, impulseY?: number) => {
    const b = ballRef.current;
    b.vx = impulseX ?? (Math.random() > 0.4 ? 9.5 : -9.5);
    b.vy = impulseY ?? -8.2 * Math.sign(b.gravity || 1);
    setKickCount((k) => k + 1);
  }, []);

  const toggleGravity = useCallback(() => {
    setGravityInverted((prev) => {
      const next = !prev;
      ballRef.current.gravity = next ? -0.28 : 0.28;
      ballRef.current.vy = next ? -6.5 : 6.5;
      return next;
    });
  }, []);

  useEffect(() => {
    const canvas = ballCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const step = () => {
      const w = canvas.width;
      const h = canvas.height;
      const b = ballRef.current;

      if (motionEnabled) {
        b.vy += b.gravity;
        b.x += b.vx;
        b.y += b.vy;
        b.vx *= 0.992;
        b.vy *= 0.992;
        b.rotation += b.vx * 0.05;

        if (b.y + b.r > h - 14) {
          b.y = h - 14 - b.r;
          b.vy = -b.vy * 0.78;
        } else if (b.y - b.r < 14) {
          b.y = 14 + b.r;
          b.vy = -b.vy * 0.78;
        }

        if (b.x + b.r > w - 14) {
          if (b.y > h * 0.28 && b.y < h * 0.72 && Math.abs(b.vx) > 2.2) {
            setScore((s) => ({ ...s, home: s.home + 1 }));
          }
          b.x = w - 14 - b.r;
          b.vx = -b.vx * 0.82;
        } else if (b.x - b.r < 14) {
          if (b.y > h * 0.28 && b.y < h * 0.72 && Math.abs(b.vx) > 2.2) {
            setScore((s) => ({ ...s, away: s.away + 1 }));
          }
          b.x = 14 + b.r;
          b.vx = -b.vx * 0.82;
        }
      }

      ctx.fillStyle = "#10208a";
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = "rgba(250, 249, 244, 0.28)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(14, 14, w - 28, h - 28);
      ctx.beginPath();
      ctx.moveTo(w / 2, 14);
      ctx.lineTo(w / 2, h - 14);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 36, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 212, 92, 0.28)";
      ctx.fillRect(4, h * 0.28, 10, h * 0.44);
      ctx.fillRect(w - 14, h * 0.28, 10, h * 0.44);

      ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
      ctx.beginPath();
      ctx.ellipse(b.x, h - 12, Math.max(6, b.r * (1 - (h - b.y) / (h * 1.4))), 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.rotation);
      ctx.fillStyle = "#faf9f4";
      ctx.beginPath();
      ctx.arc(0, 0, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#101c73";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#2944eb";
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
        const px = Math.cos(a) * (b.r * 0.48);
        const py = Math.sin(a) * (b.r * 0.48);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      return true;
    };

    const loop = createAnimationLoop(canvas, step, motionEnabled);
    return () => loop.dispose();
  }, [motionEnabled]);

  return (
    <div className="dave-stadium-wrapper" data-testid="stadium-arena-stage">
      <div className="dave-stadium-grid">
        <div
          className={`dave-stadium-cube-scene ${exploded ? "is-exploded" : ""}`}
          onPointerMove={(e) => {
            if (!motionEnabled) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const nx = (e.clientX - rect.left) / rect.width - 0.5;
            const ny = (e.clientY - rect.top) / rect.height - 0.5;
            setCubeTilt({
              rx: Math.round(-16 - ny * 26),
              ry: Math.round(24 + nx * 36),
            });
          }}
        >
          <div className="dave-stadium-cube-header">
            <span className="p-mono">3D PERSPECTIVE STADIUM CUBE</span>
            <Button
              variant="ghost"
              className="p-btn dave-mini-trigger p-mono"
              data-testid="stadium-explode-btn"
              aria-pressed={exploded}
              onClick={() => setExploded((v) => !v)}
            >
              <span>{exploded ? "Collapse Cube" : "Explode 3D Tiers"}</span>
            </Button>
          </div>
          <div
            data-testid="stadium-cube"
            data-exploded={exploded}
            className="dave-stadium-cube"
            style={{
              transform: `rotateX(${cubeTilt.rx}deg) rotateY(${cubeTilt.ry}deg)`,
            }}
          >
            <div className="dave-cube-tier dave-cube-roof">
              <span className="p-mono">TIER 03 // FLOODLIGHTS & CANOPY</span>
            </div>
            <div className="dave-cube-tier dave-cube-stands">
              <span className="p-mono">TIER 02 // SUPPORTER TERRACES</span>
            </div>
            <div className="dave-cube-tier dave-cube-pitch">
              <span className="p-mono">TIER 01 // TACTICAL PITCH CORE</span>
            </div>
          </div>
          <p className="p-mono dave-cube-readout">
            Tilt: X {cubeTilt.rx}° / Y {cubeTilt.ry}° • Mode: {exploded ? "Exploded" : "Assembled"}
          </p>
        </div>

        <div className="dave-stadium-pitch-panel">
          <div className="dave-stadium-scoreboard">
            <div>
              <span className="p-mono">INTERACTIVE STADIUM BALL PHYSICS</span>
              <strong data-testid="stadium-score" className="dave-score-readout">
                HOME {score.home} : {score.away} AWAY (Kicks: {kickCount})
              </strong>
            </div>
            <div className="dave-stage-controls">
              <Button
                variant="ghost"
                className="p-btn dave-mini-trigger p-mono"
                data-testid="stadium-kick-btn"
                onClick={() => kickBall(10.5, -7.5)}
              >
                <SoccerBall size={15} weight="fill" aria-hidden="true" />
                <span>Kick Ball</span>
              </Button>
              <Button
                variant="ghost"
                className="p-btn dave-mini-trigger p-mono"
                data-testid="stadium-gravity-btn"
                aria-pressed={gravityInverted}
                onClick={toggleGravity}
              >
                <span>Gravity: {gravityInverted ? "Inverted ↑" : "Normal ↓"}</span>
              </Button>
            </div>
          </div>
          <canvas
            ref={ballCanvasRef}
            width={560}
            height={200}
            data-testid="stadium-ball-canvas"
            className="dave-ball-canvas"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const px = ((e.clientX - rect.left) / rect.width) * e.currentTarget.width;
              const py = ((e.clientY - rect.top) / rect.height) * e.currentTarget.height;
              const dx = px - ballRef.current.x;
              const dy = py - ballRef.current.y;
              kickBall(Math.sign(dx || 1) * 9.5, dy < 0 ? -8 : -5.5);
            }}
          />
        </div>
      </div>

      <div
        data-testid="awards-ticker"
        className="dave-ticker-bar"
        style={{ '--ticker-offset': `${tickerOffset}px` } as React.CSSProperties}
        tabIndex={0}
        role="region"
        aria-label="Motion experiments ticker. Use left and right arrows to scroll."
        onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); setTickerOffset(value => value + (event.key === 'ArrowLeft' ? -60 : 60)); } }}
        onPointerDown={event => event.currentTarget.setPointerCapture(event.pointerId)}
        onPointerUp={event => event.currentTarget.releasePointerCapture(event.pointerId)}
        onPointerMove={(e) => {
          if (e.buttons === 1) {
            setTickerOffset((prev) => prev + e.movementX);
          }
        }}
      >
        <div
          className="dave-ticker-track"
          style={{ animationPlayState: motionEnabled ? 'running' : 'paused' }}
        >
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, idx) => (
            <span key={idx} className="dave-ticker-item p-mono">
              <strong>★</strong> {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. GuitarStringsAndCurveStage (6 Elastic Guitar Strings + Curved SVG Text) */
/* -------------------------------------------------------------------------- */
const GUITAR_NOTES = [
  { label: "E2", freq: 82.41, y: 34 },
  { label: "A2", freq: 110.0, y: 58 },
  { label: "D3", freq: 146.83, y: 82 },
  { label: "G3", freq: 196.0, y: 106 },
  { label: "B3", freq: 246.94, y: 130 },
  { label: "E4", freq: 329.63, y: 154 },
] as const;

export function GuitarStringsAndCurveStage({ motionEnabled }: { motionEnabled: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const stringStateRef = useRef(
    GUITAR_NOTES.map(() => ({ offset: 0, velocity: 0 }))
  );
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [strumCount, setStrumCount] = useState(0);
  const [activeNote, setActiveNote] = useState("E4");
  const [curveOffset, setCurveOffset] = useState(12);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const loopRef = useRef<ReturnType<typeof createAnimationLoop> | null>(null);

  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout);
    if (audioCtxRef.current) void audioCtxRef.current.close().catch(() => {});
  }, []);

  const playNoteAudio = useCallback((freq: number) => {
    if (!soundEnabled) return;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        void ctx.resume();
      }
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.996, now + 0.45);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.52);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.55);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    } catch {
      /* Web Audio is optional and degrades silently when blocked by autoplay policy. */
    }
  }, [soundEnabled]);

  const pluckString = useCallback(
    (index: number, strength = 28) => {
      const s = stringStateRef.current[index];
      if (!s) return;
      s.offset = motionEnabled ? strength : 0;
      s.velocity = motionEnabled ? strength * 0.45 : 0;
      const note = GUITAR_NOTES[index];
      setActiveNote(note.label);
      setStrumCount((c) => c + 1);
      setCurveOffset((prev) => (prev + 6) % 45);
      playNoteAudio(note.freq);
      loopRef.current?.start();
    },
    [playNoteAudio, motionEnabled]
  );

  const strumChord = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    GUITAR_NOTES.forEach((_, idx) => {
      timersRef.current.push(setTimeout(() => {
        pluckString(idx, idx % 2 === 0 ? 30 : -28);
      }, idx * 35));
    });
  }, [pluckString]);

  useEffect(() => {
    const animateStrings = () => {
      const svg = svgRef.current;
      if (svg) {
        const paths = svg.querySelectorAll<SVGPathElement>("path[data-guitar-string]");
        paths.forEach((path, idx) => {
          const st = stringStateRef.current[idx];
          const baseY = GUITAR_NOTES[idx].y;
          if (motionEnabled) {
            st.velocity += -st.offset * 0.28;
            st.velocity *= 0.84;
            st.offset += st.velocity;
          } else {
            st.offset = 0;
            st.velocity = 0;
          }
          const cy = baseY + st.offset;
          path.setAttribute("d", `M 36 ${baseY} Q 400 ${cy.toFixed(2)} 764 ${baseY}`);
        });
      }
      return stringStateRef.current.some(string => Math.abs(string.offset) + Math.abs(string.velocity) > 0.01);
    };

    if (!svgRef.current) return;
    const loop = createAnimationLoop(svgRef.current, animateStrings, motionEnabled);
    loopRef.current = loop;
    return () => { loop.dispose(); loopRef.current = null; timersRef.current.forEach(clearTimeout); };
  }, [motionEnabled]);

  return (
    <div
      className="dave-guitar-stage"
      data-testid="guitar-contact-stage"
      data-strum-count={strumCount}
      data-active-note={activeNote}
    >
      <svg
        viewBox="0 0 1000 130"
        className="dave-curved-text-svg"
        data-testid="contact-curved-text"
        aria-label="Ready to play? Code with character."
      >
        <defs>
          <path id="dave-contact-curve" d="M 30 105 C 280 12, 720 12, 970 105" />
        </defs>
        <text className="dave-curved-text">
          <textPath href="#dave-contact-curve" startOffset={`${curveOffset}%`}>
            READY TO PLAY? • STRUM THE STRINGS • CODE WITH CHARACTER •
          </textPath>
        </text>
      </svg>

      <div className="dave-guitar-header">
        <div>
          <span className="p-mono">ELASTIC SVG STRINGS + WEB AUDIO HARMONIC SYNTH</span>
          <strong className="p-mono" data-testid="guitar-telemetry">
            Last Note: {activeNote} • Plucks: {strumCount}
          </strong>
        </div>
        <Button variant="ghost" className="p-btn dave-mini-trigger" aria-pressed={soundEnabled} onClick={() => {
          if (soundEnabled && audioCtxRef.current) void audioCtxRef.current.suspend().catch(() => {});
          setSoundEnabled(enabled => !enabled);
        }}>Sound: {soundEnabled ? "on" : "off"}</Button>
        <Button
          variant="ghost"
          className="p-btn dave-mini-trigger p-mono"
          data-testid="guitar-strum-btn"
          onClick={strumChord}
        >
          <MusicNotes size={15} weight="fill" aria-hidden="true" />
          <span>Strum Full Chord</span>
        </Button>
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 800 188"
        data-testid="guitar-svg"
        className="dave-guitar-svg"
        onPointerMove={(e) => {
          if (!motionEnabled) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const py = ((e.clientY - rect.top) / rect.height) * 188;
          GUITAR_NOTES.forEach((n, idx) => {
            if (Math.abs(py - n.y) < 10 && Math.abs(stringStateRef.current[idx].offset) < 6) {
              pluckString(idx, e.movementY >= 0 ? 24 : -24);
            }
          });
        }}
      >
        <circle cx="400" cy="94" r="64" className="dave-guitar-soundhole" />
        <rect x="24" y="20" width="12" height="148" rx="4" className="dave-guitar-bridge" />
        <rect x="764" y="20" width="12" height="148" rx="4" className="dave-guitar-bridge" />

        {GUITAR_NOTES.map((note, idx) => (
          <g key={note.label}
            data-testid={`guitar-string-control-${idx}`}
            tabIndex={0}
            role="button"
            aria-label={`Pluck ${note.label} string`}
            onClick={() => pluckString(idx, 30)}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pluckString(idx, 30); } }}
          >
            <rect x="36" y={note.y - 10} width="728" height="20" fill="transparent" />
            <text x="8" y={note.y + 4} className="dave-guitar-note-label">
              {note.label}
            </text>
            <path
              data-guitar-string={idx}
              data-testid={`guitar-string-${idx}`}
              d={`M 36 ${note.y} Q 400 ${note.y} 764 ${note.y}`}
              className="dave-guitar-string"
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. GoldModeOverlay (Gold Mode Toggle + Flapping Butterfly + Gold Snow)     */
/* -------------------------------------------------------------------------- */
interface GoldFlake {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  twinkleSpeed: number;
  gold: boolean;
}

export function GoldModeOverlay({
  goldMode,
  motionEnabled,
}: {
  goldMode: boolean;
  motionEnabled: boolean;
}) {
  const snowCanvasRef = useRef<HTMLCanvasElement>(null);
  const butterflyRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef({ x: 320, y: 220 });
  const posRef = useRef({ x: 320, y: 220, angle: 0 });
  const flakesRef = useRef<GoldFlake[]>([]);

  useEffect(() => {
    if (goldMode) {
      document.documentElement.setAttribute("data-gold-mode", "true");
    } else {
      document.documentElement.removeAttribute("data-gold-mode");
    }
    return () => {
      document.documentElement.removeAttribute("data-gold-mode");
    };
  }, [goldMode]);

  useEffect(() => {
    if (!goldMode) return;
    const canvas = snowCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    flakesRef.current = Array.from({ length: 75 }, (_, i) => ({
      x: (i * 97) % Math.max(320, window.innerWidth),
      y: (i * 53) % Math.max(320, window.innerHeight),
      vx: (Math.random() - 0.5) * 0.9,
      vy: 0.65 + Math.random() * 1.35,
      r: 1.8 + (i % 4) * 1.1,
      alpha: 0.35 + (i % 5) * 0.12,
      twinkleSpeed: 0.03 + (i % 4) * 0.015,
      gold: i % 4 !== 0,
    }));

    const onMove = (e: PointerEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
      for (const f of flakesRef.current) {
        const dx = f.x - e.clientX;
        const dy = f.y - e.clientY;
        const dist = Math.hypot(dx, dy);
        if (dist < 110 && dist > 1) {
          f.vx += (dx / dist) * 1.4;
          f.vy += (dy / dist) * 1.4;
        }
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let tick = 0;
    const render = () => {
      tick++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const f of flakesRef.current) {
        if (motionEnabled) {
          f.x += f.vx + Math.sin(tick * 0.02 + f.r) * 0.35;
          f.y += f.vy;
          f.vx *= 0.98;
          f.vy = Math.max(0.55, f.vy * 0.98);
          if (f.y > canvas.height + 10) {
            f.y = -10;
            f.x = Math.random() * canvas.width;
          }
          if (f.x > canvas.width + 10) f.x = -10;
          if (f.x < -10) f.x = canvas.width + 10;
        }
        const twinkle = 0.45 + 0.55 * Math.sin(tick * f.twinkleSpeed);
        ctx.fillStyle = f.gold
          ? `rgba(255, 212, 92, ${(f.alpha * twinkle).toFixed(2)})`
          : `rgba(250, 249, 244, ${(f.alpha * twinkle).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (butterflyRef.current) {
        const p = posRef.current;
        const t = targetRef.current;
        const dx = t.x - p.x;
        const dy = t.y - p.y;
        p.x += dx * 0.14;
        p.y += dy * 0.14;
        if (Math.hypot(dx, dy) > 1.5) {
          p.angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        }
        const flap = motionEnabled ? (Math.sin(tick * 0.36) * 0.55 + 0.45).toFixed(2) : "1";
        butterflyRef.current.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0) rotate(${p.angle.toFixed(1)}deg)`;
        butterflyRef.current.style.setProperty("--wing-scale", flap);
      }

      return true;
    };

    const loop = createAnimationLoop(canvas, render, motionEnabled);
    return () => {
      loop.dispose();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, [goldMode, motionEnabled]);

  if (!goldMode) return null;

  return (
    <>
      <canvas
        id="gold-snow-canvas"
        ref={snowCanvasRef}
        data-testid="gold-snow-canvas"
        aria-hidden="true"
        className="dave-gold-snow-canvas"
      />
      <div
        ref={butterflyRef}
        data-testid="gold-butterfly"
        aria-hidden="true"
        className="dave-gold-butterfly"
      >
        <svg viewBox="0 0 48 48" width="38" height="38" className="dave-butterfly-svg">
          <g className="dave-butterfly-wings">
            <path
              d="M23 24 C12 8, 2 10, 4 22 C6 30, 15 30, 23 26 Z"
              fill="#ffd45c"
              stroke="#101c73"
              strokeWidth="1.5"
            />
            <path
              d="M25 24 C36 8, 46 10, 44 22 C42 30, 33 30, 25 26 Z"
              fill="#ffd45c"
              stroke="#101c73"
              strokeWidth="1.5"
            />
            <path
              d="M23 27 C14 31, 8 40, 15 43 C20 45, 22 36, 23 29 Z"
              fill="#f59e0b"
              stroke="#101c73"
              strokeWidth="1.5"
            />
            <path
              d="M25 27 C34 31, 40 40, 33 43 C28 45, 26 36, 25 29 Z"
              fill="#f59e0b"
              stroke="#101c73"
              strokeWidth="1.5"
            />
          </g>
          <rect x="22.5" y="14" width="3" height="22" rx="1.5" fill="#faf9f4" />
        </svg>
      </div>
    </>
  );
}
