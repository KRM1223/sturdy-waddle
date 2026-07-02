import Controls from './Controls'
import EndingScreen from './EndingScreen'
import Header from './Header'
import HoverCard from './HoverCard'
import LandmarkModal from './LandmarkModal'
import SceneCaptions from './SceneCaptions'
import ScrollHint from './ScrollHint'
import TimelineNav from './TimelineNav'
import { useProgressValue } from '../hooks/useProgressValue'

/** Everything HTML that floats over the world. */
export default function Overlay() {
  const progress = useProgressValue()

  return (
    <>
      <Header progress={progress} />
      <SceneCaptions progress={progress} />
      <TimelineNav progress={progress} />
      <Controls />
      <HoverCard />
      <LandmarkModal />
      <EndingScreen progress={progress} />
      <ScrollHint />
    </>
  )
}
