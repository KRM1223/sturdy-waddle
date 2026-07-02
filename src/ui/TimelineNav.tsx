import { motion, useTransform, type MotionValue } from 'framer-motion'
import { PHASES } from '../config/timeline'
import { getScrollDriver } from '../hooks/useScrollDriver'
import { useExperience } from '../store/experience'

/** The vertical chapter rail — progress line plus jump-to dots. */
export default function TimelineNav({ progress }: { progress: MotionValue<number> }) {
  const phaseIndex = useExperience((s) => s.phaseIndex)
  const started = useExperience((s) => s.started)
  const scaleY = useTransform(progress, [0, 1], [0, 1])

  return (
    <nav
      aria-label="Chapters"
      className={`fixed top-1/2 right-5 z-30 hidden -translate-y-1/2 transition-opacity duration-700 md:block ${
        started ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="relative flex flex-col items-center gap-[10px] py-2">
        <div className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-1/2 bg-white/10" />
        <motion.div
          style={{ scaleY }}
          className="absolute top-0 bottom-0 left-1/2 w-px origin-top -translate-x-1/2 bg-gradient-to-b from-sky-300/80 to-sky-300/30"
        />
        {PHASES.map((phase, i) => (
          <button
            key={phase.id}
            type="button"
            aria-label={`Go to chapter ${i + 1}: ${phase.name}`}
            aria-current={phaseIndex === i ? 'step' : undefined}
            onClick={() => getScrollDriver()?.scrollToProgress(phase.range[0] + 0.012)}
            className="group relative flex h-4 w-4 items-center justify-center outline-none"
          >
            <span
              className={`block rounded-full transition-all duration-500 group-focus-visible:ring-2 group-focus-visible:ring-sky-300/70 ${
                phaseIndex === i
                  ? 'h-2.5 w-2.5 bg-sky-300 shadow-[0_0_14px_rgba(125,211,252,0.8)]'
                  : 'h-1.5 w-1.5 bg-white/30 group-hover:bg-white/70'
              }`}
            />
            <span className="pointer-events-none absolute right-6 rounded-md bg-black/60 px-2.5 py-1 font-mono text-[10px] tracking-[0.18em] whitespace-nowrap text-white/80 uppercase opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
              {String(i + 1).padStart(2, '0')} · {phase.name}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}
