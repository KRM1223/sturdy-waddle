import type { NumberKey } from '../types'
import { clamp01, sampleNumberKeys } from '../utils/math'
import { riverCenterX } from '../utils/terrain'
import { RAIN, STORM } from '../config/atmosphere'
import { T } from '../config/timeline'

/**
 * Fully procedural, position-aware soundtrack. Every layer is synthesized
 * with WebAudio (no audio files) and mixed two ways at once:
 *
 *  1. the scroll timeline decides WHAT the world sounds like (era curves)
 *  2. the camera position decides WHERE you hear it from — construction
 *     hammers near the pits, water babble by the river, festival pads by
 *     the plaza, traffic in the grid, wind on the ridge, hum underground.
 */

type LayerId =
  | 'wind'
  | 'traffic'
  | 'rain'
  | 'construction'
  | 'birds'
  | 'night'
  | 'thump'
  | 'festival'
  | 'water'
  | 'hum'

const WIND_GAIN: NumberKey[] = [
  { t: 0, v: 0.5 },
  { t: 0.12, v: 0.35 },
  { t: 0.5, v: 0.18 },
  { t: 0.69, v: 0.3 },
  { t: 0.73, v: 0.55 },
  { t: 0.78, v: 0.2 },
  { t: 0.9, v: 0.35 },
  { t: 1, v: 0.15 },
]
const BIRD_GAIN: NumberKey[] = [
  { t: 0, v: 0.7 },
  { t: 0.1, v: 0.5 },
  { t: 0.2, v: 0.15 },
  { t: 0.35, v: 0 },
  { t: 0.55, v: 0.25 },
  { t: 0.66, v: 0.1 },
  { t: 0.7, v: 0 },
]
const CONSTRUCTION_GAIN: NumberKey[] = [
  { t: 0.06, v: 0 },
  { t: 0.1, v: 0.4 },
  { t: 0.3, v: 0.6 },
  { t: 0.42, v: 0.5 },
  { t: 0.52, v: 0.18 },
  { t: 0.56, v: 0 },
]
const TRAFFIC_GAIN: NumberKey[] = [
  { t: 0.5, v: 0 },
  { t: 0.56, v: 0.34 },
  { t: 0.66, v: 0.44 },
  { t: 0.72, v: 0.16 },
  { t: 0.76, v: 0.34 },
  { t: 0.9, v: 0.38 },
  { t: 0.93, v: 0 },
]
const RAIN_GAIN: NumberKey[] = RAIN.map((k) => ({ t: k.t, v: k.v * 0.65 }))
const NIGHT_GAIN: NumberKey[] = [
  { t: 0.67, v: 0 },
  { t: 0.7, v: 0.3 },
  { t: 0.72, v: 0 },
  { t: 0.77, v: 0.25 },
  { t: 0.84, v: 0.1 },
  { t: 0.88, v: 0 },
]
const FESTIVAL_GAIN: NumberKey[] = [
  { t: 0.75, v: 0 },
  { t: 0.78, v: 0.42 },
  { t: 0.82, v: 0.44 },
  { t: 0.86, v: 0.24 },
  { t: 0.9, v: 0.28 },
  { t: 0.96, v: 0.12 },
  { t: 1, v: 0 },
]
const WATER_GAIN: NumberKey[] = [
  { t: 0, v: 0.5 },
  { t: 0.15, v: 0.42 },
  { t: 0.4, v: 0.3 },
  { t: 0.74, v: 0.26 },
  { t: 0.76, v: 0.3 },
  { t: 0.9, v: 0.15 },
  { t: 0.94, v: 0 },
]

function createNoiseBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let lastOut = 0
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1
    // pink-ish noise via leaky integrator
    lastOut = (lastOut + 0.02 * white) / 1.02
    data[i] = lastOut * 3.5
  }
  return buffer
}

interface Layer {
  id: LayerId
  gain: GainNode
  keys: NumberKey[] | null
}

interface ListenerPos {
  x: number
  y: number
  z: number
}

/** Smooth proximity falloff: 1 inside `near`, 0 beyond `far`. */
const proximity = (dist: number, near: number, far: number) =>
  1 - clamp01((dist - near) / (far - near))

export class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private layers: Layer[] = []
  private birdTimer = 0
  private cricketTimer = 0
  private thumpTimer = 0
  private lastThunderAt = -10
  private padOscs: OscillatorNode[] = []
  private started = false
  private muted = true
  private listener: ListenerPos = { x: 150, y: 26, z: 185 }
  private undergroundFactor = 0

  start() {
    if (this.started) return
    this.started = true
    const ctx = new AudioContext()
    this.ctx = ctx
    const master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)
    this.master = master

    const noise = createNoiseBuffer(ctx)

    const makeNoiseLayer = (
      id: LayerId,
      keys: NumberKey[] | null,
      filterType: BiquadFilterType,
      freq: number,
      q = 0.8,
      playbackRate = 1,
    ) => {
      const src = ctx.createBufferSource()
      src.buffer = noise
      src.loop = true
      src.playbackRate.value = playbackRate
      const filter = ctx.createBiquadFilter()
      filter.type = filterType
      filter.frequency.value = freq
      filter.Q.value = q
      const gain = ctx.createGain()
      gain.gain.value = 0
      src.connect(filter)
      filter.connect(gain)
      gain.connect(master)
      src.start()
      this.layers.push({ id, gain, keys })
      return { filter, gain }
    }

    // Wind — slowly wandering bandpass noise
    const wind = makeNoiseLayer('wind', WIND_GAIN, 'bandpass', 320, 0.6, 0.7)
    const windLfo = ctx.createOscillator()
    windLfo.frequency.value = 0.07
    const windLfoGain = ctx.createGain()
    windLfoGain.gain.value = 140
    windLfo.connect(windLfoGain)
    windLfoGain.connect(wind.filter.frequency)
    windLfo.start()

    // Traffic — low rumble in the grid
    makeNoiseLayer('traffic', TRAFFIC_GAIN, 'lowpass', 210, 0.4, 0.5)
    // Rain — bright hiss, everywhere
    makeNoiseLayer('rain', RAIN_GAIN, 'highpass', 1600, 0.3, 1.4)
    // Construction bed — mid grind around the pits
    makeNoiseLayer('construction', CONSTRUCTION_GAIN, 'bandpass', 700, 0.7, 0.85)
    // River — babbling band of noise that lives on the water
    const water = makeNoiseLayer('water', WATER_GAIN, 'bandpass', 900, 0.9, 1.15)
    const waterLfo = ctx.createOscillator()
    waterLfo.frequency.value = 0.4
    const waterLfoGain = ctx.createGain()
    waterLfoGain.gain.value = 260
    waterLfo.connect(waterLfoGain)
    waterLfoGain.connect(water.filter.frequency)
    waterLfo.start()

    // Underground hum — mains electricity singing in the dark
    const humGain = ctx.createGain()
    humGain.gain.value = 0
    humGain.connect(master)
    for (const [f, g] of [
      [55, 0.05],
      [110, 0.032],
      [165, 0.014],
    ] as const) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = f
      const og = ctx.createGain()
      og.gain.value = g
      osc.connect(og)
      og.connect(humGain)
      osc.start()
    }
    this.layers.push({ id: 'hum', gain: humGain, keys: null })

    // Bird / cricket / thump layers are event-based; give them routing gains
    const birdGain = ctx.createGain()
    birdGain.gain.value = 0
    birdGain.connect(master)
    this.layers.push({ id: 'birds', gain: birdGain, keys: BIRD_GAIN })
    this.birdBus = birdGain

    const nightGain = ctx.createGain()
    nightGain.gain.value = 0
    nightGain.connect(master)
    this.layers.push({ id: 'night', gain: nightGain, keys: NIGHT_GAIN })
    this.nightBus = nightGain

    const thumpGain = ctx.createGain()
    thumpGain.gain.value = 0
    thumpGain.connect(master)
    this.layers.push({ id: 'thump', gain: thumpGain, keys: CONSTRUCTION_GAIN })
    this.thumpBus = thumpGain

    // Festival pad — warm detuned chord over a soft heartbeat kick
    const padGain = ctx.createGain()
    padGain.gain.value = 0
    const padFilter = ctx.createBiquadFilter()
    padFilter.type = 'lowpass'
    padFilter.frequency.value = 900
    padGain.connect(padFilter)
    padFilter.connect(master)
    this.layers.push({ id: 'festival', gain: padGain, keys: FESTIVAL_GAIN })
    this.padBus = padGain
    const chord = [110, 164.81, 196, 246.94]
    for (const f of chord) {
      for (const det of [-3, 3]) {
        const osc = ctx.createOscillator()
        osc.type = 'sawtooth'
        osc.frequency.value = f
        osc.detune.value = det
        const g = ctx.createGain()
        g.gain.value = 0.02
        osc.connect(g)
        g.connect(padGain)
        osc.start()
        this.padOscs.push(osc)
      }
    }

    this.setMuted(this.muted)
  }

  private birdBus: GainNode | null = null
  private nightBus: GainNode | null = null
  private thumpBus: GainNode | null = null
  private padBus: GainNode | null = null
  private beatTimer = 0

  setMuted(muted: boolean) {
    this.muted = muted
    if (!this.ctx || !this.master) return
    if (!muted && this.ctx.state === 'suspended') void this.ctx.resume()
    const t = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(t)
    this.master.gain.setTargetAtTime(muted ? 0 : 0.7, t, 0.4)
  }

  /** Called every frame with the camera position — drives the zone mix. */
  setListener(pos: ListenerPos, underground: number) {
    this.listener = pos
    this.undergroundFactor = underground
  }

  /** Per-layer spatial multiplier from the listener's position in the city. */
  private spatialMultiplier(id: LayerId): number {
    const { x, y, z } = this.listener
    const coreDist = Math.hypot(x, z)
    const altitude = Math.max(0, y)
    const aboveGround = 1 - this.undergroundFactor
    switch (id) {
      case 'construction':
      case 'thump':
        // work happens across the plateau — fades on the far hills and in orbit
        return proximity(coreDist, 130, 320) * proximity(altitude, 90, 320) * aboveGround
      case 'traffic':
        return proximity(coreDist, 115, 300) * proximity(altitude, 55, 260) * aboveGround
      case 'festival': {
        const plazaDist = Math.hypot(x - 12, z + 12)
        return (0.25 + 0.75 * proximity(plazaDist, 40, 220)) * proximity(altitude, 80, 380)
      }
      case 'water': {
        const riverDist = Math.abs(x - riverCenterX(z))
        return proximity(riverDist, 28, 190) * proximity(altitude, 40, 200) * aboveGround
      }
      case 'birds':
        // birdsong lives in the meadow ring, not over the asphalt
        return (0.3 + 0.7 * clamp01((coreDist - 70) / 140)) * proximity(altitude, 60, 220)
      case 'wind':
        // wind swells with altitude and out on the open ridge
        return (0.55 + clamp01(altitude / 220) * 0.8 + clamp01((coreDist - 180) / 300) * 0.4) * aboveGround + this.undergroundFactor * 0.1
      case 'night':
        return 0.4 + 0.6 * proximity(altitude, 60, 240)
      case 'hum':
        return this.undergroundFactor
      case 'rain':
        return aboveGround * 0.9 + 0.1
    }
  }

  private chirp(bus: GainNode, base: number, len: number) {
    if (!this.ctx) return
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    const t = ctx.currentTime
    osc.type = 'sine'
    osc.frequency.setValueAtTime(base, t)
    osc.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * 0.6), t + len * 0.4)
    osc.frequency.exponentialRampToValueAtTime(base * 0.9, t + len)
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(0.12 + Math.random() * 0.08, t + len * 0.2)
    g.gain.exponentialRampToValueAtTime(0.0001, t + len)
    osc.connect(g)
    g.connect(bus)
    osc.start(t)
    osc.stop(t + len + 0.05)
  }

  private thump(gainScale = 1) {
    if (!this.ctx || !this.thumpBus) return
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    const t = ctx.currentTime
    osc.type = 'sine'
    osc.frequency.setValueAtTime(80, t)
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.24)
    g.gain.setValueAtTime(0.5 * gainScale, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
    osc.connect(g)
    g.connect(this.thumpBus)
    osc.start(t)
    osc.stop(t + 0.35)
  }

  /** Soft festival kick, four to the floor. */
  private beat() {
    if (!this.ctx || !this.padBus) return
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    const t = ctx.currentTime
    osc.type = 'sine'
    osc.frequency.setValueAtTime(120, t)
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.12)
    g.gain.setValueAtTime(0.55, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18)
    osc.connect(g)
    g.connect(this.padBus)
    osc.start(t)
    osc.stop(t + 0.2)
  }

  thunder() {
    if (!this.ctx || !this.master || this.muted) return
    const ctx = this.ctx
    if (ctx.currentTime - this.lastThunderAt < 2.5) return
    this.lastThunderAt = ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = createNoiseBuffer(ctx, 1.6)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    const t = ctx.currentTime
    filter.frequency.setValueAtTime(1400, t)
    filter.frequency.exponentialRampToValueAtTime(90, t + 1.5)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.65, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7)
    src.connect(filter)
    filter.connect(g)
    g.connect(this.master)
    src.start()
  }

  fireworkPop() {
    if (!this.ctx || !this.master || this.muted) return
    const ctx = this.ctx
    const src = ctx.createBufferSource()
    src.buffer = createNoiseBuffer(ctx, 0.4)
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 500 + Math.random() * 700
    const g = ctx.createGain()
    const t = ctx.currentTime
    g.gain.setValueAtTime(0.3, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5)
    src.connect(filter)
    filter.connect(g)
    g.connect(this.master)
    src.start()
  }

  /** Bright chime when the visitor plants a tree. */
  plantChime() {
    if (!this.ctx || !this.master || this.muted) return
    const ctx = this.ctx
    const t = ctx.currentTime
    for (const [f, delay] of [
      [523.25, 0],
      [659.25, 0.07],
      [783.99, 0.14],
    ] as const) {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = f
      g.gain.setValueAtTime(0, t + delay)
      g.gain.linearRampToValueAtTime(0.16, t + delay + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 0.6)
      osc.connect(g)
      g.connect(this.master)
      osc.start(t + delay)
      osc.stop(t + delay + 0.7)
    }
  }

  /** Heavy ground hit when the visitor pokes a construction site. */
  clickThump() {
    if (!this.ctx || !this.master || this.muted) return
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    const t = ctx.currentTime
    osc.type = 'sine'
    osc.frequency.setValueAtTime(95, t)
    osc.frequency.exponentialRampToValueAtTime(32, t + 0.3)
    g.gain.setValueAtTime(0.6, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4)
    osc.connect(g)
    g.connect(this.master)
    osc.start(t)
    osc.stop(t + 0.45)
  }

  /** Called every frame with the smoothed scroll progress. */
  update(progress: number, dt: number) {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    for (const layer of this.layers) {
      const base = layer.keys ? sampleNumberKeys(layer.keys, progress) : 0.24
      const target = base * this.spatialMultiplier(layer.id)
      layer.gain.gain.setTargetAtTime(target, t, 0.22)
    }

    // Bird chirps — meadow chapters, and again once the parks are planted
    this.birdTimer -= dt
    if (this.birdTimer <= 0 && this.birdBus && (progress < 0.3 || (progress > 0.5 && progress < 0.66))) {
      this.birdTimer = 0.4 + Math.random() * 1.8
      this.chirp(this.birdBus, 1900 + Math.random() * 1600, 0.12 + Math.random() * 0.2)
    }
    // Crickets at night
    this.cricketTimer -= dt
    if (this.cricketTimer <= 0 && this.nightBus) {
      this.cricketTimer = 0.14 + Math.random() * 0.3
      this.chirp(this.nightBus, 4200 + Math.random() * 800, 0.05)
    }
    // Construction thumps — louder when you're standing over the site
    this.thumpTimer -= dt
    if (this.thumpTimer <= 0 && progress > T.survey[0] && progress < T.infrastructure[1]) {
      this.thumpTimer = 0.9 + Math.random() * 1.6
      this.thump(0.5 + this.spatialMultiplier('thump'))
    }
    // Festival heartbeat near the plaza
    this.beatTimer -= dt
    if (this.beatTimer <= 0 && progress > 0.765 && progress < 0.9) {
      this.beatTimer = 0.62
      this.beat()
    }
    // Rolling thunder during the storm
    if (sampleNumberKeys(STORM, progress) > 0.4 && Math.random() < dt * 0.5) {
      this.thunder()
    }
  }
}

export const audioEngine = new AudioEngine()
