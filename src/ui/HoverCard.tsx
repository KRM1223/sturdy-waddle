import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FiActivity, FiCalendar, FiCloud, FiSun, FiUsers, FiZap } from 'react-icons/fi'
import { experience, useExperience } from '../store/experience'

/** Building dossier that follows the cursor while hovering the skyline. */
export default function HoverCard() {
  const building = useExperience((s) => s.hoveredBuilding)
  const cardRef = useRef<HTMLDivElement>(null)

  // Follow the pointer on rAF without re-rendering React
  useEffect(() => {
    let raf = 0
    const loop = () => {
      const el = cardRef.current
      if (el) {
        const { x, y } = experience.hoverPoint
        const pad = 18
        const w = el.offsetWidth
        const h = el.offsetHeight
        const left = Math.min(x + pad, window.innerWidth - w - 12)
        const top = Math.min(y + pad, window.innerHeight - h - 12)
        el.style.transform = `translate(${left}px, ${top}px)`
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-40">
      <AnimatePresence>
        {building && (
          <motion.div
            ref={cardRef}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="glass-panel absolute top-0 left-0 w-[248px] rounded-2xl p-4 will-change-transform"
            role="status"
          >
            <p className="font-mono text-[9px] tracking-[0.3em] text-sky-300/80 uppercase">
              {building.info.district}
            </p>
            <h3 className="font-serif mt-1 text-lg leading-tight text-white">
              {building.info.name}
            </h3>
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
              <Stat icon={<FiUsers />} label="Population" value={building.info.population.toLocaleString()} />
              <Stat icon={<FiZap />} label="Power" value={building.info.powerUsage} />
              <Stat icon={<FiActivity />} label="Traffic" value={building.info.traffic} />
              <Stat icon={<FiCloud />} label="Pollution" value={building.info.pollution} />
              <Stat icon={<FiSun />} label="Green energy" value={building.info.greenEnergy} />
              <Stat icon={<FiCalendar />} label="Built" value={building.info.constructionDate} />
            </dl>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="flex items-center gap-1.5 text-white/45">
        <span className="text-[10px]">{icon}</span>
        {label}
      </dt>
      <dd className="font-medium text-white/90">{value}</dd>
    </div>
  )
}
