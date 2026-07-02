import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { T } from '../../config/timeline'
import { clamp01, easeOutCubic, mulberry32, rangeProgress } from '../../utils/math'
import { BUILDINGS } from './cityData'
import { frame, scratch } from '../frameState'

const TAXI_COUNT = 12
const FOREST_COUNT = 160

/** Chapter 12 — flying taxis, sky bridges, hyperloop, holograms, green towers. */
export default function FutureCity() {
  const groupRef = useRef<THREE.Group>(null)
  const taxisRef = useRef<THREE.InstancedMesh>(null)
  const trailsRef = useRef<THREE.InstancedMesh>(null)
  const podRefs = useRef<(THREE.Mesh | null)[]>([])
  const forestRef = useRef<THREE.InstancedMesh>(null)
  const holoMats = useRef<THREE.ShaderMaterial[]>([])
  const bridgesRef = useRef<THREE.Group>(null)

  const towers = useMemo(
    () => BUILDINGS.filter((b) => b.kind === 'skyscraper').sort((a, b) => b.height - a.height),
    [],
  )

  const taxiPaths = useMemo(() => {
    const rand = mulberry32(8181)
    return Array.from({ length: TAXI_COUNT }, () => {
      const pts: THREE.Vector3[] = []
      const n = 5
      for (let i = 0; i < n; i++) {
        pts.push(
          new THREE.Vector3((rand() - 0.5) * 150, 45 + rand() * 45, (rand() - 0.5) * 150),
        )
      }
      const curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.7)
      return { curve, speed: 0.02 + rand() * 0.02, offset: rand() }
    })
  }, [])

  const bridges = useMemo(() => {
    const list: { a: THREE.Vector3; b: THREE.Vector3; len: number }[] = []
    for (let i = 0; i < Math.min(6, towers.length - 1); i++) {
      const ta = towers[i]
      const tb = towers[i + 1]
      const a = new THREE.Vector3(ta.x, Math.min(ta.height, tb.height) * 0.82, ta.z)
      const b = new THREE.Vector3(tb.x, Math.min(ta.height, tb.height) * 0.82, tb.z)
      const len = a.distanceTo(b)
      if (len < 60) list.push({ a, b, len })
    }
    return list
  }, [towers])

  const forest = useMemo(() => {
    const rand = mulberry32(9191)
    const greens = towers.filter((t) => t.hasGreenRoof).slice(0, 10)
    return Array.from({ length: FOREST_COUNT }, (_, i) => {
      const t = greens[i % Math.max(1, greens.length)]
      const face = Math.floor(rand() * 4)
      const u = (rand() - 0.5) * 0.9
      const y = (0.2 + rand() * 0.75) * t.height
      const off = 0.52
      const pos =
        face === 0
          ? [t.x + t.width * off, y, t.z + u * t.depth]
          : face === 1
            ? [t.x - t.width * off, y, t.z + u * t.depth]
            : face === 2
              ? [t.x + u * t.width, y, t.z + t.depth * off]
              : [t.x + u * t.width, y, t.z - t.depth * off]
      return { pos: pos as [number, number, number], s: 0.5 + rand() * 0.8, hue: rand() }
    })
  }, [towers])

  const holograms = useMemo(
    () =>
      towers.slice(0, 4).map((t, i) => ({
        x: t.x + (i % 2 === 0 ? 14 : -14),
        y: t.height + 14,
        z: t.z + (i < 2 ? 10 : -10),
        hue: 0.5 + i * 0.12,
      })),
    [towers],
  )

  const forestColorsSet = useRef(false)

  useFrame(() => {
    const p = frame.p
    const reveal = rangeProgress(p, T.future[0], T.future[0] + 0.05)
    if (groupRef.current) {
      groupRef.current.visible = reveal > 0.005
      if (!groupRef.current.visible) return
    }

    // Flying taxis ride their loops; light trails stretch behind them
    if (taxisRef.current && trailsRef.current) {
      taxiPaths.forEach((path, i) => {
        const t = (frame.time * path.speed + path.offset) % 1
        const pos = path.curve.getPointAt(t)
        const tangent = path.curve.getTangentAt(t)
        scratch.v3b.copy(pos).add(tangent)
        scratch.mat4.lookAt(pos, scratch.v3b, scratch.v3c.set(0, 1, 0))
        scratch.quat.setFromRotationMatrix(scratch.mat4)
        scratch.mat4.compose(pos, scratch.quat, scratch.v3a.setScalar(reveal))
        taxisRef.current!.setMatrixAt(i, scratch.mat4)
        // trail: stretched behind
        scratch.v3b.copy(pos).addScaledVector(tangent, -3.4)
        scratch.mat4.compose(scratch.v3b, scratch.quat, scratch.v3a.set(reveal * 0.4, reveal * 0.4, reveal * 5))
        trailsRef.current!.setMatrixAt(i, scratch.mat4)
      })
      taxisRef.current.instanceMatrix.needsUpdate = true
      trailsRef.current.instanceMatrix.needsUpdate = true
    }

    // Hyperloop pods race the elevated ring
    podRefs.current.forEach((pod, i) => {
      if (!pod) return
      const a = frame.time * 0.35 + i * ((Math.PI * 2) / 3)
      pod.position.set(Math.cos(a) * 118, 16, Math.sin(a) * 118)
      pod.rotation.y = -a - Math.PI / 2
      pod.scale.setScalar(reveal)
    })

    // Sky bridges extend between towers
    if (bridgesRef.current) {
      bridgesRef.current.children.forEach((bridge, i) => {
        const grow = easeOutCubic(clamp01(reveal * 2.2 - i * 0.14))
        bridge.scale.y = 1
        bridge.scale.z = 1
        bridge.scale.x = Math.max(0.001, grow)
      })
    }

    // Vertical forest fades in
    if (forestRef.current) {
      if (!forestColorsSet.current) {
        forestColorsSet.current = true
        const c = new THREE.Color()
        forest.forEach((f, i) =>
          forestRef.current!.setColorAt(i, c.setHSL(0.3 + f.hue * 0.08, 0.5, 0.3 + f.hue * 0.15)),
        )
        if (forestRef.current.instanceColor) forestRef.current.instanceColor.needsUpdate = true
      }
      forest.forEach((f, i) => {
        const sway = Math.sin(frame.time * 1.2 + i) * 0.04
        scratch.euler.set(sway, 0, sway)
        scratch.quat.setFromEuler(scratch.euler)
        scratch.mat4.compose(
          scratch.v3a.set(...f.pos),
          scratch.quat,
          scratch.v3b.setScalar(Math.max(0.001, f.s * reveal)),
        )
        forestRef.current!.setMatrixAt(i, scratch.mat4)
      })
      forestRef.current.instanceMatrix.needsUpdate = true
    }

    for (const mat of holoMats.current) {
      if (mat) {
        mat.uniforms.uTime.value = frame.time
        mat.uniforms.uReveal.value = reveal
      }
    }
  })

  return (
    <group ref={groupRef} visible={false}>
      {/* Flying taxis */}
      <instancedMesh ref={taxisRef} args={[undefined, undefined, TAXI_COUNT]}>
        <capsuleGeometry args={[0.7, 1.8, 4, 8]} />
        <meshStandardMaterial color="#e8ecf0" emissive="#ffb84d" emissiveIntensity={0.8} roughness={0.3} metalness={0.5} />
      </instancedMesh>
      <instancedMesh ref={trailsRef} args={[undefined, undefined, TAXI_COUNT]}>
        <boxGeometry args={[0.5, 0.5, 1]} />
        <meshBasicMaterial color="#ffb84d" transparent opacity={0.35} toneMapped={false} depthWrite={false} />
      </instancedMesh>

      {/* Hyperloop ring + pods */}
      <mesh position={[0, 16, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[118, 1.7, 10, 90]} />
        <meshStandardMaterial color="#9fb4c8" transparent opacity={0.34} roughness={0.15} metalness={0.7} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 118, 7.5, Math.sin(a) * 118]}>
            <cylinderGeometry args={[0.6, 0.9, 15, 6]} />
            <meshStandardMaterial color="#7c93a8" roughness={0.5} metalness={0.4} />
          </mesh>
        )
      })}
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            podRefs.current[i] = el
          }}
          rotation={[0, 0, Math.PI / 2]}
        >
          <capsuleGeometry args={[1.1, 6, 4, 10]} />
          <meshStandardMaterial color="#f4f7fa" emissive="#3de8ff" emissiveIntensity={1.2} roughness={0.2} metalness={0.6} />
        </mesh>
      ))}

      {/* Sky bridges */}
      <group ref={bridgesRef}>
        {bridges.map((b, i) => {
          const mid = b.a.clone().lerp(b.b, 0.5)
          const dir = b.b.clone().sub(b.a)
          const angle = Math.atan2(dir.z, dir.x)
          return (
            <group key={i} position={mid} rotation={[0, -angle, 0]}>
              <mesh>
                <cylinderGeometry args={[1.6, 1.6, b.len, 8]} />
                <meshStandardMaterial color="#bfe3f2" transparent opacity={0.4} roughness={0.1} metalness={0.3} />
              </mesh>
            </group>
          )
        })}
      </group>

      {/* Vertical forests clinging to green towers */}
      <instancedMesh ref={forestRef} args={[undefined, undefined, FOREST_COUNT]}>
        <icosahedronGeometry args={[0.9, 0]} />
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>

      {/* Holographic beacons drifting over the towers */}
      {holograms.map((h, i) => (
        <group key={i} position={[h.x, h.y, h.z]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[5, 0.14, 8, 40]} />
            <meshBasicMaterial color="#6fe8ff" transparent opacity={0.5} toneMapped={false} depthWrite={false} />
          </mesh>
          <mesh>
            <coneGeometry args={[4.4, 12, 20, 1, true]} />
            <shaderMaterial
              ref={(mat) => {
                if (mat) holoMats.current[i] = mat
              }}
              transparent
              depthWrite={false}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              uniforms={{ uTime: { value: 0 }, uReveal: { value: 0 }, uHue: { value: h.hue } }}
              vertexShader={/* glsl */ `
                varying vec2 vUv;
                uniform float uTime;
                void main() {
                  vUv = uv;
                  vec3 pos = position;
                  pos.x += sin(uTime * 2.0 + position.y) * 0.12;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
              `}
              fragmentShader={/* glsl */ `
                uniform float uTime;
                uniform float uReveal;
                varying vec2 vUv;
                void main() {
                  float scan = step(0.5, fract(vUv.y * 22.0 - uTime * 1.6)) * 0.5 + 0.4;
                  float flicker = 0.85 + 0.15 * sin(uTime * 19.0);
                  float fade = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
                  gl_FragColor = vec4(vec3(0.42, 0.9, 1.0) * scan * flicker, fade * 0.3 * uReveal);
                }
              `}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}
