import { useInterval } from 'beautiful-react-hooks'
import * as React from 'react'
import Dropzone from 'react-dropzone'
import { Controls } from './controls'
import { GameCanvas } from './game-canvas'
import { generate, Grid } from './game-of-life'
import { emptyBoard } from './gol-utils'
import { getBoardFromRLE } from './rle-handling'

const DefaultWidth = 50
const DefaultHeight = 50
const DefaultCellSize = 10
const WrapEdges = true

// TODO: bresenhem lines between mouse moves
// TODO: bug if you load a pattern too big for the board
// TODO: support more RLE features, like board positioning
// TODO: better board storage 🤔
// TODO: if RLE parsing is unsuccessful, make it fail gracefully

export const SoundsOfLife = () => {
  const [grid, setGrid] = React.useState<Grid>(
    emptyBoard(DefaultWidth, DefaultHeight),
  )
  const [count, setCount] = React.useState(0)
  const [live, setLive] = React.useState(false)
  const [speed, setSpeed] = React.useState(1000)
  const [width, setWidth] = React.useState(DefaultWidth)
  const [height, setHeight] = React.useState(DefaultHeight)
  const [cellSize, setCellSize] = React.useState(
    DefaultCellSize,
  )

  const runGeneration = React.useCallback(() => {
    setGrid(generate(grid, WrapEdges))
  }, [grid])

  useInterval(() => {
    if (live) {
      runGeneration()
    }
  }, speed)

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
        >
          <GameCanvas
            width={DefaultWidth}
            height={DefaultHeight}
            cellSize={cellSize}
            grid={grid}
            setGrid={setGrid}
          />
          <Controls
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
          />
        </div>
      )}
    </Dropzone>
  )
}
