export type CameraMode = 'cinematic' | 'orbit'

export interface PhaseDef {
  id: string
  index: number
  name: string
  title: string
  subtitle: string
  body: string
  /** Normalized scroll range [start, end] of this phase. */
  range: [number, number]
  align: 'left' | 'right' | 'center'
}

export interface BuildingInfo {
  name: string
  district: string
  population: number
  powerUsage: string
  traffic: string
  pollution: string
  greenEnergy: string
  constructionDate: string
}

export interface BuildingData {
  id: number
  x: number
  z: number
  width: number
  depth: number
  height: number
  kind: 'skyscraper' | 'commercial' | 'residential' | 'industrial'
  color: string
  /** Normalized scroll value where construction begins. */
  buildStart: number
  /** Normalized scroll value where construction completes. */
  buildEnd: number
  hasGreenRoof: boolean
  info: BuildingInfo
}

export interface LandmarkInfo {
  id: string
  name: string
  category: string
  description: string
  facts: { label: string; value: string }[]
}

export interface NumberKey {
  t: number
  v: number
}

export interface ColorKey {
  t: number
  v: string
}

export interface Vec3Key {
  t: number
  v: [number, number, number]
}

export interface CameraKey {
  t: number
  pos: [number, number, number]
  look: [number, number, number]
  fov: number
}
