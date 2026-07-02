import { useFrame } from '@react-three/fiber'
import { experience, setExperience } from '../store/experience'
import { audioEngine } from '../audio/AudioEngine'
import { damp, sampleNumberKeys } from '../utils/math'
import {
  AURORA,
  CLOUD_COVER,
  CLOUD_DARKNESS,
  MOON,
  NIGHT,
  RAIN,
  RAINBOW,
  SNOW,
  STARS,
  STORM,
} from '../config/atmosphere'
import { T } from '../config/timeline'
import { frame } from './frameState'

/** Runs before every other system each frame and derives all shared factors. */
export default function TimelineUpdater() {
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    frame.dt = dt
    frame.time += dt

    // Damped progress — the single heartbeat of the experience
    frame.p = damp(frame.p, experience.progress, 4.2, dt)
    experience.smoothProgress = frame.p
    const p = frame.p

    const nightCurve = sampleNumberKeys(NIGHT, p)
    frame.night = experience.nightOverride ? Math.max(nightCurve, 1) : nightCurve

    // Camera dips below ground during chapter 4 — or via the toggle
    const ug =
      p > T.underground[0] - 0.015 && p < T.underground[1] + 0.015
        ? Math.min(
            1,
            Math.max(
              0,
              Math.min(
                (p - (T.underground[0] - 0.015)) / 0.03,
                (T.underground[1] + 0.015 - p) / 0.03,
              ),
            ),
          )
        : 0
    frame.underground = experience.undergroundOverride ? Math.max(ug, 1) : ug

    frame.rain = sampleNumberKeys(RAIN, p)
    frame.snow = sampleNumberKeys(SNOW, p)
    frame.storm = sampleNumberKeys(STORM, p)
    frame.cloudCover = sampleNumberKeys(CLOUD_COVER, p)
    frame.cloudDark = sampleNumberKeys(CLOUD_DARKNESS, p)
    frame.stars = sampleNumberKeys(STARS, p)
    frame.moon = sampleNumberKeys(MOON, p)
    frame.aurora = sampleNumberKeys(AURORA, p)
    frame.rainbow = sampleNumberKeys(RAINBOW, p)
    frame.wireframe = experience.wireframe
    frame.windStrength = 1 + frame.storm * 2.2 + frame.rain * 0.8

    // Lightning: random strikes while the storm rages, fast decay
    frame.lightning = Math.max(0, frame.lightning - dt * 3.2)
    if (frame.storm > 0.35 && Math.random() < dt * 0.55) {
      frame.lightning = 0.75 + Math.random() * 0.25
      audioEngine.thunder()
    }

    audioEngine.update(p, dt)
    if (!experience.ready) setExperience({ ready: true })
  }, -100)

  return null
}
