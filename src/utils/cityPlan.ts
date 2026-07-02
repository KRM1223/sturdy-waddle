import type { BuildingData, LandmarkInfo } from '../types'
import { T } from '../config/timeline'
import { lerp, mulberry32 } from './math'

/**
 * The deterministic master plan. Roads form a grid over the plateau,
 * blocks host districts, and every building knows when in the scroll
 * timeline it gets built.
 */

export const ROAD_SPACING = 24
export const ROAD_HALF = 3.4 // half width of a road
export const GRID_EXTENT = 96 // roads span -96..96
export const ROAD_COORDS = [-96, -72, -48, -24, 0, 24, 48, 72, 96]

export interface RoadSegment {
  id: number
  x: number
  z: number
  length: number
  horizontal: boolean
  /** 0..1 distance factor from the city center, used for build stagger. */
  stagger: number
}

export interface BlockDef {
  cx: number
  cz: number
  /** Block half size (inside sidewalk margin). */
  half: number
  use: 'buildings' | 'park' | 'landmark' | 'plaza' | 'solar'
  landmarkId?: string
}

const LANDMARK_BLOCKS: Record<string, [number, number]> = {
  stadium: [-84, -84],
  airport: [84, 84],
  station: [60, -12],
  museum: [-36, -36],
  library: [-12, -36],
  school: [-60, 36],
  hospital: [36, -60],
  police: [12, 60],
  fire: [36, 60],
  park: [-12, -12],
  plaza: [12, -12],
  solar: [84, 36],
}

export function buildBlocks(): BlockDef[] {
  const blocks: BlockDef[] = []
  const used = new Set(Object.values(LANDMARK_BLOCKS).map(([x, z]) => `${x},${z}`))
  for (const [id, [cx, cz]] of Object.entries(LANDMARK_BLOCKS)) {
    blocks.push({
      cx,
      cz,
      half: ROAD_SPACING / 2 - ROAD_HALF - 1.6,
      use: id === 'park' ? 'park' : id === 'plaza' ? 'plaza' : id === 'solar' ? 'solar' : 'landmark',
      landmarkId: id,
    })
  }
  for (let ix = 0; ix < ROAD_COORDS.length - 1; ix++) {
    for (let iz = 0; iz < ROAD_COORDS.length - 1; iz++) {
      const cx = (ROAD_COORDS[ix] + ROAD_COORDS[ix + 1]) / 2
      const cz = (ROAD_COORDS[iz] + ROAD_COORDS[iz + 1]) / 2
      if (used.has(`${cx},${cz}`)) continue
      blocks.push({ cx, cz, half: ROAD_SPACING / 2 - ROAD_HALF - 1.6, use: 'buildings' })
    }
  }
  return blocks
}

export function buildRoadSegments(): RoadSegment[] {
  const segments: RoadSegment[] = []
  let id = 0
  const chunk = ROAD_SPACING
  for (const c of ROAD_COORDS) {
    for (let a = -GRID_EXTENT; a < GRID_EXTENT; a += chunk) {
      const mid = a + chunk / 2
      const distH = (Math.abs(mid) + Math.abs(c)) / (GRID_EXTENT * 2)
      segments.push({ id: id++, x: mid, z: c, length: chunk, horizontal: true, stagger: distH })
      segments.push({ id: id++, x: c, z: mid, length: chunk, horizontal: false, stagger: distH })
    }
  }
  return segments
}

const DISTRICT_PALETTES = {
  skyscraper: ['#9fb4c8', '#b7c9d9', '#8ba3bd', '#c3d2de', '#a5bccf'],
  commercial: ['#c9b8a4', '#d6c3ab', '#b3a58f', '#cfc0ae', '#c0ad93'],
  residential: ['#d9cfc0', '#e2d5c2', '#cbbfae', '#d5c6b1', '#e6dccb'],
  industrial: ['#98a1a8', '#a8b0b5', '#8d969e', '#b0b8bd', '#9aa4ab'],
} as const

const NAMES = {
  skyscraper: ['Meridian Tower', 'Aster Spire', 'Northlight One', 'The Vela', 'Cobalt Exchange', 'Halcyon Tower', 'Solace HQ', 'Vertex Plaza', 'Aurora Heights', 'The Argent'],
  commercial: ['Fenwick Arcade', 'Marrow & Co.', 'The Foundry Hall', 'Larkspur Market', 'Atlas Offices', 'Beacon Works', 'The Tessera', 'Quill House', 'Harbor Trade Center', 'The Anvil'],
  residential: ['Alder Court', 'Rowan Terrace', 'Miren Gardens', 'The Linden', 'Sable Row', 'Juniper Flats', 'Calla Residences', 'The Wrenhouse', 'Osier Yards', 'Hollis Green'],
  industrial: ['Delta Fabrication', 'Ironquay Plant', 'Vantage Logistics', 'The Kiln Works', 'Coreline Depot', 'Mistral Assembly', 'Granite Freight', 'Novafab Unit 7'],
} as const

function districtFor(cx: number, cz: number): BuildingData['kind'] {
  const d = Math.hypot(cx, cz)
  if (cx > 48 && cz < -48) return 'industrial'
  if (d < 40) return 'skyscraper'
  if (d < 74) return 'commercial'
  return 'residential'
}

export function buildBuildings(): BuildingData[] {
  const rand = mulberry32(20260702)
  const buildings: BuildingData[] = []
  const blocks = buildBlocks().filter((b) => b.use === 'buildings')
  let id = 0

  for (const block of blocks) {
    const kind = districtFor(block.cx, block.cz)
    const perSide = kind === 'skyscraper' ? 2 : kind === 'industrial' ? 2 : 3
    const cell = (block.half * 2) / perSide
    for (let ix = 0; ix < perSide; ix++) {
      for (let iz = 0; iz < perSide; iz++) {
        if (rand() < 0.14) continue // courtyards & variety
        const x = block.cx - block.half + cell * (ix + 0.5) + (rand() - 0.5) * 1.4
        const z = block.cz - block.half + cell * (iz + 0.5) + (rand() - 0.5) * 1.4
        const footprint = cell * (0.52 + rand() * 0.24)
        const d = Math.hypot(x, z)
        let height: number
        switch (kind) {
          case 'skyscraper':
            height = 34 + rand() * 46 + (1 - d / 40) * 22
            break
          case 'commercial':
            height = 12 + rand() * 16
            break
          case 'industrial':
            height = 7 + rand() * 6
            break
          default:
            height = 6 + rand() * 9
        }
        const palette = DISTRICT_PALETTES[kind]
        const names = NAMES[kind]
        // Construction ripples outward from the center of the city.
        const staggerT = Math.min(1, d / 110)
        const buildStart = lerp(T.buildings[0], T.buildings[1] - 0.03, staggerT * 0.85 + rand() * 0.15)
        const buildEnd = buildStart + 0.028 + rand() * 0.022
        const year = 2031 + Math.round(staggerT * 6 + rand() * 2)
        const green = kind === 'industrial' ? 10 + rand() * 25 : 30 + rand() * 65
        buildings.push({
          id: id++,
          x,
          z,
          width: footprint,
          depth: footprint * (0.85 + rand() * 0.3),
          height,
          kind,
          color: palette[Math.floor(rand() * palette.length)],
          buildStart,
          buildEnd,
          hasGreenRoof: rand() < 0.3,
          info: {
            name: `${names[Math.floor(rand() * names.length)]}`,
            district:
              kind === 'skyscraper' ? 'Financial Core' : kind === 'commercial' ? 'Midtown' : kind === 'industrial' ? 'Ironquay District' : 'Garden Districts',
            population: Math.round(height * footprint * (kind === 'residential' ? 3.2 : 1.6)),
            powerUsage: `${(height * footprint * 0.9).toFixed(0)} MWh/yr`,
            traffic: `${Math.round(80 + rand() * 900)} veh/day`,
            pollution: kind === 'industrial' ? 'Moderate' : rand() < 0.5 ? 'Low' : 'Very low',
            greenEnergy: `${green.toFixed(0)}%`,
            constructionDate: `${['Jan', 'Mar', 'Apr', 'Jun', 'Sep', 'Oct'][Math.floor(rand() * 6)]} ${year}`,
          },
        })
      }
    }
  }
  return buildings
}

export const LANDMARKS: LandmarkInfo[] = [
  {
    id: 'stadium',
    name: 'The Auria Stadium',
    category: 'Sport & Events',
    description: 'A 42,000-seat bowl with a photovoltaic crown roof. On match nights its glow is visible from the far ridge.',
    facts: [
      { label: 'Capacity', value: '42,000' },
      { label: 'Opened', value: 'May 2035' },
      { label: 'Energy', value: '100% on-site solar' },
      { label: 'Events / yr', value: '120+' },
    ],
  },
  {
    id: 'airport',
    name: 'Vela International Airport',
    category: 'Transport',
    description: 'A single-runway city airport tuned for quiet electric regional aircraft, ten minutes from the core by metro.',
    facts: [
      { label: 'Runway', value: '2.4 km' },
      { label: 'Passengers', value: '3.1M / yr' },
      { label: 'Fleet', value: '68% electric' },
      { label: 'Opened', value: 'Nov 2036' },
    ],
  },
  {
    id: 'station',
    name: 'Central Station',
    category: 'Transport',
    description: 'The vaulted heart of the rail network. Every metro line, tram loop and regional service meets under one arched roof.',
    facts: [
      { label: 'Daily riders', value: '210,000' },
      { label: 'Platforms', value: '14' },
      { label: 'Lines', value: '6 metro · 4 rail' },
      { label: 'Opened', value: 'Feb 2034' },
    ],
  },
  {
    id: 'museum',
    name: 'Museum of the Valley',
    category: 'Culture',
    description: 'Built around the survey marker that started it all. The permanent exhibition tells the story of the land before the city.',
    facts: [
      { label: 'Galleries', value: '18' },
      { label: 'Visitors', value: '890k / yr' },
      { label: 'Collection', value: '54,000 objects' },
      { label: 'Opened', value: 'Aug 2035' },
    ],
  },
  {
    id: 'library',
    name: 'The Open Library',
    category: 'Culture',
    description: 'A reading room wrapped in glass, open 24 hours. Its lantern roof is the soft gold light of the civic quarter at night.',
    facts: [
      { label: 'Volumes', value: '1.2M' },
      { label: 'Open', value: '24 / 7' },
      { label: 'Reading seats', value: '2,400' },
      { label: 'Opened', value: 'Apr 2035' },
    ],
  },
  {
    id: 'school',
    name: 'Rowan Campus',
    category: 'Education',
    description: 'Primary and secondary school around a shared orchard courtyard. The city planted the trees before it poured the foundations.',
    facts: [
      { label: 'Students', value: '2,800' },
      { label: 'Courtyards', value: '4' },
      { label: 'Solar roof', value: '1.8 MW' },
      { label: 'Opened', value: 'Sep 2034' },
    ],
  },
  {
    id: 'hospital',
    name: 'Meridian General Hospital',
    category: 'Health',
    description: 'A terraced healing campus with rooftop gardens on every ward. Drone pads on level 9 handle urgent deliveries.',
    facts: [
      { label: 'Beds', value: '640' },
      { label: 'Helipads', value: '2 + 6 drone pads' },
      { label: 'Staff', value: '3,900' },
      { label: 'Opened', value: 'Jun 2034' },
    ],
  },
  {
    id: 'police',
    name: 'Harbor Precinct',
    category: 'Civic',
    description: 'Community policing hub with an open ground floor — half station, half neighborhood common room.',
    facts: [
      { label: 'Officers', value: '240' },
      { label: 'Response', value: '4.2 min avg' },
      { label: 'Districts', value: '5' },
      { label: 'Opened', value: 'Mar 2034' },
    ],
  },
  {
    id: 'fire',
    name: 'Firehouse No. 1',
    category: 'Civic',
    description: 'The first emergency service in the valley. The brass bell above the bay doors came from the surveyors’ camp.',
    facts: [
      { label: 'Engines', value: '8' },
      { label: 'Crew', value: '96' },
      { label: 'Coverage', value: 'Full city < 6 min' },
      { label: 'Opened', value: 'Jan 2034' },
    ],
  },
  {
    id: 'park',
    name: 'Founders Park',
    category: 'Public Space',
    description: 'The green heart of the grid — the one block the master plan promised would never be built on.',
    facts: [
      { label: 'Trees', value: '1,100' },
      { label: 'Lawn', value: '4.6 ha' },
      { label: 'Ponds', value: '2' },
      { label: 'Planted', value: 'Spring 2034' },
    ],
  },
]

export const LANDMARK_POSITIONS = LANDMARK_BLOCKS
