# Changelog

## Unreleased — Rust runtime migration

### Changed

- Reworked the portfolio homepage around Ohaki's research-first motivation and the real Myport garden; made project and source paths easier to scan while preserving existing routes.
- Refined case-study framing and responsive typography without adding client JavaScript or a UI dependency.

### Added

- Replaced the active Next.js runtime with Rust/Axum server-rendered routes and a Rust/WebAssembly playground; historical Next.js source and package configuration remain under `legacy-next/`.
- Added a source-linked architecture case study, a resilient background GitHub snapshot, startup checks, reproducible local build/run scripts, and saved-progress recovery tests.

### Changed

- Kept case studies readable without JavaScript and made the WebAssembly playground an explicit, optional action.
- Restored a partial preferences record without discarding its reduced-motion setting; preserved existing session version and storage keys.

### Fixed

- Removed the deprecated wasm-bindgen initializer call from the playground.

---

## Archived Next.js redesign history

### Changed

- Made `/` a recruiter-first portfolio with selected-project switching, shared navigation and a persistent light/dark preference. The existing playable atelier is available at `/play` without loading its renderer on the homepage.
- Consolidated reading-surface design tokens and strengthened the GitHub boundary with runtime payload validation and isolated fallback snapshots.
- Added an original generated rooftop concept illustration, clearly distinguished from the playable scene, as an optimized local WebP asset.
- Fixed intro action overlap and initialize playground motion from the operating-system preference; explicit visitor selection still takes precedence.

- Added source-inspected activity booking and registration case study, including explicit persistence and location-verification tradeoffs.
- Kept mobile section navigation visible, enlarged touch controls, and synchronized guided-travel UI with runtime cancellation.
- Replaced the scattered game HUD with a guided-tour entry, a visible chapter navigator, contextual event controls, and a completion-to-source handoff.
- Rebuilt the environment as a rooftop atelier with greenhouse architecture, timber decks, lantern cables and distinct workshop silhouettes.
- Unified project details on the existing accessible sheet primitive across desktop and mobile, replacing the custom desktop dialog.
- Added exact collected-target state and guided station paths; preserved locally saved chapters.
- Added a direct `/work` route for reviewing real public repositories without playing, with source status and inspectable portfolio engineering notes.
- Added guided event destinations and workshop navigation; deliveries now indicate when pickup or delivery is available.
- Rebuilt the garden around a mechanical botanical beacon, layered planting and maker details. Completed stories feed the beacon and restore workshop signals.
- Full effects follow the operating-system preference, with an explicit Calm mode available before entry and during play.
- Redesigned the male cozy developer with short textured hair, straight bomber jacket and charcoal trousers.
- Added a cherry-tree arboretum, reflective pond, timber footbridge, flower meadows and clickable wind chimes; Bloom and nearby movement animate the garden.
- Activated the existing React Bits BlurText and SpotlightCard components in the welcome, story HUD and journal. Journal entries now guide the character to workshops.
- Added input-driven garden motion: destination rings, bounded particle bursts for footsteps/landings/event progress, workshop hover activation, character greetings and head tracking, responsive foliage, and a day/evening light control.
- Added keyboard/touch-accessible greeting and lighting buttons, reduced-motion alternatives, and tactile UI feedback without a second animation loop or new dependencies.
- Replaced the long side-scrolling loop with a compact freely walkable developer garden, character-following perspective camera, keyboard/touch movement and click-to-walk.
- Added project-linked story events: idea collection, ordered connection pads, and book deliveries; chapter completion persists locally, with replay, leave-event recovery, and a browse-without-playing journal.
- Reused the original cozy character and workshop models through shared world assets; added WebGL failure recovery and retained direct access to factual repository details.
- Replaced the helmeted explorer with an original cozy anime developer: sculpted hair, expressive blinking eyes, headphones, sage knit clothing and a coffee mug, with damped secondary hair motion.
- Applied a sage, cream and peach palette to chapter markers, shared panels and the welcoming developer-trail introduction; preserved repository content and gameplay controls.
- Added perspective depth, baked environment reflections on the explorer's visor and metalwork, and a wider player-following shadow frustum.
- Added a deforming scarf, acceleration-driven body lean, head stabilization, a damped lantern pendulum, and drone banking.
- Added landing ripples, gently damped camera pullback at speed, and proximity-driven landmark activation; motion preferences update without a reload.
- Replaced the repeated terminal station with six landmark silhouettes: armillary observatory, campus archive, connected terraces, geodesic dome, transmission spire and atelier gateway.
- Sculpted an expedition coat, curved visor, ivory helmet, brass hardware and trailing scarf for the explorer.
- Added layered sky color, a distant sun, branching trees and suspended rock foundations; reduced in-world label size.
- Articulated explorer elbows and knees, with stance/recovery gait, airborne poses, breathing, and impact absorption.
- Reworked shared terrain, every repository station, distant architecture and mountains with matte surfaces, vegetation, stone details and player-following shadows.
- Calmed station and portal motion; kept labels still and disabled decorative world motion for reduced-motion users.
- Refined the explorer with layered armor, backpack details, cooler materials, and contrasting rim lighting.
- Added continuous distance-driven gait, smooth limb transitions, three-dimensional turns, and secondary lantern/drone motion.

### Fixed

- Removed overlapping terrain segments at the loop boundary that caused flickering surfaces.
- Restored background depth layers near the beginning of the trail.
- Removed an intro hydration mismatch when reduced motion is enabled.
- Moved the compact mobile chapter panel above the play area so it no longer obscures the explorer.

## 0.2.0 - 2026-08-25

### Added

- Responsive expedition-style entry experience and reusable shadcn UI primitives.
- Desktop and mobile project detail surfaces with accessible controls and focus recovery.

### Changed

- Rebuilt the portfolio HUD, navigation, project stations, typography, color system, and motion language.
- Split the Three.js journey into reusable world, intro, HUD, palette, and project-panel modules.

### Fixed

- Mobile game controls, responsive overflow, reduced-motion behavior, and corrupted interface text.
