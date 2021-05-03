import * as React from 'react'
import { bresenhamLine } from './bresenham-line'
import { GOL } from './game-of-life'
import { getRenderSize, Point, roundToHaypixel } from './utils'

type DrawMode = 'insert-cell' | 'erase' | 'not-drawing'

interface GameCanvasProps {
  cellSize: number
  setCellSize: React.Dispatch<React.SetStateAction<number>>
  offset: Float32Array
  setOffset: React.Dispatch<React.SetStateAction<Float32Array>>
  gameOfLifeRef: React.MutableRefObject<GOL | undefined>
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

export const GameCanvas = React.forwardRef<
  HTMLCanvasElement,
  GameCanvasProps
>(
  (
    { cellSize, setCellSize, offset, setOffset, gameOfLifeRef },
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

    const [
      lastDraggedFramePosition,
      setLastDraggedFramePosition,
    ] = React.useState<Point | null>(null)
    const [drawMode, setDrawMode] = React.useState<DrawMode>(
      'not-drawing',
    )
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
    }, [])

    React.useEffect(() => {
      onResize()
      window.addEventListener('resize', onResize)
      return () => window.removeEventListener('resize', onResize)
    }, [onResize])

    const onMouseDown = React.useCallback(
      (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (gameOfLifeRef.current != null) {
          const x = Math.floor(
            e.clientX / cellSize + viewportCellLeft,
          )
          const y = Math.floor(e.clientY / cellSize + viewportCellTop)

          const currentValue = gameOfLifeRef.current.getCell(x, y)
          if (drawMode === 'not-drawing') {
            const newValue = !currentValue
            setDrawMode(newValue ? 'insert-cell' : 'erase')
            gameOfLifeRef.current.setCell(x, y, newValue)
          }
          setLastDraggedFramePosition({ x: x, y: y })
        }
      },
      [
        drawMode,
        cellSize,
        viewportCellLeft,
        viewportCellTop,
        gameOfLifeRef,
      ],
    )

    const onMouseMove = React.useCallback(
      (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (gameOfLifeRef.current != null) {
          const x = Math.floor(
            e.clientX / cellSize + viewportCellLeft,
          )
          const y = Math.floor(e.clientY / cellSize + viewportCellTop)

          // TODO: support haypixels
          setMouseX(x)
          setMouseY(y)

          if (drawMode === 'erase' || drawMode === 'insert-cell') {
            const newValue = drawMode === 'insert-cell'
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
          }
        }
      },
      [
        drawMode,
        lastDraggedFramePosition,
        cellSize,
        viewportCellLeft,
        viewportCellTop,
        gameOfLifeRef,
      ],
    )

    const onMouseUp = React.useCallback(
      () => setDrawMode('not-drawing'),
      [],
    )

    const onWheel = React.useCallback(
      (e: WheelEvent) => {
        e.preventDefault()
        if (e.ctrlKey) {
          const newCellSize = Math.min(
            20,
            Math.max(0.5, cellSize + (cellSize * -e.deltaY) / 100),
          )
          setOffset((v) =>
            calculateOffsetForZoom(
              e.x,
              e.y,
              v,
              cellSize,
              newCellSize,
            ),
          )
          setCellSize(newCellSize)

          if (zoomTimeoutID.current != null) {
            clearTimeout(zoomTimeoutID.current)
          }
          zoomTimeoutID.current = setTimeout(() => {
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
          scrollTimeoutID.current = setTimeout(() => {
            setOffset(
              (v) =>
                new Float32Array([
                  roundToHaypixel(v[0] * cellSize, cellSize < 1) /
                    cellSize,
                  roundToHaypixel(v[1] * cellSize, cellSize < 1) /
                    cellSize,
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
            cursor: 'crosshair',
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
      </>
    )
  },
)
