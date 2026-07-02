import { buildBuildings } from '../../utils/cityPlan'

/** Generated once — every system reads the same deterministic master plan. */
export const BUILDINGS = buildBuildings()

export const CRANE_SITES = BUILDINGS.filter((b) => b.height > 40)
  .sort((a, b) => b.height - a.height)
  .slice(0, 9)
