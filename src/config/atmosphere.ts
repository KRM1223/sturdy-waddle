import type { ColorKey, NumberKey, Vec3Key } from '../types'

/**
 * Continuous environment curves keyed on global progress.
 * Time of day: morning → noon (construction) → afternoon → golden hour (first life)
 * → sunset → night/stars → storm → snow → clearing rainbow → festival night
 * → neon future night → space → void.
 */

export const SKY_TOP: ColorKey[] = [
  { t: 0.0, v: '#7ecbf5' },
  { t: 0.12, v: '#57b6f0' },
  { t: 0.3, v: '#3fa7ee' },
  { t: 0.5, v: '#3d9de6' },
  { t: 0.6, v: '#3f6fc5' },
  { t: 0.675, v: '#2b3a75' },
  { t: 0.7, v: '#0d1230' },
  { t: 0.718, v: '#141a33' },
  { t: 0.732, v: '#0e1126' },
  { t: 0.745, v: '#3b4a63' },
  { t: 0.755, v: '#5f88b8' },
  { t: 0.775, v: '#1a2247' },
  { t: 0.8, v: '#0a0e24' },
  { t: 0.86, v: '#070a1e' },
  { t: 0.92, v: '#02030c' },
  { t: 1.0, v: '#000004' },
]

export const SKY_HORIZON: ColorKey[] = [
  { t: 0.0, v: '#ffe2ae' },
  { t: 0.12, v: '#e6f6f4' },
  { t: 0.3, v: '#d2f0f8' },
  { t: 0.5, v: '#ffd292' },
  { t: 0.6, v: '#ff9e5e' },
  { t: 0.675, v: '#ff7a4e' },
  { t: 0.7, v: '#2c3a66' },
  { t: 0.718, v: '#2a3352' },
  { t: 0.732, v: '#1c2340' },
  { t: 0.745, v: '#8fa3bd' },
  { t: 0.755, v: '#cfe0ee' },
  { t: 0.775, v: '#4e3a6e' },
  { t: 0.8, v: '#3d2b63' },
  { t: 0.86, v: '#33206b' },
  { t: 0.92, v: '#0a1233' },
  { t: 1.0, v: '#000010' },
]

export const FOG_COLOR: ColorKey[] = [
  { t: 0.0, v: '#cfe3ec' },
  { t: 0.3, v: '#d5e8ef' },
  { t: 0.55, v: '#f4cfa4' },
  { t: 0.65, v: '#e8a06a' },
  { t: 0.7, v: '#10142c' },
  { t: 0.732, v: '#161c33' },
  { t: 0.745, v: '#aebfd2' },
  { t: 0.775, v: '#241c46' },
  { t: 0.86, v: '#120f2e' },
  { t: 0.92, v: '#04050f' },
  { t: 1.0, v: '#000006' },
]

export const SUN_COLOR: ColorKey[] = [
  { t: 0.0, v: '#ffdfae' },
  { t: 0.25, v: '#fff4de' },
  { t: 0.55, v: '#ffcf8f' },
  { t: 0.66, v: '#ff9a5c' },
  { t: 0.7, v: '#9db4ff' },
  { t: 0.755, v: '#ffe9c9' },
  { t: 0.8, v: '#8ba0ff' },
  { t: 0.92, v: '#7387ff' },
]

export const SUN_INTENSITY: NumberKey[] = [
  { t: 0.0, v: 3.3 },
  { t: 0.3, v: 4.0 },
  { t: 0.6, v: 3.3 },
  { t: 0.675, v: 2.4 },
  { t: 0.7, v: 0.5 },
  { t: 0.726, v: 0.3 },
  { t: 0.745, v: 1.8 },
  { t: 0.755, v: 2.8 },
  { t: 0.775, v: 0.55 },
  { t: 0.86, v: 0.45 },
  { t: 0.94, v: 0.2 },
]

export const AMBIENT_INTENSITY: NumberKey[] = [
  { t: 0.0, v: 0.95 },
  { t: 0.4, v: 1.05 },
  { t: 0.66, v: 0.8 },
  { t: 0.7, v: 0.42 },
  { t: 0.745, v: 0.7 },
  { t: 0.755, v: 0.95 },
  { t: 0.78, v: 0.46 },
  { t: 0.9, v: 0.36 },
  { t: 1.0, v: 0.16 },
]

/** Sun direction — azimuth sweeps through the day, elevation follows. */
export const SUN_POSITION: Vec3Key[] = [
  { t: 0.0, v: [220, 90, 160] },
  { t: 0.2, v: [140, 220, 60] },
  { t: 0.45, v: [-40, 260, -80] },
  { t: 0.6, v: [-190, 130, -60] },
  { t: 0.675, v: [-250, 40, 60] },
  { t: 0.7, v: [-260, -20, 120] },
  { t: 0.745, v: [200, 120, 140] },
  { t: 0.755, v: [230, 150, 120] },
  { t: 0.775, v: [-200, 60, -160] },
  { t: 1.0, v: [-200, 200, -200] },
]

export const FOG_DENSITY: NumberKey[] = [
  { t: 0.0, v: 0.0022 },
  { t: 0.2, v: 0.0018 },
  { t: 0.6, v: 0.002 },
  { t: 0.7, v: 0.0026 },
  { t: 0.726, v: 0.0034 },
  { t: 0.738, v: 0.0085 }, // fog bank
  { t: 0.75, v: 0.004 },
  { t: 0.775, v: 0.0022 },
  { t: 0.87, v: 0.0018 },
  { t: 0.91, v: 0.0006 },
  { t: 1.0, v: 0.0002 },
]

export const STARS: NumberKey[] = [
  { t: 0.66, v: 0 },
  { t: 0.7, v: 1 },
  { t: 0.72, v: 0.85 },
  { t: 0.735, v: 0.1 },
  { t: 0.75, v: 0.35 },
  { t: 0.762, v: 0 },
  { t: 0.79, v: 0.8 },
  { t: 0.86, v: 0.9 },
  { t: 0.92, v: 1 },
  { t: 1.0, v: 1 },
]

export const MOON: NumberKey[] = [
  { t: 0.68, v: 0 },
  { t: 0.705, v: 1 },
  { t: 0.73, v: 0.35 },
  { t: 0.75, v: 0 },
  { t: 0.79, v: 0.9 },
  { t: 0.9, v: 0.6 },
  { t: 0.96, v: 0 },
]

export const RAIN: NumberKey[] = [
  { t: 0.705, v: 0 },
  { t: 0.715, v: 0.75 },
  { t: 0.725, v: 1 },
  { t: 0.736, v: 0.35 },
  { t: 0.744, v: 0 },
]

export const STORM: NumberKey[] = [
  { t: 0.718, v: 0 },
  { t: 0.726, v: 1 },
  { t: 0.736, v: 0.6 },
  { t: 0.742, v: 0 },
]

export const SNOW: NumberKey[] = [
  { t: 0.736, v: 0 },
  { t: 0.744, v: 1 },
  { t: 0.752, v: 0.7 },
  { t: 0.76, v: 0 },
]

export const RAINBOW: NumberKey[] = [
  { t: 0.748, v: 0 },
  { t: 0.755, v: 0.9 },
  { t: 0.764, v: 0.9 },
  { t: 0.772, v: 0 },
]

export const CLOUD_COVER: NumberKey[] = [
  { t: 0.0, v: 0.55 },
  { t: 0.3, v: 0.4 },
  { t: 0.6, v: 0.5 },
  { t: 0.71, v: 0.75 },
  { t: 0.726, v: 1 },
  { t: 0.75, v: 0.5 },
  { t: 0.78, v: 0.35 },
  { t: 0.9, v: 0.55 },
  { t: 0.94, v: 0.2 },
  { t: 1.0, v: 0 },
]

export const CLOUD_DARKNESS: NumberKey[] = [
  { t: 0.0, v: 0 },
  { t: 0.7, v: 0.35 },
  { t: 0.726, v: 0.9 },
  { t: 0.744, v: 0.4 },
  { t: 0.755, v: 0.1 },
  { t: 0.79, v: 0.5 },
]

export const AURORA: NumberKey[] = [
  { t: 0.9, v: 0 },
  { t: 0.93, v: 1 },
  { t: 0.965, v: 0.8 },
  { t: 1.0, v: 0 },
]

/** How “night” the city is — drives window glow, street lights, neon. */
export const NIGHT: NumberKey[] = [
  { t: 0.0, v: 0 },
  { t: 0.6, v: 0.08 },
  { t: 0.66, v: 0.35 },
  { t: 0.695, v: 1 },
  { t: 0.745, v: 0.35 },
  { t: 0.758, v: 0.15 },
  { t: 0.78, v: 1 },
  { t: 0.9, v: 1 },
  { t: 1.0, v: 1 },
]

export const BLOOM: NumberKey[] = [
  { t: 0.0, v: 0.35 },
  { t: 0.6, v: 0.5 },
  { t: 0.7, v: 0.8 },
  { t: 0.755, v: 0.5 },
  { t: 0.8, v: 0.9 },
  { t: 0.9, v: 1.0 },
  { t: 0.97, v: 0.75 },
]

export const VIGNETTE: NumberKey[] = [
  { t: 0.0, v: 0.22 },
  { t: 0.7, v: 0.34 },
  { t: 0.9, v: 0.42 },
  { t: 1.0, v: 0.68 },
]
