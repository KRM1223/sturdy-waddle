import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useExperience } from '../store/experience'

const MIN_SHOW_MS = 1800

/** Opening title card — holds until the first frame has rendered. */
export default function LoadingScreen() {
  const ready = useExperience((s) => s.ready)
  const [minElapsed, setMinElapsed] = useState(false)
  const done = ready && minElapsed

  useEffect(() => {
    const t = window.setTimeout(() => setMinElapsed(true), MIN_SHOW_MS)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          exit={{ opacity: 0, transition: { duration: 1.1, ease: 'easeInOut' } }}
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-8 bg-[#05070f]"
          role="status"
          aria-label="Loading the experience"
        >
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-4 text-center"
          >
            <span className="font-mono text-[10px] tracking-[0.5em] text-sky-300/70 uppercase">
              An interactive film
            </span>
            <h1 className="font-serif text-[clamp(2.4rem,7vw,5.2rem)] leading-none text-white">
              The Birth of a City
            </h1>
            <p className="max-w-sm text-sm leading-relaxed font-light text-white/50">
              From the first blade of grass to the lights of orbit — you control time itself.
              Scroll, and a century unfolds.
            </p>
          </motion.div>
          <div className="h-px w-44 overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              className="h-full w-1/2 bg-gradient-to-r from-transparent via-sky-300 to-transparent"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
