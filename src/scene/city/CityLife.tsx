import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { T } from '../../config/timeline'
import { LANDMARK_POSITIONS } from '../../utils/cityPlan'
import { mulberry32, rangeProgress, rangeWindow } from '../../utils/math'
import { frame, scratch } from '../frameState'

const CROWD = 40
const TRUCK_COLORS = ['#e07a4f', '#4fa8e0', '#e0c04f', '#8a56b0']

/** Chapter 11 — festival stage, dancing crowd, food trucks, café terraces. */
export default function CityLife() {
  const groupRef = useRef<THREE.Group>(null)
  const crowdRef = useRef<THREE.InstancedMesh>(null)
  const beamRefs = useRef<(THREE.Mesh | null)[]>([])
  const crosswalkMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#e9ecef',
        emissive: '#9be3ff',
        emissiveIntensity: 0,
        roughness: 0.55,
      }),
    [],
  )

  const [px, pz] = LANDMARK_POSITIONS.plaza

  const dancers = useMemo(() => {
    const rand = mulberry32(2323)
    return Array.from({ length: CROWD }, () => ({
      x: px + (rand() - 0.5) * 13,
      z: pz + 2 + rand() * 6,
      phase: rand() * Math.PI * 2,
      energy: 0.6 + rand() * 0.8,
      hue: rand(),
    }))
  }, [px, pz])

  const colorsSet = useRef(false)

  useFrame(() => {
    const p = frame.p
    const reveal = rangeProgress(p, T.life[0], T.life[0] + 0.04)
    if (groupRef.current) {
      groupRef.current.visible = reveal > 0.005
    }

    // Interactive crosswalks pulse from the smart-city chapter onward
    const active = rangeProgress(p, T.smart[0], T.smart[0] + 0.03)
    crosswalkMat.emissiveIntensity =
      active * (0.5 + Math.max(0, Math.sin(frame.time * 2.4)) * 1.4) * (0.4 + frame.night)

    if (!groupRef.current?.visible) return

    // The crowd dances — bodies bounce, sway, and spin to a shared beat
    if (crowdRef.current) {
      if (!colorsSet.current) {
        colorsSet.current = true
        const c = new THREE.Color()
        dancers.forEach((d, i) => crowdRef.current!.setColorAt(i, c.setHSL(d.hue, 0.6, 0.55)))
        if (crowdRef.current.instanceColor) crowdRef.current.instanceColor.needsUpdate = true
      }
      const beat = frame.time * 2.4
      dancers.forEach((d, i) => {
        const bounce = Math.abs(Math.sin(beat * d.energy + d.phase)) * 0.5
        scratch.euler.set(0, Math.sin(beat * 0.5 + d.phase) * 0.8, Math.sin(beat + d.phase) * 0.12)
        scratch.quat.setFromEuler(scratch.euler)
        scratch.mat4.compose(
          scratch.v3a.set(d.x, 0.7 + bounce, d.z),
          scratch.quat,
          scratch.v3b.setScalar(reveal * 0.9),
        )
        crowdRef.current!.setMatrixAt(i, scratch.mat4)
      })
      crowdRef.current.instanceMatrix.needsUpdate = true
    }

    // Stage light beams sweep
    beamRefs.current.forEach((beam, i) => {
      if (!beam) return
      beam.rotation.z = Math.sin(frame.time * 0.9 + i * 1.8) * 0.5
      const mat = beam.material as THREE.MeshBasicMaterial
      mat.opacity = (0.06 + frame.night * 0.14) * reveal * rangeWindow(p, T.life[0], T.life[1] + 0.02, 0.02)
    })
  })

  return (
    <>
      {/* Pulsing crosswalks at the four plaza approaches */}
      <group>
        {[
          [px, pz - 12.6, 0],
          [px, pz + 12.6, 0],
          [px - 12.6, pz, Math.PI / 2],
          [px + 12.6, pz, Math.PI / 2],
        ].map(([x, z, rot], i) => (
          <group key={i} position={[x as number, 0.13, z as number]} rotation={[0, rot as number, 0]}>
            {[-2, -1, 0, 1, 2].map((s) => (
              <mesh
                key={s}
                position={[s * 1.2, 0, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                material={s === 0 ? crosswalkMat : undefined}
              >
                <planeGeometry args={[0.7, 5.5]} />
                {s !== 0 && <meshStandardMaterial color="#e9ecef" roughness={0.55} />}
              </mesh>
            ))}
          </group>
        ))}
      </group>

      <group ref={groupRef} visible={false}>
        {/* Festival stage on the plaza */}
        <group position={[px, 0, pz - 5]}>
          <mesh position={[0, 0.7, 0]}>
            <boxGeometry args={[12, 1.4, 6]} />
            <meshStandardMaterial color="#2b3038" roughness={0.8} />
          </mesh>
          <mesh position={[0, 4.4, -2.6]}>
            <boxGeometry args={[12.6, 6, 0.5]} />
            <meshStandardMaterial color="#171b21" emissive="#5e2f9e" emissiveIntensity={0.8} roughness={0.6} />
          </mesh>
          {[-4.5, 0, 4.5].map((ox, i) => (
            <mesh
              key={ox}
              ref={(el) => {
                beamRefs.current[i] = el
              }}
              position={[ox, 7, -1]}
              rotation={[0.6, 0, 0]}
            >
              <coneGeometry args={[2.6, 18, 14, 1, true]} />
              <meshBasicMaterial
                color={['#ff6fd8', '#6fe8ff', '#ffe86f'][i]}
                transparent
                opacity={0.1}
                side={THREE.DoubleSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          ))}
        </group>

        {/* Dancing crowd */}
        <instancedMesh ref={crowdRef} args={[undefined, undefined, CROWD]}>
          <capsuleGeometry args={[0.26, 0.85, 3, 8]} />
          <meshStandardMaterial roughness={0.7} />
        </instancedMesh>

        {/* Food trucks along the park edge */}
        {TRUCK_COLORS.map((color, i) => (
          <group key={i} position={[-24 + i * 8, 0, -1.5]} rotation={[0, Math.PI / 2, 0]}>
            <mesh position={[0, 1.4, 0]} castShadow>
              <boxGeometry args={[5.4, 2.4, 2.3]} />
              <meshStandardMaterial color={color} roughness={0.5} />
            </mesh>
            <mesh position={[0.4, 1.7, 1.2]}>
              <boxGeometry args={[2.6, 1, 0.12]} />
              <meshStandardMaterial color="#fff4d6" emissive="#ffd98f" emissiveIntensity={1.1} />
            </mesh>
            <mesh position={[0.4, 2.6, 1.5]} rotation={[0.5, 0, 0]}>
              <boxGeometry args={[3, 0.1, 1.4]} />
              <meshStandardMaterial color="#f4f7fa" roughness={0.7} />
            </mesh>
          </group>
        ))}

        {/* Café terraces around the plaza */}
        {[
          [px - 7, pz + 7],
          [px + 7, pz + 7],
          [px + 7, pz - 8.5],
        ].map(([cx, cz], i) => (
          <group key={i} position={[cx, 0, cz]}>
            {[0, 1, 2].map((t) => {
              const a = (t / 3) * Math.PI * 2 + i
              return (
                <group key={t} position={[Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2]}>
                  <mesh position={[0, 0.55, 0]}>
                    <cylinderGeometry args={[0.5, 0.5, 0.08, 10]} />
                    <meshStandardMaterial color="#e6dccb" roughness={0.6} />
                  </mesh>
                  <mesh position={[0, 0.28, 0]}>
                    <cylinderGeometry args={[0.07, 0.09, 0.55, 6]} />
                    <meshStandardMaterial color="#5b6168" roughness={0.6} />
                  </mesh>
                  <mesh position={[0, 1.9, 0]}>
                    <coneGeometry args={[1.1, 0.5, 8]} />
                    <meshStandardMaterial
                      color={['#d96f5f', '#e0b13f', '#5aa8a0'][t]}
                      roughness={0.75}
                      side={THREE.DoubleSide}
                    />
                  </mesh>
                  <mesh position={[0, 1.1, 0]}>
                    <cylinderGeometry args={[0.05, 0.05, 1.6, 5]} />
                    <meshStandardMaterial color="#8b9298" roughness={0.6} />
                  </mesh>
                </group>
              )
            })}
          </group>
        ))}
      </group>
    </>
  )
}
