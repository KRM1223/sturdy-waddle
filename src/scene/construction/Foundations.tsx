import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { T } from '../../config/timeline'
import { clamp01, easeOutCubic, mulberry32, rangeProgress, rangeWindow } from '../../utils/math'
import { BUILDINGS, CRANE_SITES } from '../city/cityData'
import { frame, scratch } from '../frameState'

/** Chapter 5 — pits, rebar, poured concrete pads, tower cranes, deliveries. */
export default function Foundations() {
  const padsRef = useRef<THREE.InstancedMesh>(null)
  const rebarRef = useRef<THREE.InstancedMesh>(null)
  const stacksRef = useRef<THREE.InstancedMesh>(null)
  const cranesRef = useRef<THREE.Group>(null)
  const jibRefs = useRef<(THREE.Group | null)[]>([])

  const rebarPins = useMemo(() => {
    const rand = mulberry32(555)
    const pins: { x: number; z: number; stagger: number }[] = []
    for (const b of BUILDINGS) {
      if (b.height < 20 && rand() < 0.5) continue
      const n = b.height > 40 ? 5 : 3
      for (let i = 0; i < n; i++) {
        pins.push({
          x: b.x + (rand() - 0.5) * b.width * 0.7,
          z: b.z + (rand() - 0.5) * b.depth * 0.7,
          stagger: rand(),
        })
      }
    }
    return pins
  }, [])

  const stacks = useMemo(() => {
    const rand = mulberry32(919)
    return Array.from({ length: 26 }, () => ({
      x: (rand() - 0.5) * 170,
      z: (rand() - 0.5) * 170,
      rot: rand() * Math.PI,
      stagger: rand(),
    }))
  }, [])

  useFrame(() => {
    const p = frame.p
    const phase = rangeProgress(p, T.foundations[0], T.foundations[1])
    // Foundations remain visible until each tower has grown over them
    const show = rangeWindow(p, T.foundations[0], T.buildings[1] + 0.05, 0.02)

    if (padsRef.current) {
      padsRef.current.visible = show > 0.004
      BUILDINGS.forEach((b, i) => {
        const local = easeOutCubic(clamp01(phase * 2 - (Math.hypot(b.x, b.z) / 110) * 0.9))
        scratch.mat4.compose(
          scratch.v3a.set(b.x, 0.25 * local, b.z),
          scratch.quat.identity(),
          scratch.v3b.set(
            Math.max(0.001, local) * (b.width + 1.2),
            Math.max(0.001, local * 0.6),
            Math.max(0.001, local) * (b.depth + 1.2),
          ),
        )
        padsRef.current!.setMatrixAt(i, scratch.mat4)
      })
      padsRef.current.instanceMatrix.needsUpdate = true
    }

    if (rebarRef.current) {
      // rebar rises before the pour, disappears as buildings swallow it
      const rebarLife = rangeWindow(p, T.foundations[0] + 0.008, T.buildings[0] + 0.05, 0.02)
      rebarRef.current.visible = rebarLife > 0.004
      rebarPins.forEach((pin, i) => {
        const local = easeOutCubic(clamp01(phase * 2.4 - pin.stagger))
        scratch.mat4.compose(
          scratch.v3a.set(pin.x, 1.6 * local * rebarLife, pin.z),
          scratch.quat.identity(),
          scratch.v3b.set(1, Math.max(0.001, local * rebarLife), 1),
        )
        rebarRef.current!.setMatrixAt(i, scratch.mat4)
      })
      rebarRef.current.instanceMatrix.needsUpdate = true
    }

    if (stacksRef.current) {
      const stackLife = rangeWindow(p, T.foundations[0], T.buildings[1], 0.025)
      stacksRef.current.visible = stackLife > 0.004
      stacks.forEach((s, i) => {
        const local = easeOutCubic(clamp01(phase * 2.2 - s.stagger))
        scratch.euler.set(0, s.rot, 0)
        scratch.quat.setFromEuler(scratch.euler)
        scratch.mat4.compose(
          scratch.v3a.set(s.x, 0.5, s.z),
          scratch.quat,
          scratch.v3b.setScalar(Math.max(0.001, local * stackLife)),
        )
        stacksRef.current!.setMatrixAt(i, scratch.mat4)
      })
      stacksRef.current.instanceMatrix.needsUpdate = true
    }

    if (cranesRef.current) {
      const craneLife = rangeWindow(p, T.foundations[0] + 0.01, T.infrastructure[0] + 0.02, 0.03)
      cranesRef.current.visible = craneLife > 0.004
      cranesRef.current.children.forEach((crane, i) => {
        const rise = easeOutCubic(clamp01(craneLife * 2 - i * 0.06))
        crane.scale.set(1, Math.max(0.001, rise), 1)
      })
      jibRefs.current.forEach((jib, i) => {
        if (jib) jib.rotation.y = Math.sin(frame.time * 0.16 + i * 1.9) * 1.6 + i
      })
    }
  })

  return (
    <group>
      <instancedMesh ref={padsRef} args={[undefined, undefined, BUILDINGS.length]} visible={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#8f9499" roughness={0.95} />
      </instancedMesh>

      <instancedMesh ref={rebarRef} args={[undefined, undefined, rebarPins.length]} visible={false}>
        <boxGeometry args={[0.14, 3.2, 0.14]} />
        <meshStandardMaterial color="#7a4a28" roughness={0.5} metalness={0.6} />
      </instancedMesh>

      <instancedMesh ref={stacksRef} args={[undefined, undefined, stacks.length]} visible={false}>
        <boxGeometry args={[3.2, 1.1, 1.6]} />
        <meshStandardMaterial color="#b6a98f" roughness={0.85} />
      </instancedMesh>

      {/* Tower cranes over the tallest sites */}
      <group ref={cranesRef} visible={false}>
        {CRANE_SITES.map((site, i) => {
          const mastH = site.height + 18
          return (
            <group key={site.id} position={[site.x + site.width * 0.8, 0, site.z + site.depth * 0.8]}>
              <mesh position={[0, mastH / 2, 0]}>
                <boxGeometry args={[1.1, mastH, 1.1]} />
                <meshStandardMaterial color="#e8b62a" roughness={0.55} />
              </mesh>
              <group
                position={[0, mastH, 0]}
                ref={(el) => {
                  jibRefs.current[i] = el
                }}
              >
                <mesh position={[9, 0.5, 0]}>
                  <boxGeometry args={[22, 0.9, 0.9]} />
                  <meshStandardMaterial color="#e8b62a" roughness={0.55} />
                </mesh>
                <mesh position={[-5, 0.5, 0]}>
                  <boxGeometry args={[6, 1.6, 1.4]} />
                  <meshStandardMaterial color="#7d7466" roughness={0.9} />
                </mesh>
                {/* hook cable */}
                <mesh position={[14, -3.5, 0]}>
                  <boxGeometry args={[0.09, 8, 0.09]} />
                  <meshStandardMaterial color="#2b2e33" roughness={0.6} />
                </mesh>
                <mesh position={[14, -7.8, 0]}>
                  <boxGeometry args={[1.4, 1.1, 1.4]} />
                  <meshStandardMaterial color="#9aa2ab" roughness={0.6} metalness={0.4} />
                </mesh>
              </group>
              <pointLight position={[0, mastH + 2, 0]} color="#ff4d4d" intensity={4} distance={16} />
            </group>
          )
        })}
      </group>
    </group>
  )
}
