import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { mulberry32, rangeWindow } from '../../utils/math'
import { frame, scratch } from '../frameState'

const FLOCK = 34

interface BirdSeed {
  radius: number
  speed: number
  phase: number
  height: number
  bob: number
  size: number
}

/**
 * A flock of instanced birds — two flapping triangles each — circling the
 * valley in the pastoral chapters and again over the finished city.
 */
export default function Birds() {
  const meshRef = useRef<THREE.InstancedMesh>(null)

  const seeds = useMemo<BirdSeed[]>(() => {
    const rand = mulberry32(99)
    return Array.from({ length: FLOCK }, () => ({
      radius: 60 + rand() * 160,
      speed: 0.1 + rand() * 0.12,
      phase: rand() * Math.PI * 2,
      height: 40 + rand() * 55,
      bob: rand() * Math.PI * 2,
      size: 0.7 + rand() * 0.8,
    }))
  }, [])

  const geometry = useMemo(() => {
    // Two triangles meeting at the body — wing flap driven in the shader
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array([
      // left wing
      0, 0, 0.8, 0, 0, -0.8, -2.2, 0, 0,
      // right wing
      0, 0, 0.8, 2.2, 0, 0, 0, 0, -0.8,
    ])
    const wingSide = new Float32Array([0, 0, -1, 0, 1, 0])
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aWing', new THREE.BufferAttribute(wingSide, 1))
    return geo
  }, [])

  const material = useMemo(() => {
    const mat = new THREE.MeshBasicMaterial({ color: '#2b3140', side: THREE.DoubleSide })
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 }
      mat.userData.shader = shader
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           attribute float aWing;
           uniform float uTime;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           float flap = sin(uTime * 9.0 + float(gl_InstanceID) * 1.7) * 0.9;
           transformed.y += abs(aWing) * flap * 1.4;`,
        )
    }
    return mat
  }, [])

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const shader = material.userData.shader as { uniforms: { uTime: { value: number } } } | undefined
    if (shader) shader.uniforms.uTime.value = frame.time

    // Birds live in the meadow era and return once the parks are planted
    const presence =
      rangeWindow(frame.p, 0, 0.13, 0.03) + rangeWindow(frame.p, 0.52, 0.68, 0.04) * 0.6
    mesh.visible = presence > 0.02
    if (!mesh.visible) return

    for (let i = 0; i < FLOCK; i++) {
      const s = seeds[i]
      const a = frame.time * s.speed + s.phase
      const x = Math.cos(a) * s.radius
      const z = Math.sin(a) * s.radius
      const y = s.height + Math.sin(frame.time * 0.9 + s.bob) * 4
      scratch.euler.set(0, -a - Math.PI / 2, Math.sin(frame.time * 0.9 + s.bob) * 0.12)
      scratch.quat.setFromEuler(scratch.euler)
      scratch.mat4.compose(
        scratch.v3a.set(x, y, z),
        scratch.quat,
        scratch.v3b.setScalar(s.size * presence),
      )
      mesh.setMatrixAt(i, scratch.mat4)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, FLOCK]} frustumCulled={false} />
  )
}
