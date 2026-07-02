import type { CameraKey, Vec3Key } from '../types'

/**
 * The cinematic camera rail. Positions and look-targets are sampled with
 * Catmull-Rom interpolation so the ride between chapters never cuts.
 */
export const CAMERA_KEYS: CameraKey[] = [
  // The empty land — wide vista drifting over the meadow
  { t: 0.0, pos: [150, 26, 185], look: [-30, 14, -20], fov: 52 },
  { t: 0.05, pos: [110, 20, 150], look: [-20, 10, -10], fov: 52 },
  // Surveying — swoop low toward the arriving machines
  { t: 0.1, pos: [62, 12, 96], look: [10, 4, 10], fov: 50 },
  { t: 0.14, pos: [40, 9, 70], look: [0, 3, 0], fov: 48 },
  // Roads — lift up to read the grid being drawn
  { t: 0.18, pos: [10, 62, 104], look: [0, 0, 0], fov: 50 },
  { t: 0.212, pos: [-18, 44, 78], look: [0, 0, 8], fov: 50 },
  // Underground — dive beneath the surface
  { t: 0.232, pos: [-30, 6, 58], look: [0, -8, 10], fov: 54 },
  { t: 0.25, pos: [-34, -13, 44], look: [10, -10, -6], fov: 58 },
  { t: 0.272, pos: [26, -15, -30], look: [-8, -9, 18], fov: 58 },
  // Foundations — rise back out among the pits and cranes
  { t: 0.295, pos: [44, 6, 64], look: [0, 6, 0], fov: 52 },
  { t: 0.33, pos: [56, 18, 44], look: [-8, 10, -8], fov: 50 },
  // Buildings grow — orbit while the skyline climbs
  { t: 0.37, pos: [78, 30, -10], look: [-10, 22, 0], fov: 48 },
  { t: 0.41, pos: [40, 44, -78], look: [-8, 26, 6], fov: 48 },
  // Public infrastructure — glide across the civic quarter
  { t: 0.455, pos: [-40, 46, -100], look: [-16, 8, 6], fov: 48 },
  { t: 0.5, pos: [-102, 34, -34], look: [-10, 10, 10], fov: 48 },
  // City comes alive — drop to street level warmth
  { t: 0.54, pos: [-62, 9, 26], look: [0, 6, 4], fov: 50 },
  { t: 0.575, pos: [-30, 7, 46], look: [16, 8, -6], fov: 50 },
  // Smart city — sweep the green ridge and solar fields
  { t: 0.615, pos: [36, 16, 92], look: [90, 14, 60], fov: 50 },
  { t: 0.65, pos: [86, 28, 62], look: [10, 12, -10], fov: 50 },
  // Weather — hold a patient, cinematic wide
  { t: 0.69, pos: [96, 38, 8], look: [0, 18, 0], fov: 48 },
  { t: 0.725, pos: [70, 46, -60], look: [-6, 20, 0], fov: 48 },
  { t: 0.755, pos: [10, 34, -96], look: [0, 16, 0], fov: 48 },
  // City life — festival plaza and rooftops at night
  { t: 0.785, pos: [-48, 16, -58], look: [4, 8, 6], fov: 50 },
  { t: 0.82, pos: [-70, 26, 24], look: [0, 14, 0], fov: 50 },
  // Future city — weave between towers with the taxis
  { t: 0.85, pos: [-30, 52, 70], look: [14, 40, -8], fov: 48 },
  { t: 0.885, pos: [44, 64, 46], look: [-6, 42, -10], fov: 48 },
  // Global view — the long pull back to orbit
  { t: 0.915, pos: [30, 160, 220], look: [0, 20, 0], fov: 50 },
  { t: 0.945, pos: [-40, 420, 520], look: [0, 0, 0], fov: 52 },
  { t: 0.985, pos: [-90, 780, 860], look: [0, -60, 0], fov: 54 },
  { t: 1.0, pos: [-110, 900, 960], look: [0, -80, 0], fov: 54 },
]

export const CAMERA_POS_KEYS: Vec3Key[] = CAMERA_KEYS.map((k) => ({ t: k.t, v: k.pos }))
export const CAMERA_LOOK_KEYS: Vec3Key[] = CAMERA_KEYS.map((k) => ({ t: k.t, v: k.look }))
export const CAMERA_FOV_KEYS = CAMERA_KEYS.map((k) => ({ t: k.t, v: k.fov }))
