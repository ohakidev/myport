# Myport

A readable developer portfolio built with Next.js 15, React 19 and TypeScript. The main reading routes do not load the Three.js world:

- `/`: selected work, interactive architecture preview, repository search and GitHub profile.
- `/work`: two source-linked case studies with decisions, implementation layers and trade-offs.
- `/play`: the optional interactive rooftop journey.

## Local development

Use Node.js 20.9 or newer and pnpm.

```powershell
pnpm install --frozen-lockfile
pnpm dev -p 3100
```

Production build and local preview:

```powershell
pnpm build
pnpm start -p 3100
```

No Rust toolchain or WASM build is required. Vercel is configured for Next.js; deployment is separate from local verification.

## Where to make changes

- `src/app/portfolio-system.css`: shared theme, navigation, controls and architecture-inspector styles.
- `src/app/portfolio.css`: Index composition and responsive layout.
- `src/app/work/work.css`: case-study layout.
- `src/lib/case-studies.ts`: shared case-study copy and historical source references.
- `src/components/architecture-inspector.tsx`: reusable four-layer inspector.
- `src/lib/github.ts`: validated public GitHub data, one-hour cache, bounded requests and saved fallback.
- `src/components/journey.tsx`: playground interface, progress and focus coordination.
- `src/components/journey/world.tsx`: Three.js runtime.

Next.js server routes load portfolio data; client components own only their local UI state. Existing shadcn buttons remain the primitive base. GSAP sequences the hero, animates the original SVG companion, and enhances the repository deck with drag inertia and elastic response. Native horizontal scrolling and arrow buttons remain the fallback. All added motion respects reduced motion; the document itself retains native scrolling.

Electric cobalt is the initial palette; the visitor can select Midnight. The saved preference uses `ohaki-portfolio-theme` and falls back to a session-only preference when storage is unavailable.

The electric atelier direction uses oversized type, outlined controls and an interactive illustrated companion. Dave Holloway's public portfolio informed high-level contrast and motion principles; its identity, artwork, text and code are not shipped here. Native disclosure elements keep secondary source notes and capabilities readable without custom state machinery.

## Developer documentation

Blume's separate developer handbook lives in `docs/`, starting with `docs/status.mdx`.
See `docs/dev-workflow.mdx` for its pinned CLI and validation/build commands.
Internal docs and generated output are excluded from the portfolio deployment.

## Content and evidence boundaries

Public repository data belongs to `ohakidev`. The repository index labels saved fallback data and distinguishes loaded repositories from the profile's public repository count.

Case-study source links use exact historical commits. They are not claims that a historical snapshot includes current local work, or proof of deployment, authorship, adoption or performance.

The existing `public/images/rooftop-illustration.webp` is generated concept artwork, not a screenshot of the interactive scene. No awards, clients or usage metrics are invented.

The Rust migration remains in Git history, not the active build. Existing user-owned assets, environment files and local documentation are preserved. Deployment must use the linked `myport` Vercel project with the Next.js build settings in `vercel.json`; older Rust project overrides are not valid for this source tree.
