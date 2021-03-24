import * as React from 'react'
import type { Grid } from './game-of-life'
import { emptyBoard, soup, blinker } from './gol-utils'

interface ControlsProps {
  runGeneration: () => void
  setGrid: React.Dispatch<React.SetStateAction<Grid>>
  width: number
  setWidth: React.Dispatch<React.SetStateAction<number>>
  height: number
  setHeight: React.Dispatch<React.SetStateAction<number>>
  live: boolean
  setLive: React.Dispatch<React.SetStateAction<boolean>>
  speed: number
  setSpeed: React.Dispatch<React.SetStateAction<number>>
}
export const Controls = ({
  runGeneration,
  setGrid,
  width,
  setWidth,
  height,
  setHeight,
  live,
  setLive,
  speed,
  setSpeed,
}: ControlsProps) => {
  const onGenerateClick = React.useCallback(() => {
    runGeneration()
  }, [runGeneration])

  const onClearClick = React.useCallback(() => {
    setGrid(emptyBoard(width, height))
  }, [setGrid, width, height])

  const onSoupClick = React.useCallback(() => {
    setGrid(soup(width, height))
  }, [setGrid, width, height])

  const onBlinkerClick = React.useCallback(() => {
    setGrid(blinker(width, height))
  }, [setGrid, width, height])

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
    <div id='controls'>
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
      </div>
    </div>
  )
}
