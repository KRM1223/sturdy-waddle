import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { T } from '../../config/timeline'
import { mulberry32, rangeProgress } from '../../utils/math'
import { frame, scratch } from '../frameState'

const PEOPLE_COUNT = 140
const DOG_COUNT = 14
const CYCLIST_COUNT = 16

const OUTFITS = ['#c96f4f', '#4f6fc9', '#d8cfc0', '#3f4650', '#7fa86e', '#b05684', '#e0b13f', '#5aa8a0']

interface PersonSeed {
  road: number
  horizontal: boolean
  side: number
  speed: number
  offset: number
  dir: number
  scale: number // children are smaller
  color: string
}

/** Chapter 8 — pedestrians, children, dogs and cyclists on the sidewalks. */
export default function Citizens() {
  const bodyRef = useRef<THREE.InstancedMesh>(null)
  const headRef = useRef<THREE.InstancedMesh>(null)
  const dogRef = useRef<THREE.InstancedMesh>(null)
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
    }))
  }, [])

  const dogs = useMemo(() => {
    const rand = mulberry32(1212)
    return Array.from({ length: DOG_COUNT }, () => ({
      owner: Math.floor(rand() * PEOPLE_COUNT),
      wag: rand() * Math.PI * 2,
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

  const colorsSet = useRef(false)
  const personPos = useMemo(() => people.map(() => new THREE.Vector3()), [people])

  useFrame(() => {
    const p = frame.p
    // people appear as the city wakes; crowds thin in rain, vanish in storm
    const density =
      rangeProgress(p, T.alive[0], T.alive[0] + 0.045) *
      (1 - frame.rain * 0.6) *
      (1 - frame.storm * 0.9)
    const body = bodyRef.current
    const head = headRef.current
    if (!body || !head) return

    if (!colorsSet.current) {
      colorsSet.current = true
      const c = new THREE.Color()
      people.forEach((person, i) => body.setColorAt(i, c.set(person.color)))
      if (body.instanceColor) body.instanceColor.needsUpdate = true
    }

    body.visible = density > 0.01
    head.visible = body.visible
    const span = 180
    if (body.visible) {
      people.forEach((person, i) => {
        const active = i / PEOPLE_COUNT < density ? 1 : 0
        const travel = ((frame.time * person.speed + person.offset) % span) - span / 2
        const along = travel * person.dir
        const x = person.horizontal ? along : person.road + person.side
        const z = person.horizontal ? person.road + person.side : along
        const bob = Math.abs(Math.sin(frame.time * 7 * person.speed + i)) * 0.08
        personPos[i].set(x, 0, z)
        const heading = person.horizontal
          ? person.dir > 0
            ? Math.PI / 2
            : -Math.PI / 2
          : person.dir > 0
            ? 0
            : Math.PI
        scratch.euler.set(0, heading, 0)
        scratch.quat.setFromEuler(scratch.euler)
        const s = active * person.scale
        scratch.mat4.compose(
          scratch.v3a.set(x, 0.75 * person.scale + bob, z),
          scratch.quat,
          scratch.v3b.set(s, s, s),
        )
        body.setMatrixAt(i, scratch.mat4)
        scratch.mat4.compose(
          scratch.v3a.set(x, 1.62 * person.scale + bob, z),
          scratch.quat,
          scratch.v3b.set(s, s, s),
        )
        head.setMatrixAt(i, scratch.mat4)
      })
      body.instanceMatrix.needsUpdate = true
      head.instanceMatrix.needsUpdate = true
    }

    if (dogRef.current) {
      dogRef.current.visible = body.visible
      dogs.forEach((dog, i) => {
        const owner = people[dog.owner]
        const active = dog.owner / PEOPLE_COUNT < density ? 1 : 0
        const op = personPos[dog.owner]
        const trot = Math.abs(Math.sin(frame.time * 9 + dog.wag)) * 0.05
        scratch.euler.set(0, Math.sin(frame.time * 2 + dog.wag) * 0.3, 0)
        scratch.quat.setFromEuler(scratch.euler)
        scratch.mat4.compose(
          scratch.v3a.set(op.x + (owner.horizontal ? 0 : 0.9), 0.28 + trot, op.z + (owner.horizontal ? 0.9 : 0)),
          scratch.quat,
          scratch.v3b.setScalar(active),
        )
        dogRef.current!.setMatrixAt(i, scratch.mat4)
      })
      dogRef.current.instanceMatrix.needsUpdate = true
    }

    if (cyclistRef.current && wheelRef.current) {
      cyclistRef.current.visible = body.visible
      wheelRef.current.visible = body.visible
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
        scratch.euler.set(0, heading, Math.sin(frame.time * 3 + i) * 0.05)
        scratch.quat.setFromEuler(scratch.euler)
        scratch.mat4.compose(
          scratch.v3a.set(x, 1, z),
          scratch.quat,
          scratch.v3b.setScalar(active * 0.85),
        )
        cyclistRef.current!.setMatrixAt(i, scratch.mat4)
        // two wheels
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
      <instancedMesh ref={bodyRef} args={[undefined, undefined, PEOPLE_COUNT]} visible={false}>
        <capsuleGeometry args={[0.26, 0.85, 3, 8]} />
        <meshStandardMaterial roughness={0.75} />
      </instancedMesh>
      <instancedMesh ref={headRef} args={[undefined, undefined, PEOPLE_COUNT]} visible={false}>
        <sphereGeometry args={[0.21, 8, 8]} />
        <meshStandardMaterial color="#e8c39a" roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={dogRef} args={[undefined, undefined, DOG_COUNT]} visible={false}>
        <boxGeometry args={[0.35, 0.4, 0.85]} />
        <meshStandardMaterial color="#8a6a48" roughness={0.85} />
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
