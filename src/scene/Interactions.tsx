import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { audioEngine } from '../audio/AudioEngine'
import { T } from '../config/timeline'
import { clamp01, easeOutBack } from '../utils/math'
import { terrainHeight } from '../utils/terrain'
import { plantQueue, requestBurst, requestPlant } from './interactive'
import { frame, scratch } from './frameState'

const MAX_PLANTED = 42

interface PlantedTree {
  x: number
  y: number
  z: number
  bornAt: number
  scale: number
  hue: number
}

/**
 * The world answers the visitor's clicks, era by era:
 * meadow — plant a tree · construction — slam the earth · city — fireworks.
 */
export default function Interactions() {
  const trunkRef = useRef<THREE.InstancedMesh>(null)
  const canopyRef = useRef<THREE.InstancedMesh>(null)
  const planted = useRef<PlantedTree[]>([])
  const colorsDirty = useRef(false)

  const trunkGeometry = useMemo(() => {
    const geo = new THREE.CylinderGeometry(0.22, 0.4, 3.2, 5)
    geo.translate(0, 1.6, 0)
    return geo
  }, [])
  const canopyGeometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(2.2, 0)
    geo.scale(1, 1.35, 1)
    geo.translate(0, 4.6, 0)
    return geo
  }, [])

  const onWorldClick = (e: ThreeEvent<MouseEvent>) => {
    const { x, z } = e.point
    const p = frame.p
    const y = terrainHeight(x, z)

    if (p < T.roads[0]) {
      // The meadow era — leave a tree behind
      requestPlant({ x, z })
      requestBurst({ x, y: y + 3, z, hue: 0.3, radius: 5 })
      audioEngine.plantChime()
    } else if (p < T.alive[0]) {
      // The construction era — kick up the earth
      requestBurst({ x, y: y + 1.5, z, hue: -1, radius: 8 })
      audioEngine.clickThump()
    } else {
      // The living city — celebrate
      requestBurst({
        x,
        y: y + 42 + Math.random() * 22,
        z,
        hue: Math.random(),
        radius: 16 + Math.random() * 10,
      })
      audioEngine.fireworkPop()
    }
  }

  useFrame(() => {
    // Absorb plant requests into the pool
    while (plantQueue.length > 0) {
      const req = plantQueue.shift()!
      const tree: PlantedTree = {
        x: req.x,
        y: terrainHeight(req.x, req.z),
        z: req.z,
        bornAt: frame.time,
        scale: 0.8 + Math.random() * 0.7,
        hue: Math.random(),
      }
      if (planted.current.length >= MAX_PLANTED) planted.current.shift()
      planted.current.push(tree)
      colorsDirty.current = true
    }

    const trunk = trunkRef.current
    const canopy = canopyRef.current
    if (!trunk || !canopy) return
    const trees = planted.current
    trunk.visible = trees.length > 0
    canopy.visible = trunk.visible
    if (!trunk.visible) return

    if (colorsDirty.current) {
      colorsDirty.current = false
      trees.forEach((t, i) =>
        canopy.setColorAt(i, scratch.colorA.setHSL(0.26 + t.hue * 0.12, 0.55, 0.36)),
      )
      if (canopy.instanceColor) canopy.instanceColor.needsUpdate = true
    }

    for (let i = 0; i < MAX_PLANTED; i++) {
      const t = trees[i]
      if (!t) {
        scratch.mat4.makeScale(0.001, 0.001, 0.001)
        trunk.setMatrixAt(i, scratch.mat4)
        canopy.setMatrixAt(i, scratch.mat4)
        continue
      }
      const pop = easeOutBack(clamp01((frame.time - t.bornAt) / 0.7))
      const sway = Math.sin(frame.time * 1.4 + t.x) * 0.04 * frame.windStrength
      scratch.euler.set(sway, t.hue * 6, sway * 0.7)
      scratch.quat.setFromEuler(scratch.euler)
      scratch.mat4.compose(
        scratch.v3a.set(t.x, t.y, t.z),
        scratch.quat,
        scratch.v3b.setScalar(Math.max(0.001, pop * t.scale)),
      )
      trunk.setMatrixAt(i, scratch.mat4)
      canopy.setMatrixAt(i, scratch.mat4)
    }
    trunk.instanceMatrix.needsUpdate = true
    canopy.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      {/* Invisible catch plane — one cheap quad instead of raycasting the terrain */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        onClick={onWorldClick}
        visible={false}
      >
        <planeGeometry args={[2400, 2400]} />
        <meshBasicMaterial />
      </mesh>

      {/* Trees the visitor has planted */}
      <instancedMesh ref={trunkRef} args={[trunkGeometry, undefined, MAX_PLANTED]} visible={false}>
        <meshStandardMaterial color="#6d4c33" roughness={0.95} flatShading />
      </instancedMesh>
      <instancedMesh ref={canopyRef} args={[canopyGeometry, undefined, MAX_PLANTED]} visible={false}>
        <meshStandardMaterial roughness={0.9} flatShading />
      </instancedMesh>
    </group>
  )
}
