import * as React from 'react'
import type { Grid } from './game-of-life'
import { blinker, emptyGrid, soup } from './gol-utils'
import { preventDefault } from './utils'

interface ControlsProps {
  showControls: boolean
  setShowControls: React.Dispatch<React.SetStateAction<boolean>>
  runGeneration: () => void
  setGrid: React.Dispatch<React.SetStateAction<Grid>>
  live: boolean
  setLive: React.Dispatch<React.SetStateAction<boolean>>
  speed: number
  setSpeed: React.Dispatch<React.SetStateAction<number>>
  count: number
  cellSize: number
  setCellSize: React.Dispatch<React.SetStateAction<number>>
  originX: number
  originY: number
}
export const Controls = ({
  runGeneration,
  setGrid,
  live,
  setLive,
  speed,
  setSpeed,
  count,
  cellSize,
  setCellSize,
  showControls,
  setShowControls,
  originX,
  originY,
}: ControlsProps) => {
  const onGenerateClick = React.useCallback(() => {
    runGeneration()
  }, [runGeneration])

  const onClearClick = React.useCallback(() => {
    setGrid(emptyGrid())
  }, [setGrid])

  const onSoupClick = React.useCallback(() => {
    setGrid(soup(0, 0, 100, 100))
  }, [setGrid])

  const onBlinkerClick = React.useCallback(() => {
    setGrid(blinker())
  }, [setGrid])

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
            <button
              style={{ marginRight: '1em' }}
              onClick={onRunClick}
            >
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
            <button
              style={{ marginRight: '1em' }}
              onClick={onClearClick}
            >
              Clear
            </button>
            <button
              style={{ marginRight: '1em' }}
              onClick={onSoupClick}
            >
              Random Soup
            </button>
            <button
              style={{ marginRight: '1em' }}
              onClick={onBlinkerClick}
            >
              Blinker
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <div>Count: {count}</div>
              <div>Cell Size: {cellSize.toFixed(0)}px</div>
              <div>
                Origin: ({Number(originX.toFixed(2))},{' '}
                {Number(originY.toFixed(2))})
              </div>
            </div>
          </div>
        </>
      ) : (
        <div onClick={() => setShowControls(true)}>Show Controls</div>
      )}
    </div>
  )
}
