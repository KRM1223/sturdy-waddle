import { motion } from 'framer-motion'
import { FiChevronDown } from 'react-icons/fi'
import { useExperience } from '../store/experience'

/** The opening invitation to scroll — retires itself once the journey starts. */
export default function ScrollHint() {
  const started = useExperience((s) => s.started)
  const ready = useExperience((s) => s.ready)

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-8 z-30 flex flex-col items-center gap-3 transition-opacity duration-1000 ${
        ready && !started ? 'opacity-100' : 'opacity-0'
      }`}
      aria-hidden={started}
    >
      <span className="font-mono text-[10px] tracking-[0.4em] text-white/55 uppercase">
        Scroll to begin a century
      </span>
      <motion.span
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        className="text-white/70"
      >
        <FiChevronDown size={18} />
      </motion.span>
    </div>
  )
}
