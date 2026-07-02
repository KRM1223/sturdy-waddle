# The Birth of a City

An immersive, cinematic scroll experience. One continuous page; one scroll; one
century. An empty valley of grass, wildflowers and a silver river grows —
survey stakes, roads, glowing underground utilities, foundations, a skyline,
civic landmarks, traffic and people, a thinking smart city, storms and snow and
a rainbow, festival nights with fireworks, flying taxis and holograms — until
the camera pulls back through the cloud layer and the city becomes one light
among billions.

Everything is procedural. There are no external 3D models, textures or audio
files: the terrain, the city plan, the window lights, the weather, and even the
soundtrack (wind, birdsong, construction, rain, thunder, crickets, festival
pads) are generated at runtime.

## Tech

- **React 19 + Vite + TypeScript**
- **Three.js + React Three Fiber + drei** — the world
- **GSAP ScrollTrigger + Lenis** — one master scroll progress (0 → 1) drives every system
- **Framer Motion** — the HTML overlay (chapter captions, nav, modals)
- **@react-three/postprocessing** — bloom + vignette grade
- **Tailwind CSS 4** — UI styling
- Custom **GLSL** — sky dome, stars, rain/snow, river, aurora, rainbow, window
  lights, billboards, holograms, utility-pipe pulses, fireworks

## Run

```bash
npm install
npm run dev       # develop
npm run build     # typecheck + production build
npm run preview   # serve the build
```

## How it works

- `src/config/timeline.ts` — 13 chapters + ending as normalized scroll ranges.
- `src/config/atmosphere.ts` — continuous keyframe curves (sun, sky, fog,
  rain, snow, storm, stars, aurora, bloom…) sampled against progress.
- `src/config/cameraPath.ts` — a Catmull-Rom camera rail with look targets and
  fov per keyframe; pointer parallax and storm shake are layered on top.
- `src/hooks/useScrollDriver.ts` — Lenis + ScrollTrigger write a single
  progress value into a mutable store; React never re-renders on scroll.
- `src/scene/TimelineUpdater.tsx` — damps progress once per frame and derives
  the shared factors (night, underground, rain, lightning…) every system reads.
- `src/utils/cityPlan.ts` — the deterministic master plan: road grid, blocks,
  districts, and ~400 buildings that each know *when* they get built.
- `src/audio/AudioEngine.ts` — a fully synthesized WebAudio soundtrack,
  crossfaded along the scroll.

## Interactions

- **The world answers your clicks, era by era**: click the meadow to plant a
  tree (with a chime), slam the earth during construction, and launch
  fireworks over the living city. Tap any tower to celebrate from its roof.
  Pop a drifting hot-air balloon for confetti.
- **Move the cursor through the meadow** — grass, flowers and trees part
  around it like a hand through a field.
- **Hover** any tower for its dossier (population, power, traffic, pollution,
  green energy, construction date) with a glowing highlight shell. **Click**
  a civic landmark for its story.
- **Positional audio**: the mix follows the camera — construction hammers over
  the pits, water babble by the river, festival pads (with a heartbeat kick)
  near the plaza, traffic in the grid, wind on the ridge, a mains hum
  underground.
- Keyboard: `M` mute · `P` pause timeline · `R` replay · `C` free camera ·
  `X` wireframe · `U` underground · `N` night — plus arrow-key scrolling.
- Right-side rail jumps between chapters.

## Performance & accessibility

Instanced meshes for everything plural (trees, flowers, buildings, cars,
people, drones, panels), GPU particle shaders, a single ground mesh, damped
per-frame updates with dirty-state skips, `prefers-reduced-motion` support
(parallax, particles and sway are toned down), ARIA labels and full keyboard
navigation.
