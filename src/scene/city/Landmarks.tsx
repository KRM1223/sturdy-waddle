import { useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { T } from '../../config/timeline'
import { LANDMARK_POSITIONS, LANDMARKS } from '../../utils/cityPlan'
import { clamp01, easeOutBack, mulberry32, rangeProgress } from '../../utils/math'
import { setExperience } from '../../store/experience'
import { frame } from '../frameState'

/** Chapter 7 — the civic quarter. Every landmark is unique and clickable. */
export default function Landmarks() {
  return (
    <group>
      <Landmark id="stadium" stagger={0}><Stadium /></Landmark>
      <Landmark id="airport" stagger={0.5}><Airport /></Landmark>
      <Landmark id="station" stagger={0.2}><Station /></Landmark>
      <Landmark id="museum" stagger={0.35}><Museum /></Landmark>
      <Landmark id="library" stagger={0.45}><Library /></Landmark>
      <Landmark id="school" stagger={0.15}><School /></Landmark>
      <Landmark id="hospital" stagger={0.1}><Hospital /></Landmark>
      <Landmark id="police" stagger={0.55}><Police /></Landmark>
      <Landmark id="fire" stagger={0.05}><Fire /></Landmark>
      <Landmark id="park" stagger={0.3}><Park /></Landmark>
      <Plaza />
      <MetroEntrances />
      <BusTerminal />
    </group>
  )
}

function Landmark({ id, stagger, children }: { id: string; stagger: number; children: ReactNode }) {
  const groupRef = useRef<THREE.Group>(null)
  const [x, z] = LANDMARK_POSITIONS[id]
  const info = useMemo(() => LANDMARKS.find((l) => l.id === id) ?? null, [id])

  useFrame(() => {
    const g = groupRef.current
    if (!g) return
    const phase = rangeProgress(frame.p, T.infrastructure[0], T.infrastructure[1] - 0.01)
    const local = clamp01(phase * 1.9 - stagger * 0.85)
    const s = local >= 1 ? 1 : easeOutBack(local) * local
    g.scale.setScalar(Math.max(0.001, s))
    g.visible = local > 0.002
  })

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (info && frame.p > T.infrastructure[0]) setExperience({ activeLandmark: info })
  }
  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (frame.p > T.infrastructure[0]) document.body.style.cursor = 'pointer'
  }
  const onOut = () => {
    document.body.style.cursor = ''
  }

  return (
    <group
      ref={groupRef}
      position={[x, 0, z]}
      visible={false}
      onClick={onClick}
      onPointerOver={onOver}
      onPointerOut={onOut}
    >
      {children}
    </group>
  )
}

const std = (color: string, extra?: Partial<THREE.MeshStandardMaterialParameters>) => (
  <meshStandardMaterial color={color} roughness={0.72} {...extra} />
)

function Stadium() {
  const lightsRef = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(() => {
    if (lightsRef.current) lightsRef.current.emissiveIntensity = 0.2 + frame.night * 4
  })
  return (
    <group>
      <mesh position={[0, 2.6, 0]} castShadow>
        <cylinderGeometry args={[9.2, 10.4, 5.2, 24, 1, true]} />
        <meshStandardMaterial color="#c9d2da" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 5.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[6.2, 10.2, 24]} />
        {std('#39404a', { side: THREE.DoubleSide })}
      </mesh>
      <mesh position={[0, 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[6.4, 24]} />
        {std('#4c9a44')}
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4
        return (
          <group key={i} position={[Math.cos(a) * 11.5, 0, Math.sin(a) * 11.5]}>
            <mesh position={[0, 4.5, 0]}>
              <cylinderGeometry args={[0.16, 0.22, 9, 6]} />
              {std('#5b6168')}
            </mesh>
            <mesh position={[0, 9.2, 0]} rotation={[0.5, -a + Math.PI / 2, 0]}>
              <boxGeometry args={[2.2, 1.1, 0.3]} />
              <meshStandardMaterial
                ref={i === 0 ? lightsRef : undefined}
                color="#fffbe8"
                emissive="#fff3c2"
                emissiveIntensity={0.2}
              />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function Airport() {
  return (
    <group>
      {/* terminal */}
      <mesh position={[0, 2.4, 0]} castShadow>
        <boxGeometry args={[16, 4.8, 7]} />
        {std('#dfe5eb', { roughness: 0.4, metalness: 0.2 })}
      </mesh>
      <mesh position={[0, 5.2, 0]}>
        <cylinderGeometry args={[3.5, 3.5, 16.4, 3, 1, false, 0, Math.PI]} />
        {std('#9fb4c8', { roughness: 0.35, metalness: 0.4 })}
      </mesh>
      {/* control tower */}
      <mesh position={[-9, 5.5, 2]}>
        <cylinderGeometry args={[0.8, 1.1, 11, 8]} />
        {std('#c9d2da')}
      </mesh>
      <mesh position={[-9, 11.6, 2]}>
        <cylinderGeometry args={[2, 1.4, 2.4, 8]} />
        {std('#38424e', { emissive: '#7fd7ff', emissiveIntensity: 0.6 })}
      </mesh>
      {/* runway east of the terminal (world x 110..250) */}
      <group position={[-84, 0, -84]}>
        <mesh position={[178, 0.09, 84]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[130, 14]} />
          {std('#33373d', { roughness: 0.95 })}
        </mesh>
        {Array.from({ length: 12 }, (_, i) => (
          <mesh key={i} position={[122 + i * 10.5, 0.14, 84]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[4.4, 0.5]} />
            {std('#e9ecef', { emissive: '#e9ecef', emissiveIntensity: 0.2 })}
          </mesh>
        ))}
      </group>
    </group>
  )
}

function Station() {
  return (
    <group>
      <mesh position={[0, 2.2, 0]} castShadow>
        <boxGeometry args={[15, 4.4, 8.5]} />
        {std('#c8b89e')}
      </mesh>
      <mesh position={[0, 4.4, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[4.4, 4.4, 15.2, 14, 1, false, 0, Math.PI]} />
        {std('#7c93a8', { roughness: 0.35, metalness: 0.45 })}
      </mesh>
      <mesh position={[0, 2.4, 4.4]}>
        <boxGeometry args={[6, 3.4, 0.4]} />
        {std('#39404a', { emissive: '#ffd9a0', emissiveIntensity: 0.5 })}
      </mesh>
      {/* platforms + rails heading north */}
      {[-2.5, 0, 2.5].map((ox) => (
        <mesh key={ox} position={[ox, 0.2, -14]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.6, 22]} />
          {std('#8b9298')}
        </mesh>
      ))}
    </group>
  )
}

function Museum() {
  return (
    <group>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[13, 1, 10]} />
        {std('#cfc4b0')}
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[-5 + i * 2, 3.2, 4.2]}>
          <cylinderGeometry args={[0.45, 0.5, 4.4, 10]} />
          {std('#e6ddcb')}
        </mesh>
      ))}
      <mesh position={[0, 3, -0.6]} castShadow>
        <boxGeometry args={[12, 4.4, 8]} />
        {std('#d9cfba')}
      </mesh>
      <mesh position={[0, 6, 1.4]} rotation={[0.42, 0, 0]}>
        <boxGeometry args={[13.4, 0.5, 8.2]} />
        {std('#b7a88d')}
      </mesh>
      <mesh position={[0, 6.6, -1.5]}>
        <sphereGeometry args={[3, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        {std('#9fb4c8', { metalness: 0.5, roughness: 0.3 })}
      </mesh>
    </group>
  )
}

function Library() {
  const lantern = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(() => {
    if (lantern.current) lantern.current.emissiveIntensity = 0.25 + frame.night * 1.1
  })
  return (
    <group>
      <mesh position={[0, 2.8, 0]} castShadow>
        <boxGeometry args={[11, 5.6, 9]} />
        {std('#d5cab4')}
      </mesh>
      <mesh position={[0, 6.4, 0]}>
        <boxGeometry args={[7, 2.2, 6]} />
        <meshStandardMaterial
          ref={lantern}
          color="#f4e9cf"
          emissive="#ffd98f"
          emissiveIntensity={0.25}
          roughness={0.4}
        />
      </mesh>
      {[-4.2, 4.2].map((ox) => (
        <mesh key={ox} position={[ox, 2.4, 4.6]}>
          <boxGeometry args={[2, 4.8, 0.3]} />
          {std('#8d97a1', { roughness: 0.3, metalness: 0.3 })}
        </mesh>
      ))}
    </group>
  )
}

function School() {
  return (
    <group>
      {[[-3.5, 0], [3.5, 0], [0, -4.5]].map(([ox, oz], i) => (
        <mesh key={i} position={[ox, 1.9, oz]} castShadow>
          <boxGeometry args={[6, 3.8, 4]} />
          {std(i === 2 ? '#d8b46a' : '#d9cfc0')}
        </mesh>
      ))}
      <mesh position={[0, 0.15, 4]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3.6, 20]} />
        {std('#cf7f4f')}
      </mesh>
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2
        return (
          <group key={i} position={[Math.cos(a) * 2.2, 0, 4 + Math.sin(a) * 2.2]}>
            <mesh position={[0, 1.2, 0]}>
              <cylinderGeometry args={[0.12, 0.18, 1.6, 5]} />
              {std('#6d4c33')}
            </mesh>
            <mesh position={[0, 2.3, 0]}>
              <icosahedronGeometry args={[1, 0]} />
              {std('#77a85a')}
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function Hospital() {
  const cross = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(() => {
    if (cross.current) cross.current.emissiveIntensity = 1 + frame.night * 2.4
  })
  return (
    <group>
      <mesh position={[0, 4.5, 0]} castShadow>
        <boxGeometry args={[9, 9, 7]} />
        {std('#e8ebee')}
      </mesh>
      <mesh position={[0, 2, 5]} castShadow>
        <boxGeometry args={[13, 4, 3.5]} />
        {std('#dfe3e7')}
      </mesh>
      {/* red cross sign */}
      <group position={[0, 8, 3.6]}>
        <mesh>
          <boxGeometry args={[0.7, 2.2, 0.25]} />
          <meshStandardMaterial ref={cross} color="#e23b3b" emissive="#ff4646" emissiveIntensity={1} />
        </mesh>
        <mesh>
          <boxGeometry args={[2.2, 0.7, 0.25]} />
          <meshStandardMaterial color="#e23b3b" emissive="#ff4646" emissiveIntensity={1} />
        </mesh>
      </group>
      {/* rooftop drone pad */}
      <mesh position={[0, 9.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.4, 16]} />
        {std('#39404a')}
      </mesh>
      <mesh position={[0, 9.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.7, 2, 16]} />
        {std('#ffd24a', { emissive: '#ffd24a', emissiveIntensity: 0.5 })}
      </mesh>
    </group>
  )
}

function Police() {
  return (
    <group>
      <mesh position={[0, 2.6, 0]} castShadow>
        <boxGeometry args={[8.5, 5.2, 6.5]} />
        {std('#b9c2cc')}
      </mesh>
      <mesh position={[0, 3.2, 3.3]}>
        <boxGeometry args={[8.6, 0.8, 0.2]} />
        {std('#2b53a8', { emissive: '#3d6fd9', emissiveIntensity: 0.9 })}
      </mesh>
      <mesh position={[3, 6.6, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 3, 4]} />
        {std('#5b6168')}
      </mesh>
      <mesh position={[3, 8.2, 0]}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#3d6fd9" emissive="#3d6fd9" emissiveIntensity={2} />
      </mesh>
    </group>
  )
}

function Fire() {
  return (
    <group>
      <mesh position={[0, 2.4, 0]} castShadow>
        <boxGeometry args={[9, 4.8, 7]} />
        {std('#c25548')}
      </mesh>
      {[-2.4, 0.2].map((ox) => (
        <mesh key={ox} position={[ox + 1, 1.5, 3.55]}>
          <boxGeometry args={[2.1, 3, 0.15]} />
          {std('#8f3d33', { emissive: '#ffb27a', emissiveIntensity: 0.25 })}
        </mesh>
      ))}
      <mesh position={[3.4, 5.6, -2]}>
        <boxGeometry args={[1.8, 6.4, 1.8]} />
        {std('#a8443a')}
      </mesh>
      <mesh position={[3.4, 9, -2]}>
        <sphereGeometry args={[0.35, 8, 8]} />
        <meshStandardMaterial color="#ffd24a" emissive="#ffb02e" emissiveIntensity={1.4} />
      </mesh>
    </group>
  )
}

function Park() {
  const trees = useMemo(() => {
    const rand = mulberry32(4004)
    return Array.from({ length: 16 }, () => ({
      x: (rand() - 0.5) * 15,
      z: (rand() - 0.5) * 15,
      s: 0.6 + rand() * 0.7,
      hue: rand(),
    }))
  }, [])
  return (
    <group>
      <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[17.5, 17.5]} />
        {std('#5d9a4c')}
      </mesh>
      <mesh position={[3, 0.18, 3]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3, 18]} />
        {std('#3f7fa8', { roughness: 0.2, metalness: 0.1 })}
      </mesh>
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} scale={t.s}>
          <mesh position={[0, 1.4, 0]}>
            <cylinderGeometry args={[0.18, 0.28, 2.4, 5]} />
            {std('#6d4c33')}
          </mesh>
          <mesh position={[0, 3.4, 0]}>
            <icosahedronGeometry args={[1.7, 0]} />
            <meshStandardMaterial color={new THREE.Color().setHSL(0.28 + t.hue * 0.06, 0.5, 0.34)} roughness={0.9} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Plaza() {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!ref.current) return
    const s = easeOutBack(rangeProgress(frame.p, T.infrastructure[0] + 0.01, T.infrastructure[0] + 0.05))
    ref.current.scale.setScalar(Math.max(0.001, s))
    ref.current.visible = s > 0.002
  })
  const [x, z] = LANDMARK_POSITIONS.plaza
  return (
    <group ref={ref} position={[x, 0, z]} visible={false}>
      <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[17.5, 17.5]} />
        {std('#b7aa93')}
      </mesh>
      {/* fountain */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[2.6, 3, 1, 18]} />
        {std('#cfc4b0')}
      </mesh>
      <mesh position={[0, 1.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.3, 18]} />
        {std('#4a90b8', { roughness: 0.15 })}
      </mesh>
      <mesh position={[0, 1.9, 0]}>
        <cylinderGeometry args={[0.5, 0.7, 1.6, 10]} />
        {std('#cfc4b0')}
      </mesh>
    </group>
  )
}

function MetroEntrances() {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!ref.current) return
    const s = easeOutBack(rangeProgress(frame.p, T.infrastructure[0] + 0.03, T.infrastructure[0] + 0.065))
    ref.current.scale.setScalar(Math.max(0.001, s))
    ref.current.visible = s > 0.002
  })
  const spots: [number, number][] = [
    [6, -18],
    [-30, 30],
    [54, 6],
    [-54, -30],
  ]
  return (
    <group ref={ref} visible={false}>
      {spots.map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 1.2, 0]}>
            <boxGeometry args={[3.2, 2.4, 2.2]} />
            {std('#39424e')}
          </mesh>
          <mesh position={[0, 2.4, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[1.1, 1.1, 3.2, 10, 1, false, 0, Math.PI]} />
            {std('#c23e3e')}
          </mesh>
          <mesh position={[0, 1.6, 1.15]}>
            <circleGeometry args={[0.55, 12]} />
            <meshStandardMaterial color="#ffcf3d" emissive="#ffcf3d" emissiveIntensity={1.2} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function BusTerminal() {
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    if (!ref.current) return
    const s = easeOutBack(rangeProgress(frame.p, T.infrastructure[0] + 0.045, T.infrastructure[0] + 0.08))
    ref.current.scale.setScalar(Math.max(0.001, s))
    ref.current.visible = s > 0.002
  })
  return (
    <group ref={ref} position={[60, 0, -36]} visible={false}>
      <mesh position={[0, 2.8, 0]}>
        <boxGeometry args={[14, 0.5, 8]} />
        {std('#8d97a1', { metalness: 0.4, roughness: 0.4 })}
      </mesh>
      {[-6, -2, 2, 6].map((ox) => (
        <mesh key={ox} position={[ox, 1.4, 0]}>
          <cylinderGeometry args={[0.18, 0.22, 2.8, 6]} />
          {std('#5b6168')}
        </mesh>
      ))}
      <mesh position={[0, 1, -3.6]}>
        <boxGeometry args={[13, 2, 0.3]} />
        {std('#aeb9c4', { roughness: 0.3, metalness: 0.2 })}
      </mesh>
    </group>
  )
}
