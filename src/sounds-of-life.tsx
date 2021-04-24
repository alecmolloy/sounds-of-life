import { useInterval } from 'beautiful-react-hooks'
import * as React from 'react'
import Dropzone from 'react-dropzone'
import { Helmet } from 'react-helmet'
import { Controls } from './controls'
import { GameCanvas } from './game-canvas'
import { GOL } from './game-of-life'
import { KeyboardShortcuts } from './keyboard-shortcuts'
import { setBoardFromRLE } from './rle-handling'

// TODO: re-enable setting via RLE
// TODO: don't floor values for when cellSize is less than 1.0
// TODO: support more RLE features, like board positioning
// TODO: if RLE parsing is unsuccessful, make it fail gracefully

export const SoundsOfLife = () => {
  const gameOfLifeRef = React.useRef<GOL>()
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  const [count, setCount] = React.useState(0)
  const [live, setLive] = React.useState(false)
  const [speed, setSpeed] = React.useState(200)
  const [offset, setReactOffset] = React.useState(
    new Float32Array([0, 0]),
  )
  const [cellSize, setReactCellSize] = React.useState(10)
  const [showControls, setShowControls] = React.useState(true)

  const step = React.useCallback(() => {
    gameOfLifeRef.current?.step()
  }, [])

  useInterval(() => {
    if (live) {
      step()
    }
  }, speed)

  const animate = React.useCallback(() => {
    gameOfLifeRef.current?.render()
    window.requestAnimationFrame(animate)
  }, [gameOfLifeRef])

  React.useEffect(() => {
    window.requestAnimationFrame(animate)
  }, [])

  React.useEffect(() => {
    if (gameOfLifeRef.current != null) {
      gameOfLifeRef.current.offset = offset
    }
  }, [offset])

  const setCellSize = React.useCallback(
    (setStateAction: React.SetStateAction<number>) => {
      setReactCellSize((oldV) => {
        const newValue =
          typeof setStateAction === 'function'
            ? setStateAction(oldV)
            : setStateAction
        if (gameOfLifeRef.current != null) {
          gameOfLifeRef.current.cellSize = newValue
        }
        return newValue
      })
    },
    [],
  )

  const setOffset = React.useCallback(
    (setStateAction: React.SetStateAction<Float32Array>) => {
      setReactOffset((oldV) => {
        const newValue =
          typeof setStateAction === 'function'
            ? setStateAction(oldV)
            : setStateAction
        if (gameOfLifeRef.current != null) {
          gameOfLifeRef.current.offset = newValue
        }
        return newValue
      })
    },
    [],
  )

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
              if (gameOfLifeRef.current != null) {
                const parsedBoard = setBoardFromRLE(
                  text,
                  gameOfLifeRef.current,
                )
                if (parsedBoard != null) {
                  // setGrid(parsedBoard)
                }
              }
            })
          }
        }}
      >
        {({ getRootProps }) => (
          <div {...getRootProps()} style={{ outline: 'none' }}>
            <KeyboardShortcuts
              live={live}
              runGeneration={step}
              setLive={setLive}
              setCount={setCount}
              setCellSize={setCellSize}
              setSpeed={setSpeed}
              setOffset={setReactOffset}
              setShowControls={setShowControls}
            >
              <GameCanvas
                ref={canvasRef}
                gameOfLifeRef={gameOfLifeRef}
                offset={offset}
                setOffset={setOffset}
                cellSize={cellSize}
                setCellSize={setCellSize}
              />
            </KeyboardShortcuts>
            <Controls
              offset={offset}
              showControls={showControls}
              setShowControls={setShowControls}
              count={count}
              runGeneration={step}
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
