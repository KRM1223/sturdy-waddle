import { motion, useTransform, type MotionValue } from 'framer-motion'
import { PHASES } from '../config/timeline'
import type { PhaseDef } from '../types'

/** Chapter copy that breathes in and out with the scroll. */
export default function SceneCaptions({ progress }: { progress: MotionValue<number> }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-20">
      {PHASES.map((phase) => (
        <Caption key={phase.id} phase={phase} progress={progress} />
      ))}
    </div>
  )
}

function Caption({ phase, progress }: { phase: PhaseDef; progress: MotionValue<number> }) {
  const [start, end] = phase.range
  const fadeIn = Math.min(0.02, (end - start) * 0.3)
  // the opening chapter greets the visitor immediately
  const inKeys =
    phase.index === 0
      ? [0, 0.0001]
      : [start + fadeIn * 0.3, start + fadeIn * 1.6]
  const opacity = useTransform(
    progress,
    [...inKeys, end - fadeIn * 1.9, end - fadeIn * 0.6],
    [phase.index === 0 ? 1 : 0, 1, 1, 0],
  )
  const y = useTransform(progress, [start, end], [phase.index === 0 ? 0 : 46, -46])

  const alignClass =
    phase.align === 'left'
      ? 'left-[6vw] items-start text-left'
      : phase.align === 'right'
        ? 'right-[6vw] items-end text-right'
        : 'left-1/2 -translate-x-1/2 items-center text-center'

  return (
    <motion.section
      style={{ opacity, y }}
      className={`absolute top-[16vh] flex w-[min(560px,82vw)] flex-col gap-5 md:top-[20vh] ${alignClass}`}
      aria-label={phase.name}
    >
      <span className="chapter-kicker">{phase.subtitle}</span>
      <h2 className="chapter-title text-balance">{phase.title}</h2>
      <p className="chapter-body max-w-[46ch]">{phase.body}</p>
    </motion.section>
  )
}
