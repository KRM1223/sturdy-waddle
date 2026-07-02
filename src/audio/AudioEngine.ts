import type { NumberKey } from '../types'
import { sampleNumberKeys } from '../utils/math'
import { RAIN, STORM } from '../config/atmosphere'
import { T } from '../config/timeline'

/**
 * Fully procedural soundtrack — wind, birds, construction, traffic, rain,
 * night crickets and festival pads are synthesized with WebAudio and
 * crossfaded along the scroll timeline. No audio files.
 */

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
  { t: 0.1, v: 0.35 },
  { t: 0.3, v: 0.55 },
  { t: 0.42, v: 0.45 },
  { t: 0.52, v: 0.15 },
  { t: 0.56, v: 0 },
]
const TRAFFIC_GAIN: NumberKey[] = [
  { t: 0.5, v: 0 },
  { t: 0.56, v: 0.3 },
  { t: 0.66, v: 0.4 },
  { t: 0.72, v: 0.15 },
  { t: 0.76, v: 0.3 },
  { t: 0.9, v: 0.35 },
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
  { t: 0.78, v: 0.3 },
  { t: 0.82, v: 0.32 },
  { t: 0.86, v: 0.18 },
  { t: 0.9, v: 0.22 },
  { t: 0.96, v: 0.1 },
  { t: 1, v: 0 },
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
  gain: GainNode
  keys: NumberKey[]
}

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
      keys: NumberKey[],
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
      this.layers.push({ gain, keys })
      return { filter, gain }
    }

    // Wind — slowly wandering bandpass noise
    const wind = makeNoiseLayer(WIND_GAIN, 'bandpass', 320, 0.6, 0.7)
    const windLfo = ctx.createOscillator()
    windLfo.frequency.value = 0.07
    const windLfoGain = ctx.createGain()
    windLfoGain.gain.value = 140
    windLfo.connect(windLfoGain)
    windLfoGain.connect(wind.filter.frequency)
    windLfo.start()

    // Traffic — low rumble
    makeNoiseLayer(TRAFFIC_GAIN, 'lowpass', 210, 0.4, 0.5)
    // Rain — bright hiss
    makeNoiseLayer(RAIN_GAIN, 'highpass', 1600, 0.3, 1.4)
    // Construction bed — mid grind
    makeNoiseLayer(CONSTRUCTION_GAIN, 'bandpass', 700, 0.7, 0.85)

    // Bird / cricket layers are event-based; give them routing gains
    const birdGain = ctx.createGain()
    birdGain.gain.value = 0
    birdGain.connect(master)
    this.layers.push({ gain: birdGain, keys: BIRD_GAIN })
    this.birdBus = birdGain

    const nightGain = ctx.createGain()
    nightGain.gain.value = 0
    nightGain.connect(master)
    this.layers.push({ gain: nightGain, keys: NIGHT_GAIN })
    this.nightBus = nightGain

    const thumpGain = ctx.createGain()
    thumpGain.gain.value = 0
    thumpGain.connect(master)
    this.layers.push({ gain: thumpGain, keys: CONSTRUCTION_GAIN })
    this.thumpBus = thumpGain

    // Festival pad — warm detuned chord
    const padGain = ctx.createGain()
    padGain.gain.value = 0
    const padFilter = ctx.createBiquadFilter()
    padFilter.type = 'lowpass'
    padFilter.frequency.value = 900
    padGain.connect(padFilter)
    padFilter.connect(master)
    this.layers.push({ gain: padGain, keys: FESTIVAL_GAIN })
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

  setMuted(muted: boolean) {
    this.muted = muted
    if (!this.ctx || !this.master) return
    if (!muted && this.ctx.state === 'suspended') void this.ctx.resume()
    const t = this.ctx.currentTime
    this.master.gain.cancelScheduledValues(t)
    this.master.gain.setTargetAtTime(muted ? 0 : 0.7, t, 0.4)
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

  private thump() {
    if (!this.ctx || !this.thumpBus) return
    const ctx = this.ctx
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    const t = ctx.currentTime
    osc.type = 'sine'
    osc.frequency.setValueAtTime(80, t)
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.24)
    g.gain.setValueAtTime(0.5, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3)
    osc.connect(g)
    g.connect(this.thumpBus)
    osc.start(t)
    osc.stop(t + 0.35)
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

  /** Called every frame with the smoothed scroll progress. */
  update(progress: number, dt: number) {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    for (const layer of this.layers) {
      const target = sampleNumberKeys(layer.keys, progress)
      layer.gain.gain.setTargetAtTime(target, t, 0.25)
    }

    // Bird chirps in the meadow chapters
    this.birdTimer -= dt
    if (this.birdTimer <= 0 && this.birdBus && progress < 0.3) {
      this.birdTimer = 0.4 + Math.random() * 1.8
      this.chirp(this.birdBus, 1900 + Math.random() * 1600, 0.12 + Math.random() * 0.2)
    }
    // Crickets at night
    this.cricketTimer -= dt
    if (this.cricketTimer <= 0 && this.nightBus) {
      this.cricketTimer = 0.14 + Math.random() * 0.3
      this.chirp(this.nightBus, 4200 + Math.random() * 800, 0.05)
    }
    // Construction thumps
    this.thumpTimer -= dt
    if (this.thumpTimer <= 0 && progress > T.survey[0] && progress < T.infrastructure[1]) {
      this.thumpTimer = 0.9 + Math.random() * 1.6
      this.thump()
    }
    // Rolling thunder during the storm
    if (sampleNumberKeys(STORM, progress) > 0.4 && Math.random() < dt * 0.5) {
      this.thunder()
    }
  }
}

export const audioEngine = new AudioEngine()
