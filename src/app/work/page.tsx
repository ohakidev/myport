import type { Metadata } from "next";
import Link from "next/link";
import { PortfolioNav } from "@/components/portfolio-nav";
import { WorkHero } from "@/components/work-hero";
import { WorkStudies } from "@/components/work-studies";
import "./work.css";
import "../portfolio.css";

export const metadata: Metadata = {
  title: "Work | ohakidev",
  description: "Engineering case studies with commit-pinned public source.",
};

export default function WorkPage() {
  return (
    <div className="p-shell">
      <a className="p-skip" href="#work-content">Skip to case studies</a>
      <PortfolioNav current="work" />
      <main className="work-frame">
        <WorkHero />
        <WorkStudies />
      </main>
      <footer className="p-footer"><span>ohaki / Engineering in the open.</span><div><Link href="/">Return to index</Link><Link href="/play" prefetch={false}>Playground</Link></div></footer>
    </div>
  );
}
