# Changelog

## Unreleased

### Changed

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
