import * as React from 'react'
import Recoil from 'recoil'
import {
  cellSizeState,
  countState,
  liveState,
  offsetState,
  showControlsState,
  showGridState,
  fpsState,
} from './state'
import { GridShowState, maxFps, preventDefault } from './utils'

interface ControlsProps {
  runGeneration: () => void
}
export const Controls = ({ runGeneration }: ControlsProps) => {
  const [showControls, setShowControls] =
    Recoil.useRecoilState(showControlsState)
  const [live, setLive] = Recoil.useRecoilState(liveState)
  const [fps, setFps] = Recoil.useRecoilState(fpsState)
  const [showGrid, setShowGrid] = Recoil.useRecoilState(showGridState)

  const offset = Recoil.useRecoilValue(offsetState)
  const count = Recoil.useRecoilValue(countState)
  const cellSize = Recoil.useRecoilValue(cellSizeState)

  const onGenerateClick = React.useCallback(() => {
    runGeneration()
  }, [runGeneration])

  const onRunClick = React.useCallback(() => {
    setLive((v) => !v)
  }, [setLive])

  const onFpsChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(e.target.value)
      if (!isNaN(newValue)) {
        setFps(Math.min(maxFps, newValue))
      }
    },
    [setFps],
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
            FPS:
            <input
              style={{ marginLeft: '1em', width: '5em' }}
              type='number'
              value={fps}
              onChange={onFpsChange}
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
              <option value={GridShowState.Auto}>auto</option>
              <option value={GridShowState.Off}>off</option>
              <option value={GridShowState.On}>on</option>
            </select>
          </div>
        </>
      ) : (
        <div onClick={() => setShowControls(true)}>Show Controls</div>
      )}
    </div>
  )
}
