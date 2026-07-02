import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { frame } from '../frameState'

/** Curtains of green-violet light for the orbital finale. */
export default function Aurora() {
  const meshRef = useRef<THREE.Mesh>(null)
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uOpacity: { value: 0 } }),
    [],
  )

  useFrame((_, dt) => {
    uniforms.uTime.value += dt
    uniforms.uOpacity.value = frame.aurora
    if (meshRef.current) meshRef.current.visible = frame.aurora > 0.01
  })

  return (
    <mesh
      ref={meshRef}
      visible={false}
      position={[0, 620, -1150]}
      rotation={[0.15, 0, 0]}
      frustumCulled={false}
    >
      <planeGeometry args={[2600, 700, 64, 24]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          uniform float uTime;
          varying vec2 vUv;
          void main() {
            vUv = uv;
            vec3 pos = position;
            pos.z += sin(uv.x * 9.0 + uTime * 0.35) * 46.0 * uv.y;
            pos.x += sin(uv.x * 4.0 - uTime * 0.2) * 30.0;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `}
        fragmentShader={/* glsl */ `
          uniform float uTime;
          uniform float uOpacity;
          varying vec2 vUv;
          void main() {
            float bands = sin(vUv.x * 26.0 + uTime * 0.5) * 0.5 + 0.5;
            bands *= sin(vUv.x * 7.0 - uTime * 0.22) * 0.5 + 0.5;
            float vertical = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.35, vUv.y);
            vec3 green = vec3(0.2, 0.95, 0.55);
            vec3 violet = vec3(0.5, 0.3, 0.9);
            vec3 col = mix(green, violet, vUv.y + bands * 0.3);
            gl_FragColor = vec4(col, bands * vertical * 0.5 * uOpacity);
          }
        `}
      />
    </mesh>
  )
}
