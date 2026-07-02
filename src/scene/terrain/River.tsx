import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { riverCenterX, RIVER_WIDTH, WORLD_SIZE } from '../../utils/terrain'
import { frame } from '../frameState'

/** A ribbon of animated water following the valley's S-curve. */
export default function River() {
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uNight: { value: 0 },
      uFreeze: { value: 0 },
    }),
    [],
  )

  const geometry = useMemo(() => {
    const steps = 120
    const geo = new THREE.PlaneGeometry(RIVER_WIDTH * 2.2, WORLD_SIZE * 0.96, 4, steps)
    geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i)
      pos.setX(i, pos.getX(i) + riverCenterX(z))
      pos.setY(i, -1.4)
    }
    geo.computeVertexNormals()
    return geo
  }, [])

  const materialRef = useRef<THREE.ShaderMaterial>(null)

  useFrame((_, dt) => {
    uniforms.uTime.value += dt
    uniforms.uNight.value = frame.night
    uniforms.uFreeze.value = frame.snow
  })

  return (
    <mesh geometry={geometry} renderOrder={1}>
      <shaderMaterial
        ref={materialRef}
        transparent
        uniforms={uniforms}
        vertexShader={/* glsl */ `
          uniform float uTime;
          varying vec2 vUv;
          varying vec3 vWorldPos;
          void main() {
            vUv = uv;
            vec3 pos = position;
            pos.y += sin(pos.z * 0.4 + uTime * 1.6) * 0.12 + sin(pos.x * 0.9 + uTime * 2.2) * 0.08;
            vec4 wp = modelMatrix * vec4(pos, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `}
        fragmentShader={/* glsl */ `
          uniform float uTime;
          uniform float uNight;
          uniform float uFreeze;
          varying vec2 vUv;
          varying vec3 vWorldPos;

          float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float noise(vec2 p) {
            vec2 i = floor(p); vec2 f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                       mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
          }

          void main() {
            // flowing ripple field
            vec2 flow = vec2(vWorldPos.x * 0.25, vWorldPos.z * 0.25 - uTime * 0.8);
            float ripple = noise(flow * 2.0) * 0.6 + noise(flow * 5.0 + 3.7) * 0.4;

            vec3 deep = mix(vec3(0.13, 0.32, 0.42), vec3(0.05, 0.1, 0.22), uNight);
            vec3 lit = mix(vec3(0.55, 0.78, 0.85), vec3(0.35, 0.5, 0.85), uNight);
            vec3 col = mix(deep, lit, ripple * ripple);

            // sun glints
            float glint = pow(ripple, 6.0) * (1.0 - uNight * 0.88) * 2.2;
            col += vec3(1.0, 0.95, 0.8) * glint;

            // freeze to pale ice during the snow pass
            col = mix(col, vec3(0.82, 0.88, 0.93), uFreeze * 0.85);

            // soften banks
            float bank = smoothstep(0.0, 0.16, vUv.x) * smoothstep(1.0, 0.84, vUv.x);
            gl_FragColor = vec4(col, bank * 0.94);
            #include <colorspace_fragment>
          }
        `}
      />
    </mesh>
  )
}
