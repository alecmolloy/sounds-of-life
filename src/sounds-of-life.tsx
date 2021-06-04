import { useInterval } from 'beautiful-react-hooks'
import * as React from 'react'
import Dropzone from 'react-dropzone'
import { Helmet } from 'react-helmet'
import Recoil from 'recoil'
import { Controls } from './controls'
import { GameCanvas } from './game-canvas'
import { GOL, GridShowState } from './game-of-life'
import { KeyboardShortcuts } from './keyboard-shortcuts'
import { parseRLEAndUpdateBoard } from './rle-handling'
import {
  cellSizeState,
  countState,
  liveState,
  modeState,
  offsetState,
  showControlsState,
  showGridState,
  speedState,
} from './state'

// TODO: rethink the whole state bridge between react and GOL, can this be done somehow?
// maybe turn the GOL component into a react component?

// TODO: fix selection so it turns off when drawing + make sure mousedown works properly with "newMode"
// TODO: maybe allow users to change size of board, check to see if it is lossy
// TODO: change board size if RLE is too big, warn users
// TODO: a nice UI
// TODO: fix pinch to zoom on safari: https://dev.to/danburzo/pinch-me-i-m-zooming-gestures-in-the-dom-a0e
// TODO: figure out why chrome goes @1x suddenly while resizing or after swapping windows

export const SoundsOfLife = () => {
  const gameOfLifeRef = React.useRef<GOL>()
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  const live = Recoil.useRecoilValue(liveState)
  const speed = Recoil.useRecoilValue(speedState)
  const setReactOffset = Recoil.useSetRecoilState(offsetState)
  const setRecoilCellSize = Recoil.useSetRecoilState(cellSizeState)
  Recoil.useRecoilState(showControlsState)
  const setRecoilShowGrid = Recoil.useSetRecoilState(showGridState)

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
      setRecoilCellSize((oldV) => {
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
      setRecoilShowGrid((oldV) => {
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
            <KeyboardShortcuts live={live} runGeneration={step}>
              <GameCanvas ref={canvasRef} gameOfLifeRef={gameOfLifeRef} />
            </KeyboardShortcuts>
            <Controls runGeneration={step} />
          </div>
        )}
      </Dropzone>
    </>
  )
}
