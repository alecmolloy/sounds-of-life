import * as React from 'react'
import { GridShowState } from './game-of-life'
import { preventDefault } from './utils'

interface ControlsProps {
  showControls: boolean
  setShowControls: React.Dispatch<React.SetStateAction<boolean>>
  runGeneration: () => void
  live: boolean
  setLive: React.Dispatch<React.SetStateAction<boolean>>
  speed: number
  setSpeed: React.Dispatch<React.SetStateAction<number>>
  count: number
  cellSize: number
  offset: Float32Array
  showGrid: GridShowState
  setShowGrid: React.Dispatch<React.SetStateAction<GridShowState>>
}
export const Controls = ({
  runGeneration,
  live,
  setLive,
  speed,
  setSpeed,
  count,
  cellSize,
  showControls,
  setShowControls,
  offset,
  showGrid,
  setShowGrid,
}: ControlsProps) => {
  const onGenerateClick = React.useCallback(() => {
    runGeneration()
  }, [runGeneration])

  const onRunClick = React.useCallback(() => {
    setLive((v) => !v)
  }, [setLive])

  const onSpeedChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(e.target.value)
      if (!isNaN(newValue)) {
        setSpeed(newValue)
      }
    },
    [setSpeed],
  )

  return (
    <div
      id='controls'
      style={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        backgroundColor: '#fff2',
        padding: 10,
        color: 'white',
        paddingRight: showControls ? 40 : 10,
        userSelect: 'none',
      }}
      onClick={preventDefault}
    >
      {showControls ? (
        <>
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              cursor: 'pointer',
            }}
            onClickCapture={(e) => {
              e.stopPropagation()
              setShowControls(false)
            }}
          >
            ✕
          </div>
          <div>
            <button
              style={{ marginRight: '1em' }}
              onClick={onGenerateClick}
              disabled={live}
            >
              Generate
            </button>
            <button style={{ marginRight: '1em' }} onClick={onRunClick}>
              {live ? 'Pause' : 'Run'}
            </button>
            Speed (ms):
            <input
              style={{ marginLeft: '1em', width: '5em' }}
              type='number'
              value={speed}
              onChange={onSpeedChange}
            />
          </div>
          <div style={{ marginTop: '1em' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div>Count: {count}</div>
              <div>Cell Size: {cellSize.toFixed(0)}px</div>
              <div>
                Origin: ({Number(offset[0].toFixed(2))},{' '}
                {Number(offset[1].toFixed(2))})
              </div>
            </div>
          </div>
          <div style={{ marginTop: '1em' }}>
            Show grid:
            <select
              onChange={(e) => {
                setShowGrid(Number(e.target.value) as GridShowState)
              }}
              value={showGrid}
            >
              <option value={GridShowState.auto}>auto</option>
              <option value={GridShowState.off}>off</option>
              <option value={GridShowState.on}>on</option>
            </select>
          </div>
        </>
      ) : (
        <div onClick={() => setShowControls(true)}>Show Controls</div>
      )}
    </div>
  )
}
