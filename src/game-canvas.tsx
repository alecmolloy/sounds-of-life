import P5 from 'p5'
import * as React from 'react'
import Sketch, { SketchProps } from 'react-p5'
import { bresenhamLine } from './bresenham-line'
import { Grid } from './game-of-life'
import { setDeeply } from './gol-utils'
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

export const GameCanvas = ({
  grid,
  setGrid,
  cellSize,
  setCellSize,
  offsetX,
  setOffsetX,
  offsetY,
  setOffsetY,
}: GameCanvasProps) => {
  const { innerWidth, innerHeight } = window
  const hayWidth = innerWidth / 2
  const hayHeight = innerHeight / 2

  const viewportLeft = (offsetX * cellSize) / cellSize
  const viewportTop = (offsetY * cellSize) / cellSize
  const viewportBottom = innerHeight + viewportTop
  const viewportRight = innerWidth + viewportLeft

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
    p5.strokeWeight(1)

    p5.stroke(50)
    if (cellSize > 15) {
      for (
        let x = -((viewportLeft * cellSize) % cellSize);
        x < innerWidth;
        x += cellSize
      ) {
        p5.line(x, 0, x, innerHeight)
      }
      for (
        let y = -((viewportTop * cellSize) % cellSize);
        y < innerHeight;
        y += cellSize
      ) {
        p5.line(0, y, innerWidth, y)
      }
    }

    const originOffset = cellSize > 4 ? 0.5 : 0
    const sizeOffset = cellSize > 4 ? -1 : 0

    p5.fill(255)
    p5.strokeWeight(0)
    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          if (
            x + 1 > viewportLeft &&
            x < viewportRight &&
            y + 1 > viewportTop &&
            y < viewportBottom
          ) {
            p5.rect(
              (x - viewportLeft) * cellSize + originOffset,
              (y - viewportTop) * cellSize + originOffset,
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
      setMouseX(Math.floor(e.mouseX / cellSize + viewportLeft))
      setMouseY(Math.floor(e.mouseY / cellSize + viewportTop))
    },
    [cellSize, viewportTop, viewportLeft],
  )

  const mousePressedOrDragged = React.useCallback(
    (e: any) => {
      const xIndex = Math.floor(e.mouseX / cellSize + viewportLeft)
      const yIndex = Math.floor(e.mouseY / cellSize + viewportTop)

      const currentValue = !!grid.getIn([yIndex, xIndex])
      if (drawMode === 'not-drawing') {
        const newValue = !currentValue
        setDrawMode(newValue ? 'insert-cell' : 'erase')
        setGrid(setDeeply(xIndex, yIndex, newValue, grid))
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
          setGrid(setDeeply(xIndex, yIndex, newValue, grid))
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
      viewportLeft,
      viewportTop,
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
