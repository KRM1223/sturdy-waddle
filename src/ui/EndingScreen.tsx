import { motion, useTransform, type MotionValue } from 'framer-motion'
import { FiRotateCcw } from 'react-icons/fi'
import { getScrollDriver } from '../hooks/useScrollDriver'

/** The final fade — two lines, a pause between them, and an invitation. */
export default function EndingScreen({ progress }: { progress: MotionValue<number> }) {
  const veil = useTransform(progress, [0.955, 0.985], [0, 1])
  const lineOne = useTransform(progress, [0.962, 0.972, 0.982, 0.988], [0, 1, 1, 0])
  const lineOneY = useTransform(progress, [0.962, 0.988], [22, -14])
  const lineTwo = useTransform(progress, [0.988, 0.996], [0, 1])
  const lineTwoY = useTransform(progress, [0.988, 1], [26, 0])
  const pointer = useTransform(progress, (v): 'auto' | 'none' => (v > 0.985 ? 'auto' : 'none'))

  return (
    <motion.div
      style={{ opacity: veil, pointerEvents: pointer }}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#01020a]/92 px-6 text-center"
      aria-hidden={false}
    >
      <motion.p
        style={{ opacity: lineOne, y: lineOneY }}
        className="font-serif max-w-3xl text-[clamp(1.6rem,4vw,3.2rem)] leading-snug text-white/90 text-balance"
      >
        Every great city began as an empty landscape.
      </motion.p>
      <motion.div
        style={{ opacity: lineTwo, y: lineTwoY }}
        className="absolute flex flex-col items-center gap-10 px-6"
      >
        <p className="font-serif text-[clamp(2rem,5.6vw,4.4rem)] leading-tight text-white text-balance">
          What will you <em className="text-sky-300 not-italic">build</em>?
        </p>
        <button
          type="button"
          onClick={() => getScrollDriver()?.scrollToProgress(0)}
          className="group flex items-center gap-3 rounded-full border border-white/15 bg-white/5 px-7 py-3.5 font-mono text-[11px] tracking-[0.3em] text-white/80 uppercase backdrop-blur-md transition-all duration-500 outline-none hover:border-sky-300/60 hover:text-white focus-visible:ring-2 focus-visible:ring-sky-300/70"
        >
          <FiRotateCcw className="transition-transform duration-700 group-hover:-rotate-[360deg]" />
          Watch it rise again
        </button>
      </motion.div>
    </motion.div>
  )
}
