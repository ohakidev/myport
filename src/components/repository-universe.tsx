"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { GitHubPortfolio, Project } from "@/lib/github";

const languageColors: Record<string, string> = {
  TypeScript: "#58a6ff",
  JavaScript: "#f1e05a",
  Python: "#3fb950",
  HTML: "#e34c26",
  CSS: "#c6538c",
  Shell: "#89e051",
  MDX: "#fcb32c",
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function formatYear(date: string) {
  return new Intl.DateTimeFormat("en", { year: "numeric" }).format(new Date(date));
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.69c-2.78.61-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.55 9.55 0 0 1 12 7.68a9.5 9.5 0 0 1 2.5.34c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.86v1.9c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  );
}

function ThreeWorld({
  projects,
  selected,
  onSelect,
  exploded,
}: {
  projects: Project[];
  selected: string | null;
  onSelect: (project: Project) => void;
  exploded: boolean;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  const explodedRef = useRef(exploded);
  const selectedRef = useRef(selected);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    explodedRef.current = exploded;
  }, [exploded]);
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05070f, 0.055);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 1.2, 12);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.touchAction = "pan-y";
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0x9cc7ff, 0x110d18, 1.9));
    const key = new THREE.PointLight(0x58a6ff, 45, 30);
    key.position.set(4, 5, 6);
    scene.add(key);
    const rim = new THREE.PointLight(0xff7a59, 32, 24);
    rim.position.set(-5, -1, 3);
    scene.add(rim);

    const root = new THREE.Group();
    root.name = "repository-universe";
    root.userData.sculptRuntime = {
      clickable: true,
      explodable: true,
      source: "GitHub public repositories",
    };
    scene.add(root);

    const coreMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x141b2d,
      emissive: 0x10264a,
      emissiveIntensity: 1.4,
      metalness: 0.7,
      roughness: 0.24,
      clearcoat: 0.9,
    });
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.18, 2),
      coreMaterial,
    );
    core.name = "backend-core";
    root.add(core);

    const wire = new THREE.LineSegments(
      new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.42, 2)),
      new THREE.LineBasicMaterial({
        color: 0x58a6ff,
        transparent: true,
        opacity: 0.35,
      }),
    );
    wire.name = "architecture-boundary";
    root.add(wire);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.05, 0.025, 8, 100),
      new THREE.MeshBasicMaterial({
        color: 0x7d8ca4,
        transparent: true,
        opacity: 0.26,
      }),
    );
    ring.rotation.x = Math.PI * 0.43;
    ring.rotation.y = Math.PI * 0.1;
    root.add(ring);

    const nodes: THREE.Mesh[] = [];
    const links: THREE.Line[] = [];
    projects.forEach((project, index) => {
      const angle = index * 2.399;
      const radius = 3.1 + (index % 3) * 0.55;
      const origin = new THREE.Vector3(
        Math.cos(angle) * radius,
        (index - (projects.length - 1) / 2) * 0.52,
        Math.sin(angle) * radius * 0.72,
      );
      const color = new THREE.Color(
        languageColors[project.language ?? ""] ?? "#a78bfa",
      );
      const node = new THREE.Mesh(
        index === 0
          ? new THREE.OctahedronGeometry(0.42, 0)
          : new THREE.DodecahedronGeometry(0.26 + Math.min(project.stars, 10) * 0.012, 0),
        new THREE.MeshPhysicalMaterial({
          color,
          emissive: color,
          emissiveIntensity: 0.28,
          roughness: 0.28,
          metalness: 0.42,
          clearcoat: 0.7,
        }),
      );
      node.name = project.name;
      node.position.copy(origin);
      node.userData = { project, origin, explodeWithParent: false };
      root.add(node);
      nodes.push(node);

      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        origin,
      ]);
      const link = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: index === 0 ? 0.5 : 0.16,
        }),
      );
      link.userData.node = node;
      root.add(link);
      links.push(link);
    });

    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(900);
    let seed = 17;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < starPositions.length; i += 3) {
      starPositions[i] = (random() - 0.5) * 30;
      starPositions[i + 1] = (random() - 0.5) * 22;
      starPositions[i + 2] = (random() - 0.5) * 22;
    }
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        color: 0x6d7f99,
        size: 0.018,
        transparent: true,
        opacity: 0.72,
      }),
    );
    scene.add(stars);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(3, 3);
    const targetPointer = new THREE.Vector2();
    let hovered: THREE.Mesh | null = null;
    let frame = 0;

    const updatePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      targetPointer.copy(pointer);
    };
    const click = () => {
      if (hovered) onSelectRef.current(hovered.userData.project as Project);
    };
    renderer.domElement.addEventListener("pointermove", updatePointer);
    renderer.domElement.addEventListener("click", click);

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    const clock = new THREE.Clock();
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      const pageHeight = Math.max(document.documentElement.scrollHeight - innerHeight, 1);
      const scroll = scrollY / pageHeight;

      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(nodes, false)[0]?.object as
        | THREE.Mesh
        | undefined;
      if (hovered !== hit) {
        hovered = hit ?? null;
        renderer.domElement.style.cursor = hovered ? "pointer" : "grab";
      }

      const explode = explodedRef.current ? 1.62 : 1;
      nodes.forEach((node, index) => {
        const origin = node.userData.origin as THREE.Vector3;
        const desired = origin.clone().multiplyScalar(explode);
        node.position.lerp(desired, reduceMotion ? 1 : 0.055);
        const active = selectedRef.current === node.name;
        const over = hovered === node;
        const scale = active ? 1.65 : over ? 1.32 : 1;
        node.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.13);
        if (!reduceMotion) {
          node.rotation.x = time * (0.16 + index * 0.005);
          node.rotation.y = time * (0.22 + index * 0.007);
        }
        const points = [
          new THREE.Vector3(),
          node.position.clone(),
        ];
        links[index].geometry.setFromPoints(points);
      });

      if (!reduceMotion) {
        core.rotation.y = time * 0.12;
        core.rotation.x = Math.sin(time * 0.22) * 0.15;
        wire.rotation.y = -time * 0.09;
        ring.rotation.z = time * 0.055;
        root.rotation.y += (scroll * Math.PI * 1.45 - root.rotation.y) * 0.025;
        root.position.y += ((0.5 - scroll) * 1.3 - root.position.y) * 0.025;
        camera.position.x += (targetPointer.x * 0.72 - camera.position.x) * 0.02;
        camera.position.y +=
          (1.2 + targetPointer.y * 0.35 - camera.position.y) * 0.02;
      }
      camera.lookAt(0, root.position.y * 0.3, 0);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointermove", updatePointer);
      renderer.domElement.removeEventListener("click", click);
      root.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          object.geometry.dispose();
          const material = object.material;
          if (Array.isArray(material)) material.forEach((item) => item.dispose());
          else material.dispose();
        }
      });
      starGeometry.dispose();
      (stars.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [projects]);

  return <div className="three-world" ref={mountRef} />;
}

export function RepositoryUniverse({
  portfolio,
}: {
  portfolio: GitHubPortfolio;
}) {
  const [selected, setSelected] = useState<Project | null>(
    portfolio.projects[0] ?? null,
  );
  const [exploded, setExploded] = useState(false);
  const featured = useMemo(() => portfolio.projects.slice(0, 6), [portfolio.projects]);
  const timeline = useMemo(
    () => [...portfolio.projects].sort((a, b) => Date.parse(a.pushedAt) - Date.parse(b.pushedAt)),
    [portfolio.projects],
  );
  const languages = useMemo(
    () =>
      Array.from(
        new Set(
          portfolio.projects
            .map((project) => project.language)
            .filter((language): language is string => Boolean(language)),
        ),
      ),
    [portfolio.projects],
  );

  return (
    <main>
      <a className="skip-link" href="#work">
        Skip to selected work
      </a>

      <header className="topbar">
        <a className="wordmark" href="#top" aria-label="ohakidev, back to top">
          <span className="wordmark-mark" aria-hidden="true">
            L/
          </span>
            ohakidev
        </a>
        <div className="topbar-meta">
          <span className={portfolio.isLive ? "live-dot" : "live-dot cached"} />
          {portfolio.isLive ? "GitHub data live" : "GitHub data cached"}
        </div>
        <a
          className="icon-link"
          href={portfolio.profileUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="Open GitHub profile"
        >
          <GitHubIcon />
        </a>
      </header>

      <ThreeWorld
        projects={portfolio.projects}
        selected={selected?.name ?? null}
        onSelect={setSelected}
        exploded={exploded}
      />

      <button
        className="explode-control"
        type="button"
        aria-pressed={exploded}
        onClick={() => setExploded((value) => !value)}
      >
        <span aria-hidden="true">{exploded ? "×" : "+"}</span>
        {exploded ? "Reassemble universe" : "Explode repository map"}
      </button>

      <div className="story">
        <section className="chapter hero" id="top" aria-labelledby="hero-title">
          <div className="chapter-index">00 / SYSTEMS IN MOTION</div>
          <div className="hero-copy">
          <p className="eyebrow">{portfolio.bio} · Research · Experiments · Tools</p>
            <h1 id="hero-title">
              I turn complex
              <span> systems into motion.</span>
            </h1>
            <p className="lede">
              The public work of <strong>@{portfolio.login}</strong>, mapped as an
              interactive universe. Scroll to travel through the systems; select a
              node to inspect its source.
            </p>
            <div className="hero-actions">
              <a className="primary-action" href="#work">
                Enter the repository field <ArrowIcon />
              </a>
              <a
                className="text-action"
                href={portfolio.profileUrl}
                target="_blank"
                rel="noreferrer"
              >
                View GitHub
              </a>
            </div>
          </div>
          <div className="hero-stats" aria-label="GitHub profile statistics">
            <div>
              <strong>{portfolio.publicRepos}</strong>
              <span>public repos</span>
            </div>
            <div>
              <strong>{portfolio.followers}</strong>
              <span>followers</span>
            </div>
            <div>
              <strong>{languages.length}</strong>
              <span>active languages</span>
            </div>
          </div>
          <p className="scroll-note">
            <span aria-hidden="true" /> Scroll to traverse
          </p>
        </section>

        <section className="chapter manifesto" id="approach" aria-labelledby="approach-title">
          <div className="chapter-index">01 / ARCHITECTURE</div>
          <div className="manifesto-copy">
            <p className="eyebrow">A research-first point of view</p>
            <h2 id="approach-title">
              The interface is only the visible edge of the system.
            </h2>
            <p>
              The repository graph reveals a recurring practice: typed boundaries,
              distributed workloads, authentication, databases, APIs, and developer
              tools. The 3D core represents that invisible infrastructure -—the work
              that keeps products reliable after the first click.
            </p>
          </div>
          <div className="signal-list" aria-label="Technical focus">
            {["Backend systems", "Cloud workloads", "Developer tooling", "Full-stack delivery"].map(
              (item, index) => (
                <div key={item}>
                  <span>0{index + 1}</span>
                  {item}
                </div>
              ),
            )}
          </div>
        </section>

        <section className="chapter timeline" id="timeline" aria-labelledby="timeline-title">
          <div className="chapter-index">02 / THE TIMELINE</div>
          <div className="timeline-heading">
            <div>
              <p className="eyebrow">A chronology of experiments</p>
              <h2 id="timeline-title">Follow the work as it evolves.</h2>
            </div>
            <p>
              Scroll is the time axis. Each node is a public commit trail: from early
              web experiments to products, tools, and live experiments.
            </p>
          </div>
          <div className="timeline-rail" role="list" aria-label="Repository timeline">
            <div className="timeline-line" aria-hidden="true" />
            {timeline.map((project, index) => (
              <button
                key={project.name}
                type="button"
                role="listitem"
                className={selected?.name === project.name ? "timeline-event active" : "timeline-event"}
                onClick={() => {
                  setSelected(project);
                  document.getElementById("work")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
              >
                <span className="timeline-dot" aria-hidden="true" />
                <span className="timeline-year">{formatYear(project.pushedAt)}</span>
                <span className="timeline-card">
                  <strong>{project.name}</strong>
                  <small>{project.description}</small>
                  <em>{project.language ?? "Mixed stack"} · {formatDate(project.pushedAt)}</em>
                </span>
                <span className="timeline-step">0{index + 1}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="chapter work" id="work" aria-labelledby="work-title">
          <div className="chapter-index">03 / SELECTED REPOSITORIES</div>
          <div className="work-heading">
            <div>
              <p className="eyebrow">Pulled from GitHub</p>
              <h2 id="work-title">Systems worth opening.</h2>
            </div>
            <p>
              These are public repositories, ranked by community signal and recency.
              Hover the 3D field or use the accessible list below.
            </p>
          </div>

          <div className="project-layout">
            <div className="project-list" role="list">
              {featured.map((project, index) => (
                <button
                  key={project.name}
                  type="button"
                  className={selected?.name === project.name ? "project-row active" : "project-row"}
                  onClick={() => setSelected(project)}
                  role="listitem"
                >
                  <span className="project-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="project-name">{project.name}</span>
                  <span className="project-language">
                    <i
                      style={{
                        background:
                          languageColors[project.language ?? ""] ?? "#a78bfa",
                      }}
                    />
                    {project.language ?? "Mixed"}
                  </span>
                  <span className="project-arrow" aria-hidden="true">
                    ↗
                  </span>
                </button>
              ))}
            </div>

            <aside className="project-inspector" aria-live="polite">
              {selected ? (
                <>
                  <div className="inspector-topline">
                    <span>ACTIVE NODE</span>
                    <span>{formatDate(selected.pushedAt)}</span>
                  </div>
                  <h3>{selected.name}</h3>
                  <p>{selected.description}</p>
                  <div className="repo-metrics">
                    <span>★ {selected.stars}</span>
                    <span>⑂ {selected.forks}</span>
                    <span>{selected.language ?? "Mixed"}</span>
                  </div>
                  {selected.topics.length > 0 && (
                    <div className="topic-list">
                      {selected.topics.slice(0, 5).map((topic) => (
                        <span key={topic}>{topic}</span>
                      ))}
                    </div>
                  )}
                  <div className="inspector-actions">
                    <a href={selected.url} target="_blank" rel="noreferrer">
                      Open source <ArrowIcon />
                    </a>
                    {selected.homepage && (
                      <a href={selected.homepage} target="_blank" rel="noreferrer">
                        Live site
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <p>Select a repository.</p>
              )}
            </aside>
          </div>
        </section>

        <section className="chapter stack" id="stack" aria-labelledby="stack-title">
          <div className="chapter-index">04 / TOOLBOX</div>
          <div className="stack-copy">
            <p className="eyebrow">Observed repository languages</p>
            <h2 id="stack-title">A polyglot toolkit, arranged around the problem.</h2>
          </div>
          <div className="language-orbit">
            {languages.map((language, index) => (
              <div key={language} style={{ "--i": index } as React.CSSProperties}>
                <span
                  style={{ background: languageColors[language] ?? "#a78bfa" }}
                />
                {language}
              </div>
            ))}
          </div>
          <blockquote>
            “Code is the artifact. Architecture is the story it leaves behind.”
          </blockquote>
        </section>

        <section className="chapter contact" id="contact" aria-labelledby="contact-title">
          <div className="chapter-index">05 / OPEN CHANNEL</div>
          <div className="contact-copy">
            <p className="eyebrow">Available for thoughtful technical work</p>
            <h2 id="contact-title">
              Have a system that needs a clearer shape?
            </h2>
            <p>
              Start with the code. Explore the repositories, inspect the decisions,
              then open a conversation through the public profile.
            </p>
            <a
              className="primary-action"
              href={portfolio.profileUrl}
              target="_blank"
              rel="noreferrer"
            >
              Connect on GitHub <ArrowIcon />
            </a>
          </div>
          <footer>
            <span>(c) {new Date().getFullYear()} {portfolio.login}</span>
            <span>No portrait used - Public GitHub data only</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
