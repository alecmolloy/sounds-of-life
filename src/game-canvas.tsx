import * as React from 'react'
import { bresenhamLine } from './bresenham-line'
import { GOL } from './game-of-life'
import { Point } from './utils'

type DrawMode = 'insert-cell' | 'erase' | 'not-drawing'

interface GameCanvasProps {
  cellSize: number
  setCellSize: React.Dispatch<React.SetStateAction<number>>
  offset: Float32Array
  setOffset: React.Dispatch<React.SetStateAction<Float32Array>>
  gameOfLifeRef: React.MutableRefObject<GOL | undefined>
}

export const GameCanvas = React.forwardRef<
  HTMLCanvasElement,
  GameCanvasProps
>(
  (
    { cellSize, setCellSize, offset, setOffset, gameOfLifeRef },
    ref,
  ) => {
    const {
      innerWidth: screenWidth,
      innerHeight: screenHeight,
    } = window
    const viewportCellWidth = screenWidth / cellSize
    const viewportCellHeight = screenHeight / cellSize

    const viewportCellLeft = offset[0]
    const viewportCellTop = offset[1]
    const viewportCellBottom = viewportCellHeight + viewportCellTop
    const viewportCellRight = viewportCellWidth + viewportCellLeft

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
      if (typeof ref === 'object' && ref?.current != null) {
        ref.current.width = window.innerWidth
        ref.current.height = window.innerHeight
      }
    }, [ref])

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
        screenHeight,
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

          const x = e.x / cellSize
          const y = e.y / cellSize

          const scaleFactor = newCellSize / cellSize
          setOffset(
            (v) =>
              new Float32Array([
                x - x / scaleFactor + v[0],
                y - y / scaleFactor + v[1],
              ]),
          )
          setCellSize(newCellSize)
        } else {
          setOffset(
            (v) =>
              new Float32Array([
                v[0] + e.deltaX / cellSize,
                v[1] + e.deltaY / cellSize,
              ]),
          )
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
        gameOfLifeRef.current = new GOL(ref.current, cellSize)
        gameOfLifeRef.current.render()
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
            backgroundColor: 'black',
          }}
        />
        {mouseX != null && mouseY != null ? (
          <div
            style={{
              userSelect: 'none',
              position: 'absolute',
              bottom: 0,
              right: 0,
              backgroundColor: 'black',
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
