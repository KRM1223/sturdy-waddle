import { useSyncExternalStore } from 'react'
import type { BuildingData, CameraMode, LandmarkInfo } from '../types'

export interface ExperienceState {
  /** Raw scroll progress from ScrollTrigger, 0..1. */
  progress: number
  /** Frame-damped progress used by every 3D system. */
  smoothProgress: number
  phaseIndex: number
  ready: boolean
  started: boolean
  muted: boolean
  paused: boolean
  wireframe: boolean
  nightOverride: boolean
  undergroundOverride: boolean
  cameraMode: CameraMode
  reducedMotion: boolean
  isCoarsePointer: boolean
  hoveredBuilding: BuildingData | null
  hoverPoint: { x: number; y: number }
  activeLandmark: LandmarkInfo | null
}

const state: ExperienceState = {
  progress: 0,
  smoothProgress: 0,
  phaseIndex: 0,
  ready: false,
  started: false,
  muted: true,
  paused: false,
  wireframe: false,
  nightOverride: false,
  undergroundOverride: false,
  cameraMode: 'cinematic',
  reducedMotion:
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  isCoarsePointer:
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  hoveredBuilding: null,
  hoverPoint: { x: 0, y: 0 },
  activeLandmark: null,
}

type Listener = () => void
const listeners = new Set<Listener>()

/** Direct mutable access for per-frame reads inside useFrame — zero React overhead. */
export const experience = state

export function setExperience(partial: Partial<ExperienceState>, silent = false) {
  Object.assign(state, partial)
  if (!silent) listeners.forEach((l) => l())
}

/** High-frequency values (progress) are written silently to avoid re-rendering React on scroll. */
export function setProgress(progress: number) {
  state.progress = progress
}

export function subscribeExperience(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const selectorCache = new WeakMap<object, unknown>()

export function useExperience<T>(selector: (s: ExperienceState) => T): T {
  return useSyncExternalStore(
    subscribeExperience,
    () => {
      const next = selector(state)
      const prev = selectorCache.get(selector as object) as T
      if (Object.is(prev, next)) return prev
      selectorCache.set(selector as object, next)
      return next
    },
    () => selector(state),
  )
}
