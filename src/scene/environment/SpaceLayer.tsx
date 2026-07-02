import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { rangeProgress } from '../../utils/math'
import { T } from '../../config/timeline'
import { frame } from '../frameState'

/**
 * The orbital finale: satellites gliding overhead, a small space station,
 * and a high cirrus cloud sheet that sells the pull-back through the sky.
 */
export default function SpaceLayer() {
  const groupRef = useRef<THREE.Group>(null)
  const stationRef = useRef<THREE.Group>(null)
  const satsRef = useRef<THREE.Group>(null)
  const sheetRef = useRef<THREE.Mesh>(null)

  const satelliteOrbits = useMemo(
    () =>
      Array.from({ length: 5 }, (_, i) => ({
        radius: 520 + i * 90,
        speed: 0.05 + i * 0.014,
        phase: i * 1.7,
        tilt: 0.2 + i * 0.12,
      })),
    [],
  )

  useFrame(() => {
    const reveal = rangeProgress(frame.p, T.global[0], T.global[0] + 0.03)
    const group = groupRef.current
    if (!group) return
    group.visible = reveal > 0.01
    if (!group.visible) return

    if (satsRef.current) {
      satsRef.current.children.forEach((sat, i) => {
        const orbit = satelliteOrbits[i]
        const a = frame.time * orbit.speed + orbit.phase
        sat.position.set(
          Math.cos(a) * orbit.radius,
          420 + Math.sin(a * 0.7) * 60 + i * 40,
          Math.sin(a) * orbit.radius,
        )
        sat.rotation.y = a
      })
    }
    if (stationRef.current) {
      const a = frame.time * 0.03
      stationRef.current.position.set(Math.cos(a) * 700, 560, Math.sin(a) * 700 - 200)
      stationRef.current.rotation.y = frame.time * 0.08
      stationRef.current.rotation.z = 0.3
    }
    if (sheetRef.current) {
      const mat = sheetRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = reveal * 0.16 * (1 - rangeProgress(frame.p, 0.965, 0.995))
      sheetRef.current.rotation.z = frame.time * 0.004
    }
  })

  return (
    <group ref={groupRef} visible={false}>
      {/* High cirrus sheet under the camera during the pull-back */}
      <mesh ref={sheetRef} position={[0, 330, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[80, 900, 48]} />
        <meshBasicMaterial color="#dbe7f4" transparent opacity={0} depthWrite={false} fog={false} />
      </mesh>

      <group ref={satsRef}>
        {satelliteOrbits.map((_, i) => (
          <group key={i}>
            <mesh>
              <boxGeometry args={[3, 3, 6]} />
              <meshStandardMaterial color="#c8d2dd" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[7, 0, 0]}>
              <boxGeometry args={[10, 0.3, 4]} />
              <meshStandardMaterial color="#2c4a8f" emissive="#1a3a80" emissiveIntensity={0.8} metalness={0.6} roughness={0.4} />
            </mesh>
            <mesh position={[-7, 0, 0]}>
              <boxGeometry args={[10, 0.3, 4]} />
              <meshStandardMaterial color="#2c4a8f" emissive="#1a3a80" emissiveIntensity={0.8} metalness={0.6} roughness={0.4} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Space station */}
      <group ref={stationRef}>
        <mesh>
          <cylinderGeometry args={[4, 4, 34, 10]} />
          <meshStandardMaterial color="#dfe6ee" metalness={0.7} roughness={0.35} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[3, 3, 26, 10]} />
          <meshStandardMaterial color="#c9d2dc" metalness={0.7} roughness={0.35} />
        </mesh>
        {[-22, 22].map((x) => (
          <mesh key={x} position={[x, 0, 0]}>
            <boxGeometry args={[18, 0.5, 9]} />
            <meshStandardMaterial color="#27418a" emissive="#16307a" emissiveIntensity={1.1} metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
        <pointLight color="#9fc2ff" intensity={30} distance={140} />
      </group>
    </group>
  )
}
