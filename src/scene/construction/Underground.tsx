import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { mulberry32 } from '../../utils/math'
import { frame } from '../frameState'

interface PipeRun {
  color: string
  emissive: string
  depth: number
  radius: number
  lines: { horizontal: boolean; at: number }[]
  flow: number
  label: 'water' | 'power' | 'fiber' | 'gas' | 'sewer' | 'drain'
}

const RUNS: PipeRun[] = [
  { label: 'water', color: '#1c4d66', emissive: '#2f9fd8', depth: -4, radius: 0.55, flow: 1.4, lines: [{ horizontal: true, at: -48 }, { horizontal: true, at: 24 }, { horizontal: false, at: -24 }] },
  { label: 'power', color: '#5c4a12', emissive: '#ffc23d', depth: -6.5, radius: 0.34, flow: 3.2, lines: [{ horizontal: true, at: 0 }, { horizontal: false, at: 48 }, { horizontal: false, at: -72 }] },
  { label: 'fiber', color: '#123c4d', emissive: '#3de8ff', depth: -8.6, radius: 0.22, flow: 5.0, lines: [{ horizontal: true, at: 48 }, { horizontal: false, at: 0 }, { horizontal: true, at: -24 }] },
  { label: 'gas', color: '#5c2c12', emissive: '#ff9040', depth: -11, radius: 0.4, flow: 0.9, lines: [{ horizontal: false, at: 24 }, { horizontal: true, at: 72 }] },
  { label: 'sewer', color: '#2c3a22', emissive: '#7fbf5a', depth: -14, radius: 0.8, flow: 0.6, lines: [{ horizontal: true, at: -72 }, { horizontal: false, at: 72 }] },
  { label: 'drain', color: '#31404d', emissive: '#6aa8cf', depth: -12.4, radius: 0.6, flow: 0.8, lines: [{ horizontal: false, at: -48 }, { horizontal: true, at: 96 }] },
]

const EXTENT = 100
const PACKET_COUNT = 90

/**
 * Chapter 4 — the glowing subterranean network. Pulses run along every pipe
 * (a flowing dash shader), data packets race the fiber lines.
 */
export default function Underground() {
  const groupRef = useRef<THREE.Group>(null)
  const packetsRef = useRef<THREE.InstancedMesh>(null)
  const materialsRef = useRef<THREE.ShaderMaterial[]>([])

  const packetLines = useMemo(() => {
    const fiber = RUNS.find((r) => r.label === 'fiber')!
    const rand = mulberry32(66)
    return Array.from({ length: PACKET_COUNT }, (_, i) => {
      const line = fiber.lines[i % fiber.lines.length]
      return {
        line,
        depth: fiber.depth,
        speed: 40 + rand() * 70,
        offset: rand() * EXTENT * 2,
        dir: rand() > 0.5 ? 1 : -1,
      }
    })
  }, [])

  useFrame(() => {
    const visible = frame.underground > 0.005
    if (groupRef.current) groupRef.current.visible = visible
    if (!visible) return

    for (const mat of materialsRef.current) {
      if (mat) {
        mat.uniforms.uTime.value = frame.time
        mat.uniforms.uReveal.value = frame.underground
      }
    }

    if (packetsRef.current) {
      const m = new THREE.Matrix4()
      const v = new THREE.Vector3()
      packetLines.forEach((pk, i) => {
        const travel = ((frame.time * pk.speed + pk.offset) % (EXTENT * 2)) - EXTENT
        const along = travel * pk.dir
        if (pk.line.horizontal) v.set(along, pk.depth, pk.line.at)
        else v.set(pk.line.at, pk.depth, along)
        m.makeScale(frame.underground, frame.underground, frame.underground)
        m.setPosition(v)
        packetsRef.current!.setMatrixAt(i, m)
      })
      packetsRef.current.instanceMatrix.needsUpdate = true
    }
  })

  const pulseShader = (run: PipeRun, index: number) => (
    <shaderMaterial
      ref={(mat) => {
        if (mat) materialsRef.current[index] = mat
      }}
      transparent
      uniforms={{
        uTime: { value: 0 },
        uReveal: { value: 0 },
        uColor: { value: new THREE.Color(run.color) },
        uEmissive: { value: new THREE.Color(run.emissive) },
        uFlow: { value: run.flow },
      }}
      vertexShader={/* glsl */ `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `}
      fragmentShader={/* glsl */ `
        uniform float uTime;
        uniform float uReveal;
        uniform vec3 uColor;
        uniform vec3 uEmissive;
        uniform float uFlow;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          float along = vWorldPos.x + vWorldPos.z;
          float pulse = smoothstep(0.75, 1.0, sin(along * 0.35 - uTime * uFlow * 2.2) * 0.5 + 0.5);
          vec3 col = uColor * 0.8 + uEmissive * (0.35 + pulse * 1.6);
          gl_FragColor = vec4(col, uReveal);
          #include <colorspace_fragment>
        }
      `}
    />
  )

  return (
    <group ref={groupRef} visible={false}>
      {/* Soil vault — a dark cavern so the network reads clearly */}
      <mesh position={[0, -11, 0]}>
        <boxGeometry args={[EXTENT * 2.4, 22, EXTENT * 2.4]} />
        <meshBasicMaterial color="#07080d" side={THREE.BackSide} transparent opacity={0.94} />
      </mesh>

      {RUNS.map((run, ri) =>
        run.lines.map((line, li) => (
          <mesh
            key={`${run.label}-${li}`}
            position={line.horizontal ? [0, run.depth, line.at] : [line.at, run.depth, 0]}
            rotation={line.horizontal ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry args={[run.radius, run.radius, EXTENT * 2, 8]} />
            {pulseShader(run, ri * 4 + li)}
          </mesh>
        )),
      )}

      {/* Junction nodes where pipes meet */}
      {RUNS.flatMap((run) =>
        run.lines
          .filter((l) => l.horizontal)
          .flatMap((h) =>
            run.lines
              .filter((l) => !l.horizontal)
              .map((v) => (
                <mesh key={`${run.label}-${h.at}-${v.at}`} position={[v.at, run.depth, h.at]}>
                  <sphereGeometry args={[run.radius * 2, 10, 10]} />
                  <meshStandardMaterial
                    color={run.color}
                    emissive={run.emissive}
                    emissiveIntensity={1.2}
                  />
                </mesh>
              )),
          ),
      )}

      {/* Fiber data packets */}
      <instancedMesh ref={packetsRef} args={[undefined, undefined, PACKET_COUNT]}>
        <sphereGeometry args={[0.34, 6, 6]} />
        <meshBasicMaterial color="#8ff2ff" toneMapped={false} />
      </instancedMesh>

      {/* Soft cavern lighting */}
      <pointLight position={[0, -6, 0]} color="#3de8ff" intensity={60} distance={160} />
      <pointLight position={[-50, -8, 40]} color="#ffc23d" intensity={40} distance={120} />
      <pointLight position={[50, -10, -40]} color="#2f9fd8" intensity={40} distance={120} />
    </group>
  )
}
