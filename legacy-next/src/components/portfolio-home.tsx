"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle,
  Code,
  Cube,
  GithubLogo,
  ShieldCheck,
} from "@phosphor-icons/react";
import type { GitHubPortfolio, Project } from "@/lib/github";
import { PortfolioNav } from "@/components/portfolio-nav";

type SpotlightKey = "myport" | "activity";

type ArchitectureNode = {
  kind: string;
  title: string;
  detail: string;
  note: string;
};

type SpotlightDefinition = {
  key: SpotlightKey;
  match: string;
  tabLabel: string;
  tabDetail: string;
  title: string;
  summary: string;
  fallbackUrl: string;
  fallbackHomepage: string | null;
  sourcePaths: string[];
  nodes: ArchitectureNode[];
};

const spotlightDefinitions: Record<SpotlightKey, SpotlightDefinition> = {
  myport: {
    key: "myport",
    match: "myport",
    tabLabel: "Rooftop atelier",
    tabDetail: "myport repository",
    title: "A portfolio you can explore.",
    summary:
      "A Three.js portfolio world turns GitHub project data into a guided exploration, with /work for a direct read.",
    fallbackUrl: "https://github.com/ohakidev/myport",
    fallbackHomepage: null,
    sourcePaths: [
      "src/lib/github.ts",
      "src/components/portfolio-home.tsx",
      "src/app/work/page.tsx",
      "src/components/journey/world.tsx",
    ],
    nodes: [
      {
        kind: "Public source",
        title: "GitHubPortfolio",
        detail: "src/lib/github.ts",
        note: "Profile, repositories and links",
      },
      {
        kind: "Homepage",
        title: "PortfolioHome",
        detail: "src/components/portfolio-home.tsx",
        note: "A direct first read",
      },
      {
        kind: "Case studies",
        title: "/work",
        detail: "src/app/work/page.tsx",
        note: "Decisions and implementation paths",
      },
      {
        kind: "Playground",
        title: "Journey",
        detail: "src/components/journey.tsx",
        note: "The full interactive world at /play",
      },
    ],
  },
  activity: {
    key: "activity",
    match: "stdactivitycheckV2",
    tabLabel: "Student activity system",
    tabDetail: "stdactivitycheckV2 repository",
    title: "From signup to check-in.",
    summary:
      "A university activity system separates form creation, booking and on-site registration so students and organizers can see what happens next.",
    fallbackUrl: "https://github.com/ohakidev/stdactivitycheckV2",
    fallbackHomepage: "https://stdactivitycheck-v2.vercel.app",
    sourcePaths: ["actions/ActivityAction.tsx", "CreateForm", "SubmitForm", "joinActivity"],
    nodes: [
      {
        kind: "Setup",
        title: "CreateForm",
        detail: "form content + schedule",
        note: "Create and publish an activity",
      },
      {
        kind: "Intake",
        title: "SubmitForm",
        detail: "submission + booking",
        note: "Stores the first participation state",
      },
      {
        kind: "Guard",
        title: "joinActivity",
        detail: "booking + window + location",
        note: "Checks the next action before writing",
      },
      {
        kind: "Next state",
        title: "registered",
        detail: "participation state",
        note: "Makes the outcome explicit",
      },
    ],
  },
};

function projectMatches(name: string, target: string) {
  return name.toLowerCase() === target.toLowerCase();
}

function resolveHomepageUrl(
  project: Project | undefined,
  isLive: boolean,
  fallbackHomepage: string | null,
) {
  if (project) return project.homepage;
  return isLive ? null : fallbackHomepage;
}

function ProjectSwitcher({
  activeKey,
  onChange,
  compact = false,
  className = "",
}: {
  activeKey: SpotlightKey;
  onChange: (key: SpotlightKey) => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={`portfolio-home__project-switcher ${className}${compact ? " portfolio-home__project-switcher--compact" : ""}`} role="group" aria-label="Select a project">
      {(Object.values(spotlightDefinitions) as SpotlightDefinition[]).map((item) => (
        <button
          key={item.key}
          className="portfolio-home__project-tab"
          type="button"
          aria-pressed={activeKey === item.key}
          onClick={() => onChange(item.key)}
        >
          <span>{item.tabLabel}</span>
          <small>{item.tabDetail}</small>
        </button>
      ))}
    </div>
  );
}


function ArchitecturePreview({
  definition,
  repositoryUrl,
}: {
  definition: SpotlightDefinition;
  repositoryUrl: string;
}) {
  const [sourcePath, routePath, ...branchPaths] = definition.nodes;

  return (
    <figure className="portfolio-architecture" aria-labelledby={`architecture-${definition.key}`}>
      <div className="portfolio-architecture__header">
        <div>
          <span className="portfolio-architecture__label">Architecture preview</span>
          <figcaption id={`architecture-${definition.key}`}>What the code hands off next</figcaption>
        </div>
        <Code size={19} weight="bold" aria-hidden="true" />
      </div>

      {definition.key === "activity" ? (
        <ol className="portfolio-architecture__sequence">
          {definition.nodes.map((node, index) => <li key={node.title}><span className="portfolio-architecture__step" aria-hidden="true">{index + 1}</span><ArchitectureNodeCard node={node} emphasis={index === 0} /></li>)}
        </ol>
      ) : <>
      <div className="portfolio-architecture__flow">
        <ArchitectureNodeCard node={sourcePath} emphasis />
        <div className="portfolio-architecture__connector" aria-hidden="true">
          <ArrowRight size={17} weight="bold" />
          <span>feeds</span>
        </div>
        <ArchitectureNodeCard node={routePath} />
      </div>

      <div className="portfolio-architecture__drop" aria-hidden="true">
        <span>opens into</span>
        <ArrowRight size={17} weight="bold" />
      </div>

      <div className="portfolio-architecture__branches">
        {branchPaths.map((node) => (
          <ArchitectureNodeCard key={`${definition.key}-${node.title}`} node={node} />
        ))}
      </div>
      </>}

      <div className="portfolio-architecture__footer">
        <span>Use the repository for the full context.</span>
        <a href={repositoryUrl} target="_blank" rel="noreferrer noopener">
          Open source
          <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
        </a>
      </div>
    </figure>
  );
}

function ArchitectureNodeCard({ node, emphasis = false }: { node: ArchitectureNode; emphasis?: boolean }) {
  return (
    <div className={`portfolio-architecture__node${emphasis ? " portfolio-architecture__node--emphasis" : ""}`}>
      <span className="portfolio-architecture__node-kind">{node.kind}</span>
      <strong>{node.title}</strong>
      <code>{node.detail}</code>
      <small>{node.note}</small>
    </div>
  );
}

export function PortfolioHome({ portfolio }: { portfolio: GitHubPortfolio }) {
  const [activeKey, setActiveKey] = useState<SpotlightKey>("myport");
  const active = spotlightDefinitions[activeKey];
  const project = portfolio.projects.find((item) => projectMatches(item.name, active.match));
  const repositoryUrl = project?.url ?? active.fallbackUrl;
  const homepageUrl = resolveHomepageUrl(project, portfolio.isLive, active.fallbackHomepage);
  const projectName = project?.name ?? active.match;
  const language = project?.language ?? "TypeScript";
  const projectDescription = active.summary;
  const sourceState = portfolio.isLive ? "Public GitHub data" : "Showing saved GitHub data";

  return (
    <main className="portfolio-home">
      <div className="portfolio-home__shell">
        <a className="portfolio-home__skip-link" href="#portfolio-content">
          Skip to selected work
        </a>

        <PortfolioNav current="home" />

        <section className="portfolio-home__hero" aria-labelledby="portfolio-title">
          <div className="portfolio-home__hero-copy">
            <p className="portfolio-home__kicker">
              Ohaki / Web developer
            </p>
            <h1 id="portfolio-title">
              <span>People first.</span>
              <span>Systems follow.</span>
            </h1>
            <p className="portfolio-home__hero-lede">
              I design clear digital experiences and engineer the systems that make them work.
            </p>
            <div className="portfolio-home__hero-actions">
              <a className="portfolio-home__button portfolio-home__button--primary" href="#spotlight">
                Explore selected work
                <ArrowRight size={17} weight="bold" aria-hidden="true" />
              </a>
              <Link className="portfolio-home__button portfolio-home__button--secondary" href="/play" prefetch={false}>
                Try the playground
                <Cube size={17} weight="bold" aria-hidden="true" />
              </Link>
            </div>
            <div className="portfolio-home__hero-state" role="status">
              <CheckCircle size={17} weight="fill" aria-hidden="true" />
              <span>{sourceState}</span>
              <a href={portfolio.profileUrl} target="_blank" rel="noreferrer noopener">
                @{portfolio.login}
                <ArrowUpRight size={14} weight="bold" aria-hidden="true" />
              </a>
            </div>
          </div>

          <figure className="portfolio-art">
            <Link href="/play" prefetch={false} className="portfolio-art__link" aria-label="Explore the interactive rooftop playground">
              <Image src="/images/rooftop-illustration.webp" alt="Editorial illustration of a rooftop maker’s atelier with a glass greenhouse, winding path and blue cube." width={1200} height={800} priority sizes="(max-width: 767px) 100vw, 50vw" />
              <span className="portfolio-art__action"><Cube size={19} aria-hidden="true" /> Explore the 3D playground <ArrowUpRight size={18} aria-hidden="true" /></span>
            </Link>
            <figcaption>A playful side of my work. Concept illustration; the interactive world has its own visual style.</figcaption>
          </figure>
        </section>

        <div id="portfolio-content">
          <section id="spotlight" className="portfolio-home__section portfolio-home__spotlight-section" aria-labelledby="spotlight-title">
            <div className="portfolio-home__section-heading">
              <div>
                <h2 id="spotlight-title">Selected work, with the systems behind it.</h2>
                <p>Two different products. Read the case studies or trace each decision back to public source.</p>
              </div>
              <Link className="portfolio-home__text-link" href="/work">
                Read both case studies
                <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
              </Link>
            </div>

            <div className="portfolio-home__spotlight">
              <ProjectSwitcher
                activeKey={activeKey}
                onChange={setActiveKey}
                className="portfolio-home__spotlight-switcher"
              />

              <div className="portfolio-home__spotlight-panel" aria-live="polite">
                <div className="portfolio-home__spotlight-copy">
                  <div className="portfolio-home__project-heading">
                    <span className="portfolio-home__project-icon" aria-hidden="true">
                      {activeKey === "myport" ? <Cube size={21} weight="duotone" /> : <ShieldCheck size={21} weight="duotone" />}
                    </span>
                    <span>{active.tabLabel}</span>
                  </div>
                  <h3>{active.title}</h3>
                  <p>{projectDescription}</p>

                  <dl className="portfolio-home__project-facts">
                    <div>
                      <dt>Repository</dt>
                      <dd>{projectName}</dd>
                    </div>
                    <div>
                      <dt>Language</dt>
                      <dd>{language}</dd>
                    </div>
                  </dl>

                  <div className="portfolio-home__spotlight-actions">
                    <a className="portfolio-home__button portfolio-home__button--dark" href={repositoryUrl} target="_blank" rel="noreferrer noopener">
                      Open source
                      <GithubLogo size={17} weight="bold" aria-hidden="true" />
                    </a>
                    {homepageUrl && (
                      <a className="portfolio-home__text-link" href={homepageUrl} target="_blank" rel="noreferrer noopener">
                        Open live site
                        <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
                      </a>
                    )}
                  </div>

                  <div className="portfolio-home__source-paths">
                    <span>Useful paths</span>
                    <div>
                      {active.sourcePaths.map((path) => <code key={path}>{path}</code>)}
                    </div>
                  </div>
                </div>

                <ArchitecturePreview definition={active} repositoryUrl={repositoryUrl} />
              </div>
            </div>
          </section>

          <section id="about" className="portfolio-home__section portfolio-home__about-section" aria-labelledby="about-title">
            <div className="portfolio-home__about-copy">
              <p className="portfolio-home__kicker portfolio-home__kicker--quiet">
                About
              </p>
              <h2 id="about-title">Interaction and implementation belong together.</h2>
              <p>
                I build at the boundary between what a person sees and what the system needs to do next. These projects show that range, from spatial interaction to everyday workflows.
              </p>
              <a className="portfolio-home__button portfolio-home__button--primary" href={portfolio.profileUrl} target="_blank" rel="noreferrer noopener">
                Open @{portfolio.login}
                <GithubLogo size={17} weight="bold" aria-hidden="true" />
              </a>
            </div>

              <div className="portfolio-home__about-facts">
                <div className="portfolio-home__about-fact">
                <span>Focus</span>
                <strong>Interactive frontends</strong>
                <small>Next.js, React, TypeScript and Three.js across the selected builds.</small>
              </div>
              <div className="portfolio-home__about-fact">
                <span>Focus</span>
                <strong>Workflow systems</strong>
                <small>Form intake, booking and registration states in stdactivitycheckV2.</small>
              </div>
              <div className="portfolio-home__about-fact">
                <span>Profile</span>
                <strong>{portfolio.name}</strong>
                <small>@{portfolio.login} on GitHub. Explore the repositories and their development history.</small>
              </div>
            </div>
          </section>
        </div>

        <footer className="portfolio-home__footer">
          <span>ohaki / public source</span>
          <div>
            <Link href="/work">Work</Link>
            <Link href="/play" prefetch={false}>Playground</Link>
            <a href={portfolio.profileUrl} target="_blank" rel="noreferrer noopener">GitHub</a>
          </div>
        </footer>
      </div>
    </main>
  );
}
