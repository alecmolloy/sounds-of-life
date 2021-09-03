import React from 'react'
import Recoil from 'recoil'
import { bresenhamLine } from './bresenham-line'
import { CanvasId } from './game-of-life'
import { parseRLEAndUpdateBoard } from './rle-parser'
import { printRLE } from './rle-printer'
import {
  boardSizeState,
  cellSizeState,
  countState,
  fpsState,
  liveState,
  modeState,
  offsetState,
  selectionState,
  showControlsState,
} from './state'
import {
  GestureEvent,
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
    getBoardSection,
    setEmpty,
    children,
  }) => {
    const scrollTimeoutID = React.useRef<number | null>(null)
    const zoomTimeoutID = React.useRef<number | null>(null)
    const cellSizeAtGestureStart = React.useRef<number | null>(null)

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

    const onKeyDown = React.useCallback(
      (e: React.KeyboardEvent) => {
        switch (e.code) {
          case 'KeyM':
          case 'KeyV': {
            setMode('selection-default')
            break
          }
          case 'KeyP': {
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
              const newCellSize = calculateNearestCellSizeStep(cellSize)
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
            } else {
              setFps((fps) => Math.min(maxFps, Math.round(fps / 1.1)))
            }
            break
          }
          case 'Minus': {
            if (e.metaKey) {
              e.preventDefault()
              const newCellSize = Math.max(MinZoom, cellSize / 1.1)
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
          case 'Escape': {
            setSelection(null)
            break
          }
        }
      },
      [
        cellSize,
        live,
        runGeneration,
        setCellSize,
        setCount,
        setEmpty,
        setFps,
        setLive,
        setMode,
        setOffset,
        setSelection,
        setShowControls,
      ],
    )

    const onMouseDown = React.useCallback(
      (e: React.MouseEvent<HTMLElement>) => {
        if (e.target instanceof HTMLElement && e.target.id === CanvasId) {
          const x = Math.floor(e.clientX / cellSize + offset[0])
          const y = Math.floor(e.clientY / cellSize + offset[1])

          const currentValue = getCell(x, y)
          switch (mode) {
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
              console.error(mode)
            }
          }
          setLastDraggedFramePosition({ x, y })
        }
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
        switch (mode) {
          case 'drawing-default':
          case 'selection-default': {
            break
          }
          case 'drawing-erase':
          case 'drawing-insert-cell': {
            const newValue = mode === 'drawing-insert-cell'
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
            const _exhaustiveCheck: never = mode
            throw new Error(`${_exhaustiveCheck} not accounted for`)
          }
        }
      },
      [
        cellSize,
        offset,
        mode,
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
    const setOffsetAndSnappingZoom = React.useCallback(
      (newCellSize: number, clientX: number, clientY: number) => {
        setOffset((v) =>
          calculateOffsetForZoom(clientX, clientY, v, cellSize, newCellSize),
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
              clientX,
              clientY,
              v,
              newCellSize,
              targetNewCellSize,
            ),
          )
        }, 500)
      },
      [cellSize, setCellSize, setOffset],
    )

    const onWheel = React.useCallback(
      (e: WheelEvent) => {
        e.preventDefault()
        if (e.ctrlKey) {
          const newCellSize = Math.min(
            MaxZoom,
            Math.max(MinZoom, cellSize + (cellSize * -e.deltaY) / 100),
          )
          setOffsetAndSnappingZoom(newCellSize, e.clientX, e.clientY)
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
      [cellSize, setOffsetAndSnappingZoom, setOffset],
    )
    const onGestureStart = React.useCallback(
      (e: GestureEvent) => {
        e.preventDefault()
        cellSizeAtGestureStart.current = cellSize
      },
      [cellSize],
    ) as (e: Event) => void

    const onGestureChange = React.useCallback(
      (e: GestureEvent) => {
        e.preventDefault()
        if (cellSizeAtGestureStart.current != null) {
          const newCellSize = Math.min(
            MaxZoom,
            Math.max(MinZoom, cellSizeAtGestureStart.current * e.scale),
          )
          setOffsetAndSnappingZoom(newCellSize, e.clientX, e.clientY)
        }
      },
      [setOffsetAndSnappingZoom],
    ) as (e: Event) => void

    const onGestureEnd = React.useCallback((e: GestureEvent) => {
      e.preventDefault()
      cellSizeAtGestureStart.current = null
    }, []) as (e: Event) => void

    React.useEffect(() => {
      document.addEventListener('wheel', onWheel, {
        passive: false,
      })
      if (window.GestureEvent != null) {
        document.addEventListener('gesturestart', onGestureStart)
        document.addEventListener('gesturechange', onGestureChange)
        document.addEventListener('gestureend', onGestureEnd)
      }
      return () => {
        document.removeEventListener('wheel', onWheel)
        if (window.GestureEvent != null) {
          document.removeEventListener('gesturestart', onGestureStart)
          document.removeEventListener('gesturechange', onGestureChange)
          document.removeEventListener('gestureend', onGestureEnd)
        }
      }
    }, [onWheel, onGestureChange, onGestureStart, onGestureEnd])

    const onPaste = React.useCallback(
      () =>
        window.navigator.clipboard
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
        window.navigator.clipboard.writeText(
          printRLE(getBoardSection(x, y, width, height), width, height, 0, 0),
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

export function calculateOffsetForZoom(
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

export const MaxZoom = 25
export const MinZoom = 0.5

const ZoomSteps: Array<number> = [
  0.5, 1, 1.5, 2, 3, 5, 10, 15, 20, 25, 30, 40, 50,
]

function calculateNearestCellSizeStep(cellSize: number): number {
  return ZoomSteps[
    Math.min(
      ZoomSteps.length - 1,
      ZoomSteps.reduceRight(
        (
          working: [workingDistance: number, index: number],
          current,
          i,
        ): [workingDistance: number, index: number] => {
          const distance = Math.abs(cellSize - current)
          if (working[0] > distance) {
            return [distance, i]
          } else {
            return working
          }
        },
        [Infinity, Infinity],
      )[1] + 1,
    )
  ]
}
