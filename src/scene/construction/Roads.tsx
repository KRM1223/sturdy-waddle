import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { T } from '../../config/timeline'
import { buildRoadSegments, ROAD_HALF } from '../../utils/cityPlan'
import { riverCenterX } from '../../utils/terrain'
import { clamp01, easeOutCubic, rangeProgress, rangeWindow } from '../../utils/math'
import { frame, scratch } from '../frameState'

const MAJOR = [-48, 0, 48]

/** Chapter 3 — the grid paves itself, markings draw on, lights rise. */
export default function Roads() {
  const segments = useMemo(() => buildRoadSegments(), [])
  const segRef = useRef<THREE.InstancedMesh>(null)
  const dashRef = useRef<THREE.InstancedMesh>(null)
  const poleRef = useRef<THREE.InstancedMesh>(null)
  const headRef = useRef<THREE.InstancedMesh>(null)
  const machinesRef = useRef<THREE.Group>(null)
  const lampMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([])
  const rollerDrumRefs = useRef<(THREE.Mesh | null)[]>([])

  const dashes = useMemo(() => {
    const list: { x: number; z: number; horizontal: boolean; stagger: number }[] = []
    for (const seg of segments) {
      for (let k = 0; k < 3; k++) {
        const offset = (k - 1) * (seg.length / 3.2)
        list.push({
          x: seg.horizontal ? seg.x + offset : seg.x,
          z: seg.horizontal ? seg.z : seg.z + offset,
          horizontal: seg.horizontal,
          stagger: seg.stagger + k * 0.02,
        })
      }
    }
    return list
  }, [segments])

  const streetLights = useMemo(() => {
    const list: { x: number; z: number; side: number }[] = []
    let i = 0
    for (const z of [-72, -24, 24, 72]) {
      for (let x = -84; x <= 84; x += 24) {
        list.push({ x, z: z + (i % 2 === 0 ? ROAD_HALF + 1 : -ROAD_HALF - 1), side: i % 2 ? 1 : -1 })
        i++
      }
    }
    return list
  }, [])

  const intersections = useMemo(() => {
    const list: { x: number; z: number; offset: number }[] = []
    for (const x of MAJOR) for (const z of MAJOR) list.push({ x, z, offset: (x + z + 96) / 192 })
    return list
  }, [])

  useFrame(() => {
    const p = frame.p
    const paving = rangeProgress(p, T.roads[0], T.roads[1] - 0.012)

    // Road chunks scale in along their length, rippling outward from the center
    if (segRef.current) {
      segRef.current.visible = paving > 0.001
      segments.forEach((seg, i) => {
        const local = easeOutCubic(clamp01(paving * 1.9 - seg.stagger * 0.9))
        scratch.euler.set(-Math.PI / 2, 0, seg.horizontal ? 0 : Math.PI / 2)
        scratch.quat.setFromEuler(scratch.euler)
        scratch.mat4.compose(
          scratch.v3a.set(seg.x, 0.06, seg.z),
          scratch.quat,
          scratch.v3b.set(Math.max(0.001, local) * seg.length, ROAD_HALF * 2, 1),
        )
        segRef.current!.setMatrixAt(i, scratch.mat4)
      })
      segRef.current.instanceMatrix.needsUpdate = true
    }

    // Lane markings draw on just behind the paving wave
    if (dashRef.current) {
      const marking = rangeProgress(p, T.roads[0] + 0.02, T.roads[1])
      dashRef.current.visible = marking > 0.001
      dashes.forEach((d, i) => {
        const local = easeOutCubic(clamp01(marking * 2.1 - d.stagger))
        scratch.euler.set(-Math.PI / 2, 0, d.horizontal ? 0 : Math.PI / 2)
        scratch.quat.setFromEuler(scratch.euler)
        scratch.mat4.compose(
          scratch.v3a.set(d.x, 0.12, d.z),
          scratch.quat,
          scratch.v3b.set(Math.max(0.001, local) * 2.6, 0.32, 1),
        )
        dashRef.current!.setMatrixAt(i, scratch.mat4)
      })
      dashRef.current.instanceMatrix.needsUpdate = true
    }

    // Street lights rise; heads glow at night
    if (poleRef.current && headRef.current) {
      const rise = rangeProgress(p, T.roads[0] + 0.035, T.roads[1] + 0.01)
      poleRef.current.visible = rise > 0.001
      headRef.current.visible = rise > 0.001
      streetLights.forEach((sl, i) => {
        const local = easeOutCubic(clamp01(rise * 2 - (Math.abs(sl.x) / 96) * 0.8))
        scratch.euler.set(0, 0, 0)
        scratch.quat.setFromEuler(scratch.euler)
        scratch.mat4.compose(
          scratch.v3a.set(sl.x, 0, sl.z),
          scratch.quat,
          scratch.v3b.set(1, Math.max(0.001, local), 1),
        )
        poleRef.current!.setMatrixAt(i, scratch.mat4)
        scratch.mat4.compose(
          scratch.v3a.set(sl.x, 6.4 * local, sl.z - sl.side * 0.9),
          scratch.quat,
          scratch.v3b.setScalar(Math.max(0.001, local)),
        )
        headRef.current!.setMatrixAt(i, scratch.mat4)
      })
      poleRef.current.instanceMatrix.needsUpdate = true
      headRef.current.instanceMatrix.needsUpdate = true
      const mat = headRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.15 + frame.night * 3.2
    }

    // Traffic lights cycle in a synchronized green wave
    lampMaterialsRef.current.forEach((mat, i) => {
      if (!mat) return
      const cycle = (frame.time * 0.22 + intersections[i].offset) % 1
      if (cycle < 0.45) mat.color.set('#22e06b')
      else if (cycle < 0.55) mat.color.set('#ffc23d')
      else mat.color.set('#ff4d4d')
      mat.emissive.copy(mat.color)
      mat.emissiveIntensity = 1.6 + frame.night * 2
    })

    // Bulldozer & rollers work while the grid is being paved
    if (machinesRef.current) {
      const working = rangeWindow(p, T.roads[0], T.roads[1] + 0.02, 0.015)
      machinesRef.current.visible = working > 0.005
      machinesRef.current.children.forEach((m, i) => {
        const t = Math.sin(frame.time * 0.24 + i * 2.1)
        m.position.z = t * 70
        m.rotation.y = Math.cos(frame.time * 0.24 + i * 2.1) > 0 ? 0 : Math.PI
        m.scale.setScalar(working)
      })
      rollerDrumRefs.current.forEach((drum) => {
        if (drum) drum.rotation.x += frame.dt * 2.4
      })
    }
  })

  // Traffic light poles are placed once; lamp material per pole for the cycle
  const trafficPoles = useMemo(() => intersections, [intersections])

  return (
    <group>
      <instancedMesh ref={segRef} args={[undefined, undefined, segments.length]} visible={false} receiveShadow>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#3d4148" roughness={0.92} />
      </instancedMesh>

      <instancedMesh ref={dashRef} args={[undefined, undefined, dashes.length]} visible={false}>
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial color="#e9ecef" roughness={0.6} emissive="#e9ecef" emissiveIntensity={0.08} />
      </instancedMesh>

      {/* Street lights */}
      <instancedMesh ref={poleRef} args={[undefined, undefined, streetLights.length]} visible={false}>
        <cylinderGeometry args={[0.14, 0.2, 13, 6]} />
        <meshStandardMaterial color="#5b6168" roughness={0.55} metalness={0.35} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined, undefined, streetLights.length]} visible={false}>
        <boxGeometry args={[0.5, 0.28, 1.7]} />
        <meshStandardMaterial color="#ffd9a0" emissive="#ffc87a" emissiveIntensity={0.15} />
      </instancedMesh>

      {/* Traffic lights at major intersections */}
      {trafficPoles.map((tp, i) => (
        <TrafficLight
          key={i}
          x={tp.x}
          z={tp.z}
          registerLamp={(mat) => {
            lampMaterialsRef.current[i] = mat
          }}
        />
      ))}

      {/* Roundabout ring around the central plaza */}
      <Roundabout />

      {/* Bridges over the river */}
      <Bridge z={0} />
      <Bridge z={48} small />

      {/* Road machines */}
      <group ref={machinesRef} visible={false}>
        {[-24, 24].map((x, i) => (
          <group key={x} position={[x + 1.5, 0, 0]}>
            {/* steam roller */}
            <mesh position={[0, 1.6, 0]} castShadow>
              <boxGeometry args={[3.4, 1.4, 2]} />
              <meshStandardMaterial color="#e8a020" roughness={0.6} />
            </mesh>
            <mesh position={[0.2, 2.7, 0]}>
              <boxGeometry args={[1.4, 1, 1.6]} />
              <meshStandardMaterial color="#3b4048" roughness={0.5} />
            </mesh>
            <mesh
              ref={(el) => {
                rollerDrumRefs.current[i] = el
              }}
              position={[2.2, 0.85, 0]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.85, 0.85, 2.1, 12]} />
              <meshStandardMaterial color="#9aa2ab" roughness={0.4} metalness={0.5} />
            </mesh>
          </group>
        ))}
        {/* bulldozer */}
        <group position={[73, 0, 0]}>
          <mesh position={[0, 1.3, 0]} castShadow>
            <boxGeometry args={[3, 1.6, 2.4]} />
            <meshStandardMaterial color="#d97b29" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.55, 0]}>
            <boxGeometry args={[3.4, 1, 2.8]} />
            <meshStandardMaterial color="#2a2d33" roughness={0.95} />
          </mesh>
          <mesh position={[2.2, 1, 0]}>
            <boxGeometry args={[0.4, 1.6, 3.2]} />
            <meshStandardMaterial color="#8b9298" roughness={0.5} metalness={0.4} />
          </mesh>
        </group>
      </group>
    </group>
  )
}

function TrafficLight({
  x,
  z,
  registerLamp,
}: {
  x: number
  z: number
  registerLamp: (mat: THREE.MeshStandardMaterial) => void
}) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(() => {
    if (!groupRef.current) return
    const rise = easeOutCubic(rangeProgress(frame.p, T.roads[0] + 0.045, T.roads[1] + 0.015))
    groupRef.current.scale.setScalar(Math.max(0.001, rise))
    groupRef.current.visible = rise > 0.002
  })

  return (
    <group ref={groupRef} position={[x + ROAD_HALF + 0.8, 0, z + ROAD_HALF + 0.8]} visible={false}>
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 6, 6]} />
        <meshStandardMaterial color="#4c525a" roughness={0.55} metalness={0.35} />
      </mesh>
      <mesh position={[0, 5.6, 0]}>
        <boxGeometry args={[0.55, 1.5, 0.55]} />
        <meshStandardMaterial color="#22252a" roughness={0.7} />
      </mesh>
      <mesh position={[0, 5.6, 0.31]}>
        <sphereGeometry args={[0.19, 8, 8]} />
        <meshStandardMaterial
          ref={(mat) => {
            if (mat) registerLamp(mat)
          }}
          color="#22e06b"
          emissive="#22e06b"
          emissiveIntensity={1.6}
        />
      </mesh>
    </group>
  )
}

function Roundabout() {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!ref.current) return
    const grow = easeOutCubic(rangeProgress(frame.p, T.roads[0] + 0.03, T.roads[1]))
    ref.current.scale.setScalar(Math.max(0.001, grow))
    ref.current.visible = grow > 0.002
  })
  return (
    <group ref={ref} position={[0, 0, 0]} visible={false}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <ringGeometry args={[8.5, 14.5, 40]} />
        <meshStandardMaterial color="#3d4148" roughness={0.92} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.14, 0]}>
        <ringGeometry args={[11.2, 11.6, 40]} />
        <meshStandardMaterial color="#e9ecef" roughness={0.6} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <circleGeometry args={[8.5, 32]} />
        <meshStandardMaterial color="#5d8f4e" roughness={0.95} />
      </mesh>
    </group>
  )
}

function Bridge({ z, small = false }: { z: number; small?: boolean }) {
  const ref = useRef<THREE.Group>(null)
  const rx = riverCenterX(z)
  const width = small ? 5 : 8
  const span = 60

  useFrame(() => {
    if (!ref.current) return
    const grow = easeOutCubic(
      rangeProgress(frame.p, T.roads[0] + (small ? 0.045 : 0.03), T.roads[1] + 0.01),
    )
    ref.current.visible = grow > 0.002
    // decks extend from the east bank; arches rise
    ref.current.children.forEach((child, i) => {
      if (child.name === 'deck') {
        child.scale.x = Math.max(0.001, grow)
      } else {
        child.scale.y = Math.max(0.001, Math.min(1, grow * 1.4 - i * 0.05))
      }
    })
  })

  return (
    <group ref={ref} position={[rx, 0, z]} visible={false}>
      <mesh name="deck" position={[0, 2.6, 0]} castShadow>
        <boxGeometry args={[span, 0.8, width]} />
        <meshStandardMaterial color="#767d85" roughness={0.7} />
      </mesh>
      {[-18, 0, 18].map((px) => (
        <mesh key={px} position={[px, 0.6, 0]}>
          <boxGeometry args={[2.2, 4.4, width * 0.8]} />
          <meshStandardMaterial color="#5e646c" roughness={0.85} />
        </mesh>
      ))}
      {[-width / 2 + 0.4, width / 2 - 0.4].map((pz) => (
        <mesh key={pz} position={[0, 4.4, pz]}>
          <torusGeometry args={[span / 2.4, 0.35, 6, 24, Math.PI]} />
          <meshStandardMaterial color="#9aa6b2" roughness={0.5} metalness={0.4} />
        </mesh>
      ))}
    </group>
  )
}
