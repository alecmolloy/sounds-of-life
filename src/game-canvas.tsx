import P5 from 'p5'
import * as React from 'react'
import Sketch, { SketchProps } from 'react-p5'
import { bresenhamLine } from './bresenham-line'
import { Grid } from './game-of-life'
import { getInGrid, setInGrid } from './gol-utils'
import { Point } from './utils'

type DrawMode = 'insert-cell' | 'erase' | 'not-drawing'

interface GameCanvasProps {
  grid: Grid
  setGrid: React.Dispatch<React.SetStateAction<Grid>>
  cellSize: number
  setCellSize: React.Dispatch<React.SetStateAction<number>>
  offsetX: number
  setOffsetX: React.Dispatch<React.SetStateAction<number>>
  offsetY: number
  setOffsetY: React.Dispatch<React.SetStateAction<number>>
}

export const GameCanvas: React.FunctionComponent<GameCanvasProps> = ({
  grid,
  setGrid,
  cellSize,
  setCellSize,
  offsetX,
  setOffsetX,
  offsetY,
  setOffsetY,
}) => {
  const {
    innerWidth: screenWidth,
    innerHeight: screenHeight,
  } = window
  const viewportCellWidth = screenWidth / cellSize
  const viewportCellHeight = screenHeight / cellSize

  const viewportCellLeft = offsetX
  const viewportCellTop = offsetY
  const viewportCellBottom = viewportCellHeight + viewportCellTop
  const viewportCellRight = viewportCellWidth + viewportCellLeft

  const ref = React.useRef<React.Component<SketchProps>>(null)

  const [
    lastDraggedFramePosition,
    setLastDraggedFramePosition,
  ] = React.useState<Point | null>(null)
  const [drawMode, setDrawMode] = React.useState<DrawMode>(
    'not-drawing',
  )
  const [mouseX, setMouseX] = React.useState<number | null>(null)
  const [mouseY, setMouseY] = React.useState<number | null>(null)

  const setup = React.useCallback(
    (p5: P5, canvasParentRef: Element) => {
      p5.createCanvas(window.innerWidth, window.innerHeight).parent(
        canvasParentRef,
      )
    },
    [],
  )

  const windowResize = React.useCallback((p5: P5) => {
    p5.resizeCanvas(window.innerWidth, window.innerHeight)
  }, [])

  const draw = (p5: P5) => {
    p5.background(0)

    p5.strokeWeight(0.5)
    const showGrid = cellSize >= 10
    if (showGrid) {
      for (
        let cellX = Math.floor(viewportCellLeft) + 1;
        cellX <= Math.floor(viewportCellRight) + 1;
        cellX++
      ) {
        const screenX = (cellX - viewportCellLeft) * cellSize
        p5.stroke(Math.floor(cellX) % 10 === 0 ? 75 : 50)
        p5.line(screenX - 0.25, 0, screenX - 0.25, screenHeight)
      }
      for (
        let cellY = Math.floor(viewportCellTop) + 1;
        cellY <= Math.floor(viewportCellBottom) + 1;
        cellY++
      ) {
        const screenY = (cellY - viewportCellTop) * cellSize
        p5.stroke(Math.floor(cellY) % 10 === 0 ? 75 : 50)
        p5.line(0, screenY - 0.25, screenWidth, screenY - 0.25)
      }
    }

    const originOffset = showGrid ? -0.5 : 0
    const sizeOffset = showGrid ? -0.5 : 0

    p5.fill(255)
    p5.strokeWeight(0)
    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          if (
            x + 1 > viewportCellLeft &&
            x < viewportCellRight &&
            y + 1 > viewportCellTop &&
            y < viewportCellBottom
          ) {
            p5.rect(
              (x - viewportCellLeft) * cellSize + originOffset,
              (y - viewportCellTop) * cellSize + originOffset,
              cellSize + sizeOffset,
              cellSize + sizeOffset,
            )
          }
        }
      })
    })
  }

  // TODO: support haypixels
  const mouseMoved = React.useCallback(
    (e: any) => {
      setMouseX(Math.floor(e.mouseX / cellSize + viewportCellLeft))
      setMouseY(Math.floor(e.mouseY / cellSize + viewportCellTop))
    },
    [cellSize, viewportCellTop, viewportCellLeft],
  )

  const mousePressedOrDragged = React.useCallback(
    (e: any) => {
      const xIndex = Math.floor(
        e.mouseX / cellSize + viewportCellLeft,
      )
      const yIndex = Math.floor(e.mouseY / cellSize + viewportCellTop)

      const currentValue = getInGrid(xIndex, yIndex, grid)
      if (drawMode === 'not-drawing') {
        const newValue = !currentValue
        setDrawMode(newValue ? 'insert-cell' : 'erase')
        setGrid(setInGrid(xIndex, yIndex, newValue, grid))
      } else {
        const newValue = drawMode === 'insert-cell'
        if (lastDraggedFramePosition != null) {
          setGrid(
            bresenhamLine(
              lastDraggedFramePosition.x,
              lastDraggedFramePosition.y,
              xIndex,
              yIndex,
              newValue,
              grid,
            ),
          )
        } else {
          setGrid(setInGrid(xIndex, yIndex, newValue, grid))
        }
      }
      setLastDraggedFramePosition({ x: xIndex, y: yIndex })
    },
    [
      drawMode,
      grid,
      setGrid,
      cellSize,
      lastDraggedFramePosition,
      viewportCellLeft,
      viewportCellTop,
    ],
  )

  const mouseReleased = React.useCallback(
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
        setOffsetX((v) => x - x / scaleFactor + v)
        setOffsetY((v) => y - y / scaleFactor + v)
        setCellSize(newCellSize)
      } else {
        setOffsetX((v) => v + e.deltaX / cellSize)
        setOffsetY((v) => v + e.deltaY / cellSize)
      }
    },
    [setCellSize, setOffsetX, setOffsetY, cellSize],
  )

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
      <Sketch
        ref={ref}
        className='gol-grid'
        setup={setup}
        draw={draw}
        mouseMoved={mouseMoved}
        mousePressed={mousePressedOrDragged}
        mouseDragged={mousePressedOrDragged}
        mouseReleased={mouseReleased}
        windowResized={windowResize}
        style={{
          cursor: 'crosshair',
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
}
