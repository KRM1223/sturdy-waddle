import { motion, useTransform, type MotionValue } from 'framer-motion'
import { PHASES } from '../config/timeline'
import { useExperience } from '../store/experience'

/** Minimal wordmark + live chapter readout. */
export default function Header({ progress }: { progress: MotionValue<number> }) {
  const phaseIndex = useExperience((s) => s.phaseIndex)
  const phase = PHASES[phaseIndex]
  const opacity = useTransform(progress, [0.955, 0.975], [1, 0])

  return (
    <motion.header
      style={{ opacity }}
      className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start justify-between px-5 py-5 md:px-8"
    >
      <div className="flex flex-col gap-1">
        <span className="font-serif text-lg tracking-wide text-white/95">The Birth of a City</span>
        <span className="font-mono text-[9px] tracking-[0.34em] text-white/40 uppercase">
          A scroll through time
        </span>
      </div>
      <div className="hidden flex-col items-end gap-1 sm:flex" aria-live="polite">
        <span className="font-mono text-[10px] tracking-[0.3em] text-sky-300/80 uppercase">
          {String(phaseIndex + 1).padStart(2, '0')} / {String(PHASES.length).padStart(2, '0')}
        </span>
        <span className="font-mono text-[9px] tracking-[0.3em] text-white/45 uppercase">
          {phase.name}
        </span>
      </div>
    </motion.header>
  )
}
