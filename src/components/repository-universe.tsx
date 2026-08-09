"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { GitHubPortfolio, Project } from "@/lib/github";

const colorByLanguage: Record<string, string> = {
  TypeScript: "#67e8f9",
  JavaScript: "#fde047",
  Python: "#86efac",
  HTML: "#fb7185",
  CSS: "#c084fc",
};

const chapters = [
  { id: "origin", label: "Origin" },
  { id: "practice", label: "Practice" },
  { id: "work", label: "Work" },
  { id: "contact", label: "Contact" },
];

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.69c-2.78.61-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.35 1.09 2.92.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.55 9.55 0 0 1 12 7.68a9.5 9.5 0 0 1 2.5.34c1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.86v1.9c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

function createBranch(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
) {
  const direction = end.clone().sub(start);
  const branch = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.72, radius, direction.length(), 7, 1),
    material,
  );
  branch.position.copy(start).add(end).multiplyScalar(0.5);
  branch.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize(),
  );
  return branch;
}

function StoryWorld({
  projects,
  selected,
  onSelect,
  focusMode,
}: {
  projects: Project[];
  selected: string | null;
  onSelect: (project: Project) => void;
  focusMode: boolean;
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selected);
  const selectRef = useRef(onSelect);
  const focusRef = useRef(focusMode);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);
  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);
  useEffect(() => {
    focusRef.current = focusMode;
  }, [focusMode]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070811, 0.04);
    const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 100);
    camera.position.set(0, 1.7, 12.5);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.setAttribute("aria-hidden", "true");
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xa5b4fc, 0x1c1026, 1.8));
    const key = new THREE.PointLight(0x67e8f9, 52, 34);
    key.position.set(4, 6, 6);
    scene.add(key);
    const warmth = new THREE.PointLight(0xfb7185, 38, 28);
    warmth.position.set(-5, 1, 4);
    scene.add(warmth);

    const world = new THREE.Group();
    world.name = "ohaki-research-tree";
    world.userData.sculptRuntime = {
      source: "img2threejs procedural workflow",
      clickable: true,
      explodable: true,
      animationReady: true,
    };
    scene.add(world);

    const branchMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x171b2c,
      roughness: 0.42,
      metalness: 0.62,
      clearcoat: 0.8,
      emissive: 0x101f32,
      emissiveIntensity: 0.32,
    });
    const pathMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x20263d,
      roughness: 0.3,
      metalness: 0.7,
      clearcoat: 1,
    });

    const trunkPoints = [
      new THREE.Vector3(0, -4.8, 0),
      new THREE.Vector3(-0.15, -2.2, 0.1),
      new THREE.Vector3(0.2, 0.3, -0.1),
      new THREE.Vector3(-0.05, 3.1, 0),
      new THREE.Vector3(0.15, 5, 0),
    ];
    for (let index = 0; index < trunkPoints.length - 1; index += 1) {
      world.add(
        createBranch(
          trunkPoints[index],
          trunkPoints[index + 1],
          0.24 - index * 0.035,
          branchMaterial,
        ),
      );
    }

    const nodes: THREE.Mesh[] = [];
    const tendrils: THREE.Mesh[] = [];
    projects.forEach((project, index) => {
      const level = -3.4 + index * (7.4 / Math.max(projects.length - 1, 1));
      const direction = index % 2 === 0 ? 1 : -1;
      const depth = (index % 3 - 1) * 0.7;
      const start = new THREE.Vector3(0, level - 0.4, 0);
      const joint = new THREE.Vector3(direction * 1.4, level + 0.15, depth * 0.5);
      const end = new THREE.Vector3(direction * (3 + (index % 2) * 0.55), level + 0.65, depth);
      world.add(createBranch(start, joint, 0.12, branchMaterial));
      world.add(createBranch(joint, end, 0.075, branchMaterial));

      const color = new THREE.Color(
        colorByLanguage[project.language ?? ""] ?? "#f0abfc",
      );
      const material = new THREE.MeshPhysicalMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.44,
        roughness: 0.22,
        metalness: 0.28,
        clearcoat: 1,
        transparent: true,
        opacity: 0.94,
      });
      const node = new THREE.Mesh(
        index === projects.length - 1
          ? new THREE.IcosahedronGeometry(0.55, 2)
          : new THREE.DodecahedronGeometry(0.36, 1),
        material,
      );
      node.name = project.name;
      node.position.copy(end);
      node.userData = { project, origin: end.clone(), direction };
      world.add(node);
      nodes.push(node);

      const orbit = new THREE.Mesh(
        new THREE.TorusGeometry(0.72, 0.012, 6, 80),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.24,
        }),
      );
      orbit.position.copy(end);
      orbit.rotation.x = Math.PI * 0.62;
      orbit.userData = { node, phase: index * 0.7 };
      world.add(orbit);
      tendrils.push(orbit);
    });

    const rootRings: THREE.Mesh[] = [];
    for (let index = 0; index < 3; index += 1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.2 + index * 0.62, 0.015, 6, 100),
        new THREE.MeshBasicMaterial({
          color: index === 1 ? 0xfb7185 : 0x67e8f9,
          transparent: true,
          opacity: 0.14,
        }),
      );
      ring.position.y = -4.65;
      ring.rotation.x = Math.PI / 2;
      world.add(ring);
      rootRings.push(ring);
    }

    const dustGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(960);
    let seed = 29;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = (random() - 0.5) * 24;
      positions[i + 1] = (random() - 0.5) * 18;
      positions[i + 2] = (random() - 0.5) * 18;
    }
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const dust = new THREE.Points(
      dustGeometry,
      new THREE.PointsMaterial({
        color: 0x8da2c8,
        size: 0.025,
        transparent: true,
        opacity: 0.55,
      }),
    );
    scene.add(dust);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(4, 4);
    const pointerTarget = new THREE.Vector2();
    let hovered: THREE.Mesh | null = null;
    let frame = 0;

    const pointerMove = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      pointerTarget.copy(pointer);
    };
    const click = () => {
      if (hovered) {
        selectRef.current(hovered.userData.project as Project);
        document.getElementById("work")?.scrollIntoView({ behavior: "smooth" });
      }
    };
    renderer.domElement.addEventListener("pointermove", pointerMove);
    renderer.domElement.addEventListener("click", click);

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const clock = new THREE.Clock();
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();
      const maxScroll = Math.max(document.documentElement.scrollHeight - innerHeight, 1);
      const progress = scrollY / maxScroll;

      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(nodes, false)[0]?.object as
        | THREE.Mesh
        | undefined;
      hovered = hit ?? null;
      renderer.domElement.style.cursor = hovered ? "pointer" : "grab";

      nodes.forEach((node, index) => {
        const active = node.name === selectedRef.current;
        const over = node === hovered;
        const target = active ? 1.5 : over ? 1.24 : 1;
        node.scale.lerp(new THREE.Vector3(target, target, target), 0.12);
        if (!reduced) {
          node.rotation.y = time * (0.2 + index * 0.018);
          node.position.y =
            (node.userData.origin as THREE.Vector3).y + Math.sin(time * 1.1 + index) * 0.08;
        }
      });
      tendrils.forEach((ring, index) => {
        if (!reduced) ring.rotation.z = time * (0.08 + index * 0.008);
      });
      rootRings.forEach((ring, index) => {
        const pulse = 1 + Math.sin(time * 0.7 + index) * 0.08;
        ring.scale.setScalar(pulse);
      });

      const focus = focusRef.current ? 1 : 0;
      world.rotation.y +=
        (progress * Math.PI * 1.2 + pointerTarget.x * 0.13 - world.rotation.y) * 0.025;
      world.position.y += ((0.5 - progress) * 5.2 - world.position.y) * 0.025;
      camera.position.z += (12.5 - focus * 2.4 - camera.position.z) * 0.035;
      camera.position.x += (pointerTarget.x * 0.7 - camera.position.x) * 0.022;
      camera.position.y += (1.7 + pointerTarget.y * 0.4 - camera.position.y) * 0.022;
      camera.lookAt(0, world.position.y * 0.18, 0);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointermove", pointerMove);
      renderer.domElement.removeEventListener("click", click);
      world.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach((item) => item.dispose());
          else object.material.dispose();
        }
      });
      dustGeometry.dispose();
      (dust.material as THREE.Material).dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [projects]);

  return <div className="story-world" ref={mountRef} />;
}

function ProjectPanel({
  project,
  close,
}: {
  project: Project;
  close: () => void;
}) {
  return (
    <aside className="project-panel" aria-live="polite">
      <button className="panel-close" type="button" onClick={close} aria-label="Close project detail">
        ×
      </button>
      <p className="micro-label">ACTIVE BRANCH</p>
      <h3>{project.name}</h3>
      <p>{project.description}</p>
      <div className="project-meta">
        <span>{project.language ?? "Mixed stack"}</span>
        <span>★ {project.stars}</span>
        <span>{new Date(project.pushedAt).getFullYear()}</span>
      </div>
      {project.topics.length > 0 && (
        <div className="topic-row">
          {project.topics.slice(0, 5).map((topic) => (
            <span key={topic}>{topic}</span>
          ))}
        </div>
      )}
      <div className="panel-actions">
        <a href={project.url} target="_blank" rel="noreferrer">
          View source <ArrowIcon />
        </a>
        {project.homepage && (
          <a href={project.homepage} target="_blank" rel="noreferrer">
            Open live project
          </a>
        )}
      </div>
    </aside>
  );
}

export function RepositoryUniverse({ portfolio }: { portfolio: GitHubPortfolio }) {
  const [selected, setSelected] = useState<Project | null>(portfolio.projects[0] ?? null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [activeChapter, setActiveChapter] = useState("origin");
  const chronological = useMemo(
    () => [...portfolio.projects].sort((a, b) => Date.parse(a.pushedAt) - Date.parse(b.pushedAt)),
    [portfolio.projects],
  );
  const languages = useMemo(
    () => Array.from(new Set(portfolio.projects.map((project) => project.language).filter(Boolean))),
    [portfolio.projects],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const current = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (current) setActiveChapter(current.target.id);
      },
      { threshold: [0.25, 0.55] },
    );
    chapters.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  const inspect = (project: Project) => {
    setSelected(project);
    setPanelOpen(true);
  };

  return (
    <main>
      <a href="#origin" className="skip-link">Skip to story</a>
      <StoryWorld
        projects={chronological}
        selected={selected?.name ?? null}
        onSelect={inspect}
        focusMode={focusMode}
      />

      <header className="site-nav">
        <a href="#origin" className="brand" aria-label="ohakidev home">
          <span>O</span>
          <strong>ohaki</strong>
        </a>
        <nav aria-label="Story chapters">
          {chapters.map((chapter, index) => (
            <a
              key={chapter.id}
              href={`#${chapter.id}`}
              className={activeChapter === chapter.id ? "active" : ""}
            >
              <span>0{index + 1}</span>
              {chapter.label}
            </a>
          ))}
        </nav>
        <a
          className="github-link"
          href={portfolio.profileUrl}
          target="_blank"
          rel="noreferrer"
          aria-label="GitHub profile"
        >
          <GitHubIcon />
        </a>
      </header>

      <div className="chapter-progress" aria-hidden="true">
        {chapters.map((chapter) => (
          <span key={chapter.id} className={activeChapter === chapter.id ? "active" : ""} />
        ))}
      </div>

      <button
        className="focus-control"
        type="button"
        aria-pressed={focusMode}
        onClick={() => setFocusMode((value) => !value)}
      >
        <span aria-hidden="true">{focusMode ? "−" : "+"}</span>
        {focusMode ? "Step back" : "Enter 3D"}
      </button>

      {panelOpen && selected && <ProjectPanel project={selected} close={() => setPanelOpen(false)} />}

      <div className="story-shell">
        <section className="story-chapter hero-chapter" id="origin" aria-labelledby="origin-title">
          <div className="chapter-tag"><span>01</span> ORIGIN / RESEARCHER</div>
          <div className="hero-grid">
            <div className="hero-copy">
              <p className="micro-label">research everything that can make life better</p>
              <h1 id="origin-title">
                Curious by default.
                <em>Useful by design.</em>
              </h1>
              <p className="hero-lede">
                I am <strong>{portfolio.name}</strong> — an independent builder exploring
                products, automation, communities, and emerging technology through code.
              </p>
              <div className="hero-actions">
                <a href="#practice" className="primary-button">
                  Follow the story <ArrowIcon />
                </a>
                <a href={portfolio.profileUrl} target="_blank" rel="noreferrer" className="quiet-link">
                  @{portfolio.login}
                </a>
              </div>
            </div>
            <div className="hero-note">
              <span>THE LIVING TREE</span>
              <p>
                Every glowing branch is a public project. Move your pointer through the scene,
                rotate the tree by scrolling, or click a node to inspect its source.
              </p>
              <div className="hero-stats">
                <strong>{portfolio.publicRepos}</strong><span>public experiments</span>
                <strong>{portfolio.followers}</strong><span>people following</span>
                <strong>{languages.length}</strong><span>observed languages</span>
              </div>
            </div>
          </div>
          <div className="scroll-cue"><i /> scroll to grow the tree</div>
        </section>

        <section className="story-chapter practice-chapter" id="practice" aria-labelledby="practice-title">
          <div className="chapter-tag"><span>02</span> PRACTICE / HOW I BUILD</div>
          <div className="section-heading">
            <p className="micro-label">No fixed title. A repeatable instinct.</p>
            <h2 id="practice-title">Research becomes a prototype. A prototype becomes proof.</h2>
          </div>
          <div className="practice-grid">
            {[
              ["Observe", "Start with a real friction point, not a fashionable stack."],
              ["Connect", "Map data, people, APIs, and constraints into one working system."],
              ["Prototype", "Ship the smallest interactive proof that can teach something."],
              ["Refine", "Keep what improves life. Remove what only adds noise."],
            ].map(([title, copy], index) => (
              <article key={title}>
                <span>0{index + 1}</span>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
          <div className="stack-band">
            <p>Observed in the public work</p>
            <div>
              {languages.map((language) => (
                <span key={language ?? "Mixed"}>
                  <i style={{ background: colorByLanguage[language ?? ""] ?? "#f0abfc" }} />
                  {language}
                </span>
              ))}
              <span><i className="neutral" /> Next.js</span>
              <span><i className="neutral" /> shadcn/ui</span>
              <span><i className="neutral" /> Vercel</span>
            </div>
          </div>
        </section>

        <section className="story-chapter work-chapter" id="work" aria-labelledby="work-title">
          <div className="chapter-tag"><span>03</span> WORK / PUBLIC TRAIL</div>
          <div className="section-heading work-heading">
            <div>
              <p className="micro-label">A timeline drawn from GitHub</p>
              <h2 id="work-title">The experiments changed. The curiosity did not.</h2>
            </div>
            <p>
              This timeline does not invent a résumé. It follows the public repository trail and
              lets each project speak through its code, live deployment, and last active year.
            </p>
          </div>
          <div className="work-timeline" role="list">
            <div className="timeline-spine" aria-hidden="true" />
            {chronological.map((project, index) => (
              <article
                key={project.name}
                role="listitem"
                className={selected?.name === project.name ? "work-entry active" : "work-entry"}
              >
                <button type="button" onClick={() => inspect(project)}>
                  <span className="entry-year">{new Date(project.pushedAt).getFullYear()}</span>
                  <i className="entry-node" aria-hidden="true" />
                  <span className="entry-card">
                    <span className="entry-kicker">CHAPTER {String(index + 1).padStart(2, "0")}</span>
                    <strong>{project.name}</strong>
                    <small>{project.description}</small>
                    <span className="entry-footer">
                      <b>{project.language ?? "Mixed stack"}</b>
                      <em>{project.homepage ? "live + source" : "source available"}</em>
                    </span>
                  </span>
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="story-chapter contact-chapter" id="contact" aria-labelledby="contact-title">
          <div className="chapter-tag"><span>04</span> CONTACT / NEXT BRANCH</div>
          <div className="contact-grid">
            <div>
              <p className="micro-label">The next useful experiment can start here.</p>
              <h2 id="contact-title">What should we make less difficult?</h2>
            </div>
            <div className="contact-card">
              <p>
                Explore the source, try the live projects, and open a conversation through
                GitHub. I am interested in research-led products, thoughtful automation, and
                tools that create tangible value.
              </p>
              <a href={portfolio.profileUrl} target="_blank" rel="noreferrer" className="primary-button">
                Start on GitHub <ArrowIcon />
              </a>
            </div>
          </div>
          <footer>
            <span>© {new Date().getFullYear()} {portfolio.login}</span>
            <span>Procedural Three.js · public GitHub data · no portrait</span>
          </footer>
        </section>
      </div>
    </main>
  );
}
