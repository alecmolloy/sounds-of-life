import React from 'react'
import Recoil from 'recoil'
import { bresenhamLine } from './bresenham-line'
import { parseRLEAndUpdateBoard } from './rle-parser'
import { rlePrinter } from './rle-printer'
import {
  boardSizeState,
  cellSizeState,
  countState,
  liveState,
  modeState,
  offsetState,
  selectionState,
  showControlsState,
  fpsState,
} from './state'
import {
  CanvasMode,
  maxFps,
  modeIsDrawing,
  modeIsSelecting,
  Point,
  roundToHaypixel,
  selection2D,
} from './utils'

interface KeyboardShortcutsProps {
  runGeneration: () => void
  setBoardState: (state: Uint8Array) => void
  getCell: (x: number, y: number) => boolean
  setCell: (x: number, y: number, newValue: boolean) => void
  getBoard: () => Uint8Array
  getBoardSection: (
    x: number,
    y: number,
    width: number,
    height: number,
  ) => Uint8Array
  setEmpty: () => void
}

export const CanvasInteractions: React.FunctionComponent<KeyboardShortcutsProps> =
  ({
    runGeneration,
    setBoardState,
    getCell,
    setCell,
    getBoard,
    getBoardSection,
    setEmpty,
    children,
  }) => {
    const scrollTimeoutID = React.useRef<number | null>(null)
    const zoomTimeoutID = React.useRef<number | null>(null)

    const [cellSize, setCellSize] = Recoil.useRecoilState(cellSizeState)
    const [offset, setOffset] = Recoil.useRecoilState(offsetState)
    const [mode, setMode] = Recoil.useRecoilState(modeState)
    const [selection, setSelection] = Recoil.useRecoilState(selectionState)
    const [live, setLive] = Recoil.useRecoilState(liveState)
    const setShowControls = Recoil.useSetRecoilState(showControlsState)
    const setCount = Recoil.useSetRecoilState(countState)
    const setFps = Recoil.useSetRecoilState(fpsState)

    const [lastDraggedFramePosition, setLastDraggedFramePosition] =
      React.useState<Point | null>(null)
    const [mouseX, setMouseX] = React.useState<number | null>(null)
    const [mouseY, setMouseY] = React.useState<number | null>(null)

    const boardSize = Recoil.useRecoilValue(boardSizeState)

    const onKeyDown = (e: React.KeyboardEvent) => {
      switch (e.code) {
        case 'MetaLeft':
        case 'MetaRight':
        case 'ControlLeft':
        case 'ControlRight': {
          setMode('drawing-default')
          break
        }
        case 'KeyC': {
          if (!e.metaKey && !e.ctrlKey) {
            setShowControls((v) => !v)
          }
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
          setEmpty()
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
            setFps((fps) => Math.min(maxFps, Math.round(fps / 1.1)))
          }
          break
        }
        case 'Minus': {
          if (e.metaKey) {
            e.preventDefault()
            setCellSize((v) => Math.max(1, v / 1.1))
          } else {
            setFps((fps) => Math.min(maxFps, Math.round(fps * 1.1)))
          }
          break
        }
        case 'Digit0':
        case 'Digit1': {
          if (e.metaKey) {
            setCellSize(10)
            setOffset(new Float32Array([0, 0]))
          }
          break
        }
      }
    }
    const onKeyUp = (e: React.KeyboardEvent) => {
      switch (e.code) {
        case 'MetaLeft':
        case 'MetaRight':
        case 'ControlLeft':
        case 'ControlRight': {
          setMode('selection-default')
          break
        }
        case 'Escape': {
          setSelection(null)
          break
        }
      }
    }

    const onMouseDown = React.useCallback(
      (e: React.MouseEvent<HTMLElement>) => {
        const x = Math.floor(e.clientX / cellSize + offset[0])
        const y = Math.floor(e.clientY / cellSize + offset[1])

        const currentValue = getCell(x, y)
        const newMode = getAndSetNewMode(mode, setMode, e)
        switch (newMode) {
          case 'drawing-default': {
            const newValue = !currentValue
            setMode(newValue ? 'drawing-insert-cell' : 'drawing-erase')
            break
          }
          case 'selection-default': {
            setSelection(selection2D(x, y, x + 1, y + 1, x, y))
            setMode('selection-selecting')
            break
          }
          default: {
            console.error(newMode)
          }
        }
        setLastDraggedFramePosition({ x, y })
      },
      [cellSize, offset, getCell, mode, setMode, setSelection],
    )

    const onMouseMove = React.useCallback(
      (e: React.MouseEvent<HTMLElement>) => {
        const x = Math.floor(e.clientX / cellSize + offset[0])
        const y = Math.floor(e.clientY / cellSize + offset[1])

        // TODO: support haypixels
        setMouseX(x)
        setMouseY(y)
        const newMode = getAndSetNewMode(mode, setMode, e)
        switch (newMode) {
          case 'drawing-default':
          case 'selection-default': {
            break
          }
          case 'drawing-erase':
          case 'drawing-insert-cell': {
            const newValue = newMode === 'drawing-insert-cell'
            if (lastDraggedFramePosition != null) {
              bresenhamLine(
                lastDraggedFramePosition.x,
                lastDraggedFramePosition.y,
                x,
                y,
                newValue,
                setCell,
              )
            } else {
              setCell(x, y, newValue)
            }
            setLastDraggedFramePosition({ x, y })
            break
          }
          case 'selection-selecting': {
            if (selection !== null) {
              const { newLeft, newRight } = (() => {
                if (x > selection.originX) {
                  return { newLeft: selection.originX, newRight: x + 1 }
                } else {
                  return { newLeft: x, newRight: selection.originX + 1 }
                }
              })()
              const { newTop, newBottom } = (() => {
                if (y > selection.originY) {
                  return { newTop: selection.originY, newBottom: y + 1 }
                } else {
                  return { newTop: y, newBottom: selection.originY + 1 }
                }
              })()
              setSelection(
                selection2D(
                  newLeft,
                  newTop,
                  newRight,
                  newBottom,
                  selection.originX,
                  selection.originY,
                ),
              )
            } else {
              throw new Error('Selection not set')
            }
            break
          }
          default: {
            const _exhaustiveCheck: never = newMode
            throw new Error(`${_exhaustiveCheck} not accounted for`)
          }
        }
      },
      [
        cellSize,
        offset,
        mode,
        setMode,
        lastDraggedFramePosition,
        setCell,
        selection,
        setSelection,
      ],
    )

    const onMouseUp = React.useCallback(() => {
      if (modeIsDrawing(mode)) {
        setMode('drawing-default')
      } else if (modeIsSelecting(mode)) {
        setMode('selection-default')
      }
    }, [mode, setMode])

    const onWheel = React.useCallback(
      (e: WheelEvent) => {
        e.preventDefault()
        if (e.ctrlKey) {
          const newCellSize = Math.min(
            20,
            Math.max(0.5, cellSize + (cellSize * -e.deltaY) / 100),
          )
          setOffset((v) =>
            calculateOffsetForZoom(e.x, e.y, v, cellSize, newCellSize),
          )
          setCellSize(newCellSize)

          if (zoomTimeoutID.current != null) {
            clearTimeout(zoomTimeoutID.current)
          }
          zoomTimeoutID.current = window.setTimeout(() => {
            const targetNewCellSize = roundToHaypixel(
              newCellSize,
              newCellSize > 1,
            )
            setCellSize(targetNewCellSize)
            setOffset((v) =>
              calculateOffsetForZoom(
                e.x,
                e.y,
                v,
                newCellSize,
                targetNewCellSize,
              ),
            )
          }, 500)
        } else {
          setOffset(
            (v) =>
              new Float32Array([
                v[0] + e.deltaX / cellSize,
                v[1] + e.deltaY / cellSize,
              ]),
          )

          if (scrollTimeoutID.current != null) {
            clearTimeout(scrollTimeoutID.current)
          }
          scrollTimeoutID.current = window.setTimeout(() => {
            setOffset(
              (v) =>
                new Float32Array([
                  roundToHaypixel(v[0] * cellSize, cellSize < 1) / cellSize,
                  roundToHaypixel(v[1] * cellSize, cellSize < 1) / cellSize,
                ]),
            )
          }, 500)
        }
      },
      [setCellSize, setOffset, cellSize],
    )

    React.useEffect(() => {
      document.body.addEventListener('wheel', onWheel, {
        passive: false,
      })

      return () => {
        document.body.removeEventListener('wheel', onWheel)
      }
    }, [onWheel])

    const onPaste = React.useCallback(
      () =>
        navigator.clipboard
          .readText()
          .then((clipboardText) =>
            parseRLEAndUpdateBoard(
              clipboardText,
              setBoardState,
              setOffset,
              boardSize,
            ),
          ),
      [setBoardState, setOffset, boardSize],
    )
    React.useEffect(() => {
      window.addEventListener('paste', onPaste)
      return () => window.removeEventListener('paste', onPaste)
    }, [onPaste])

    const onCopy = React.useCallback(() => {
      if (selection != null) {
        const x = selection.left
        const y = selection.top
        const width = selection.width()
        const height = selection.height()
        navigator.clipboard.writeText(
          rlePrinter(getBoardSection(x, y, width, height), width, height, 0, 0),
        )
      }
    }, [getBoardSection, selection])
    React.useEffect(() => {
      window.addEventListener('copy', onCopy)
      return () => window.removeEventListener('copy', onCopy)
    }, [onCopy])

    return (
      <div
        tabIndex={0}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        style={{ outline: 'none' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      >
        {mouseX != null && mouseY != null ? (
          <div
            style={{
              userSelect: 'none',
              position: 'absolute',
              bottom: 0,
              right: 0,
              color: 'white',
              fontFamily: 'monospace',
              fontSize: 10,
              padding: 2,
            }}
          >
            ({mouseX}, {mouseY})
          </div>
        ) : null}
        {children}
      </div>
    )
  }

function getAndSetNewMode(
  mode: CanvasMode,
  setMode: React.Dispatch<React.SetStateAction<CanvasMode>>,
  e: React.MouseEvent,
): CanvasMode {
  let newMode: CanvasMode = mode
  if (e.metaKey || e.ctrlKey) {
    switch (mode) {
      case 'selection-selecting': {
        newMode = 'drawing-insert-cell'
        break
      }
      case 'selection-default': {
        newMode = 'drawing-default'
        break
      }
    }
  }
  setMode(newMode)
  return newMode
}

function calculateOffsetForZoom(
  mouseX: number,
  mouseY: number,
  oldOffset: Float32Array,
  oldCellSize: number,
  newCellSize: number,
): Float32Array {
  const x = mouseX / oldCellSize
  const y = mouseY / oldCellSize
  const scaleFactor = newCellSize / oldCellSize
  return new Float32Array([
    x - x / scaleFactor + oldOffset[0],
    y - y / scaleFactor + oldOffset[1],
  ])
}
