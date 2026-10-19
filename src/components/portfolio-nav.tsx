"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Moon, Sun } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

export function PortfolioNav({ current }: { current: "home" | "work" | "play" }) {
  const [theme, setTheme] = useState("light");
  useEffect(() => { setTheme(document.documentElement.dataset.portfolioTheme ?? "light"); }, []);
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.portfolioTheme = next;
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try { localStorage.setItem("ohaki-portfolio-theme", next); } catch { /* Session-only when storage is unavailable. */ }
  };
  return (
    <header className="p-topbar">
      <Link className="p-wordmark" href="/" aria-label="Ohaki home">ohaki<span>Independent developer</span></Link>
      <nav aria-label="Portfolio navigation">
        <Link href="/" aria-current={current === "home" ? "page" : undefined}>Index</Link>
        <Link href="/work" aria-current={current === "work" ? "page" : undefined}>Work</Link>
        <Link href="/play" prefetch={false}>Playground</Link>
        <Link href="/#about">About</Link>
        <a href="https://github.com/ohakidev" target="_blank" rel="noopener noreferrer">GitHub <ArrowUpRight size={14} aria-hidden="true" /></a>
      </nav>
      <Button variant="ghost" className="p-btn p-theme" onClick={toggleTheme} data-testid="theme-toggle" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
        {theme === "dark" ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
        <span>{theme === "dark" ? "Midnight" : "Electric"}</span>
      </Button>
    </header>
  );
}
