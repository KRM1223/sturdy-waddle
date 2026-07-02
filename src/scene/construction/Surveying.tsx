import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { T } from '../../config/timeline'
import { clamp01, easeOutBack, easeOutCubic, mulberry32, rangeProgress, rangeWindow } from '../../utils/math'
import { frame, scratch } from '../frameState'

const MARKER_COUNT = 26
const WORKER_COUNT = 22

/** Chapter 2 — surveyors, trucks, excavators, scan drones, dust. */
export default function Surveying() {
  const groupRef = useRef<THREE.Group>(null)
  const markersRef = useRef<THREE.InstancedMesh>(null)
  const flagsRef = useRef<THREE.InstancedMesh>(null)
  const workersRef = useRef<THREE.InstancedMesh>(null)
  const workerHeadsRef = useRef<THREE.InstancedMesh>(null)
  const helmetsRef = useRef<THREE.InstancedMesh>(null)
  const trucksRef = useRef<THREE.Group>(null)
  const dronesRef = useRef<THREE.Group>(null)
  const excArmRefs = useRef<(THREE.Group | null)[]>([])
  const dustRef = useRef<THREE.Points>(null)

  const rand = useMemo(() => mulberry32(1123), [])
  const markers = useMemo(
    () =>
      Array.from({ length: MARKER_COUNT }, (_, i) => ({
        x: -84 + (i % 6) * 33.6 + (rand() - 0.5) * 8,
        z: -84 + Math.floor(i / 6) * 37 + (rand() - 0.5) * 8,
        delay: rand(),
      })),
    [rand],
  )
  const workers = useMemo(
    () =>
      Array.from({ length: WORKER_COUNT }, () => ({
        cx: (rand() - 0.5) * 130,
        cz: (rand() - 0.5) * 130,
        radius: 3 + rand() * 9,
        speed: 0.25 + rand() * 0.4,
        phase: rand() * Math.PI * 2,
      })),
    [rand],
  )
  const trucks = useMemo(
    () => [
      { fromX: 260, z: 12, parkX: 58, delay: 0, color: '#d97b29' },
      { fromX: 285, z: 4, parkX: 74, delay: 0.14, color: '#c9a227' },
      { fromX: 310, z: -14, parkX: 88, delay: 0.28, color: '#d97b29' },
      { fromX: 335, z: 20, parkX: 46, delay: 0.42, color: '#a8552f' },
    ],
    [],
  )

  const dustGeo = useMemo(() => {
    const positions = new Float32Array(180 * 3)
    const seeds = new Float32Array(180)
    const r = mulberry32(31)
    for (let i = 0; i < 180; i++) {
      positions[i * 3] = (r() - 0.5) * 150
      positions[i * 3 + 1] = r() * 3
      positions[i * 3 + 2] = (r() - 0.5) * 150
      seeds[i] = r()
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    return geo
  }, [])
  const dustUniforms = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: 0 } }), [])

  useFrame(() => {
    const p = frame.p
    // machines & people present from surveying until the towers stand
    const presence = rangeWindow(p, T.survey[0], T.buildings[1] - 0.02, 0.02)
    const arrive = rangeProgress(p, T.survey[0], T.survey[0] + 0.045)
    if (groupRef.current) {
      groupRef.current.visible = presence > 0.005
      if (!groupRef.current.visible) return
    }

    // Survey markers pop up in a staggered wave, retired once roads begin
    const markerLife = rangeWindow(p, T.survey[0] + 0.01, T.roads[1], 0.015)
    if (markersRef.current && flagsRef.current) {
      markers.forEach((mk, i) => {
        const local = clamp01(markerLife * 2.4 - mk.delay)
        const s = easeOutBack(clamp01(local)) * markerLife
        scratch.euler.set(0, mk.delay * 6, 0)
        scratch.quat.setFromEuler(scratch.euler)
        scratch.mat4.compose(
          scratch.v3a.set(mk.x, 0, mk.z),
          scratch.quat,
          scratch.v3b.set(1, Math.max(0.001, s), 1),
        )
        markersRef.current!.setMatrixAt(i, scratch.mat4)
        scratch.mat4.compose(
          scratch.v3a.set(mk.x, 1.75 * s, mk.z),
          scratch.quat,
          scratch.v3b.setScalar(Math.max(0.001, s)),
        )
        flagsRef.current!.setMatrixAt(i, scratch.mat4)
      })
      markersRef.current.instanceMatrix.needsUpdate = true
      flagsRef.current.instanceMatrix.needsUpdate = true
    }

    // Workers wander in small loops with a walking bob — hi-vis vests, hard hats
    if (workersRef.current && workerHeadsRef.current && helmetsRef.current) {
      workers.forEach((w, i) => {
        const a = frame.time * w.speed + w.phase
        const x = w.cx + Math.cos(a) * w.radius
        const z = w.cz + Math.sin(a * 0.8) * w.radius
        const bob = Math.abs(Math.sin(frame.time * 6 + w.phase)) * 0.12
        scratch.euler.set(0, -a, 0)
        scratch.quat.setFromEuler(scratch.euler)
        scratch.mat4.compose(
          scratch.v3a.set(x, (0.88 + bob) * presence, z),
          scratch.quat,
          scratch.v3b.setScalar(presence),
        )
        workersRef.current!.setMatrixAt(i, scratch.mat4)
        scratch.mat4.compose(
          scratch.v3a.set(x, (1.72 + bob) * presence, z),
          scratch.quat,
          scratch.v3b.setScalar(presence),
        )
        workerHeadsRef.current!.setMatrixAt(i, scratch.mat4)
        scratch.mat4.compose(
          scratch.v3a.set(x, (1.86 + bob) * presence, z),
          scratch.quat,
          scratch.v3b.setScalar(presence),
        )
        helmetsRef.current!.setMatrixAt(i, scratch.mat4)
      })
      workersRef.current.instanceMatrix.needsUpdate = true
      workerHeadsRef.current.instanceMatrix.needsUpdate = true
      helmetsRef.current.instanceMatrix.needsUpdate = true
    }

    // Trucks drive in from the horizon, brake smoothly, park
    if (trucksRef.current) {
      trucksRef.current.children.forEach((truck, i) => {
        const cfg = trucks[i]
        const drive = easeOutCubic(clamp01(arrive * 1.5 - cfg.delay))
        truck.position.set(cfg.fromX + (cfg.parkX - cfg.fromX) * drive, 0, cfg.z)
        truck.rotation.y = Math.PI
        const settle = Math.sin(drive * Math.PI) * 0.03
        truck.rotation.z = settle
        truck.scale.setScalar(presence)
      })
    }

    // Scan drones fly a lawnmower sweep, cones pulsing
    if (dronesRef.current) {
      const scanning = rangeWindow(p, T.survey[0] + 0.015, T.roads[0] + 0.03, 0.02)
      dronesRef.current.visible = scanning > 0.01
      dronesRef.current.children.forEach((drone, i) => {
        const t = (frame.time * 0.11 + i * 0.33) % 1
        const row = Math.floor(t * 5)
        const along = (t * 5) % 1
        const dir = row % 2 === 0 ? 1 : -1
        drone.position.set(
          dir * (-80 + along * 160),
          26 + Math.sin(frame.time * 2 + i) * 1.5,
          -70 + row * 35 + i * 6,
        )
        drone.scale.setScalar(scanning)
      })
    }

    // Excavator arms dig in a slow loop
    excArmRefs.current.forEach((arm, i) => {
      if (!arm) return
      arm.rotation.z = -0.5 + Math.sin(frame.time * 0.9 + i * 2.1) * 0.35
      arm.parent!.rotation.y = Math.sin(frame.time * 0.35 + i * 1.4) * 0.7
    })

    dustUniforms.uTime.value = frame.time
    dustUniforms.uOpacity.value = rangeWindow(p, T.survey[0], T.buildings[1], 0.03) * 0.5
    if (dustRef.current) dustRef.current.visible = dustUniforms.uOpacity.value > 0.02
  })

  return (
    <group ref={groupRef} visible={false}>
      {/* Survey markers: stake + flag */}
      <instancedMesh ref={markersRef} args={[undefined, undefined, MARKER_COUNT]}>
        <cylinderGeometry args={[0.09, 0.09, 3.5, 5]} />
        <meshStandardMaterial color="#e8e2d4" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={flagsRef} args={[undefined, undefined, MARKER_COUNT]}>
        <boxGeometry args={[1.1, 0.7, 0.06]} />
        <meshStandardMaterial color="#ff5a3c" emissive="#ff5a3c" emissiveIntensity={0.25} side={THREE.DoubleSide} />
      </instancedMesh>

      {/* Workers — hi-vis vests, heads, hard hats */}
      <instancedMesh ref={workersRef} args={[undefined, undefined, WORKER_COUNT]}>
        <capsuleGeometry args={[0.3, 0.9, 3, 8]} />
        <meshStandardMaterial color="#ffb020" roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={workerHeadsRef} args={[undefined, undefined, WORKER_COUNT]}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#e0b088" roughness={0.65} />
      </instancedMesh>
      <instancedMesh ref={helmetsRef} args={[undefined, undefined, WORKER_COUNT]}>
        <sphereGeometry args={[0.26, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#ffd23f" roughness={0.4} />
      </instancedMesh>

      {/* Trucks */}
      <group ref={trucksRef}>
        {trucks.map((t, i) => (
          <group key={i}>
            <mesh position={[0, 1.5, 0]} castShadow>
              <boxGeometry args={[6.4, 1.7, 2.6]} />
              <meshStandardMaterial color={t.color} roughness={0.6} />
            </mesh>
            <mesh position={[2.6, 2.6, 0]} castShadow>
              <boxGeometry args={[1.6, 1.4, 2.4]} />
              <meshStandardMaterial color="#3b4048" roughness={0.5} />
            </mesh>
            <mesh position={[-0.8, 2.5, 0]}>
              <boxGeometry args={[3.4, 1.1, 2.5]} />
              <meshStandardMaterial color="#8b9298" roughness={0.9} />
            </mesh>
            {[-2, 0.2, 2.4].map((wx) => (
              <group key={wx}>
                <mesh position={[wx, 0.65, 1.25]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.65, 0.65, 0.4, 10]} />
                  <meshStandardMaterial color="#1c1e22" roughness={0.9} />
                </mesh>
                <mesh position={[wx, 0.65, -1.25]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.65, 0.65, 0.4, 10]} />
                  <meshStandardMaterial color="#1c1e22" roughness={0.9} />
                </mesh>
              </group>
            ))}
          </group>
        ))}
      </group>

      {/* Excavators */}
      {[
        [30, 30, 0.6],
        [-40, 18, 2.4],
        [12, -44, 4.2],
      ].map(([x, z, rot], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, rot, 0]}>
          <mesh position={[0, 1.1, 0]} castShadow>
            <boxGeometry args={[3.2, 1.5, 2.4]} />
            <meshStandardMaterial color="#e8a020" roughness={0.6} />
          </mesh>
          <mesh position={[0.4, 2.2, 0]}>
            <boxGeometry args={[1.6, 1.2, 1.6]} />
            <meshStandardMaterial color="#3b4048" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[3.6, 0.9, 2.8]} />
            <meshStandardMaterial color="#2a2d33" roughness={0.95} />
          </mesh>
          {/* articulated arm */}
          <group position={[1.4, 2, 0]}>
            <group
              ref={(el) => {
                excArmRefs.current[i] = el
              }}
            >
              <mesh position={[1.6, 0.5, 0]} rotation={[0, 0, 0.5]}>
                <boxGeometry args={[3.6, 0.5, 0.5]} />
                <meshStandardMaterial color="#e8a020" roughness={0.6} />
              </mesh>
              <mesh position={[3.3, -0.4, 0]} rotation={[0, 0, -0.9]}>
                <boxGeometry args={[2.6, 0.4, 0.4]} />
                <meshStandardMaterial color="#d99010" roughness={0.6} />
              </mesh>
              <mesh position={[4.2, -1.4, 0]}>
                <boxGeometry args={[0.9, 0.9, 1.1]} />
                <meshStandardMaterial color="#4a4f57" roughness={0.8} />
              </mesh>
            </group>
          </group>
        </group>
      ))}

      {/* Scan drones with light cones */}
      <group ref={dronesRef}>
        {[0, 1, 2].map((i) => (
          <group key={i}>
            <mesh>
              <boxGeometry args={[1.1, 0.3, 1.1]} />
              <meshStandardMaterial color="#dde3ea" roughness={0.4} metalness={0.4} />
            </mesh>
            {[[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]].map(([rx, rz], j) => (
              <mesh key={j} position={[rx, 0.22, rz]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.28, 0.05, 6, 12]} />
                <meshStandardMaterial color="#3d434c" roughness={0.5} />
              </mesh>
            ))}
            <mesh position={[0, -13, 0]}>
              <coneGeometry args={[7, 26, 16, 1, true]} />
              <meshBasicMaterial
                color="#54e0a6"
                transparent
                opacity={0.09}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
            <pointLight color="#54e0a6" intensity={8} distance={30} position={[0, -2, 0]} />
          </group>
        ))}
      </group>

      {/* Construction dust */}
      <points ref={dustRef} frustumCulled={false}>
        <primitive object={dustGeo} attach="geometry" />
        <shaderMaterial
          transparent
          depthWrite={false}
          uniforms={dustUniforms}
          vertexShader={/* glsl */ `
            attribute float aSeed;
            uniform float uTime;
            varying float vAlpha;
            void main() {
              vec3 pos = position;
              pos.y += mod(uTime * (0.4 + aSeed * 0.8) + aSeed * 6.0, 6.0);
              pos.x += sin(uTime * 0.4 + aSeed * 20.0) * 2.0;
              vAlpha = 1.0 - pos.y / 6.5;
              vec4 mv = modelViewMatrix * vec4(pos, 1.0);
              gl_PointSize = (60.0 + aSeed * 90.0) / -mv.z;
              gl_Position = projectionMatrix * mv;
            }
          `}
          fragmentShader={/* glsl */ `
            uniform float uOpacity;
            varying float vAlpha;
            void main() {
              float d = length(gl_PointCoord - 0.5);
              if (d > 0.5) discard;
              gl_FragColor = vec4(0.76, 0.68, 0.55, smoothstep(0.5, 0.0, d) * vAlpha * uOpacity);
            }
          `}
        />
      </points>
    </group>
  )
}
