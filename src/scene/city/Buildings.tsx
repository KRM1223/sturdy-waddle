import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { T } from '../../config/timeline'
import { clamp01, easeOutBack, mulberry32, rangeProgress } from '../../utils/math'
import { experience, setExperience } from '../../store/experience'
import { audioEngine } from '../../audio/AudioEngine'
import { requestBurst } from '../interactive'
import { BUILDINGS } from './cityData'
import { frame, scratch } from '../frameState'

const COUNT = BUILDINGS.length

/**
 * Chapter 6 — every tower in the city as a single InstancedMesh.
 * A custom shader paints per-instance procedural windows that light up at
 * night with individual flicker. Steel frames climb one step ahead of the glass.
 */
export default function Buildings() {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const frameRef = useRef<THREE.InstancedMesh>(null)
  const highlightRef = useRef<THREE.Mesh>(null)
  const growthState = useRef<'pre' | 'anim' | 'done'>('pre')

  const geometry = useMemo(() => {
    const geo = new THREE.BoxGeometry(1, 1, 1)
    geo.translate(0, 0.5, 0)
    // per-instance dims + seed for the window shader
    const dims = new Float32Array(COUNT * 3)
    const seeds = new Float32Array(COUNT)
    BUILDINGS.forEach((b, i) => {
      dims[i * 3] = b.width
      dims[i * 3 + 1] = b.height
      dims[i * 3 + 2] = b.depth
      seeds[i] = (i * 0.6180339887) % 1
    })
    geo.setAttribute('aDims', new THREE.InstancedBufferAttribute(dims, 3))
    geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1))
    return geo
  }, [])

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      roughness: 0.55,
      metalness: 0.18,
      flatShading: false,
    })
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uNight = { value: 0 }
      shader.uniforms.uTime = { value: 0 }
      mat.userData.shader = shader
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           attribute vec3 aDims;
           attribute float aSeed;
           varying vec3 vLocal;
           varying vec3 vDims;
           varying float vSeed;
           varying vec3 vLocalNormal;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           vLocal = position;
           vDims = aDims;
           vSeed = aSeed;
           vLocalNormal = normal;`,
        )
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uNight;
           uniform float uTime;
           varying vec3 vLocal;
           varying vec3 vDims;
           varying float vSeed;
           varying vec3 vLocalNormal;
           float bHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7)) + vSeed * 43.7) * 43758.5453); }`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
           {
             // pick facade coordinates by dominant normal axis
             vec2 facade;
             if (abs(vLocalNormal.x) > 0.5) facade = vec2((vLocal.z + 0.5) * vDims.z, vLocal.y * vDims.y);
             else if (abs(vLocalNormal.z) > 0.5) facade = vec2((vLocal.x + 0.5) * vDims.x, vLocal.y * vDims.y);
             else facade = vec2(-10.0);
             if (facade.x > -5.0) {
               vec2 cellSize = vec2(2.3, 3.1);
               vec2 cell = floor(facade / cellSize);
               vec2 inCell = fract(facade / cellSize);
               float isWindow = step(0.22, inCell.x) * step(inCell.x, 0.82) * step(0.28, inCell.y) * step(inCell.y, 0.78);
               // skip the ground strip and roof line
               isWindow *= step(1.0, facade.y) * step(facade.y, vDims.y - 0.8);
               float lit = step(0.35, bHash(cell)) ;
               float flicker = 0.75 + 0.25 * sin(uTime * (0.5 + bHash(cell + 7.0)) + bHash(cell + 3.0) * 40.0);
               vec3 warm = mix(vec3(1.0, 0.78, 0.45), vec3(0.7, 0.85, 1.0), bHash(cell + 11.0));
               totalEmissiveRadiance += warm * isWindow * lit * flicker * uNight * 1.15;
               // daytime glass tint
               diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.55 + vec3(0.18, 0.24, 0.3), isWindow * 0.85);
             }
           }`,
        )
    }
    mat.customProgramCacheKey = () => 'city-windows'
    return mat
  }, [])

  const frameMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#e8b62a',
        wireframe: true,
        transparent: true,
        opacity: 0,
      }),
    [],
  )

  const seeds = useMemo(() => {
    const rand = mulberry32(2027)
    return BUILDINGS.map(() => rand())
  }, [])

  useFrame(() => {
    const mesh = meshRef.current
    const frames = frameRef.current
    if (!mesh || !frames) return
    const p = frame.p

    const shader = material.userData.shader as
      | { uniforms: { uNight: { value: number }; uTime: { value: number } } }
      | undefined
    if (shader) {
      shader.uniforms.uNight.value = frame.night
      shader.uniforms.uTime.value = frame.time
    }
    material.wireframe = frame.wireframe

    const animStart = T.buildings[0] - 0.02
    const animEnd = T.buildings[1] + 0.04
    let target: 'pre' | 'anim' | 'done'
    if (p < animStart) target = 'pre'
    else if (p > animEnd) target = 'done'
    else target = 'anim'

    // steel frames fade out once the skins are on
    frameMaterial.opacity =
      target === 'anim' ? 0.5 * (1 - rangeProgress(p, T.buildings[1] - 0.02, T.buildings[1] + 0.02)) : 0
    frames.visible = frameMaterial.opacity > 0.01

    if (target !== 'anim' && growthState.current === target) return
    growthState.current = target

    const writeMatrices = () => {
      BUILDINGS.forEach((b, i) => {
        const raw = clamp01((p - b.buildStart) / (b.buildEnd - b.buildStart))
        const grow = target === 'done' ? 1 : target === 'pre' ? 0 : easeOutBack(raw) * raw
        const wobble =
          target === 'anim' && raw > 0 && raw < 1 ? 1 + Math.sin(raw * Math.PI * 3 + seeds[i] * 9) * 0.01 : 1
        scratch.mat4.compose(
          scratch.v3a.set(b.x, 0, b.z),
          scratch.quat.identity(),
          scratch.v3b.set(
            b.width * wobble,
            Math.max(0.001, b.height * grow),
            b.depth * wobble,
          ),
        )
        meshRef.current!.setMatrixAt(i, scratch.mat4)

        if (frames.visible) {
          const frameGrow = Math.max(0.001, b.height * clamp01(raw * 1.35))
          scratch.mat4.compose(
            scratch.v3a.set(b.x, 0, b.z),
            scratch.quat.identity(),
            scratch.v3b.set(b.width * 1.02, frameGrow, b.depth * 1.02),
          )
          frames.setMatrixAt(i, scratch.mat4)
        }
      })
      meshRef.current!.instanceMatrix.needsUpdate = true
      if (frames.visible) frames.instanceMatrix.needsUpdate = true
    }
    writeMatrices()
    mesh.visible = target !== 'pre'
  })

  // Instance colors set once
  const colorsSet = useRef(false)
  useFrame(() => {
    if (colorsSet.current || !meshRef.current) return
    colorsSet.current = true
    const c = new THREE.Color()
    BUILDINGS.forEach((b, i) => meshRef.current!.setColorAt(i, c.set(b.color)))
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
  })

  const hoverId = useRef<number>(-1)
  const placeHighlight = (id: number) => {
    const box = highlightRef.current
    if (!box) return
    if (id < 0) {
      box.visible = false
      return
    }
    const b = BUILDINGS[id]
    box.visible = true
    box.position.set(b.x, 0, b.z)
    box.scale.set(b.width + 1.1, b.height + 1.1, b.depth + 1.1)
  }
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (experience.isCoarsePointer || frame.p < T.buildings[0]) return
    e.stopPropagation()
    const id = e.instanceId ?? -1
    if (id !== hoverId.current) {
      hoverId.current = id
      placeHighlight(id)
      setExperience({
        hoveredBuilding: id >= 0 ? BUILDINGS[id] : null,
        hoverPoint: { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY },
      })
      document.body.style.cursor = id >= 0 ? 'pointer' : ''
    } else if (id >= 0) {
      setExperience({ hoverPoint: { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY } }, true)
    }
  }
  const onOut = () => {
    if (hoverId.current !== -1) {
      hoverId.current = -1
      placeHighlight(-1)
      setExperience({ hoveredBuilding: null })
      document.body.style.cursor = ''
    }
  }
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    // tap a tower to celebrate from its roof
    if (frame.p < T.alive[0]) return
    e.stopPropagation()
    const id = e.instanceId ?? -1
    if (id < 0) return
    const b = BUILDINGS[id]
    requestBurst({
      x: b.x,
      y: b.height + 14 + Math.random() * 10,
      z: b.z,
      hue: Math.random(),
      radius: 14 + Math.random() * 8,
    })
    audioEngine.fireworkPop()
  }

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[geometry, material, COUNT]}
        visible={false}
        castShadow
        receiveShadow
        onPointerMove={onMove}
        onPointerOut={onOut}
        onClick={onClick}
      />
      <instancedMesh ref={frameRef} args={[geometry, frameMaterial, COUNT]} visible={false} />
      {/* Hover highlight — a glowing shell around the inspected tower */}
      <mesh ref={highlightRef} geometry={geometry} visible={false}>
        <meshBasicMaterial
          color="#9be3ff"
          transparent
          opacity={0.16}
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  )
}
