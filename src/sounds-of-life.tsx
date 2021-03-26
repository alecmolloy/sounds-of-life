import { useInterval } from 'beautiful-react-hooks'
import * as React from 'react'
import Dropzone from 'react-dropzone'
import { Controls } from './controls'
import { GameCanvas } from './game-canvas'
import { generate, Grid } from './game-of-life'
import { emptyGrid } from './gol-utils'
import { getBoardFromRLE } from './rle-handling'

const DefaultWidth = 50
const DefaultHeight = 50
const DefaultCellSize = 5

// TODO: infinite canvas, only render cells in frame, scrollwheel events, zoom
// TODO: bresenhem lines between mouse moves
// TODO: support more RLE features, like board positioning
// TODO: if RLE parsing is unsuccessful, make it fail gracefully

export const SoundsOfLife = () => {
  const [grid, setGrid] = React.useState<Grid>(emptyGrid())
  const [count, setCount] = React.useState(0)
  const [live, setLive] = React.useState(false)
  const [speed, setSpeed] = React.useState(200)
  const [width, setWidth] = React.useState(DefaultWidth)
  const [height, setHeight] = React.useState(DefaultHeight)
  const [cellSize, setCellSize] = React.useState(DefaultCellSize)
  const [showControls, setShowControls] = React.useState(false)

  const runGeneration = React.useCallback(() => {
    setGrid(generate(grid))
    setCount((count) => count + 1)
  }, [grid])

  useInterval(() => {
    if (live) {
      runGeneration()
    }
  }, speed)

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.code) {
        case 'KeyC': {
          setShowControls((v) => !v)
          break
        }
        case 'KeyG':
        case 'Enter': {
          runGeneration()
          break
        }
        case 'Space': {
          setLive((v) => !v)
          break
        }
      }
    },
    [runGeneration],
  )

  return (
    <Dropzone
      onDrop={(acceptedFiles) => {
        const zeroth = acceptedFiles[0]
        if (zeroth instanceof window.File) {
          zeroth.text().then((text) => {
            const parsedBoard = getBoardFromRLE(
              text,
              DefaultWidth,
              DefaultHeight,
            )
            if (parsedBoard != null) {
              setGrid(parsedBoard)
            }
          })
        }
      }}
    >
      {({ getRootProps }) => (
        <div
          {...getRootProps()}
          style={{ outline: 'none' }}
          onKeyDown={onKeyDown}
        >
          <GameCanvas
            width={DefaultWidth}
            height={DefaultHeight}
            cellSize={cellSize}
            grid={grid}
            setGrid={setGrid}
          />
          {showControls ? (
            <Controls
              count={count}
              runGeneration={runGeneration}
              setGrid={setGrid}
              width={width}
              setWidth={setWidth}
              height={height}
              setHeight={setHeight}
              live={live}
              setLive={setLive}
              speed={speed}
              setSpeed={setSpeed}
              cellSize={cellSize}
            />
          ) : null}
        </div>
      )}
    </Dropzone>
  )
}
