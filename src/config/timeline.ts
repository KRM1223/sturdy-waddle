import type { PhaseDef } from '../types'

/**
 * Master timeline. The whole experience is one normalized scroll value 0..1;
 * every scene, light, sound and camera move is keyed against these ranges.
 */
export const SCROLL_PAGES = 16 // total scroll height in viewport-heights ≈ pages * 100vh

export const PHASES: PhaseDef[] = [
  {
    id: 'land',
    index: 0,
    name: 'The Empty Land',
    title: 'Before everything, there was land.',
    subtitle: 'Chapter 01 — The Empty Land',
    body: 'A valley of grass and wildflowers. A river tracing silver through the hills. Wind, birdsong, and the patience of mountains. Nothing here knows what is coming.',
    range: [0.0, 0.075],
    align: 'left',
  },
  {
    id: 'survey',
    index: 1,
    name: 'Surveying',
    title: 'The first footprints.',
    subtitle: 'Chapter 02 — Surveying',
    body: 'Surveyors plant their markers in the meadow. Drones sweep the valley, mapping every contour. Trucks and excavators roll in, and the earth learns the weight of intention.',
    range: [0.075, 0.145],
    align: 'right',
  },
  {
    id: 'roads',
    index: 2,
    name: 'Roads',
    title: 'Lines drawn across the earth.',
    subtitle: 'Chapter 03 — Road Construction',
    body: 'Bulldozers carve the grid. Rollers press asphalt flat and warm. Lane by lane, light by light, the skeleton of movement is laid down before a single wall rises.',
    range: [0.145, 0.215],
    align: 'left',
  },
  {
    id: 'underground',
    index: 3,
    name: 'Underground',
    title: 'The hidden city beneath.',
    subtitle: 'Chapter 04 — Underground Utilities',
    body: 'Beneath the fresh asphalt, a nervous system takes shape: water mains, power cables, fiber optics, gas and drainage. A city you will never see, keeping alive the one you will.',
    range: [0.215, 0.285],
    align: 'center',
  },
  {
    id: 'foundations',
    index: 4,
    name: 'Foundations',
    title: 'Roots of steel and concrete.',
    subtitle: 'Chapter 05 — Foundations',
    body: 'Concrete pours into the earth. Rebar forests grow inside the pits. Tower cranes swing their long arms over the valley — the first vertical gestures of a skyline.',
    range: [0.285, 0.35],
    align: 'right',
  },
  {
    id: 'buildings',
    index: 5,
    name: 'Buildings',
    title: 'The skyline learns to stand.',
    subtitle: 'Chapter 06 — Buildings Grow',
    body: 'Floor by floor, steel frames climb and glass follows. Residential blocks, offices, industry — each tower a different answer to the same question: how do we live together?',
    range: [0.35, 0.44],
    align: 'left',
  },
  {
    id: 'infrastructure',
    index: 6,
    name: 'Civic Life',
    title: 'A city is more than buildings.',
    subtitle: 'Chapter 07 — Public Infrastructure',
    body: 'Schools and hospitals. A stadium, a museum, a library. Train station, metro, airport. The places that turn a construction site into a community.',
    range: [0.44, 0.525],
    align: 'right',
  },
  {
    id: 'alive',
    index: 7,
    name: 'First Breath',
    title: 'And then — life.',
    subtitle: 'Chapter 08 — The City Comes Alive',
    body: 'Traffic finds its rhythm. Crosswalks fill, shops open, trains glide between districts. Children, cyclists, dogs on leashes. The city takes its first breath and never stops.',
    range: [0.525, 0.605],
    align: 'left',
  },
  {
    id: 'smart',
    index: 8,
    name: 'Smart City',
    title: 'The city starts to think.',
    subtitle: 'Chapter 09 — Smart City',
    body: 'Wind turbines crown the hills and solar fields drink the afternoon. Delivery robots share the sidewalks, drones trace the sky, and ten thousand sensors listen quietly.',
    range: [0.605, 0.675],
    align: 'right',
  },
  {
    id: 'weather',
    index: 9,
    name: 'Seasons',
    title: 'Weather writes on the city.',
    subtitle: 'Chapter 10 — The Weather System',
    body: 'Golden hour gives way to stars. Rain sweeps in, thunder rolls across the towers, fog softens every edge, snow hushes the streets — and a rainbow signs the storm’s receipt.',
    range: [0.675, 0.755],
    align: 'center',
  },
  {
    id: 'life',
    index: 10,
    name: 'City Life',
    title: 'Nights that belong to everyone.',
    subtitle: 'Chapter 11 — City Life',
    body: 'Café terraces glow, food trucks queue along the park, a festival takes the plaza. Fireworks bloom over the harbor of rooftops while runners loop the riverside.',
    range: [0.755, 0.83],
    align: 'left',
  },
  {
    id: 'future',
    index: 11,
    name: 'Future City',
    title: 'Tomorrow moves in.',
    subtitle: 'Chapter 12 — The Future City',
    body: 'Flying taxis stitch the towers together. Sky bridges, vertical forests, a hyperloop humming at the city’s edge. Holograms drift between rooftops like weather made of light.',
    range: [0.83, 0.9],
    align: 'right',
  },
  {
    id: 'global',
    index: 12,
    name: 'Global View',
    title: 'One light among billions.',
    subtitle: 'Chapter 13 — Global View',
    body: 'Pull back through the cloud layer. The city becomes a constellation on the dark curve of the Earth, watched over by satellites and the slow green fire of the aurora.',
    range: [0.9, 0.965],
    align: 'center',
  },
]

export const ENDING_RANGE: [number, number] = [0.965, 1]

export function phaseAt(progress: number): number {
  for (let i = PHASES.length - 1; i >= 0; i--) {
    if (progress >= PHASES[i].range[0]) return i
  }
  return 0
}

/** Convenience anchors used across scene systems. */
export const T = {
  landEnd: PHASES[0].range[1],
  survey: PHASES[1].range,
  roads: PHASES[2].range,
  underground: PHASES[3].range,
  foundations: PHASES[4].range,
  buildings: PHASES[5].range,
  infrastructure: PHASES[6].range,
  alive: PHASES[7].range,
  smart: PHASES[8].range,
  weather: PHASES[9].range,
  life: PHASES[10].range,
  future: PHASES[11].range,
  global: PHASES[12].range,
  ending: ENDING_RANGE,
} as const
