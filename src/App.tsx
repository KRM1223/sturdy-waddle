import { lazy, Suspense, useEffect, useRef } from 'react'
import { SCROLL_PAGES } from './config/timeline'
import { useScrollDriver } from './hooks/useScrollDriver'
import { setExperience } from './store/experience'
import LoadingScreen from './ui/LoadingScreen'
import Overlay from './ui/Overlay'

const Experience = lazy(() => import('./scene/Experience'))

export default function App() {
  const trackRef = useRef<HTMLDivElement>(null)
  useScrollDriver(trackRef)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setExperience({ reducedMotion: mq.matches })
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return (
    <>
      {/* Scroll track — the invisible timeline the user rides */}
      <div
        ref={trackRef}
        aria-hidden="true"
        style={{ height: `${SCROLL_PAGES * 100}vh` }}
      />

      {/* The world */}
      <div className="fixed inset-0" aria-label="The Birth of a City — interactive 3D scene">
        <Suspense fallback={null}>
          <Experience />
        </Suspense>
      </div>

      {/* Cinematic UI */}
      <Overlay />
      <LoadingScreen />
    </>
  )
}
