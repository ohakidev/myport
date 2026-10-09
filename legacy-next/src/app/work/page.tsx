import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { PortfolioNav } from "@/components/portfolio-nav";
import "./work.css";

export const metadata: Metadata = {
  title: "Work | ohakidev",
  description: "Engineering case studies with commit-pinned public source.",
};

const myport = "https://github.com/ohakidev/myport";
const activity = "https://github.com/ohakidev/stdactivitycheckV2";
const profile = "https://github.com/ohakidev";
const myportCommit = "094abbe3d5e2759281ee8c37d2c7bff21c5cd4df";
const activityCommit = "115d44772fd392d5f7a4600fc0ab4ccd5dfb4ea7";
const myportSource = `${myport}/blob/${myportCommit}`;
const activitySource = `${activity}/blob/${activityCommit}`;

function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="work-source-link" href={href} target="_blank" rel="noreferrer noopener">
      {children}
      <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
    </a>
  );
}

function StoryPoint({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="work-story-point">
      <h4>{title}</h4>
      <p>{children}</p>
    </div>
  );
}

function MyportDiagram() {
  return (
    <figure className="work-diagram" aria-labelledby="myport-diagram-caption">
      <ol className="work-flow work-flow--portfolio">
        <li>
          <span>Home · /</span>
          <strong>PortfolioHome</strong>
          <code>src/app/page.tsx → PortfolioHome</code>
          <p>Server route loads the profile and repositories with <code>getGitHubPortfolio</code>.</p>
        </li>
        <li>
          <span>Work · /work</span>
          <strong>Source-linked cases</strong>
          <code>src/app/work/page.tsx</code>
          <p>A direct reading route, separate from the Three.js scene.</p>
        </li>
        <li>
          <span>Playground · /play</span>
          <strong>Journey to GameWorld</strong>
          <code>src/app/play/page.tsx → Journey</code>
          <p>Server route loads portfolio data before the Three.js experience.</p>
        </li>
      </ol>
      <figcaption id="myport-diagram-caption">
        Route map in this implementation. The pinned public commit below predates this split: <code>src/app/page.tsx</code> rendered <code>Journey</code> directly at <code>/</code>.
      </figcaption>
    </figure>
  );
}

function ActivityDiagram() {
  return (
    <figure className="work-diagram" aria-labelledby="activity-diagram-caption">
      <ol className="work-flow work-flow--activity">
        <li>
          <span>01 / Publish</span>
          <strong>CreateForm → PublishForm</strong>
          <code>ActivityAction.tsx</code>
          <p>Organizer sets the activity and registration windows.</p>
        </li>
        <li>
          <span>02 / Submit</span>
          <strong>SubmitForm</strong>
          <code>Formsubs + activitiesParticipated</code>
          <p>Response, submission count and booking are saved separately.</p>
        </li>
        <li>
          <span>03 / Check in</span>
          <strong>joinActivity</strong>
          <code>booked → registered</code>
          <p>Requires a booking, open registration window and location within 100 metres.</p>
        </li>
      </ol>
      <figcaption id="activity-diagram-caption">
        The workflow keeps a submitted response, a reservation and on-site registration as distinct states.
      </figcaption>
    </figure>
  );
}

export default function WorkPage() {
  return (
    <main className="work-route">
      <a className="work-skip-link" href="#work-content">Skip to case studies</a>
      <div className="work-shell">
        <PortfolioNav current="work" />

        <header className="work-hero" aria-labelledby="work-title">
          <div className="work-hero__copy">
            <p className="work-kicker">Engineering case studies</p>
            <h1 id="work-title">Engineering, with evidence.</h1>
            <p className="work-hero__lede">
              Two source-backed cases: the architectural decisions, workflow mechanics and trade-offs beside the code.
            </p>
            <div className="work-hero__actions">
              <a className="work-button work-button--primary" href="#myport">
                Read the cases <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </a>
              <SourceLink href={profile}>GitHub profile</SourceLink>
            </div>
          </div>
          <aside className="work-proof" aria-label="Evidence scope">
            <p className="work-proof__title">Evidence scope</p>
            <dl>
              <div><dt>Source</dt><dd>Commit-pinned GitHub snapshots</dd></div>
              <div><dt>Projects</dt><dd>myport, stdactivitycheckV2</dd></div>
              <div><dt>Focus</dt><dd>Routes, state and trust boundaries</dd></div>
            </dl>
          </aside>
        </header>

        <nav className="work-index" aria-label="Case studies">
          <span>On this page</span>
          <a href="#myport">Portfolio system <ArrowRight size={14} aria-hidden="true" /></a>
          <a href="#activity">Activity workflow <ArrowRight size={14} aria-hidden="true" /></a>
          <a href="#method">Source boundaries <ArrowRight size={14} aria-hidden="true" /></a>
        </nav>

        <div id="work-content">
          <section id="myport" className="work-case-study" aria-labelledby="myport-title">
            <div className="work-case-study__heading">
              <p className="work-label">Portfolio platform / Next.js / Three.js</p>
              <h2 id="myport-title">Make the 3D world a choice, not the front door.</h2>
              <p>
                In this working iteration, source-linked reading is separate from the Three.js Journey, while GitHub projects remain in the portfolio.
              </p>
            </div>

            <div className="work-case-study__layout">
              <div className="work-case-study__evidence">
                <MyportDiagram />
                <div className="work-source-row">
                  <span>Pinned source · 094abbe</span>
                  <SourceLink href={`${myport}/commit/${myportCommit}`}>Pinned commit</SourceLink>
                  <SourceLink href={`${myportSource}/src/lib/github.ts#L141`}>GitHub data</SourceLink>
                  <SourceLink href={`${myportSource}/src/app/page.tsx#L4`}>Earlier root route</SourceLink>
                  <SourceLink href={`${myportSource}/src/components/journey.tsx#L14`}>Journey state</SourceLink>
                  <SourceLink href={`${myportSource}/src/components/journey/world.tsx#L572`}>GameWorld</SourceLink>
                  <SourceLink href={`${myportSource}/src/components/journey/project-panel.tsx#L51`}>Project detail</SourceLink>
                </div>
              </div>
              <div className="work-case-study__story">
                <p className="work-label">Engineering decision</p>
                <h3>Keep the reading path independent of WebGL.</h3>
                <div className="work-story-points">
                  <StoryPoint title="Decision">
                    Make the scene a destination, not a prerequisite for seeing the projects. Home and Work stay readable pages; the immersive route is opt-in at <code>/play</code>.
                  </StoryPoint>
                  <StoryPoint title="Implementation">
                    In the pinned snapshot, the root server route fetched GitHub data into <code>Journey</code>. <code>Journey</code> owned selection state, <code>GameWorld</code> rendered the Three.js scene, and <code>ProjectPanel</code> showed details in a DOM dialog or mobile sheet. The current route map above moves that journey to <code>/play</code>.
                  </StoryPoint>
                  <StoryPoint title="Trade-off">
                    The immersive path gains a separate entry point; Home and Work do not depend on the WebGL renderer to make project information available.
                  </StoryPoint>
                </div>
              </div>
            </div>
          </section>

          <section id="activity" className="work-case-study" aria-labelledby="activity-title">
            <div className="work-case-study__heading">
              <p className="work-label">Student activity system / Next.js / MongoDB</p>
              <h2 id="activity-title">Separate response, reservation and arrival.</h2>
              <p>
                The workflow moves from organizer publishing through student booking to on-site registration.
              </p>
            </div>

            <div className="work-case-study__layout">
              <div className="work-case-study__evidence work-case-study__evidence--activity">
                <ActivityDiagram />
                <div className="work-source-row">
                  <span>Pinned source · 115d447</span>
                  <SourceLink href={`${activity}/commit/${activityCommit}`}>Pinned commit</SourceLink>
                  <SourceLink href={`${activitySource}/actions/ActivityAction.tsx#L203`}>PublishForm gate</SourceLink>
                  <SourceLink href={`${activitySource}/actions/ActivityAction.tsx#L53`}>Admin-role guard</SourceLink>
                  <SourceLink href={`${activitySource}/actions/ActivityAction.tsx#L287`}>Submit flow</SourceLink>
                  <SourceLink href={`${activitySource}/actions/ActivityAction.tsx#L458`}>Check-in gate</SourceLink>
                  <SourceLink href={`${activitySource}/actions/mapActions.js#L86`}>Location query</SourceLink>
                  <SourceLink href={`${activitySource}/models/ActivityForm.js`}>Activity model</SourceLink>
                  <SourceLink href={`${activitySource}/README.md#L3`}>README · context</SourceLink>
                </div>
              </div>
              <div className="work-case-study__story">
                <p className="work-label">Workflow decision</p>
                <h3>A response is not a booking, and a booking is not attendance.</h3>
                <div className="work-story-points">
                  <StoryPoint title="Decision">
                    Keep form submission, reservation and on-site registration separate so each step has an explicit state.
                  </StoryPoint>
                  <StoryPoint title="Implementation">
                    <code>SubmitForm</code> saves a response and increments the submission count; when no participation exists, it also records a booked place. <code>joinActivity</code> requires that booking, an open registration window and a location within 100 metres before marking the participant registered.
                  </StoryPoint>
                  <StoryPoint title="Trust boundary">
                    The distance check uses coordinates supplied to <code>joinActivity</code>, so it tests reported proximity, not physical presence. <code>SubmitForm</code> saves the response, count and booking in sequential writes without one transaction, so a failure part-way can leave partial state. <code>PublishForm</code> checks for a session but does not invoke <code>checkAdminPermission</code>, which other actions use for the admin-role check. These are source-review observations, not reported incidents.
                  </StoryPoint>
                </div>
              </div>
            </div>
          </section>

          <section id="method" className="work-evidence-note" aria-labelledby="method-title">
            <p className="work-label">Source boundaries</p>
            <h2 id="method-title">Code paths tell you how it works.</h2>
            <p>
              Links point to exact commit snapshots rather than a moving branch. The activity README describes a university-use system but does not document individual authorship. Source code is not proof of deployment, adoption or measured performance.
            </p>
          </section>
        </div>

        <footer className="work-footer">
          <span>Home / Work / Playground</span>
          <div>
            <SourceLink href={profile}>GitHub profile</SourceLink>
            <Link href="/"><ArrowLeft size={15} weight="bold" aria-hidden="true" /> Return home</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}
