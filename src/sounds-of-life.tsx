import { useInterval } from 'beautiful-react-hooks'
import * as React from 'react'
import Dropzone from 'react-dropzone'
import { Helmet } from 'react-helmet'
import { Controls } from './controls'
import { GameCanvas } from './game-canvas'
import { generate, Grid } from './game-of-life'
import { emptyGrid } from './gol-utils'
import { KeyboardShortcuts } from './keyboard-shortcuts'
import { getBoardFromRLE } from './rle-handling'

// TODO: don't floor values for when cellSize is less than 1.0
// TODO: zoom to cursor rather than origin
// TODO: support more RLE features, like board positioning
// TODO: if RLE parsing is unsuccessful, make it fail gracefully

export const SoundsOfLife = () => {
  const [grid, setGrid] = React.useState<Grid>(emptyGrid())
  const [count, setCount] = React.useState(0)
  const [live, setLive] = React.useState(false)
  const [speed, setSpeed] = React.useState(200)
  const [offsetX, setOffsetX] = React.useState(0)
  const [offsetY, setOffsetY] = React.useState(0)
  const [cellSize, setCellSize] = React.useState(10)
  const [showControls, setShowControls] = React.useState(true)

  const runGeneration = React.useCallback(() => {
    setGrid(generate(grid))
    setCount((count) => count + 1)
  }, [grid])

  useInterval(() => {
    if (live) {
      runGeneration()
    }
  }, speed)

  return (
    <>
      <Helmet>
        <style type='text/css'>
          {`
            body {
              margin: 0;
              overflow: hidden;
            }
            iframe {
              display: none;
            }
          `}
        </style>
      </Helmet>
      <Dropzone
        onDrop={(acceptedFiles) => {
          const zeroth = acceptedFiles[0]
          if (zeroth instanceof window.File) {
            zeroth.text().then((text) => {
              const parsedBoard = getBoardFromRLE(text)
              if (parsedBoard != null) {
                setGrid(parsedBoard)
              }
            })
          }
        }}
      >
        {({ getRootProps }) => (
          <div {...getRootProps()} style={{ outline: 'none' }}>
            <KeyboardShortcuts
              live={live}
              runGeneration={runGeneration}
              setLive={setLive}
              setGrid={setGrid}
              setCount={setCount}
              setCellSize={setCellSize}
              setSpeed={setSpeed}
              setOffsetX={setOffsetX}
              setOffsetY={setOffsetY}
              setShowControls={setShowControls}
            >
              <GameCanvas
                offsetX={offsetX}
                setOffsetX={setOffsetX}
                offsetY={offsetY}
                setOffsetY={setOffsetY}
                cellSize={cellSize}
                setCellSize={setCellSize}
                grid={grid}
                setGrid={setGrid}
              />
            </KeyboardShortcuts>
            <Controls
              originX={offsetX}
              originY={offsetY}
              showControls={showControls}
              setShowControls={setShowControls}
              count={count}
              runGeneration={runGeneration}
              setGrid={setGrid}
              live={live}
              setLive={setLive}
              speed={speed}
              setSpeed={setSpeed}
              cellSize={cellSize}
              setCellSize={setCellSize}
            />
          </div>
        )}
      </Dropzone>
    </>
  )
}
