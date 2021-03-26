import * as React from 'react'
import type { Grid } from './game-of-life'
import { emptyGrid, soup, blinker } from './gol-utils'

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
  count: number
  cellSize: number
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
}: ControlsProps) => {
  const onGenerateClick = React.useCallback(() => {
    runGeneration()
  }, [runGeneration])

  const onClearClick = React.useCallback(() => {
    setGrid(emptyGrid())
  }, [setGrid])

  const onSoupClick = React.useCallback(() => {
    setGrid(
      soup(
        0,
        0,
        window.innerWidth / cellSize,
        window.innerHeight / cellSize,
      ),
    )
  }, [setGrid, cellSize])

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
      }}
    >
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
        <button style={{ marginRight: '1em' }} onClick={onClearClick}>
          Clear
        </button>
        <button style={{ marginRight: '1em' }} onClick={onSoupClick}>
          Random Soup
        </button>
        <button
          style={{ marginRight: '1em' }}
          onClick={onBlinkerClick}
        >
          Blinker
        </button>
        Count: {count}
      </div>
    </div>
  )
}
