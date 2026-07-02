import { useCallback, useEffect } from 'react'
import {
  FiCamera,
  FiEye,
  FiLayers,
  FiMoon,
  FiPause,
  FiPlay,
  FiRotateCcw,
  FiVolume2,
  FiVolumeX,
} from 'react-icons/fi'
import { audioEngine } from '../audio/AudioEngine'
import { getScrollDriver } from '../hooks/useScrollDriver'
import { experience, setExperience, useExperience } from '../store/experience'

interface ControlDef {
  id: string
  label: string
  shortcut: string
  icon: React.ReactNode
  active: boolean
  onPress: () => void
}

/** Bottom-left command cluster — audio, time, and view modes. */
export default function Controls() {
  const muted = useExperience((s) => s.muted)
  const paused = useExperience((s) => s.paused)
  const wireframe = useExperience((s) => s.wireframe)
  const night = useExperience((s) => s.nightOverride)
  const underground = useExperience((s) => s.undergroundOverride)
  const cameraMode = useExperience((s) => s.cameraMode)
  const started = useExperience((s) => s.started)

  const toggleMute = useCallback(() => {
    const next = !experience.muted
    setExperience({ muted: next })
    audioEngine.start()
    audioEngine.setMuted(next)
  }, [])

  const togglePause = useCallback(() => {
    const next = !experience.paused
    setExperience({ paused: next })
    const driver = getScrollDriver()
    if (next) driver?.stop()
    else driver?.start()
  }, [])

  const replay = useCallback(() => {
    if (experience.paused) {
      setExperience({ paused: false })
      getScrollDriver()?.start()
    }
    getScrollDriver()?.scrollToProgress(0)
  }, [])

  const toggleCamera = useCallback(
    () => setExperience({ cameraMode: experience.cameraMode === 'cinematic' ? 'orbit' : 'cinematic' }),
    [],
  )
  const toggleWireframe = useCallback(() => setExperience({ wireframe: !experience.wireframe }), [])
  const toggleNight = useCallback(() => setExperience({ nightOverride: !experience.nightOverride }), [])
  const toggleUnderground = useCallback(
    () => setExperience({ undergroundOverride: !experience.undergroundOverride }),
    [],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      switch (e.key.toLowerCase()) {
        case 'm':
          toggleMute()
          break
        case 'p':
          togglePause()
          break
        case 'r':
          replay()
          break
        case 'c':
          toggleCamera()
          break
        case 'x':
          toggleWireframe()
          break
        case 'n':
          toggleNight()
          break
        case 'u':
          toggleUnderground()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggleMute, togglePause, replay, toggleCamera, toggleWireframe, toggleNight, toggleUnderground])

  const controls: ControlDef[] = [
    {
      id: 'mute',
      label: muted ? 'Unmute ambience' : 'Mute ambience',
      shortcut: 'M',
      icon: muted ? <FiVolumeX /> : <FiVolume2 />,
      active: !muted,
      onPress: toggleMute,
    },
    {
      id: 'pause',
      label: paused ? 'Resume timeline' : 'Pause timeline',
      shortcut: 'P',
      icon: paused ? <FiPlay /> : <FiPause />,
      active: paused,
      onPress: togglePause,
    },
    {
      id: 'replay',
      label: 'Replay from the beginning',
      shortcut: 'R',
      icon: <FiRotateCcw />,
      active: false,
      onPress: replay,
    },
    {
      id: 'camera',
      label: cameraMode === 'cinematic' ? 'Free camera' : 'Cinematic camera',
      shortcut: 'C',
      icon: <FiCamera />,
      active: cameraMode === 'orbit',
      onPress: toggleCamera,
    },
    {
      id: 'wireframe',
      label: wireframe ? 'Solid view' : 'Wireframe view',
      shortcut: 'X',
      icon: <FiEye />,
      active: wireframe,
      onPress: toggleWireframe,
    },
    {
      id: 'underground',
      label: underground ? 'Surface view' : 'Underground view',
      shortcut: 'U',
      icon: <FiLayers />,
      active: underground,
      onPress: toggleUnderground,
    },
    {
      id: 'night',
      label: night ? 'Natural light' : 'Night mode',
      shortcut: 'N',
      icon: <FiMoon />,
      active: night,
      onPress: toggleNight,
    },
  ]

  return (
    <div
      role="toolbar"
      aria-label="Experience controls"
      className={`fixed bottom-5 left-5 z-30 flex items-center gap-2 transition-all duration-700 ${
        started ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      {controls.map((c) => (
        <div key={c.id} className="group relative">
          <button
            type="button"
            aria-label={c.label}
            aria-pressed={c.active}
            data-active={c.active}
            onClick={c.onPress}
            className="control-button"
          >
            {c.icon}
          </button>
          <span className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 rounded-md bg-black/70 px-2.5 py-1 font-mono text-[10px] whitespace-nowrap text-white/85 opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100">
            {c.label} · {c.shortcut}
          </span>
        </div>
      ))}
    </div>
  )
}
