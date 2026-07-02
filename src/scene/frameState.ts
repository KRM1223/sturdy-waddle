import * as THREE from 'three'

/**
 * Per-frame derived state, computed once by TimelineUpdater and read by every
 * scene system inside useFrame. Mutable on purpose — nothing here touches React.
 */
export const frame = {
  /** Smoothed global progress 0..1 */
  p: 0,
  /** Elapsed time (s), paused-aware */
  time: 0,
  dt: 0,
  night: 0,
  underground: 0,
  rain: 0,
  snow: 0,
  storm: 0,
  /** Lightning flash 0..1, decays fast */
  lightning: 0,
  cloudCover: 0.5,
  cloudDark: 0,
  stars: 0,
  moon: 0,
  aurora: 0,
  rainbow: 0,
  wireframe: false,
  windStrength: 1,
}

export const scratch = {
  v3a: new THREE.Vector3(),
  v3b: new THREE.Vector3(),
  v3c: new THREE.Vector3(),
  colorA: new THREE.Color(),
  colorB: new THREE.Color(),
  quat: new THREE.Quaternion(),
  mat4: new THREE.Matrix4(),
  euler: new THREE.Euler(),
}
