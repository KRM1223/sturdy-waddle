import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { T } from '../../config/timeline'
import { mulberry32, rangeProgress } from '../../utils/math'
import { frame, scratch } from '../frameState'

const PEOPLE_COUNT = 140
const DOG_COUNT = 14
const CYCLIST_COUNT = 16

const OUTFITS = ['#e0684f', '#4f7de0', '#f0d9b8', '#3f4a5c', '#6fc06e', '#d05a9c', '#f0c03f', '#4fc0b8', '#9c6ad9', '#f09850']
const SKIN_TONES = ['#f0c8a0', '#e0b088', '#c89068', '#a07048', '#805030', '#f0d8b8']

interface PersonSeed {
  road: number
  horizontal: boolean
  side: number
  speed: number
  offset: number
  dir: number
  scale: number // children are smaller
  color: string
  skin: string
  stride: number
}

/**
 * Chapter 8 — fully articulated citizens: swinging legs and arms, varied
 * outfits and skin tones, children, dogs with wagging tails, and cyclists.
 */
export default function Citizens() {
  const torsoRef = useRef<THREE.InstancedMesh>(null)
  const headRef = useRef<THREE.InstancedMesh>(null)
  const legsRef = useRef<THREE.InstancedMesh>(null)
  const armsRef = useRef<THREE.InstancedMesh>(null)
  const dogBodyRef = useRef<THREE.InstancedMesh>(null)
  const dogHeadRef = useRef<THREE.InstancedMesh>(null)
  const dogTailRef = useRef<THREE.InstancedMesh>(null)
  const cyclistRef = useRef<THREE.InstancedMesh>(null)
  const wheelRef = useRef<THREE.InstancedMesh>(null)

  const people = useMemo<PersonSeed[]>(() => {
    const rand = mulberry32(9008)
    const roads = [-72, -48, -24, 0, 24, 48, 72]
    return Array.from({ length: PEOPLE_COUNT }, (_, i) => ({
      road: roads[Math.floor(rand() * roads.length)],
      horizontal: rand() > 0.5,
      side: rand() > 0.5 ? 4.6 : -4.6,
      speed: 1.1 + rand() * 1.3,
      offset: rand() * 180,
      dir: rand() > 0.5 ? 1 : -1,
      scale: i % 9 === 0 ? 0.55 : 0.9 + rand() * 0.25, // every ninth is a child
      color: OUTFITS[Math.floor(rand() * OUTFITS.length)],
      skin: SKIN_TONES[Math.floor(rand() * SKIN_TONES.length)],
      stride: 0.4 + rand() * 0.25,
    }))
  }, [])

  const dogs = useMemo(() => {
    const rand = mulberry32(1212)
    return Array.from({ length: DOG_COUNT }, () => ({
      owner: Math.floor(rand() * PEOPLE_COUNT),
      wag: rand() * Math.PI * 2,
      coat: rand(),
    }))
  }, [])

  const cyclists = useMemo(() => {
    const rand = mulberry32(7373)
    const roads = [-48, 0, 48]
    return Array.from({ length: CYCLIST_COUNT }, () => ({
      road: roads[Math.floor(rand() * roads.length)],
      horizontal: rand() > 0.5,
      speed: 5 + rand() * 3.5,
      offset: rand() * 180,
      dir: rand() > 0.5 ? 1 : -1,
    }))
  }, [])

  // Limb geometries hang from their joints so a simple X-rotation swings them
  const legGeometry = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.15, 0.68, 0.15)
    geo.translate(0, -0.34, 0)
    return geo
  }, [])
  const armGeometry = useMemo(() => {
    const geo = new THREE.BoxGeometry(0.11, 0.55, 0.11)
    geo.translate(0, -0.275, 0)
    return geo
  }, [])

  const colorsSet = useRef(false)
  const personPos = useMemo(() => people.map(() => new THREE.Vector3()), [people])

  useFrame(() => {
    const p = frame.p
    // people appear as the city wakes; crowds thin in rain, vanish in storm
    const density =
      rangeProgress(p, T.alive[0], T.alive[0] + 0.045) *
      (1 - frame.rain * 0.6) *
      (1 - frame.storm * 0.9)
    const torso = torsoRef.current
    const head = headRef.current
    const legs = legsRef.current
    const arms = armsRef.current
    if (!torso || !head || !legs || !arms) return

    if (!colorsSet.current) {
      colorsSet.current = true
      const c = new THREE.Color()
      people.forEach((person, i) => {
        torso.setColorAt(i, c.set(person.color))
        head.setColorAt(i, c.set(person.skin))
        arms.setColorAt(i * 2, c.set(person.color))
        arms.setColorAt(i * 2 + 1, c.set(person.color))
      })
      if (torso.instanceColor) torso.instanceColor.needsUpdate = true
      if (head.instanceColor) head.instanceColor.needsUpdate = true
      if (arms.instanceColor) arms.instanceColor.needsUpdate = true
      if (dogBodyRef.current) {
        dogs.forEach((dog, i) => {
          c.setHSL(0.08, 0.35 + dog.coat * 0.25, 0.28 + dog.coat * 0.3)
          dogBodyRef.current!.setColorAt(i, c)
          dogHeadRef.current!.setColorAt(i, c)
          dogTailRef.current!.setColorAt(i, c)
        })
        if (dogBodyRef.current.instanceColor) dogBodyRef.current.instanceColor.needsUpdate = true
        if (dogHeadRef.current!.instanceColor) dogHeadRef.current!.instanceColor.needsUpdate = true
        if (dogTailRef.current!.instanceColor) dogTailRef.current!.instanceColor.needsUpdate = true
      }
    }

    const visible = density > 0.01
    torso.visible = visible
    head.visible = visible
    legs.visible = visible
    arms.visible = visible
    const span = 180
    if (visible) {
      people.forEach((person, i) => {
        const active = i / PEOPLE_COUNT < density ? 1 : 0
        const s = active * person.scale
        const travel = ((frame.time * person.speed + person.offset) % span) - span / 2
        const along = travel * person.dir
        const x = person.horizontal ? along : person.road + person.side
        const z = person.horizontal ? person.road + person.side : along
        const walkCycle = frame.time * person.speed * 5.2 + i
        const bob = Math.abs(Math.sin(walkCycle)) * 0.06 * person.scale
        personPos[i].set(x, 0, z)
        const heading = person.horizontal
          ? person.dir > 0
            ? Math.PI / 2
            : -Math.PI / 2
          : person.dir > 0
            ? 0
            : Math.PI
        // lateral axis for hip/shoulder offsets
        const lx = Math.cos(heading)
        const lz = -Math.sin(heading)

        scratch.euler.set(0, heading, Math.sin(walkCycle * 0.5) * 0.03, 'YXZ')
        scratch.quat.setFromEuler(scratch.euler)
        scratch.mat4.compose(
          scratch.v3a.set(x, (1.05 + bob) * person.scale, z),
          scratch.quat,
          scratch.v3b.set(s, s, s),
        )
        torso.setMatrixAt(i, scratch.mat4)
        scratch.mat4.compose(
          scratch.v3a.set(x, (1.78 + bob) * person.scale, z),
          scratch.quat,
          scratch.v3b.set(s, s, s),
        )
        head.setMatrixAt(i, scratch.mat4)

        // legs swing in opposite phase; arms counter-swing
        for (let side = 0; side < 2; side++) {
          const sign = side === 0 ? 1 : -1
          const legSwing = Math.sin(walkCycle + side * Math.PI) * person.stride
          scratch.euler.set(legSwing, heading, 0, 'YXZ')
          scratch.quat.setFromEuler(scratch.euler)
          scratch.mat4.compose(
            scratch.v3a.set(
              x + lx * sign * 0.13 * person.scale,
              (0.72 + bob) * person.scale,
              z + lz * sign * 0.13 * person.scale,
            ),
            scratch.quat,
            scratch.v3b.set(s, s, s),
          )
          legs.setMatrixAt(i * 2 + side, scratch.mat4)

          const armSwing = Math.sin(walkCycle + (1 - side) * Math.PI) * person.stride * 0.8
          scratch.euler.set(armSwing, heading, sign * 0.12, 'YXZ')
          scratch.quat.setFromEuler(scratch.euler)
          scratch.mat4.compose(
            scratch.v3a.set(
              x + lx * sign * 0.34 * person.scale,
              (1.42 + bob) * person.scale,
              z + lz * sign * 0.34 * person.scale,
            ),
            scratch.quat,
            scratch.v3b.set(s, s, s),
          )
          arms.setMatrixAt(i * 2 + side, scratch.mat4)
        }
      })
      torso.instanceMatrix.needsUpdate = true
      head.instanceMatrix.needsUpdate = true
      legs.instanceMatrix.needsUpdate = true
      arms.instanceMatrix.needsUpdate = true
    }

    if (dogBodyRef.current && dogHeadRef.current && dogTailRef.current) {
      dogBodyRef.current.visible = visible
      dogHeadRef.current.visible = visible
      dogTailRef.current.visible = visible
      dogs.forEach((dog, i) => {
        const owner = people[dog.owner]
        const active = dog.owner / PEOPLE_COUNT < density ? 1 : 0
        const op = personPos[dog.owner]
        const trot = Math.abs(Math.sin(frame.time * 9 + dog.wag)) * 0.05
        const dx = op.x + (owner.horizontal ? 0 : 0.9)
        const dz = op.z + (owner.horizontal ? 0.9 : 0)
        const heading = owner.horizontal
          ? owner.dir > 0
            ? Math.PI / 2
            : -Math.PI / 2
          : owner.dir > 0
            ? 0
            : Math.PI
        scratch.euler.set(0, heading, 0)
        scratch.quat.setFromEuler(scratch.euler)
        scratch.mat4.compose(
          scratch.v3a.set(dx, 0.32 + trot, dz),
          scratch.quat,
          scratch.v3b.setScalar(active),
        )
        dogBodyRef.current!.setMatrixAt(i, scratch.mat4)
        // head forward of the body
        const fx = Math.sin(heading)
        const fz = Math.cos(heading)
        scratch.mat4.compose(
          scratch.v3a.set(dx + fx * 0.5, 0.5 + trot, dz + fz * 0.5),
          scratch.quat,
          scratch.v3b.setScalar(active),
        )
        dogHeadRef.current!.setMatrixAt(i, scratch.mat4)
        // wagging tail behind
        scratch.euler.set(-0.7, heading + Math.sin(frame.time * 11 + dog.wag) * 0.55, 0, 'YXZ')
        scratch.quat.setFromEuler(scratch.euler)
        scratch.mat4.compose(
          scratch.v3a.set(dx - fx * 0.45, 0.46 + trot, dz - fz * 0.45),
          scratch.quat,
          scratch.v3b.setScalar(active),
        )
        dogTailRef.current!.setMatrixAt(i, scratch.mat4)
      })
      dogBodyRef.current.instanceMatrix.needsUpdate = true
      dogHeadRef.current.instanceMatrix.needsUpdate = true
      dogTailRef.current.instanceMatrix.needsUpdate = true
    }

    if (cyclistRef.current && wheelRef.current) {
      cyclistRef.current.visible = visible
      wheelRef.current.visible = visible
      cyclists.forEach((cy, i) => {
        const active = i / CYCLIST_COUNT < density ? 1 : 0
        const travel = ((frame.time * cy.speed + cy.offset) % span) - span / 2
        const along = travel * cy.dir
        const x = cy.horizontal ? along : cy.road + 2.9
        const z = cy.horizontal ? cy.road + 2.9 : along
        const heading = cy.horizontal
          ? cy.dir > 0
            ? Math.PI / 2
            : -Math.PI / 2
          : cy.dir > 0
            ? 0
            : Math.PI
        scratch.euler.set(0.32, heading, Math.sin(frame.time * 3 + i) * 0.05, 'YXZ')
        scratch.quat.setFromEuler(scratch.euler)
        scratch.mat4.compose(
          scratch.v3a.set(x, 1, z),
          scratch.quat,
          scratch.v3b.setScalar(active * 0.85),
        )
        cyclistRef.current!.setMatrixAt(i, scratch.mat4)
        for (let w = 0; w < 2; w++) {
          const wOff = w === 0 ? 0.55 : -0.55
          scratch.euler.set(0, heading + Math.PI / 2, 0)
          scratch.quat.setFromEuler(scratch.euler)
          scratch.mat4.compose(
            scratch.v3a.set(
              x + (cy.horizontal ? wOff * cy.dir : 0),
              0.4,
              z + (cy.horizontal ? 0 : wOff * cy.dir),
            ),
            scratch.quat,
            scratch.v3b.setScalar(active * 0.8),
          )
          wheelRef.current!.setMatrixAt(i * 2 + w, scratch.mat4)
        }
      })
      cyclistRef.current.instanceMatrix.needsUpdate = true
      wheelRef.current.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group>
      <instancedMesh ref={torsoRef} args={[undefined, undefined, PEOPLE_COUNT]} visible={false}>
        <capsuleGeometry args={[0.24, 0.6, 3, 8]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined, undefined, PEOPLE_COUNT]} visible={false}>
        <sphereGeometry args={[0.21, 8, 8]} />
        <meshStandardMaterial roughness={0.65} />
      </instancedMesh>
      <instancedMesh ref={legsRef} args={[legGeometry, undefined, PEOPLE_COUNT * 2]} visible={false}>
        <meshStandardMaterial color="#2c3240" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={armsRef} args={[armGeometry, undefined, PEOPLE_COUNT * 2]} visible={false}>
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>

      <instancedMesh ref={dogBodyRef} args={[undefined, undefined, DOG_COUNT]} visible={false}>
        <boxGeometry args={[0.32, 0.34, 0.8]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={dogHeadRef} args={[undefined, undefined, DOG_COUNT]} visible={false}>
        <boxGeometry args={[0.26, 0.26, 0.3]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={dogTailRef} args={[undefined, undefined, DOG_COUNT]} visible={false}>
        <boxGeometry args={[0.07, 0.34, 0.07]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>

      <instancedMesh ref={cyclistRef} args={[undefined, undefined, CYCLIST_COUNT]} visible={false}>
        <capsuleGeometry args={[0.24, 0.7, 3, 8]} />
        <meshStandardMaterial color="#3f7fc9" roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={wheelRef} args={[undefined, undefined, CYCLIST_COUNT * 2]} visible={false}>
        <torusGeometry args={[0.36, 0.05, 6, 14]} />
        <meshStandardMaterial color="#22252a" roughness={0.7} />
      </instancedMesh>
    </group>
  )
}
