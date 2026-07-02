import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { audioEngine } from '../../audio/AudioEngine'
import { rangeWindow } from '../../utils/math'
import { frame } from '../frameState'

const BURSTS = 5
const PARTICLES = 110

/** Chapter 11 — a pool of shader-driven firework bursts over the festival. */
export default function Fireworks() {
  const pointsRef = useRef<THREE.Points>(null)
  const nextLaunch = useRef(0)
  const burstIndex = useRef(0)

  const { geometry, uniforms } = useMemo(() => {
    const positions = new Float32Array(BURSTS * PARTICLES * 3)
    const dirs = new Float32Array(BURSTS * PARTICLES * 3)
    const seeds = new Float32Array(BURSTS * PARTICLES)
    const burstId = new Float32Array(BURSTS * PARTICLES)
    for (let b = 0; b < BURSTS; b++) {
      for (let i = 0; i < PARTICLES; i++) {
        const idx = b * PARTICLES + i
        // random point on sphere
        const u = Math.random() * 2 - 1
        const a = Math.random() * Math.PI * 2
        const r = Math.sqrt(1 - u * u)
        dirs[idx * 3] = r * Math.cos(a)
        dirs[idx * 3 + 1] = u
        dirs[idx * 3 + 2] = r * Math.sin(a)
        seeds[idx] = Math.random()
        burstId[idx] = b
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aDir', new THREE.BufferAttribute(dirs, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    geo.setAttribute('aBurst', new THREE.BufferAttribute(burstId, 1))
    const uni = {
      uTime: { value: 0 },
      uStarts: { value: new Float32Array(BURSTS).fill(-100) },
      uOrigins: { value: Array.from({ length: BURSTS }, () => new THREE.Vector3()) },
      uColors: { value: Array.from({ length: BURSTS }, () => new THREE.Color()) },
    }
    return { geometry: geo, uniforms: uni }
  }, [])

  useFrame(() => {
    uniforms.uTime.value = frame.time
    const festival = rangeWindow(frame.p, 0.77, 0.84, 0.015)
    const show = festival * frame.night
    if (pointsRef.current) pointsRef.current.visible = show > 0.05
    if (show > 0.25 && frame.time > nextLaunch.current) {
      nextLaunch.current = frame.time + 0.9 + Math.random() * 1.3
      const b = burstIndex.current
      burstIndex.current = (b + 1) % BURSTS
      uniforms.uStarts.value[b] = frame.time
      uniforms.uOrigins.value[b].set(
        (Math.random() - 0.5) * 90,
        55 + Math.random() * 30,
        (Math.random() - 0.5) * 90,
      )
      uniforms.uColors.value[b].setHSL(Math.random(), 0.85, 0.62)
      audioEngine.fireworkPop()
    }
  })

  return (
    <points ref={pointsRef} frustumCulled={false} visible={false}>
      <primitive object={geometry} attach="geometry" />
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          attribute vec3 aDir;
          attribute float aSeed;
          attribute float aBurst;
          uniform float uTime;
          uniform float uStarts[${BURSTS}];
          uniform vec3 uOrigins[${BURSTS}];
          uniform vec3 uColors[${BURSTS}];
          varying float vLife;
          varying vec3 vColor;
          void main() {
            int b = int(aBurst);
            float age = uTime - uStarts[b];
            float duration = 2.6;
            float t = clamp(age / duration, 0.0, 1.0);
            vLife = 1.0 - t;
            vColor = uColors[b];
            float radius = (18.0 + aSeed * 10.0) * (1.0 - pow(1.0 - t, 3.0));
            vec3 pos = uOrigins[b] + aDir * radius;
            pos.y -= t * t * 14.0; // gravity droop
            vec4 mv = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = (240.0 * vLife * (0.4 + aSeed * 0.6)) / -mv.z;
            gl_Position = projectionMatrix * mv;
          }
        `}
        fragmentShader={/* glsl */ `
          varying float vLife;
          varying vec3 vColor;
          void main() {
            if (vLife <= 0.001) discard;
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            float a = smoothstep(0.5, 0.0, d) * vLife;
            gl_FragColor = vec4(vColor * (1.0 + vLife), a);
          }
        `}
      />
    </points>
  )
}
