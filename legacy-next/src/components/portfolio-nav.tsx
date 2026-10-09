"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, CircleHalf } from "@phosphor-icons/react";

export function PortfolioNav({ current }: { current: "home" | "work" }) {
  const [theme, setTheme] = useState("system");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ohaki-portfolio-theme");
      if (saved === "light" || saved === "dark") {
        document.documentElement.dataset.portfolioTheme = saved;
        setTheme(saved);
      }
    } catch { /* Theme remains usable when browser storage is blocked. */ }
  }, []);
  const toggleTheme = () => {
    const dark = theme === "system" ? matchMedia("(prefers-color-scheme: dark)").matches : theme === "dark";
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.portfolioTheme = next;
    setTheme(next);
    try { localStorage.setItem("ohaki-portfolio-theme", next); } catch { /* Session-only preference. */ }
  };
  return (
    <header className="portfolio-nav">
      <Link className="portfolio-wordmark" href="/" aria-label="Ohaki home">ohaki<span>/ developer</span></Link>
      <nav aria-label="Portfolio navigation">
        <Link href="/work" aria-current={current === "work" ? "page" : undefined}>Work</Link>
        <Link href="/play" prefetch={false}>Playground</Link>
        <Link href="/#about">About</Link>
        <a href="https://github.com/ohakidev" target="_blank" rel="noopener noreferrer">GitHub <ArrowUpRight size={15} aria-hidden="true" /></a>
        <button className="portfolio-theme-toggle" type="button" onClick={toggleTheme} aria-label={`Change color theme (current: ${theme})`} title="Change color theme"><CircleHalf size={20} aria-hidden="true" /></button>
      </nav>
    </header>
  );
}
