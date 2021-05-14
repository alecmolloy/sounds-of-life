import { useInterval } from 'beautiful-react-hooks'
import * as React from 'react'
import Dropzone from 'react-dropzone'
import { Helmet } from 'react-helmet'
import { Controls } from './controls'
import { GameCanvas } from './game-canvas'
import { GOL, GridShowState } from './game-of-life'
import { KeyboardShortcuts } from './keyboard-shortcuts'
import { parseRLEAndUpdateBoard } from './rle-handling'

// TODO: maybe allow users to change size of board, check to see if it is lossy
// TODO: change board size if RLE is too big, warn users
// TODO: a nice UI

export const SoundsOfLife = () => {
  const gameOfLifeRef = React.useRef<GOL>()
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  const [count, setCount] = React.useState(0)
  const [live, setLive] = React.useState(false)
  const [speed, setSpeed] = React.useState(200)
  const [offset, setReactOffset] = React.useState(new Float32Array([0, 0]))
  const [cellSize, setReactCellSize] = React.useState(10)
  const [showControls, setShowControls] = React.useState(true)
  const [showGrid, setReactShowGrid] = React.useState<GridShowState>(
    GridShowState.auto,
  )

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

  const setShowGrid = React.useCallback(
    (setStateAction: React.SetStateAction<GridShowState>) => {
      setReactShowGrid((oldV) => {
        const newValue =
          typeof setStateAction === 'function'
            ? setStateAction(oldV)
            : setStateAction
        if (gameOfLifeRef.current != null) {
          gameOfLifeRef.current.showGrid = newValue
        }
        return newValue
      })
    },
    [],
  )

  const onPaste = React.useCallback(
    (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text')
      if (gameOfLifeRef.current != null && text != null) {
        parseRLEAndUpdateBoard(text, gameOfLifeRef.current, setOffset)
      }
    },
    [setOffset],
  )

  React.useEffect(() => {
    window.addEventListener('paste', onPaste as any)
    return () => window.removeEventListener('paste', onPaste as any)
  })

  return (
    <>
      <Helmet>
        <style type='text/css'>
          {`
            body {
              margin: 0;
              overflow: hidden;
              background-color: black;
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
                parseRLEAndUpdateBoard(text, gameOfLifeRef.current, setOffset)
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
              setOffset={setOffset}
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
              showGrid={showGrid}
              setShowGrid={setShowGrid}
            />
          </div>
        )}
      </Dropzone>
    </>
  )
}
