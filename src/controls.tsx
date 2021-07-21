import Input from '@material-ui/core/Input'
import Slider, { Mark } from '@material-ui/core/Slider'
import * as React from 'react'
import Recoil from 'recoil'
import { calculateOffsetForZoom, MaxZoom, MinZoom } from './canvas-interactions'
import { printRLE } from './rle-printer'
import {
  boardSizeState,
  cellSizeState,
  countState,
  fpsState,
  liveState,
  modeState,
  offsetState,
  showGridState,
} from './state'
import { GridShowState, maxFps, modeIsDrawing, modeIsSelecting } from './utils'

interface ControlsProps {
  generate: () => void
  getBoard: () => Uint8Array
}
export const Controls: React.FunctionComponent<ControlsProps> = ({
  getBoard,
  generate,
}) => {
  const [live, setLive] = Recoil.useRecoilState(liveState)
  const [fps, setFps] = Recoil.useRecoilState(fpsState)
  const [showGrid, setShowGrid] = Recoil.useRecoilState(showGridState)
  const [mode, setMode] = Recoil.useRecoilState(modeState)
  const [count, setCount] = Recoil.useRecoilState(countState)
  const [cellSize, setCellSize] = Recoil.useRecoilState(cellSizeState)

  const boardSize = Recoil.useRecoilValue(boardSizeState)

  const setOffset = Recoil.useSetRecoilState(offsetState)

  const onGenerateClick = React.useCallback(() => {
    generate()
  }, [generate])

  const onRunClick = React.useCallback(() => {
    setLive((v) => !v)
  }, [setLive])

  const onStepBackwardsClick = React.useCallback(() => {
    setLive(false)
    setCount((v) => v - 1)
  }, [setCount, setLive])

  const onFpsChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(e.target.value)
      if (!isNaN(newValue)) {
        setFps(Math.min(maxFps, newValue))
      }
    },
    [setFps],
  )

  const onSaveClick = React.useCallback(() => {
    const fileContent = printRLE(getBoard(), boardSize[0], boardSize[1])

    const element = document.createElement('a')
    const file = new Blob([fileContent], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = `pattern.rle`
    document.body.appendChild(element) // Required for this to work in FireFox
    element.click()
    document.body.removeChild(element)
  }, [boardSize, getBoard])

  const onShowGridChange = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>): void => {
      setShowGrid(Number(e.target.value) as GridShowState)
    },
    [setShowGrid],
  )

  const onSelectionToolClick = React.useCallback(
    () => setMode('selection-default'),
    [setMode],
  )
  const onDrawingToolClick = React.useCallback(
    () => setMode('drawing-default'),
    [setMode],
  )

  const onCellSizeChange: (
    event: React.ChangeEvent<any>,
    value: number | Array<number>,
  ) => void = React.useCallback(
    (e, newCellSize) => {
      if (!Array.isArray(newCellSize)) {
        setOffset((v) =>
          calculateOffsetForZoom(
            window.innerWidth / 2,
            window.innerHeight / 2,
            v,
            cellSize,
            newCellSize,
          ),
        )
        setCellSize(newCellSize)
      }
    },
    [cellSize, setCellSize, setOffset],
  )

  return (
    <div
      id={ControlsDivID}
      style={{
        position: 'absolute',
        bottom: 10,
        left: 10,
        backdropFilter: 'blur(20px)',
        boxShadow: '2px 2px 8px #0008',
        borderRadius: 4,
        padding: 10,
        paddingLeft: 20,
        paddingRight: 20,
        color: 'white',
        userSelect: 'none',
        width: 'calc(100% - 20px - 20px)',
        height: 32,
        display: 'flex',
        alignItems: 'center',
        columnGap: 15,
        fontSize: 14,
      }}
    >
      <img
        style={{ flexShrink: 0 }}
        src={`/icons/selection-tool-icon${
          modeIsSelecting(mode) ? '-selected' : ''
        }@2x.png`}
        onClick={onSelectionToolClick}
        width={24}
        height={24}
        title='Marquee Selection (m)'
      />
      <img
        style={{ flexShrink: 0 }}
        src={`/icons/pencil-tool-icon${
          modeIsDrawing(mode) ? '-selected' : ''
        }@2x.png`}
        onClick={onDrawingToolClick}
        width={24}
        height={24}
        title='Pencil (p)'
      />
      <img
        style={{
          flexShrink: 0,
          pointerEvents: 'none',
          paddingLeft: 5,
          paddingRight: 5,
        }}
        src={`/icons/divider@2x.png`}
        width={2}
        height={24}
      />
      <img
        style={{ flexShrink: 0 }}
        src={`/icons/step-backwards${count === 0 ? '-disabled' : ''}@2x.png`}
        width={24}
        height={24}
        title={count !== 0 ? 'step backwards' : 'step backwards (disabled)'}
        onClick={onStepBackwardsClick}
      />
      <img
        style={{ flexShrink: 0 }}
        src={`/icons/${live ? 'pause' : 'play'}@2x.png`}
        width={24}
        height={24}
        title={live ? 'pause' : 'play'}
        onClick={onRunClick}
      />
      <img
        style={{ flexShrink: 0 }}
        src={`/icons/generate${live ? '-disabled' : ''}@2x.png`}
        width={24}
        height={24}
        title={live ? 'generate (disabled)' : 'step'}
        onClick={onGenerateClick}
      />
      <div style={{ flexShrink: 0 }}>
        FPS:
        <Input
          type='number'
          value={fps}
          onChange={onFpsChange}
          color='primary'
          style={{
            width: '4em',
            fontSize: 14,
            paddingLeft: 5,
          }}
        />
      </div>
      <Slider
        value={cellSize}
        onChange={onCellSizeChange}
        marks={marks}
        // step={null}
        min={MinZoom}
        max={MaxZoom}
        track={false}
        // style={{ width: 150 }}
        scale={sliderScaleFunction}
      />
      <div>Cell Size: {cellSize.toFixed(0)}px</div>
      Show grid:
      <select onChange={onShowGridChange} value={showGrid}>
        <option value={GridShowState.Auto}>auto</option>
        <option value={GridShowState.Off}>off</option>
        <option value={GridShowState.On}>on</option>
      </select>
      <button style={{ marginLeft: 10 }} onClick={onSaveClick}>
        Save RLE
      </button>
    </div>
  )
}

const marks: Array<Mark> = [
  {
    value: 0.5,
    label: '½',
  },
  {
    value: 1,
    label: 1,
  },
  {
    value: 2,
    label: 2,
  },
  {
    value: 5,
    label: 5,
  },
  {
    value: 10,
    label: 10,
  },
  {
    value: 15,
    label: 15,
  },
  {
    value: 20,
    label: 20,
  },
  {
    value: 25,
    label: 25,
  },
]

const ControlsDivID = 'controls'

const sliderScaleFunction = (x: number) => (x < 5 ? x * 2 : x)
