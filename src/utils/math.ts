import * as THREE from 'three'
import type { ColorKey, NumberKey, Vec3Key } from '../types'

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/** Progress 0→1 inside a normalized range, smoothed. */
export const rangeProgress = (p: number, start: number, end: number) =>
  smoothstep(start, end, p)

/** Bell curve: fades in over [start, start+fade], out over [end-fade, end]. */
export const rangeWindow = (p: number, start: number, end: number, fade = 0.02) =>
  smoothstep(start, start + fade, p) * (1 - smoothstep(end - fade, end, p))

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

export const easeOutBack = (t: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2

/** Frame-rate independent damping factor. */
export const damp = (current: number, target: number, lambda: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * dt))

/** Deterministic PRNG — the whole city is generated from seeds. */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function sampleNumberKeys(keys: NumberKey[], t: number): number {
  if (t <= keys[0].t) return keys[0].v
  const last = keys[keys.length - 1]
  if (t >= last.t) return last.v
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]
    const b = keys[i + 1]
    if (t >= a.t && t <= b.t) {
      const s = (t - a.t) / (b.t - a.t)
      return lerp(a.v, b.v, easeInOutSine(s))
    }
  }
  return last.v
}

const colorCache = new Map<string, THREE.Color>()
const getColor = (hex: string) => {
  let c = colorCache.get(hex)
  if (!c) {
    c = new THREE.Color(hex)
    colorCache.set(hex, c)
  }
  return c
}

export function sampleColorKeys(keys: ColorKey[], t: number, out: THREE.Color): THREE.Color {
  if (t <= keys[0].t) return out.copy(getColor(keys[0].v))
  const last = keys[keys.length - 1]
  if (t >= last.t) return out.copy(getColor(last.v))
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]
    const b = keys[i + 1]
    if (t >= a.t && t <= b.t) {
      const s = easeInOutSine((t - a.t) / (b.t - a.t))
      return out.copy(getColor(a.v)).lerp(getColor(b.v), s)
    }
  }
  return out.copy(getColor(last.v))
}

const catmullRom = (p0: number, p1: number, p2: number, p3: number, t: number) => {
  const t2 = t * t
  const t3 = t2 * t
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  )
}

/** Smooth Catmull-Rom sampling through non-uniform keyframes. */
export function sampleVec3Keys(keys: Vec3Key[], t: number, out: THREE.Vector3): THREE.Vector3 {
  if (t <= keys[0].t) return out.set(...keys[0].v)
  const last = keys[keys.length - 1]
  if (t >= last.t) return out.set(...last.v)
  let i = 0
  while (i < keys.length - 2 && t > keys[i + 1].t) i++
  const k0 = keys[Math.max(0, i - 1)].v
  const k1 = keys[i].v
  const k2 = keys[i + 1].v
  const k3 = keys[Math.min(keys.length - 1, i + 2)].v
  const s = (t - keys[i].t) / (keys[i + 1].t - keys[i].t)
  return out.set(
    catmullRom(k0[0], k1[0], k2[0], k3[0], s),
    catmullRom(k0[1], k1[1], k2[1], k3[1], s),
    catmullRom(k0[2], k1[2], k2[2], k3[2], s),
  )
}

/** 2D value noise + fbm for procedural terrain. */
const hash2 = (x: number, y: number) => {
  const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
  return h - Math.floor(h)
}

export function valueNoise2(x: number, y: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash2(xi, yi)
  const b = hash2(xi + 1, yi)
  const c = hash2(xi, yi + 1)
  const d = hash2(xi + 1, yi + 1)
  return lerp(lerp(a, b, u), lerp(c, d, u), v)
}

export function fbm2(x: number, y: number, octaves = 4): number {
  let value = 0
  let amplitude = 0.5
  let fx = x
  let fy = y
  for (let i = 0; i < octaves; i++) {
    value += amplitude * valueNoise2(fx, fy)
    fx *= 2.03
    fy *= 2.03
    amplitude *= 0.5
  }
  return value
}
