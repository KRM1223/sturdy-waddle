import { useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { mulberry32 } from '../../utils/math'
import { frame } from '../frameState'

const COUNT = 360

/** Pollen / dust motes drifting near the camera — pure atmosphere. */
export default function AmbientParticles() {
  const pointsRef = useRef<THREE.Points>(null)

  const geometry = useMemo(() => {
    const rand = mulberry32(808)
    const positions = new Float32Array(COUNT * 3)
    const seeds = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (rand() - 0.5) * 120
      positions[i * 3 + 1] = rand() * 60
      positions[i * 3 + 2] = (rand() - 0.5) * 120
      seeds[i] = rand()
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    return geo
  }, [])

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uOpacity: { value: 0.5 } }),
    [],
  )

  useFrame(({ camera }) => {
    uniforms.uTime.value = frame.time
    // strongest in the pastoral opening, gentle later, gone in space
    uniforms.uOpacity.value = (0.55 - frame.p * 0.4) * (1 - frame.underground)
    pointsRef.current?.position.set(camera.position.x, 0, camera.position.z)
  })

  return (
    <points ref={pointsRef} frustumCulled={false}>
      <primitive object={geometry} attach="geometry" />
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          attribute float aSeed;
          uniform float uTime;
          varying float vAlpha;
          void main() {
            vec3 pos = position;
            pos.x += sin(uTime * (0.2 + aSeed * 0.3) + aSeed * 40.0) * 6.0;
            pos.y += sin(uTime * (0.15 + aSeed * 0.2) + aSeed * 17.0) * 4.0;
            pos.z += cos(uTime * (0.18 + aSeed * 0.25) + aSeed * 23.0) * 6.0;
            vAlpha = 0.25 + 0.55 * sin(uTime * (0.5 + aSeed) + aSeed * 90.0);
            vec4 mv = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = (30.0 + aSeed * 50.0) / -mv.z;
            gl_Position = projectionMatrix * mv;
          }
        `}
        fragmentShader={/* glsl */ `
          uniform float uOpacity;
          varying float vAlpha;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            float a = smoothstep(0.5, 0.0, d) * max(vAlpha, 0.0) * uOpacity;
            gl_FragColor = vec4(1.0, 0.98, 0.9, a);
          }
        `}
      />
    </points>
  )
}
