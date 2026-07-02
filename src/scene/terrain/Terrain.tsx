import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { CITY_RADIUS, terrainHeight, WORLD_SIZE } from '../../utils/terrain'
import { fbm2, lerp, rangeProgress, smoothstep } from '../../utils/math'
import { T } from '../../config/timeline'
import { frame, scratch } from '../frameState'

const SEGMENTS = 220

const grass = new THREE.Color('#6fae5c')
const grassDry = new THREE.Color('#8fb763')
const rock = new THREE.Color('#8d8478')
const snowCap = new THREE.Color('#eef3f6')
const soil = new THREE.Color('#9a7d55')
const pavement = new THREE.Color('#7a8087')

/**
 * The single ground mesh: procedural mountains, meadow vertex colors, and a
 * plaza that gradually turns from grass to graded earth to pavement as the
 * city is built. Fades translucent for the underground chapter.
 */
export default function Terrain() {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  const groundStage = useRef(-1)

  const { geometry, meadowMask } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, SEGMENTS, SEGMENTS)
    geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position as THREE.BufferAttribute
    const colors = new Float32Array(pos.count * 3)
    const mask = new Float32Array(pos.count)
    const c = new THREE.Color()
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const h = terrainHeight(x, z)
      pos.setY(i, h)
      const d = Math.hypot(x, z)
      const inCity = 1 - smoothstep(CITY_RADIUS * 0.95, CITY_RADIUS * 1.18, d)
      mask[i] = inCity
      const n = fbm2(x * 0.02, z * 0.02, 3)
      c.copy(grass).lerp(grassDry, n)
      const rockiness = smoothstep(24, 60, h + n * 10)
      c.lerp(rock, rockiness)
      c.lerp(snowCap, smoothstep(88, 130, h))
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return { geometry: geo, meadowMask: mask }
  }, [])

  // Repaint city-plateau vertices as construction progresses (staged, not per-frame)
  useFrame(() => {
    const mesh = meshRef.current
    const mat = materialRef.current
    if (!mesh || !mat) return

    const targetOpacity = 1 - frame.underground * 0.88
    mat.opacity = lerp(mat.opacity, targetOpacity, 0.08)
    mat.transparent = true

    // snow tints the world; night dims it
    const snowTint = frame.snow * 0.55
    mat.color
      .copy(scratch.colorA.set('#ffffff'))
      .lerp(scratch.colorB.set('#dfe8f2'), snowTint)
      .multiplyScalar(1 - frame.night * 0.55)

    const grade = rangeProgress(frame.p, T.survey[0], T.roads[1])
    const stage = Math.round(grade * 24)
    if (stage !== groundStage.current) {
      groundStage.current = stage
      const t = stage / 24
      const colorAttr = mesh.geometry.attributes.color as THREE.BufferAttribute
      const posAttr = mesh.geometry.attributes.position as THREE.BufferAttribute
      const c = new THREE.Color()
      const base = new THREE.Color()
      for (let i = 0; i < posAttr.count; i++) {
        const m = meadowMask[i]
        if (m <= 0.01) continue
        const x = posAttr.getX(i)
        const z = posAttr.getZ(i)
        const n = fbm2(x * 0.02, z * 0.02, 3)
        base.copy(grass).lerp(grassDry, n)
        // grass → exposed soil → uniform graded pavement tone
        c.copy(base)
        if (t < 0.55) c.lerp(soil, smoothstep(0.08, 0.55, t) * m)
        else c.copy(soil).lerp(pavement, smoothstep(0.55, 1, t)).lerp(base, 1 - m)
        colorAttr.setXYZ(i, c.r, c.g, c.b)
      }
      colorAttr.needsUpdate = true
    }
  })

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow>
      <meshStandardMaterial
        ref={materialRef}
        vertexColors
        roughness={0.94}
        metalness={0}
        transparent
        flatShading
      />
    </mesh>
  )
}
