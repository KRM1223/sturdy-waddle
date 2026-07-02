import * as THREE from 'three'

/** All textures are generated procedurally — no external assets. */

let glowTexture: THREE.Texture | null = null
export function getGlowTexture(): THREE.Texture {
  if (glowTexture) return glowTexture
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.35, 'rgba(255,255,255,0.5)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  glowTexture = new THREE.CanvasTexture(canvas)
  return glowTexture
}

let cloudTexture: THREE.Texture | null = null
export function getCloudTexture(): THREE.Texture {
  if (cloudTexture) return cloudTexture
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, size, size)
  // Layered soft blobs make a believable cumulus puff
  const blobs = 26
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * Math.PI * 2
    const rx = size * 0.26 + Math.sin(i * 12.9898) * size * 0.1
    const x = size / 2 + Math.cos(a) * rx * (0.4 + ((i * 7919) % 10) / 18)
    const y = size / 2 + Math.sin(a) * rx * 0.45 * (0.4 + ((i * 104729) % 10) / 18)
    const r = size * (0.1 + ((i * 31) % 10) / 55)
    const g = ctx.createRadialGradient(x, y, 0, x, y, r)
    g.addColorStop(0, 'rgba(255,255,255,0.16)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }
  cloudTexture = new THREE.CanvasTexture(canvas)
  return cloudTexture
}
