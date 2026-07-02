import { useEffect } from 'react'
import { useMotionValue, type MotionValue } from 'framer-motion'
import { experience } from '../store/experience'

/**
 * A Framer Motion value fed by the damped scroll progress on rAF —
 * lets the HTML overlay animate without a single React re-render.
 */
export function useProgressValue(): MotionValue<number> {
  const mv = useMotionValue(0)
  useEffect(() => {
    let raf = 0
    const loop = () => {
      if (mv.get() !== experience.smoothProgress) mv.set(experience.smoothProgress)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [mv])
  return mv
}
