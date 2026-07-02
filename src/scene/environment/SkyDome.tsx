import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { SKY_HORIZON, SKY_TOP, SUN_POSITION } from '../../config/atmosphere'
import { sampleColorKeys, sampleVec3Keys } from '../../utils/math'
import { getGlowTexture } from '../../utils/textures'
import { frame } from '../frameState'

const skyVertex = /* glsl */ `
  varying vec3 vWorldPosition;
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const skyFragment = /* glsl */ `
  uniform vec3 uTopColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uSunDirection;
  uniform vec3 uSunColor;
  uniform float uSunGlow;
  uniform float uFlash;
  varying vec3 vWorldPosition;

  void main() {
    vec3 dir = normalize(vWorldPosition);
    float h = clamp(dir.y, 0.0, 1.0);
    // soft exponential horizon falloff
    float blend = pow(1.0 - h, 2.6);
    vec3 col = mix(uTopColor, uHorizonColor, blend);

    // sun halo painted into the sky
    float sunDot = max(dot(dir, normalize(uSunDirection)), 0.0);
    col += uSunColor * pow(sunDot, 42.0) * uSunGlow;
    col += uSunColor * pow(sunDot, 5.0) * 0.16 * uSunGlow;

    // lightning washes the whole dome
    col = mix(col, vec3(0.82, 0.86, 1.0), uFlash * 0.55);

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

/** Gradient dome + painted sun halo + sun/moon sprites. */
export default function SkyDome() {
  const uniforms = useMemo(
    () => ({
      uTopColor: { value: new THREE.Color('#8ec9e8') },
      uHorizonColor: { value: new THREE.Color('#ffe6c2') },
      uSunDirection: { value: new THREE.Vector3(220, 90, 160) },
      uSunColor: { value: new THREE.Color('#ffdfae') },
      uSunGlow: { value: 1 },
      uFlash: { value: 0 },
    }),
    [],
  )
  const moonRef = useRef<THREE.Sprite>(null)
  const sunSpriteRef = useRef<THREE.Sprite>(null)
  const glow = useMemo(() => getGlowTexture(), [])

  useFrame(({ camera }) => {
    const p = frame.p
    sampleColorKeys(SKY_TOP, p, uniforms.uTopColor.value)
    sampleColorKeys(SKY_HORIZON, p, uniforms.uHorizonColor.value)
    sampleVec3Keys(SUN_POSITION, p, uniforms.uSunDirection.value)
    uniforms.uSunGlow.value = (1 - frame.night * 0.85) * (1 - frame.cloudDark * 0.7)
    uniforms.uFlash.value = frame.lightning

    if (sunSpriteRef.current) {
      sunSpriteRef.current.position
        .copy(uniforms.uSunDirection.value)
        .normalize()
        .multiplyScalar(1750)
        .add(camera.position)
      const mat = sunSpriteRef.current.material as THREE.SpriteMaterial
      mat.opacity = uniforms.uSunGlow.value * 0.9
    }
    if (moonRef.current) {
      moonRef.current.position
        .set(-0.55, 0.5, -0.68)
        .normalize()
        .multiplyScalar(1700)
        .add(camera.position)
      const mat = moonRef.current.material as THREE.SpriteMaterial
      mat.opacity = frame.moon
    }
  })

  return (
    <>
      <mesh frustumCulled={false} renderOrder={-10}>
        <sphereGeometry args={[2000, 32, 20]} />
        <shaderMaterial
          vertexShader={skyVertex}
          fragmentShader={skyFragment}
          uniforms={uniforms}
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>
      <sprite ref={sunSpriteRef} scale={[380, 380, 1]}>
        <spriteMaterial
          map={glow}
          color="#fff3d6"
          transparent
          opacity={0.9}
          depthWrite={false}
          fog={false}
        />
      </sprite>
      <sprite ref={moonRef} scale={[150, 150, 1]}>
        <spriteMaterial
          map={glow}
          color="#e9f1ff"
          transparent
          opacity={0}
          depthWrite={false}
          fog={false}
        />
      </sprite>
    </>
  )
}
