import { useInterval } from 'beautiful-react-hooks'
import * as React from 'react'
import Dropzone from 'react-dropzone'
import { Helmet } from 'react-helmet'
import { Controls } from './controls'
import { GameCanvas } from './game-canvas'
import { generate, Grid } from './game-of-life'
import { emptyGrid } from './gol-utils'
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
  const [originX, setOriginX] = React.useState(0)
  const [originY, setOriginY] = React.useState(0)
  const [zoomLevel, setZoomLevel] = React.useState(10)
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
          runGeneration()
          break
        }
        case 'KeyR': {
          setGrid(emptyGrid)
          break
        }
        case 'Space': {
          setLive((v) => !v)
          break
        }
        case 'Equal': {
          if (e.metaKey) {
            e.preventDefault()
            setZoomLevel((v) => v * 1.1)
          } else {
            setSpeed((speed) => Math.round(speed / 1.1))
          }
          break
        }
        case 'Minus': {
          if (e.metaKey) {
            e.preventDefault()
            setZoomLevel((v) => Math.max(1, v / 1.1))
          } else {
            setSpeed((speed) => Math.round(speed * 1.1))
          }
          break
        }
        case 'Digit0':
        case 'Digit1': {
          if (e.metaKey) {
            setZoomLevel(10)
            setOriginX(0)
            setOriginY(0)
          }
          break
        }
      }
    },
    [runGeneration],
  )

  const onWheel = React.useCallback((e: WheelEvent) => {
    e.preventDefault()
    if (e.ctrlKey) {
      setZoomLevel((v) => Math.max(0.5, v - e.deltaY * 0.1))
    } else {
      setOriginX((v) => v + e.deltaX * 2)
      setOriginY((v) => v + e.deltaY * 2)
    }
  }, [])

  React.useEffect(() => {
    document.body.addEventListener('wheel', onWheel, {
      passive: false,
    })

    return () => {
      document.body.removeEventListener('wheel', onWheel)
    }
  }, [onWheel])

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
              originX={originX}
              originY={originY}
              zoomLevel={zoomLevel}
              setZoomLevel={setZoomLevel}
              grid={grid}
              setGrid={setGrid}
            />
            <Controls
              originX={originX}
              originY={originY}
              showControls={showControls}
              setShowControls={setShowControls}
              count={count}
              runGeneration={runGeneration}
              setGrid={setGrid}
              live={live}
              setLive={setLive}
              speed={speed}
              setSpeed={setSpeed}
              zoomLevel={zoomLevel}
              setZoomLevel={setZoomLevel}
            />
          </div>
        )}
      </Dropzone>
    </>
  )
}
