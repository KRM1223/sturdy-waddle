import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { T } from '../../config/timeline'
import { clamp01, easeOutBack, mulberry32, rangeProgress } from '../../utils/math'
import { terrainHeight } from '../../utils/terrain'
import { LANDMARK_POSITIONS } from '../../utils/cityPlan'
import { BUILDINGS } from './cityData'
import { frame, scratch } from '../frameState'

const PANEL_ROWS = 6
const PANELS_PER_ROW = 8
const ROBOT_COUNT = 10
const DRONE_COUNT = 8

/** Chapter 9 — renewables, robots, drones, sensors, living billboards. */
export default function SmartCity() {
  const groupRef = useRef<THREE.Group>(null)
  const bladesRefs = useRef<(THREE.Group | null)[]>([])
  const panelsRef = useRef<THREE.InstancedMesh>(null)
  const robotsRef = useRef<THREE.InstancedMesh>(null)
  const dronesRef = useRef<THREE.InstancedMesh>(null)
  const billboardMats = useRef<THREE.ShaderMaterial[]>([])

  const turbines = useMemo(
    () =>
      [
        [-190, -150],
        [-215, -95],
        [-235, -30],
        [-225, 45],
        [-200, 115],
      ].map(([x, z], i) => ({ x, z, y: terrainHeight(x, z), phase: i * 1.3 })),
    [],
  )

  const robots = useMemo(() => {
    const rand = mulberry32(4545)
    const roads = [-24, 0, 24, 48]
    return Array.from({ length: ROBOT_COUNT }, (_, i) => ({
      road: roads[Math.floor(rand() * roads.length)],
      horizontal: rand() > 0.5,
      speed: 2.2 + rand() * 1.6,
      offset: rand() * 160,
      dir: rand() > 0.5 ? 1 : -1,
      cleaning: i % 3 === 0,
    }))
  }, [])

  const droneSeeds = useMemo(() => {
    const rand = mulberry32(6767)
    return Array.from({ length: DRONE_COUNT }, () => ({
      cx: (rand() - 0.5) * 140,
      cz: (rand() - 0.5) * 140,
      r: 18 + rand() * 30,
      h: 34 + rand() * 26,
      speed: 0.14 + rand() * 0.18,
      phase: rand() * Math.PI * 2,
    }))
  }, [])

  const billboardSites = useMemo(
    () =>
      BUILDINGS.filter((b) => b.kind === 'skyscraper')
        .slice(0, 5)
        .map((b, i) => ({ x: b.x, z: b.z, y: b.height * 0.72, w: b.width + 0.3, hue: i * 0.19 })),
    [],
  )

  const evChargers = useMemo(
    () =>
      [
        [30, 6.2],
        [-30, 6.2],
        [6.2, -54],
        [-54, -6.2],
      ].map(([x, z]) => ({ x, z })),
    [],
  )

  useFrame(() => {
    const p = frame.p
    const reveal = rangeProgress(p, T.smart[0], T.smart[0] + 0.05)
    if (groupRef.current) {
      groupRef.current.visible = reveal > 0.005
      if (!groupRef.current.visible) return
    }

    // Turbines spin with the wind
    bladesRefs.current.forEach((blades, i) => {
      if (blades) blades.rotation.z = frame.time * (1.2 + frame.windStrength * 0.8) + turbines[i].phase
    })
    // Turbine towers scale in
    if (groupRef.current) {
      const turbineGroup = groupRef.current.children[0] as THREE.Group
      turbineGroup.children.forEach((t, i) => {
        const s = easeOutBack(clamp01(reveal * 2 - i * 0.14))
        t.scale.setScalar(Math.max(0.001, s))
      })
    }

    // Solar panels tilt toward the sun and glint
    if (panelsRef.current) {
      const [sx, sz] = LANDMARK_POSITIONS.solar
      const tilt = -0.5 - Math.sin(p * Math.PI * 2) * 0.1
      let idx = 0
      for (let r = 0; r < PANEL_ROWS; r++) {
        for (let c = 0; c < PANELS_PER_ROW; c++) {
          const grow = easeOutBack(clamp01(reveal * 2.4 - (r * PANELS_PER_ROW + c) * 0.012))
          scratch.euler.set(tilt, 0, 0)
          scratch.quat.setFromEuler(scratch.euler)
          scratch.mat4.compose(
            scratch.v3a.set(sx - 8 + c * 2.3, 1, sz - 8 + r * 3),
            scratch.quat,
            scratch.v3b.setScalar(Math.max(0.001, grow)),
          )
          panelsRef.current.setMatrixAt(idx++, scratch.mat4)
        }
      }
      panelsRef.current.instanceMatrix.needsUpdate = true
    }

    // Delivery & cleaning robots trundle along sidewalks
    if (robotsRef.current) {
      robots.forEach((robot, i) => {
        const travel = ((frame.time * robot.speed + robot.offset) % 160) - 80
        const x = robot.horizontal ? travel : robot.road + 5.4
        const z = robot.horizontal ? robot.road + 5.4 : travel
        const wobble = robot.cleaning ? Math.sin(frame.time * 5 + i) * 0.4 : 0
        scratch.euler.set(0, robot.horizontal ? Math.PI / 2 : 0, 0)
        scratch.quat.setFromEuler(scratch.euler)
        scratch.mat4.compose(
          scratch.v3a.set(x + wobble * (robot.horizontal ? 0 : 1), 0.35, z + wobble * (robot.horizontal ? 1 : 0)),
          scratch.quat,
          scratch.v3b.setScalar(reveal),
        )
        robotsRef.current!.setMatrixAt(i, scratch.mat4)
      })
      robotsRef.current.instanceMatrix.needsUpdate = true
    }

    // Delivery drones orbit their routes with a bob
    if (dronesRef.current) {
      droneSeeds.forEach((d, i) => {
        const a = frame.time * d.speed + d.phase
        scratch.euler.set(0.08, -a, 0)
        scratch.quat.setFromEuler(scratch.euler)
        scratch.mat4.compose(
          scratch.v3a.set(
            d.cx + Math.cos(a) * d.r,
            d.h + Math.sin(frame.time * 1.4 + i) * 1.6,
            d.cz + Math.sin(a) * d.r,
          ),
          scratch.quat,
          scratch.v3b.setScalar(reveal),
        )
        dronesRef.current!.setMatrixAt(i, scratch.mat4)
      })
      dronesRef.current.instanceMatrix.needsUpdate = true
    }

    for (const mat of billboardMats.current) {
      if (mat) {
        mat.uniforms.uTime.value = frame.time
        mat.uniforms.uNight.value = frame.night
        mat.uniforms.uReveal.value = reveal
      }
    }
  })

  return (
    <group ref={groupRef} visible={false}>
      {/* Wind farm on the western ridge */}
      <group>
        {turbines.map((t, i) => (
          <group key={i} position={[t.x, t.y, t.z]}>
            <mesh position={[0, 14, 0]}>
              <cylinderGeometry args={[0.5, 1, 28, 8]} />
              <meshStandardMaterial color="#e8ecf0" roughness={0.4} />
            </mesh>
            <mesh position={[0, 28, 1.2]}>
              <boxGeometry args={[1.6, 1.6, 3]} />
              <meshStandardMaterial color="#dfe5eb" roughness={0.4} />
            </mesh>
            <group
              position={[0, 28, 2.8]}
              ref={(el) => {
                bladesRefs.current[i] = el
              }}
            >
              {[0, 1, 2].map((b) => (
                <mesh key={b} rotation={[0, 0, (b / 3) * Math.PI * 2]} position={[0, 0, 0]}>
                  <boxGeometry args={[0.7, 13, 0.18]} />
                  <meshStandardMaterial color="#f4f7fa" roughness={0.35} />
                </mesh>
              ))}
            </group>
          </group>
        ))}
      </group>

      {/* Solar farm block */}
      <instancedMesh ref={panelsRef} args={[undefined, undefined, PANEL_ROWS * PANELS_PER_ROW]}>
        <boxGeometry args={[2, 0.1, 2.4]} />
        <meshStandardMaterial color="#1a2c4d" roughness={0.15} metalness={0.7} emissive="#12305c" emissiveIntensity={0.4} />
      </instancedMesh>

      {/* Robots */}
      <instancedMesh ref={robotsRef} args={[undefined, undefined, ROBOT_COUNT]}>
        <boxGeometry args={[0.7, 0.7, 1]} />
        <meshStandardMaterial color="#e8ecf0" emissive="#3de8ff" emissiveIntensity={0.5} roughness={0.35} />
      </instancedMesh>

      {/* Drones */}
      <instancedMesh ref={dronesRef} args={[undefined, undefined, DRONE_COUNT]}>
        <boxGeometry args={[1, 0.28, 1]} />
        <meshStandardMaterial color="#c9d2da" emissive="#7fd7ff" emissiveIntensity={0.7} roughness={0.4} metalness={0.4} />
      </instancedMesh>

      {/* EV chargers */}
      {evChargers.map((ev, i) => (
        <group key={i} position={[ev.x, 0, ev.z]}>
          <mesh position={[0, 0.75, 0]}>
            <boxGeometry args={[0.5, 1.5, 0.35]} />
            <meshStandardMaterial color="#2fa864" emissive="#2fe08a" emissiveIntensity={0.9} roughness={0.4} />
          </mesh>
        </group>
      ))}

      {/* IoT sensor beacons on the major intersections */}
      {[-48, 0, 48].flatMap((x) =>
        [-48, 0, 48].map((z) => (
          <mesh key={`${x}${z}`} position={[x - 4.6, 7.4, z - 4.6]}>
            <sphereGeometry args={[0.16, 6, 6]} />
            <meshStandardMaterial color="#3de8ff" emissive="#3de8ff" emissiveIntensity={2.4} toneMapped={false} />
          </mesh>
        )),
      )}

      {/* Digital billboards riding the skyscrapers */}
      {billboardSites.map((site, i) => (
        <mesh key={i} position={[site.x, site.y, site.z + 0.05]} rotation={[0, i % 2 === 0 ? 0 : Math.PI / 2, 0]}>
          <planeGeometry args={[site.w * 1.4, site.w * 0.9]} />
          <shaderMaterial
            ref={(mat) => {
              if (mat) billboardMats.current[i] = mat
            }}
            transparent
            uniforms={{
              uTime: { value: 0 },
              uNight: { value: 0 },
              uReveal: { value: 0 },
              uHue: { value: site.hue },
            }}
            vertexShader={/* glsl */ `
              varying vec2 vUv;
              void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `}
            fragmentShader={/* glsl */ `
              uniform float uTime;
              uniform float uNight;
              uniform float uReveal;
              uniform float uHue;
              varying vec2 vUv;
              vec3 hue2rgb(float h) {
                vec3 k = mod(vec3(5.0, 3.0, 1.0) + h * 6.0, 6.0);
                return 1.0 - max(min(min(k, 4.0 - k), vec3(1.0)), vec3(0.0));
              }
              void main() {
                // scrolling gradient bars — a living advertisement
                float bar = step(0.5, fract(vUv.y * 5.0 + uTime * 0.4));
                float scan = sin(vUv.y * 90.0 + uTime * 8.0) * 0.06;
                vec3 a = hue2rgb(fract(uHue + uTime * 0.03));
                vec3 b = hue2rgb(fract(uHue + 0.35 + uTime * 0.02));
                vec3 col = mix(a, b, vUv.x + scan) * (0.6 + bar * 0.6);
                float edge = step(0.03, vUv.x) * step(vUv.x, 0.97) * step(0.04, vUv.y) * step(vUv.y, 0.96);
                float glow = 0.35 + uNight * 0.9;
                gl_FragColor = vec4(col * glow * 1.6, edge * uReveal * 0.95);
              }
            `}
          />
        </mesh>
      ))}
    </group>
  )
}
