import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { T } from '../../config/timeline'
import { mulberry32, rangeProgress } from '../../utils/math'
import { GRID_EXTENT } from '../../utils/cityPlan'
import { frame, scratch } from '../frameState'

const CAR_COUNT = 72
const ROADS = [-72, -48, -24, 0, 24, 48, 72]
const CAR_COLORS = ['#c94f4f', '#4f7dc9', '#d8d8d8', '#3f4650', '#c9a23f', '#5aa86e', '#8a56b0']

interface CarSeed {
  road: number
  horizontal: boolean
  lane: number
  speed: number
  offset: number
  dir: number
  color: string
  isBus: boolean
}

/** Chapter 8 — traffic, the metro line, and aircraft. */
export default function Traffic() {
  const bodyRef = useRef<THREE.InstancedMesh>(null)
  const cabinRef = useRef<THREE.InstancedMesh>(null)
  const trainRef = useRef<THREE.Group>(null)
  const planeRefs = useRef<(THREE.Group | null)[]>([])

  const cars = useMemo<CarSeed[]>(() => {
    const rand = mulberry32(3111)
    return Array.from({ length: CAR_COUNT }, (_, i) => {
      const dir = rand() > 0.5 ? 1 : -1
      return {
        road: ROADS[Math.floor(rand() * ROADS.length)],
        horizontal: rand() > 0.5,
        lane: dir * 1.7,
        speed: 9 + rand() * 9,
        offset: rand() * GRID_EXTENT * 2,
        dir,
        color: CAR_COLORS[i % CAR_COLORS.length],
        isBus: i % 12 === 0,
      }
    })
  }, [])

  const colorsSet = useRef(false)

  useFrame(() => {
    const p = frame.p
    const density = rangeProgress(p, T.alive[0], T.alive[0] + 0.04)
    const body = bodyRef.current
    const cabin = cabinRef.current
    if (!body || !cabin) return

    if (!colorsSet.current) {
      colorsSet.current = true
      const c = new THREE.Color()
      cars.forEach((car, i) => body.setColorAt(i, c.set(car.isBus ? '#3fb8c9' : car.color)))
      if (body.instanceColor) body.instanceColor.needsUpdate = true
    }

    body.visible = density > 0.01
    cabin.visible = body.visible
    if (body.visible) {
      const span = GRID_EXTENT * 2
      cars.forEach((car, i) => {
        // fewer cars during the storm, none before the city wakes
        const active = i / CAR_COUNT < density * (1 - frame.storm * 0.55) ? 1 : 0
        const travel = ((frame.time * car.speed + car.offset) % span) - GRID_EXTENT
        const along = travel * car.dir
        const x = car.horizontal ? along : car.road + car.lane
        const z = car.horizontal ? car.road + car.lane : along
        const heading = car.horizontal
          ? car.dir > 0
            ? Math.PI / 2
            : -Math.PI / 2
          : car.dir > 0
            ? 0
            : Math.PI
        scratch.euler.set(0, heading, 0)
        scratch.quat.setFromEuler(scratch.euler)
        const len = car.isBus ? 2.4 : 1
        scratch.mat4.compose(
          scratch.v3a.set(x, 0.55, z),
          scratch.quat,
          scratch.v3b.set(active, active, active * len),
        )
        body.setMatrixAt(i, scratch.mat4)
        scratch.mat4.compose(
          scratch.v3a.set(x, 1.05, z),
          scratch.quat,
          scratch.v3b.set(active * 0.85, active, active * len * 0.55),
        )
        cabin.setMatrixAt(i, scratch.mat4)
      })
      body.instanceMatrix.needsUpdate = true
      cabin.instanceMatrix.needsUpdate = true
      const cabinMat = cabin.material as THREE.MeshStandardMaterial
      cabinMat.emissiveIntensity = 0.1 + frame.night * 1.4
    }

    // Metro train shuttling on the northern line
    if (trainRef.current) {
      const show = rangeProgress(p, T.alive[0] + 0.01, T.alive[0] + 0.05)
      trainRef.current.visible = show > 0.01
      const s = Math.sin(frame.time * 0.14)
      const z = -60 + s * 52
      trainRef.current.position.set(60, 0.9, z)
      trainRef.current.scale.setScalar(show)
    }

    // Aircraft loop: taxi, roll, climb out, circle, land
    planeRefs.current.forEach((plane, i) => {
      if (!plane) return
      const show = rangeProgress(p, T.infrastructure[1] - 0.02, T.alive[0] + 0.03)
      plane.visible = show > 0.01 && frame.storm < 0.4
      const cycle = (frame.time * 0.03 + i * 0.5) % 1
      let x: number
      let y: number
      let pitch = 0
      if (cycle < 0.25) {
        // takeoff roll
        const t = cycle / 0.25
        x = 120 + t * t * 120
        y = 0.8
      } else if (cycle < 0.5) {
        // climb
        const t = (cycle - 0.25) / 0.25
        x = 240 + t * 160
        y = 0.8 + t * t * 60
        pitch = -0.3
      } else if (cycle < 0.85) {
        // wide circuit back over the hills
        const t = (cycle - 0.5) / 0.35
        const a = t * Math.PI
        x = 240 + Math.cos(a) * 160
        y = 60
        plane.position.set(x, y, 84 - Math.sin(a) * 180)
        plane.rotation.set(0, a, Math.sin(a) * 0.25)
        plane.scale.setScalar(show * 1.6)
        return
      } else {
        // final approach
        const t = (cycle - 0.85) / 0.15
        x = 80 + t * 60
        y = 40 * (1 - t) * (1 - t) + 0.8
        pitch = 0.12
      }
      plane.position.set(x, y, 84)
      plane.rotation.set(0, 0, pitch)
      plane.scale.setScalar(show * 1.6)
    })
  })

  return (
    <group>
      <instancedMesh ref={bodyRef} args={[undefined, undefined, CAR_COUNT]} visible={false}>
        <boxGeometry args={[1.5, 0.7, 3.1]} />
        <meshStandardMaterial roughness={0.35} metalness={0.35} />
      </instancedMesh>
      <instancedMesh ref={cabinRef} args={[undefined, undefined, CAR_COUNT]} visible={false}>
        <boxGeometry args={[1.3, 0.55, 1.7]} />
        <meshStandardMaterial color="#1d232c" emissive="#ffd9a0" emissiveIntensity={0.1} roughness={0.2} metalness={0.4} />
      </instancedMesh>

      {/* Metro train — four cars */}
      <group ref={trainRef} visible={false}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[0, 0, i * 4.4 - 6.6]} castShadow>
            <boxGeometry args={[2, 1.6, 4]} />
            <meshStandardMaterial
              color={i === 0 ? '#d94f4f' : '#dfe5eb'}
              emissive="#ffd9a0"
              emissiveIntensity={0.25}
              roughness={0.35}
              metalness={0.3}
            />
          </mesh>
        ))}
      </group>

      {/* Two aircraft on the circuit */}
      {[0, 1].map((i) => (
        <group
          key={i}
          ref={(el) => {
            planeRefs.current[i] = el
          }}
          visible={false}
        >
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.5, 0.7, 7, 8]} />
            <meshStandardMaterial color="#e8ecf0" roughness={0.35} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.2, 0.5]}>
            <boxGeometry args={[9, 0.16, 1.5]} />
            <meshStandardMaterial color="#d5dbe2" roughness={0.4} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.9, -3.1]}>
            <boxGeometry args={[0.14, 1.6, 1.2]} />
            <meshStandardMaterial color="#d94f4f" roughness={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
