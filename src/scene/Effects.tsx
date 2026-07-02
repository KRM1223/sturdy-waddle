import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Bloom,
  BrightnessContrast,
  EffectComposer,
  HueSaturation,
  Vignette,
} from '@react-three/postprocessing'
import type { BloomEffect, VignetteEffect } from 'postprocessing'
import { BLOOM, VIGNETTE } from '../config/atmosphere'
import { sampleNumberKeys } from '../utils/math'
import { frame } from './frameState'

/** Cinematic grade: soft bloom that swells at night, breathing vignette. */
export default function Effects() {
  const bloomRef = useRef<BloomEffect>(null)
  const vignetteRef = useRef<VignetteEffect>(null)

  useFrame(() => {
    if (bloomRef.current) {
      bloomRef.current.intensity = sampleNumberKeys(BLOOM, frame.p) + frame.lightning * 1.4
    }
    if (vignetteRef.current) {
      vignetteRef.current.darkness = sampleNumberKeys(VIGNETTE, frame.p)
    }
  })

  return (
    <EffectComposer multisampling={4}>
      <Bloom
        ref={bloomRef}
        intensity={0.45}
        luminanceThreshold={0.72}
        luminanceSmoothing={0.32}
        mipmapBlur
      />
      <HueSaturation saturation={0.22} />
      <BrightnessContrast brightness={0.03} contrast={0.08} />
      <Vignette ref={vignetteRef} eskil={false} offset={0.22} darkness={0.36} />
    </EffectComposer>
  )
}
