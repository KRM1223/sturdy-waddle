import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import {
  AMBIENT_INTENSITY,
  FOG_COLOR,
  FOG_DENSITY,
  SUN_COLOR,
  SUN_INTENSITY,
  SUN_POSITION,
} from '../../config/atmosphere'
import { sampleColorKeys, sampleNumberKeys, sampleVec3Keys } from '../../utils/math'
import { frame, scratch } from '../frameState'

/** Sun, sky light and exponential fog — all riding the master timeline. */
export default function Atmosphere() {
  const sunRef = useRef<THREE.DirectionalLight>(null)
  const ambientRef = useRef<THREE.AmbientLight>(null)
  const hemiRef = useRef<THREE.HemisphereLight>(null)
  const scene = useThree((s) => s.scene)

  const fog = useMemo(() => new THREE.FogExp2('#cfe3ec', 0.0022), [])
  useEffect(() => {
    scene.fog = fog
    return () => {
      scene.fog = null
    }
  }, [scene, fog])

  useFrame(() => {
    const p = frame.p
    const sun = sunRef.current
    if (sun) {
      sampleVec3Keys(SUN_POSITION, p, sun.position)
      sampleColorKeys(SUN_COLOR, p, sun.color)
      sun.intensity =
        sampleNumberKeys(SUN_INTENSITY, p) * (1 - frame.storm * 0.55) + frame.lightning * 9
      if (frame.lightning > 0.05) sun.color.lerp(scratch.colorB.set('#dfe6ff'), frame.lightning)
    }
    if (ambientRef.current) {
      ambientRef.current.intensity =
        sampleNumberKeys(AMBIENT_INTENSITY, p) * (1 - frame.underground * 0.55)
    }
    if (hemiRef.current) {
      hemiRef.current.intensity = 0.35 * (1 - frame.night * 0.7)
    }
    sampleColorKeys(FOG_COLOR, p, fog.color)
    if (frame.lightning > 0.05) fog.color.lerp(scratch.colorB.set('#aab4de'), frame.lightning * 0.5)
    fog.density =
      sampleNumberKeys(FOG_DENSITY, p) * (1 - frame.underground * 0.85) + frame.rain * 0.0012
  })

  return (
    <>
      <directionalLight
        ref={sunRef}
        position={[220, 90, 160]}
        intensity={2.6}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-140}
        shadow-camera-right={140}
        shadow-camera-top={140}
        shadow-camera-bottom={-140}
        shadow-camera-near={10}
        shadow-camera-far={800}
        shadow-bias={-0.0004}
      />
      <ambientLight ref={ambientRef} intensity={0.75} color="#dfe9f5" />
      <hemisphereLight ref={hemiRef} args={['#bcd8f0', '#5c6b57', 0.35]} />
    </>
  )
}
