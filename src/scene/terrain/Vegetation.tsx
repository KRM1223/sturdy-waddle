import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { isMeadow, meadowSlopeOk, terrainHeight } from '../../utils/terrain'
import { mulberry32 } from '../../utils/math'
import { experience } from '../../store/experience'
import { frame, scratch } from '../frameState'

const TREE_COUNT = 640
const FLOWER_COUNT = 900

interface Placement {
  x: number
  y: number
  z: number
  scale: number
  rot: number
  tint: number
}

function scatter(count: number, seed: number, minR: number, maxR: number): Placement[] {
  const rand = mulberry32(seed)
  const placements: Placement[] = []
  let guard = 0
  while (placements.length < count && guard < count * 30) {
    guard++
    const a = rand() * Math.PI * 2
    const r = minR + Math.sqrt(rand()) * (maxR - minR)
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    if (!isMeadow(x, z) || !meadowSlopeOk(x, z)) continue
    placements.push({
      x,
      y: terrainHeight(x, z),
      z,
      scale: 0.65 + rand() * 0.85,
      rot: rand() * Math.PI * 2,
      tint: rand(),
    })
  }
  return placements
}

/** Wind sway injected into standard materials — bends tops, keeps roots planted. */
function makeSwayMaterial(base: THREE.MeshStandardMaterial, strength: number) {
  base.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 }
    shader.uniforms.uWind = { value: 1 }
    shader.uniforms.uCursor = { value: new THREE.Vector3(0, -999, 0) }
    base.userData.shader = shader
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
         uniform float uTime;
         uniform float uWind;
         uniform vec3 uCursor;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         {
           vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
           float phase = wp.x * 0.15 + wp.z * 0.12;
           float bendAmount = max(transformed.y, 0.0) * ${strength.toFixed(3)};
           transformed.x += sin(uTime * 1.6 + phase) * bendAmount * uWind;
           transformed.z += cos(uTime * 1.1 + phase * 1.3) * bendAmount * 0.6 * uWind;
           // cursor gust — plants lean away from the pointer like a hand through grass
           vec2 away = wp.xz - uCursor.xz;
           float cursorDist = length(away);
           float gust = exp(-cursorDist * cursorDist / 260.0) * max(transformed.y, 0.0);
           if (cursorDist > 0.001) {
             transformed.xz += normalize(away) * gust * ${(strength * 6).toFixed(3)};
           }
         }`,
      )
  }
  base.customProgramCacheKey = () => `sway-${strength}`
  return base
}

export default function Vegetation() {
  const trees = useMemo(() => scatter(TREE_COUNT, 313, 112, 420), [])
  const flowers = useMemo(() => scatter(FLOWER_COUNT, 517, 112, 260), [])

  const trunkRef = useRef<THREE.InstancedMesh>(null)
  const canopyRef = useRef<THREE.InstancedMesh>(null)
  const flowerRef = useRef<THREE.InstancedMesh>(null)

  const canopyMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true })
    return makeSwayMaterial(mat, 0.045)
  }, [])
  const flowerMaterial = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.85, side: THREE.DoubleSide })
    return makeSwayMaterial(mat, 0.35)
  }, [])

  // Static instance matrices — set once
  const initialized = useRef(false)
  useFrame(() => {
    if (!initialized.current && trunkRef.current && canopyRef.current && flowerRef.current) {
      initialized.current = true
      const m = new THREE.Matrix4()
      const q = new THREE.Quaternion()
      const e = new THREE.Euler()
      const s = new THREE.Vector3()
      const v = new THREE.Vector3()
      const c = new THREE.Color()

      trees.forEach((t, i) => {
        e.set(0, t.rot, 0)
        q.setFromEuler(e)
        m.compose(v.set(t.x, t.y, t.z), q, s.setScalar(t.scale))
        trunkRef.current!.setMatrixAt(i, m)
        canopyRef.current!.setMatrixAt(i, m)
        c.setHSL(0.29 + t.tint * 0.07, 0.42 + t.tint * 0.2, 0.3 + t.tint * 0.12)
        canopyRef.current!.setColorAt(i, c)
      })
      trunkRef.current.instanceMatrix.needsUpdate = true
      canopyRef.current.instanceMatrix.needsUpdate = true
      if (canopyRef.current.instanceColor) canopyRef.current.instanceColor.needsUpdate = true

      const flowerHues = [0.0, 0.09, 0.13, 0.72, 0.85]
      flowers.forEach((f, i) => {
        e.set(0, f.rot, 0)
        q.setFromEuler(e)
        m.compose(v.set(f.x, f.y, f.z), q, s.setScalar(f.scale * 0.6))
        flowerRef.current!.setMatrixAt(i, m)
        const hue = flowerHues[Math.floor(f.tint * flowerHues.length) % flowerHues.length]
        c.setHSL(hue, 0.75, 0.62)
        flowerRef.current!.setColorAt(i, c)
      })
      flowerRef.current.instanceMatrix.needsUpdate = true
      if (flowerRef.current.instanceColor) flowerRef.current.instanceColor.needsUpdate = true
    }

    // Drive the wind + cursor gust
    for (const mat of [canopyMaterial, flowerMaterial]) {
      const shader = mat.userData.shader as
        | {
            uniforms: {
              uTime: { value: number }
              uWind: { value: number }
              uCursor: { value: THREE.Vector3 }
            }
          }
        | undefined
      if (shader) {
        shader.uniforms.uTime.value = frame.time
        shader.uniforms.uWind.value = experience.reducedMotion ? 0.15 : frame.windStrength
        if (frame.cursorActive && !experience.reducedMotion) {
          shader.uniforms.uCursor.value.copy(frame.cursor)
        } else {
          shader.uniforms.uCursor.value.set(0, -999, 9999)
        }
      }
    }
    // Snow whitens canopies
    if (canopyRef.current) {
      const mat = canopyRef.current.material as THREE.MeshStandardMaterial
      mat.color.set('#ffffff').lerp(scratch.colorB.set('#f2f6fa'), frame.snow * 0.6)
    }
  })

  const trunkGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.22, 0.4, 3.2, 5)
    geo.translate(0, 1.6, 0)
    return geo
  }, [])
  const canopyGeometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(2.2, 0)
    geo.scale(1, 1.35, 1)
    geo.translate(0, 4.6, 0)
    return geo
  }, [])
  const flowerGeometry = useMemo(() => {
    // two crossed quads
    const a = new THREE.PlaneGeometry(0.55, 0.8)
    a.translate(0, 0.4, 0)
    const b = a.clone()
    b.rotateY(Math.PI / 2)
    const merged = new THREE.BufferGeometry()
    const posA = a.attributes.position.array as Float32Array
    const posB = b.attributes.position.array as Float32Array
    const uvA = a.attributes.uv.array as Float32Array
    const uvB = b.attributes.uv.array as Float32Array
    const normA = a.attributes.normal.array as Float32Array
    const normB = b.attributes.normal.array as Float32Array
    const idxA = Array.from(a.index!.array)
    const idxB = Array.from(b.index!.array).map((i) => i + posA.length / 3)
    merged.setAttribute('position', new THREE.BufferAttribute(new Float32Array([...posA, ...posB]), 3))
    merged.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([...normA, ...normB]), 3))
    merged.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([...uvA, ...uvB]), 2))
    merged.setIndex([...idxA, ...idxB])
    return merged
  }, [])

  return (
    <group>
      <instancedMesh ref={trunkRef} args={[trunkGeometry, undefined, TREE_COUNT]} castShadow>
        <meshStandardMaterial color="#6d4c33" roughness={0.95} flatShading />
      </instancedMesh>
      <instancedMesh
        ref={canopyRef}
        args={[canopyGeometry, canopyMaterial, TREE_COUNT]}
        castShadow
      />
      <instancedMesh ref={flowerRef} args={[flowerGeometry, flowerMaterial, FLOWER_COUNT]} />
    </group>
  )
}
