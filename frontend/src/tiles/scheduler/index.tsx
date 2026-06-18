import './scheduler.css'
import { useScheduler } from './useScheduler'
import { SchedulerSummary } from './SchedulerSummary'
import { GraphEditor } from './editor/GraphEditor'
import type { TileProps } from '../../types'

export function SchedulerTile({ maximized }: TileProps) {
  const { graphs, blockDefs, saveGraph, deleteGraph, setEnabled, runGraph } = useScheduler()

  if (!maximized) {
    return <SchedulerSummary graphs={graphs} />
  }

  return (
    <GraphEditor
      graphs={graphs}
      blockDefs={blockDefs}
      onSave={saveGraph}
      onDelete={deleteGraph}
      onSetEnabled={setEnabled}
      onRun={runGraph}
    />
  )
}
