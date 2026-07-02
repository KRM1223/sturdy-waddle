import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { mulberry32 } from '../../utils/math'
import { getCloudTexture } from '../../utils/textures'
import { frame, scratch } from '../frameState'

const COUNT = 42

interface CloudSeed {
  radius: number
  angle: number
  height: number
  scale: number
  speed: number
  wobble: number
}

/** Drifting billboard cumulus. Darkens with the storm, thins for the space pull-back. */
export default function Clouds() {
  const groupRef = useRef<THREE.Group>(null)

  const seeds = useMemo<CloudSeed[]>(() => {
    const rand = mulberry32(4242)
    return Array.from({ length: COUNT }, () => ({
      radius: 180 + rand() * 620,
      angle: rand() * Math.PI * 2,
      height: 120 + rand() * 130,
      scale: 90 + rand() * 170,
      speed: 0.004 + rand() * 0.011,
      wobble: rand() * Math.PI * 2,
    }))
  }, [])

  const texture = useMemo(() => getCloudTexture(), [])

  useFrame(() => {
    const group = groupRef.current
    if (!group) return
    const cover = frame.cloudCover
    const dark = frame.cloudDark
    const windMul = frame.windStrength
    for (let i = 0; i < group.children.length; i++) {
      const sprite = group.children[i] as THREE.Sprite
      const seed = seeds[i]
      const angle = seed.angle + frame.time * seed.speed * windMul
      sprite.position.set(
        Math.cos(angle) * seed.radius,
        seed.height + Math.sin(frame.time * 0.13 + seed.wobble) * 5,
        Math.sin(angle) * seed.radius,
      )
      const mat = sprite.material as THREE.SpriteMaterial
      const visibleShare = i / COUNT < cover ? 1 : 0
      mat.opacity += ((0.55 * visibleShare) - mat.opacity) * 0.04
      mat.color
        .copy(scratch.colorA.set('#ffffff'))
        .lerp(scratch.colorB.set('#3a415c'), dark)
        .multiplyScalar(1 - frame.night * 0.55)
      sprite.visible = mat.opacity > 0.015
    }
  })

  return (
    <group ref={groupRef}>
      {seeds.map((seed, i) => (
        <sprite key={i} scale={[seed.scale * 1.9, seed.scale, 1]}>
          <spriteMaterial
            map={texture}
            transparent
            opacity={0}
            depthWrite={false}
            fog={false}
          />
        </sprite>
      ))}
    </group>
  )
}
