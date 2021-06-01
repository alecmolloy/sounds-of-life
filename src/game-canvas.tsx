import * as React from 'react'
import { bresenhamLine } from './bresenham-line'
import { GOL } from './game-of-life'
import {
  CanvasMode,
  getRenderSize,
  modeIsDrawing,
  modeIsSelecting as modeIsSelection,
  Point,
  roundToHaypixel,
  Selection2D,
  selection2D,
} from './utils'

interface GameCanvasProps {
  cellSize: number
  setCellSize: React.Dispatch<React.SetStateAction<number>>
  offset: Float32Array
  setOffset: React.Dispatch<React.SetStateAction<Float32Array>>
  gameOfLifeRef: React.MutableRefObject<GOL | undefined>
  mode: CanvasMode
  setMode: React.Dispatch<React.SetStateAction<CanvasMode>>
  selection: Selection2D | null
  setSelection: React.Dispatch<React.SetStateAction<Selection2D | null>>
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
      case 'selection-default':
      case 'selection-selecting': {
        newMode = 'drawing-default'
        break
      }
    }
  }
  setMode(newMode)
  return newMode
}

export const GameCanvas = React.forwardRef<HTMLCanvasElement, GameCanvasProps>(
  (
    {
      cellSize,
      setCellSize,
      offset,
      setOffset,
      gameOfLifeRef,
      mode,
      setMode,
      selection,
      setSelection,
    },
    ref,
  ) => {
    const viewportCellLeft = offset[0]
    const viewportCellTop = offset[1]

    const scrollTimeoutID = React.useRef<number | null>(null)
    const zoomTimeoutID = React.useRef<number | null>(null)

    const [canvasDrawingSize, setCanvasDrawingSize] = React.useState(
      getRenderSize(),
    )
    const [canvasStyleSize, setCanvasStyleSize] = React.useState([
      window.innerWidth,
      window.innerHeight,
    ])

    const [lastDraggedFramePosition, setLastDraggedFramePosition] =
      React.useState<Point | null>(null)
    const [mouseX, setMouseX] = React.useState<number | null>(null)
    const [mouseY, setMouseY] = React.useState<number | null>(null)

    const onResize = React.useCallback(() => {
      const [newRenderWidth, newRenderHeight] = getRenderSize()
      setCanvasDrawingSize([newRenderWidth, newRenderHeight])
      setCanvasStyleSize([window.innerWidth, window.innerHeight])
      if (gameOfLifeRef.current != null) {
        gameOfLifeRef.current.viewSize = new Float32Array([
          newRenderWidth,
          newRenderHeight,
        ])
      }
    }, [gameOfLifeRef])

    React.useEffect(() => {
      onResize()
      window.addEventListener('resize', onResize)
      return () => window.removeEventListener('resize', onResize)
    }, [onResize])

    const onMouseDown = React.useCallback(
      (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (gameOfLifeRef.current != null) {
          const x = Math.floor(e.clientX / cellSize + viewportCellLeft)
          const y = Math.floor(e.clientY / cellSize + viewportCellTop)

          const currentValue = gameOfLifeRef.current.getCell(x, y)
          const newMode = getAndSetNewMode(mode, setMode, e)
          switch (newMode) {
            case 'drawing-default': {
              const newValue = !currentValue
              setMode(newValue ? 'drawing-insert-cell' : 'drawing-erase')
              break
            }
            case 'selection-default': {
              setMode('selection-selecting')
              setSelection(selection2D(x, y, x + 1, y + 1, x, y))
              break
            }
            default: {
              console.error(newMode)
            }
          }
          setLastDraggedFramePosition({ x, y })
        }
      },
      [
        mode,
        cellSize,
        viewportCellLeft,
        viewportCellTop,
        gameOfLifeRef,
        setMode,
        setSelection,
      ],
    )

    const onMouseMove = React.useCallback(
      (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (gameOfLifeRef.current != null) {
          const x = Math.floor(e.clientX / cellSize + viewportCellLeft)
          const y = Math.floor(e.clientY / cellSize + viewportCellTop)

          // TODO: support haypixels
          setMouseX(x)
          setMouseY(y)
          const newMode = getAndSetNewMode(mode, setMode, e)
          console.log(newMode)
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
                  gameOfLifeRef.current,
                )
              } else {
                gameOfLifeRef.current.setCell(x, y, newValue)
              }
              setLastDraggedFramePosition({ x, y })
              break
            }
            case 'selection-selecting': {
              if (selection !== null) {
                const { newLeft, newRight } = (() => {
                  if (x > selection.originX) {
                    return { newLeft: selection.originX, newRight: x }
                  } else {
                    return { newLeft: x, newRight: selection.originX + 1 }
                  }
                })()
                const { newTop, newBottom } = (() => {
                  if (y > selection.originY) {
                    return { newTop: selection.originY, newBottom: y }
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
        }
      },
      [
        mode,
        lastDraggedFramePosition,
        cellSize,
        viewportCellLeft,
        viewportCellTop,
        gameOfLifeRef,
        setSelection,
      ],
    )

    const onMouseUp = React.useCallback(() => {
      if (modeIsDrawing(mode)) {
        setMode('drawing-default')
      } else if (modeIsSelection(mode)) {
        setMode('selection-default')
      } else {
        const fallthrough: never = mode
      }
    }, [])

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

    React.useEffect(() => {
      if (typeof ref === 'object' && ref?.current != null) {
        gameOfLifeRef.current = new GOL(
          ref.current,
          cellSize,
          ...getRenderSize(),
        )
      }
    }, [])

    return (
      <>
        <canvas
          ref={ref}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          style={{
            cursor: modeIsDrawing(mode) ? 'crosshair' : 'cell',
            width: canvasStyleSize[0],
            height: canvasStyleSize[1],
          }}
          width={canvasDrawingSize[0]}
          height={canvasDrawingSize[1]}
        />
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
        {selection != null ? (
          <div
            style={{
              width: selection.width() * cellSize + 1,
              height: selection.height() * cellSize + 1,
              left: (-viewportCellLeft + selection.left) * cellSize,
              top: (-viewportCellTop + selection.top) * cellSize,
              pointerEvents: 'none',
              backgroundColor: '#0f02',
              boxShadow: '0 0 0 0.5px #0f06 inset',
              position: 'absolute',
              boxSizing: 'border-box',
            }}
          />
        ) : null}
      </>
    )
  },
)
