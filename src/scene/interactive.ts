/**
 * The bridge between user gestures and world reactions.
 * Click handlers push requests here; scene systems consume them each frame.
 */

export interface BurstRequest {
  x: number
  y: number
  z: number
  /** 0..1 hue, or -1 for earth-toned dust */
  hue: number
  /** particle spread radius in world units */
  radius: number
}

export interface PlantRequest {
  x: number
  z: number
}

export const burstQueue: BurstRequest[] = []
export const plantQueue: PlantRequest[] = []

export function requestBurst(req: BurstRequest) {
  if (burstQueue.length < 6) burstQueue.push(req)
}

export function requestPlant(req: PlantRequest) {
  if (plantQueue.length < 6) plantQueue.push(req)
}
