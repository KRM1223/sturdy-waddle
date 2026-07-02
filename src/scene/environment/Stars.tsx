import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { mulberry32 } from '../../utils/math'
import { frame } from '../frameState'

const COUNT = 1400

/** A shell of twinkling points, faded in by the night curve. */
export default function Stars() {
  const pointsRef = useRef<THREE.Points>(null)

  const geometry = useMemo(() => {
    const rand = mulberry32(777)
    const positions = new Float32Array(COUNT * 3)
    const seeds = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) {
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(rand() * 0.95)
      const r = 1850
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.cos(phi) + 60
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      seeds[i] = rand() * 100
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    return geo
  }, [])

  const uniforms = useMemo(() => ({ uOpacity: { value: 0 }, uTime: { value: 0 } }), [])

  useFrame(({ camera }, dt) => {
    uniforms.uOpacity.value = frame.stars
    uniforms.uTime.value += dt
    // the shell follows the camera so it never clips or parallaxes oddly
    pointsRef.current?.position.copy(camera.position)
  })

  return (
    <points ref={pointsRef} frustumCulled={false} renderOrder={-9}>
      <primitive object={geometry} attach="geometry" />
      <shaderMaterial
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          attribute float aSeed;
          uniform float uTime;
          varying float vTwinkle;
          void main() {
            vTwinkle = 0.55 + 0.45 * sin(uTime * (0.6 + fract(aSeed) * 1.8) + aSeed);
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = (1.1 + fract(aSeed * 7.31) * 2.4) * vTwinkle * 1.8;
            gl_Position = projectionMatrix * mvPosition;
          }
        `}
        fragmentShader={/* glsl */ `
          uniform float uOpacity;
          varying float vTwinkle;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            if (d > 0.5) discard;
            float a = smoothstep(0.5, 0.0, d) * vTwinkle * uOpacity;
            gl_FragColor = vec4(vec3(0.92, 0.95, 1.0), a);
          }
        `}
      />
    </points>
  )
}
