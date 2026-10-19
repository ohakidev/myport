import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { PortfolioNav } from "@/components/portfolio-nav";
import { WorkStudies } from "@/components/work-studies";
import "./work.css";

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
        <header className="work-hero">
          <h1>BEHIND<br />THE BUILD.</h1>
          <p>Decisions, state transitions and trade-offs. Two projects, with the source beside the story.</p>
          <a className="p-link" href="https://github.com/ohakidev" target="_blank" rel="noopener noreferrer">GitHub profile <ArrowUpRight size={16} aria-hidden="true" /></a>
        </header>
        <WorkStudies />
        <section className="p-section work-boundaries" id="method">
          <h2>Evidence, with boundaries.</h2>
          <p>Source links point to exact historical commits, not a moving branch. Code shows implementation; it does not establish deployment, adoption or measured performance. The current implementation is distinguished from each pinned snapshot.</p>
        </section>
      </main>
      <footer className="p-footer"><span>ohaki / Engineering in the open.</span><div><Link href="/">Return to index</Link><Link href="/play" prefetch={false}>Playground</Link></div></footer>
    </div>
  );
}
