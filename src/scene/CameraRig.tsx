import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { CAMERA_FOV_KEYS, CAMERA_LOOK_KEYS, CAMERA_POS_KEYS } from '../config/cameraPath'
import { experience, useExperience } from '../store/experience'
import { damp, sampleNumberKeys, sampleVec3Keys } from '../utils/math'
import { frame, scratch } from './frameState'

const targetPos = new THREE.Vector3()
const targetLook = new THREE.Vector3()
const currentLook = new THREE.Vector3(0, 10, 0)

/**
 * The cinematic rail: Catmull-Rom sampled position/look keyed on progress,
 * with pointer parallax and gentle breathing drift layered on top.
 * Orbit mode hands the camera to the user at the current spot.
 */
export default function CameraRig() {
  const cameraMode = useExperience((s) => s.cameraMode)
  const pointer = useRef({ x: 0, y: 0 })

  useFrame(({ camera, pointer: p3f }, rawDt) => {
    if (experience.cameraMode === 'orbit') return
    const dt = Math.min(rawDt, 0.05)
    const p = frame.p

    sampleVec3Keys(CAMERA_POS_KEYS, p, targetPos)
    sampleVec3Keys(CAMERA_LOOK_KEYS, p, targetLook)

    // Pointer parallax + idle breathing (disabled for reduced motion)
    if (!experience.reducedMotion) {
      pointer.current.x = damp(pointer.current.x, p3f.x, 3, dt)
      pointer.current.y = damp(pointer.current.y, p3f.y, 3, dt)
      const scale = 1 + p * 8 // parallax grows with altitude
      targetPos.x += pointer.current.x * 2.2 * scale
      targetPos.y += pointer.current.y * 1.1 * scale + Math.sin(frame.time * 0.4) * 0.5
      targetPos.z += Math.cos(frame.time * 0.31) * 0.4
    }

    const lambda = 3.4
    camera.position.x = damp(camera.position.x, targetPos.x, lambda, dt)
    camera.position.y = damp(camera.position.y, targetPos.y, lambda, dt)
    camera.position.z = damp(camera.position.z, targetPos.z, lambda, dt)

    currentLook.x = damp(currentLook.x, targetLook.x, lambda, dt)
    currentLook.y = damp(currentLook.y, targetLook.y, lambda, dt)
    currentLook.z = damp(currentLook.z, targetLook.z, lambda, dt)

    // Storm shake — subtle, physical
    if (frame.lightning > 0.02 && !experience.reducedMotion) {
      const s = frame.lightning * 0.35
      camera.position.x += (Math.random() - 0.5) * s
      camera.position.y += (Math.random() - 0.5) * s
    }

    camera.lookAt(currentLook)
    const cam = camera as THREE.PerspectiveCamera
    const fov = sampleNumberKeys(CAMERA_FOV_KEYS, p)
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = damp(cam.fov, fov, 3, dt)
      cam.updateProjectionMatrix()
    }
  })

  const { camera } = useThree()

  return cameraMode === 'orbit' ? (
    <OrbitControls
      camera={camera}
      target={scratch.v3c.copy(currentLook)}
      maxDistance={900}
      minDistance={8}
      maxPolarAngle={Math.PI * 0.55}
      enableDamping
      makeDefault
    />
  ) : null
}
