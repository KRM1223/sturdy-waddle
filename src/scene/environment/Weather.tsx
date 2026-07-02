import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { mulberry32 } from '../../utils/math'
import { frame } from '../frameState'

const RAIN_COUNT = 2600
const SNOW_COUNT = 1600
const BOX = 160 // precipitation volume around the camera

function makePrecipGeometry(count: number, seed: number) {
  const rand = mulberry32(seed)
  const positions = new Float32Array(count * 3)
  const seeds = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (rand() - 0.5) * BOX
    positions[i * 3 + 1] = rand() * BOX
    positions[i * 3 + 2] = (rand() - 0.5) * BOX
    seeds[i] = rand()
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
  return geo
}

/** GPU rain + snow wrapped around the camera, plus the rainbow arc. */
export default function Weather() {
  const rainRef = useRef<THREE.Points>(null)
  const snowRef = useRef<THREE.Points>(null)
  const rainbowRef = useRef<THREE.Mesh>(null)

  const rainGeo = useMemo(() => makePrecipGeometry(RAIN_COUNT, 101), [])
  const snowGeo = useMemo(() => makePrecipGeometry(SNOW_COUNT, 202), [])

  const rainUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uOpacity: { value: 0 }, uBox: { value: BOX } }),
    [],
  )
  const snowUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uOpacity: { value: 0 }, uBox: { value: BOX } }),
    [],
  )
  const rainbowUniforms = useMemo(() => ({ uOpacity: { value: 0 } }), [])

  useFrame(({ camera }, dt) => {
    rainUniforms.uTime.value += dt
    snowUniforms.uTime.value += dt
    rainUniforms.uOpacity.value = frame.rain
    snowUniforms.uOpacity.value = frame.snow
    rainbowUniforms.uOpacity.value = frame.rainbow

    if (rainRef.current) {
      rainRef.current.visible = frame.rain > 0.01
      rainRef.current.position.set(camera.position.x, camera.position.y - BOX / 2, camera.position.z)
    }
    if (snowRef.current) {
      snowRef.current.visible = frame.snow > 0.01
      snowRef.current.position.set(camera.position.x, camera.position.y - BOX / 2, camera.position.z)
    }
    if (rainbowRef.current) {
      rainbowRef.current.visible = frame.rainbow > 0.01
    }
  })

  return (
    <>
      <points ref={rainRef} frustumCulled={false} visible={false}>
        <primitive object={rainGeo} attach="geometry" />
        <shaderMaterial
          transparent
          depthWrite={false}
          uniforms={rainUniforms}
          vertexShader={/* glsl */ `
            attribute float aSeed;
            uniform float uTime;
            uniform float uBox;
            varying float vAlpha;
            void main() {
              vec3 pos = position;
              float speed = 70.0 + aSeed * 55.0;
              pos.y = mod(position.y - uTime * speed, uBox);
              pos.x += sin(aSeed * 40.0) * 2.0;
              vAlpha = 0.35 + aSeed * 0.4;
              vec4 mv = modelViewMatrix * vec4(pos, 1.0);
              gl_PointSize = 90.0 / -mv.z;
              gl_Position = projectionMatrix * mv;
            }
          `}
          fragmentShader={/* glsl */ `
            uniform float uOpacity;
            varying float vAlpha;
            void main() {
              vec2 c = gl_PointCoord - 0.5;
              // streak shape
              float a = smoothstep(0.5, 0.0, abs(c.x) * 6.0) * smoothstep(0.5, 0.1, abs(c.y));
              gl_FragColor = vec4(0.62, 0.72, 0.86, a * vAlpha * uOpacity);
            }
          `}
        />
      </points>

      <points ref={snowRef} frustumCulled={false} visible={false}>
        <primitive object={snowGeo} attach="geometry" />
        <shaderMaterial
          transparent
          depthWrite={false}
          uniforms={snowUniforms}
          vertexShader={/* glsl */ `
            attribute float aSeed;
            uniform float uTime;
            uniform float uBox;
            varying float vAlpha;
            void main() {
              vec3 pos = position;
              float speed = 6.0 + aSeed * 7.0;
              pos.y = mod(position.y - uTime * speed, uBox);
              pos.x += sin(uTime * (0.5 + aSeed) + aSeed * 30.0) * 4.0;
              pos.z += cos(uTime * (0.4 + aSeed) + aSeed * 17.0) * 4.0;
              vAlpha = 0.5 + aSeed * 0.5;
              vec4 mv = modelViewMatrix * vec4(pos, 1.0);
              gl_PointSize = (140.0 + aSeed * 160.0) / -mv.z;
              gl_Position = projectionMatrix * mv;
            }
          `}
          fragmentShader={/* glsl */ `
            uniform float uOpacity;
            varying float vAlpha;
            void main() {
              float d = length(gl_PointCoord - 0.5);
              if (d > 0.5) discard;
              float a = smoothstep(0.5, 0.05, d);
              gl_FragColor = vec4(0.95, 0.97, 1.0, a * vAlpha * uOpacity);
            }
          `}
        />
      </points>

      {/* Rainbow — a shader arc standing over the eastern hills */}
      <mesh
        ref={rainbowRef}
        visible={false}
        position={[150, -30, -180]}
        rotation={[0, -0.5, 0]}
      >
        <torusGeometry args={[220, 26, 2, 64, Math.PI]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
          uniforms={rainbowUniforms}
          vertexShader={/* glsl */ `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={/* glsl */ `
            uniform float uOpacity;
            varying vec2 vUv;
            vec3 hue(float h) {
              vec3 k = mod(vec3(5.0, 3.0, 1.0) + h * 6.0, 6.0);
              return 1.0 - max(min(min(k, 4.0 - k), vec3(1.0)), vec3(0.0));
            }
            void main() {
              float band = vUv.y;
              vec3 col = hue(band * 0.78);
              float edge = smoothstep(0.0, 0.18, band) * smoothstep(1.0, 0.82, band);
              gl_FragColor = vec4(col, edge * 0.28 * uOpacity);
            }
          `}
        />
      </mesh>
    </>
  )
}
