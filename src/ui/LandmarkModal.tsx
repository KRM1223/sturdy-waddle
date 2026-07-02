import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FiX } from 'react-icons/fi'
import { setExperience, useExperience } from '../store/experience'

/** Landmark dossier — opens when a civic building is clicked. */
export default function LandmarkModal() {
  const landmark = useExperience((s) => s.activeLandmark)
  const close = () => setExperience({ activeLandmark: null })

  useEffect(() => {
    if (!landmark) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [landmark])

  return (
    <AnimatePresence>
      {landmark && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-5 backdrop-blur-[3px] sm:items-center"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={landmark.name}
        >
          <motion.div
            initial={{ opacity: 0, y: 44, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="glass-panel w-full max-w-md rounded-3xl p-7"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] tracking-[0.32em] text-sky-300/80 uppercase">
                  {landmark.category}
                </p>
                <h3 className="font-serif mt-1.5 text-3xl leading-tight text-white">
                  {landmark.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close details"
                className="control-button shrink-0"
              >
                <FiX />
              </button>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/70">{landmark.description}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {landmark.facts.map((fact) => (
                <div key={fact.label} className="rounded-xl border border-white/8 bg-white/4 px-3.5 py-2.5">
                  <p className="text-[10px] tracking-wide text-white/45 uppercase">{fact.label}</p>
                  <p className="mt-0.5 text-sm font-medium text-white/95">{fact.value}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
