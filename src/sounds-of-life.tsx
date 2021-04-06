import { useInterval } from 'beautiful-react-hooks'
import * as React from 'react'
import Dropzone from 'react-dropzone'
import { Helmet } from 'react-helmet'
import { Controls } from './controls'
import { GameCanvas } from './game-canvas'
import { generate, Grid } from './game-of-life'
import { emptyGrid, setDeeply } from './gol-utils'
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

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.code) {
        case 'KeyC': {
          setShowControls((v) => !v)
          break
        }
        case 'KeyG':
        case 'Enter': {
          if (live) {
            setLive(false)
          }
          runGeneration()
          break
        }
        case 'KeyR': {
          setGrid(emptyGrid)
          setCount(0)
          break
        }
        case 'Space': {
          setLive((v) => !v)
          break
        }
        case 'Equal': {
          if (e.metaKey) {
            e.preventDefault()
            setCellSize((v) => v * 1.1)
          } else {
            setSpeed((speed) => Math.round(speed / 1.1))
          }
          break
        }
        case 'Minus': {
          if (e.metaKey) {
            e.preventDefault()
            setCellSize((v) => Math.max(1, v / 1.1))
          } else {
            setSpeed((speed) => Math.round(speed * 1.1))
          }
          break
        }
        case 'Digit0':
        case 'Digit1': {
          if (e.metaKey) {
            setCellSize(10)
            setOffsetX(0)
            setOffsetY(0)
          }
          break
        }
      }
    },
    [runGeneration, live],
  )

  React.useEffect(() => {
    setGrid(setDeeply(0, 0, true, grid))
  }, [])

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
          <div
            id='onWheelTarget'
            {...getRootProps()}
            style={{ outline: 'none' }}
            onKeyDown={onKeyDown}
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
