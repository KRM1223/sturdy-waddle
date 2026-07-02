import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { audioEngine } from '../../audio/AudioEngine'
import { rangeWindow } from '../../utils/math'
import { requestBurst } from '../interactive'
import { frame } from '../frameState'

const BALLOONS = [
  { color: '#ff6a5c', band: '#ffd23f', radius: 210, speed: 0.016, phase: 0.4, height: 78 },
  { color: '#4fa8e0', band: '#f0f4f8', radius: 260, speed: 0.011, phase: 2.6, height: 96 },
  { color: '#9c6ad9', band: '#ff9e5e', radius: 175, speed: 0.02, phase: 4.4, height: 64 },
]

/** Hot-air balloons drifting over the valley — pop one for confetti. */
export default function Balloons() {
  const groupRef = useRef<THREE.Group>(null)
  const lastPop = useRef<number[]>([0, 0, 0])
  const hues = useMemo(() => BALLOONS.map((b) => new THREE.Color(b.color).getHSL({ h: 0, s: 0, l: 0 }).h), [])

  useFrame(() => {
    const group = groupRef.current
    if (!group) return
    const presence = rangeWindow(frame.p, 0.015, 0.72, 0.05)
    group.visible = presence > 0.01
    if (!group.visible) return
    group.children.forEach((balloon, i) => {
      const cfg = BALLOONS[i]
      const a = frame.time * cfg.speed + cfg.phase
      balloon.position.set(
        Math.cos(a) * cfg.radius,
        cfg.height + Math.sin(frame.time * 0.3 + cfg.phase) * 6,
        Math.sin(a) * cfg.radius,
      )
      balloon.rotation.y = -a
      // squash back up after a pop
      const sincePop = frame.time - lastPop.current[i]
      const squash = sincePop < 0.5 ? 1 - Math.sin((sincePop / 0.5) * Math.PI) * 0.25 : 1
      balloon.scale.setScalar(presence * squash)
    })
  })

  const onPop = (i: number) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const balloon = groupRef.current?.children[i]
    if (!balloon || !balloon.visible) return
    lastPop.current[i] = frame.time
    requestBurst({
      x: balloon.position.x,
      y: balloon.position.y,
      z: balloon.position.z,
      hue: hues[i],
      radius: 12,
    })
    audioEngine.fireworkPop()
  }

  return (
    <group ref={groupRef} visible={false}>
      {BALLOONS.map((cfg, i) => (
        <group
          key={i}
          onClick={onPop(i)}
          onPointerOver={(e) => {
            e.stopPropagation()
            document.body.style.cursor = 'pointer'
          }}
          onPointerOut={() => {
            document.body.style.cursor = ''
          }}
        >
          {/* envelope */}
          <mesh position={[0, 6, 0]}>
            <sphereGeometry args={[4.4, 12, 12]} />
            <meshStandardMaterial color={cfg.color} roughness={0.6} />
          </mesh>
          <mesh position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[4.35, 0.55, 8, 20]} />
            <meshStandardMaterial color={cfg.band} roughness={0.6} />
          </mesh>
          <mesh position={[0, 1.4, 0]}>
            <coneGeometry args={[2.2, 3.4, 10]} />
            <meshStandardMaterial color={cfg.color} roughness={0.6} />
          </mesh>
          {/* basket */}
          <mesh position={[0, -1.2, 0]}>
            <boxGeometry args={[1.5, 1.2, 1.5]} />
            <meshStandardMaterial color="#8a5a3a" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
