"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ArrowsLeftRight, Moon, Sparkle, Sun } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { GoldModeOverlay, PageWipeTransition } from "@/components/dave-animations";
import { RefreshScrollTriggers } from "@/components/motion/refresh-scroll";
import { usePressFeedback } from "@/components/motion/use-press-feedback";
import { usePortfolioMotion } from "@/hooks/use-portfolio-motion";
import { gsap, useGSAP } from "@/lib/gsap";

export function PortfolioNav({ current }: { current: "home" | "work" | "play" }) {
  const [motionEnabled, setMotionEnabled] = usePortfolioMotion();
  const router = useRouter();
  const pendingHref = useRef<string | null>(null);
  const [theme, setTheme] = useState("light");
  const [goldMode, setGoldMode] = useState(false);
  const [wipeSeed, setWipeSeed] = useState(0);
  const [wipeMode, setWipeMode] = useState<"horizontal" | "vertical">("horizontal");
  const headerRef = useRef<HTMLElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const themeFlash = useRef(false);
  usePressFeedback(headerRef, motionEnabled);
  useEffect(() => { setTheme(document.documentElement.dataset.portfolioTheme ?? "light"); }, []);
  useGSAP(() => {
    if (!themeFlash.current) return;
    themeFlash.current = false;
    if (!motionEnabled || !veilRef.current) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(veilRef.current, { opacity: 0 }, { opacity: 0.2, duration: 0.16, yoyo: true, repeat: 1, ease: "power1.inOut" });
    });
    return () => mm.revert();
  }, { dependencies: [theme, motionEnabled], revertOnUpdate: true });
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    themeFlash.current = true;
    document.documentElement.dataset.portfolioTheme = next;
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try { localStorage.setItem("ohaki-portfolio-theme", next); } catch { /* Session-only when storage is unavailable. */ }
  };
  const triggerWipe = (nextMode?: "horizontal" | "vertical") => {
    setWipeMode(prev => nextMode ?? (prev === "horizontal" ? "vertical" : "horizontal"));
    setWipeSeed(s => s + 1);
  };
  const navigate = (event: MouseEvent<HTMLAnchorElement>, mode: "horizontal" | "vertical") => {
    if (!motionEnabled || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.currentTarget.target === "_blank" || event.currentTarget.hasAttribute("download")) return;
    const destination = new URL(event.currentTarget.href);
    if (destination.origin !== window.location.origin || (destination.pathname === window.location.pathname && destination.hash === window.location.hash)) return;
    event.preventDefault();
    pendingHref.current = `${destination.pathname}${destination.search}${destination.hash}`;
    triggerWipe(mode);
  };
  return (
    <>
    <RefreshScrollTriggers />
    <div className="theme-veil" ref={veilRef} aria-hidden="true" />
    <PageWipeTransition motionEnabled={motionEnabled} wipeSeed={wipeSeed} mode={wipeMode} onComplete={() => {
      const href = pendingHref.current;
      pendingHref.current = null;
      if (href) router.push(href);
    }} />
    <GoldModeOverlay goldMode={goldMode} motionEnabled={motionEnabled} />
    <header className="p-topbar" ref={headerRef}>
      <Link className="p-wordmark" href="/" aria-label="Ohaki home">ohaki<span>Independent developer</span></Link>
      <nav aria-label="Portfolio navigation">
        <Link href="/" aria-current={current === "home" ? "page" : undefined} onClick={event => navigate(event, "horizontal")}>Index</Link>
        <Link href="/work" aria-current={current === "work" ? "page" : undefined} onClick={event => navigate(event, "horizontal")}>Work</Link>
        <Link href="/play" prefetch={false} onClick={event => navigate(event, "vertical")}>Playground</Link>
        <Link href="/#capabilities">Capabilities</Link>
        <Link href="/#about">About</Link>
        <a href="https://github.com/ohakidev" target="_blank" rel="noopener noreferrer">GitHub <ArrowUpRight size={14} aria-hidden="true" /></a>
      </nav>
      <div className="p-topbar-actions">
        {current !== "home" && <Button variant="ghost" className="p-btn p-theme" data-press aria-label="Animations" aria-pressed={motionEnabled} onClick={() => setMotionEnabled(!motionEnabled)}><span>Motion: {motionEnabled ? "on" : "reduced"}</span><Sparkle size={16} aria-hidden="true" /></Button>}
        <Button variant="ghost" className="p-btn p-theme" data-press onClick={() => triggerWipe()} data-testid="page-wipe-trigger" aria-label="Trigger curtain wipe transition">
          <ArrowsLeftRight size={16} aria-hidden="true" />
          <span>Wipe</span>
        </Button>
        <Button variant="ghost" className="p-btn p-theme dave-gold-btn" data-press onClick={() => setGoldMode(g => !g)} data-testid="gold-mode-btn" aria-pressed={goldMode} aria-label="Toggle Gold Mode">
          <Sparkle size={16} weight={goldMode ? "fill" : "regular"} aria-hidden="true" />
          <span>{goldMode ? "Gold: ON" : "Gold Mode"}</span>
        </Button>
      <Button variant="ghost" className="p-btn p-theme" data-press onClick={toggleTheme} data-testid="theme-toggle" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
        {theme === "dark" ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
        <span>{theme === "dark" ? "Midnight" : "Electric"}</span>
      </Button>
      </div>
    </header>
    </>
  );
}
