import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { experience, setExperience, setProgress } from '../store/experience'
import { phaseAt } from '../config/timeline'
import { audioEngine } from '../audio/AudioEngine'

gsap.registerPlugin(ScrollTrigger)

export interface ScrollDriver {
  scrollToProgress: (p: number, immediate?: boolean) => void
  stop: () => void
  start: () => void
}

const driverRef: { current: ScrollDriver | null } = { current: null }
export const getScrollDriver = () => driverRef.current

/**
 * Lenis smooth scroll + GSAP ScrollTrigger drive one master progress value.
 * React never re-renders on scroll — only the phase index change notifies UI.
 */
export function useScrollDriver(trackRef: React.RefObject<HTMLDivElement | null>) {
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    const lenis = new Lenis({
      duration: 1.35,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6,
      wheelMultiplier: 0.95,
    })
    lenisRef.current = lenis
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    const trigger = ScrollTrigger.create({
      trigger: track,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true,
      onUpdate: (self) => {
        setProgress(self.progress)
        const phase = phaseAt(self.progress)
        if (phase !== experience.phaseIndex) setExperience({ phaseIndex: phase })
        if (!experience.started && self.progress > 0.002) setExperience({ started: true })
      },
    })

    // Wake the audio context on the first user gesture (autoplay policy)
    const wake = () => {
      audioEngine.start()
      window.removeEventListener('pointerdown', wake)
      window.removeEventListener('keydown', wake)
      window.removeEventListener('wheel', wake)
      window.removeEventListener('touchstart', wake)
    }
    window.addEventListener('pointerdown', wake, { passive: true })
    window.addEventListener('keydown', wake)
    window.addEventListener('wheel', wake, { passive: true })
    window.addEventListener('touchstart', wake, { passive: true })

    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return
      const page = window.innerHeight * 0.9
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault()
        lenis.scrollTo(window.scrollY + (e.key === 'PageDown' ? page : page * 0.4))
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault()
        lenis.scrollTo(window.scrollY - (e.key === 'PageUp' ? page : page * 0.4))
      } else if (e.key === 'Home') {
        e.preventDefault()
        lenis.scrollTo(0)
      } else if (e.key === 'End') {
        e.preventDefault()
        lenis.scrollTo(document.body.scrollHeight)
      }
    }
    window.addEventListener('keydown', onKey)

    const maxScroll = () => track.scrollHeight - window.innerHeight
    driverRef.current = {
      scrollToProgress: (p, immediate = false) =>
        lenis.scrollTo(maxScroll() * p, { immediate, duration: immediate ? 0 : 2.2 }),
      stop: () => lenis.stop(),
      start: () => lenis.start(),
    }

    return () => {
      window.removeEventListener('keydown', onKey)
      trigger.kill()
      gsap.ticker.remove(tick)
      lenis.destroy()
      driverRef.current = null
    }
  }, [trackRef])

  return lenisRef
}
