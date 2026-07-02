import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { useExperience } from '../store/experience'
import TimelineUpdater from './TimelineUpdater'
import CameraRig from './CameraRig'
import Effects from './Effects'
import Interactions from './Interactions'
import Atmosphere from './environment/Atmosphere'
import SkyDome from './environment/SkyDome'
import Stars from './environment/Stars'
import Clouds from './environment/Clouds'
import Weather from './environment/Weather'
import Aurora from './environment/Aurora'
import SpaceLayer from './environment/SpaceLayer'
import Birds from './environment/Birds'
import Balloons from './environment/Balloons'
import Terrain from './terrain/Terrain'
import River from './terrain/River'
import Vegetation from './terrain/Vegetation'
import AmbientParticles from './terrain/AmbientParticles'
import Surveying from './construction/Surveying'
import Roads from './construction/Roads'
import Underground from './construction/Underground'
import Foundations from './construction/Foundations'
import Buildings from './city/Buildings'
import Landmarks from './city/Landmarks'
import Traffic from './city/Traffic'
import Citizens from './city/Citizens'
import SmartCity from './city/SmartCity'
import CityLife from './city/CityLife'
import FutureCity from './city/FutureCity'
import Fireworks from './city/Fireworks'

export default function Experience() {
  const reducedMotion = useExperience((s) => s.reducedMotion)
  const coarse = useExperience((s) => s.isCoarsePointer)
  const dpr: [number, number] = coarse ? [1, 1.5] : [1, 1.75]

  return (
    <Canvas
      dpr={dpr}
      shadows
      camera={{ position: [150, 26, 185], fov: 52, near: 0.5, far: 4200 }}
      gl={{
        antialias: false,
        powerPreference: 'high-performance',
        stencil: false,
      }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.22
      }}
    >
      <TimelineUpdater />
      <CameraRig />
      <Atmosphere />
      <SkyDome />
      <Stars />
      <Suspense fallback={null}>
        <Clouds />
        <Weather />
        <Aurora />
        <SpaceLayer />
        {!reducedMotion && <Birds />}
        <Balloons />

        <Terrain />
        <River />
        <Vegetation />
        {!reducedMotion && <AmbientParticles />}

        <Surveying />
        <Roads />
        <Underground />
        <Foundations />

        <Buildings />
        <Landmarks />
        <Traffic />
        <Citizens />
        <SmartCity />
        <CityLife />
        <FutureCity />
        <Fireworks />
        <Interactions />
      </Suspense>
      <Effects />
    </Canvas>
  )
}
