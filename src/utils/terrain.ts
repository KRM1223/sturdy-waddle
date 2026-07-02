import { fbm2, smoothstep } from './math'

export const WORLD_SIZE = 1100
export const CITY_RADIUS = 108
export const RIVER_X = -132
export const RIVER_WIDTH = 16

/** Signed distance-ish river path: a gentle S-curve running along -Z→+Z. */
export function riverCenterX(z: number) {
  return RIVER_X + Math.sin(z * 0.012) * 26 + Math.sin(z * 0.004 + 1.7) * 14
}

/**
 * Single source of truth for ground elevation. The city plateau is dead flat;
 * foothills and mountains rise toward the edge of the world.
 */
export function terrainHeight(x: number, z: number): number {
  const d = Math.hypot(x, z)
  // 0 inside the plateau, 1 at the far rim
  const rim = smoothstep(CITY_RADIUS, WORLD_SIZE * 0.46, d)
  const hills = fbm2(x * 0.008 + 13.7, z * 0.008 + 4.2, 5)
  const ridges = fbm2(x * 0.0028 + 91.3, z * 0.0028 + 27.9, 4)
  let h = rim * (hills * 26 + Math.pow(ridges, 2.1) * 165 * smoothstep(0.35, 1, rim))

  // Carve the river valley
  const rx = riverCenterX(z)
  const riverDist = Math.abs(x - rx)
  const carve = 1 - smoothstep(0, RIVER_WIDTH * 2.4, riverDist)
  h = h * (1 - carve * 0.9) - carve * 3.2

  // Keep the plateau perfectly buildable
  const flat = 1 - smoothstep(CITY_RADIUS * 0.92, CITY_RADIUS * 1.25, d)
  h *= 1 - flat

  // Flatten the airport runway corridor east of the city
  const runway =
    (1 - smoothstep(10, 26, Math.abs(z - 84))) * (1 - smoothstep(0, 40, Math.max(0, x - 240) + Math.max(0, 96 - x)))
  return h * (1 - runway)
}

/** Convenience for scattering — true if a point is on open meadow. */
export function isMeadow(x: number, z: number): boolean {
  const d = Math.hypot(x, z)
  if (d < CITY_RADIUS + 6) return false
  const rx = riverCenterX(z)
  if (Math.abs(x - rx) < RIVER_WIDTH * 1.6) return false
  if (Math.abs(z - 84) < 28 && x > 92 && x < 285) return false // runway corridor
  return terrainHeight(x, z) < 34
}

export const meadowSlopeOk = (x: number, z: number) => {
  const e = 2
  const h = terrainHeight(x, z)
  const hx = terrainHeight(x + e, z)
  const hz = terrainHeight(x, z + e)
  return Math.abs(hx - h) + Math.abs(hz - h) < 1.6
}
