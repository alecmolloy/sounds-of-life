import Sketch from 'react-p5'
import * as P5 from 'p5'
import * as React from 'react'
import { Grid } from './game-of-life'

type DrawMode = 'insert-cell' | 'erase' | 'not-drawing'

interface GameCanvasProps {
  width: number
  height: number
  grid: Grid
  setGrid: React.Dispatch<React.SetStateAction<Grid>>
  cellSize: number
}

export const GameCanvas = ({
  width,
  height,
  grid,
  setGrid,
  cellSize,
}: GameCanvasProps) => {
  const canvasWidth = width * cellSize
  const canvasHeight = height * cellSize

  const [drawMode, setDrawMode] = React.useState<DrawMode>(
    'not-drawing',
  )

  const setup = (p5: P5, canvasParentRef: Element) => {
    p5.createCanvas(canvasWidth, canvasHeight).parent(
      canvasParentRef,
    )
  }

  const draw = (p5: P5) => {
    p5.background(0)
    p5.strokeWeight(1)
    p5.stroke(0, 0, 0)
    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          p5.rect(
            x * cellSize,
            y * cellSize,
            cellSize,
            cellSize,
          )
        }
      })
    })
  }

  const mousePressedOrDragged = React.useCallback(
    (event: any) => {
      const xIndex = Math.floor(event.mouseX / cellSize)
      const yIndex = Math.floor(event.mouseY / cellSize)

      const currentValue: boolean = grid.getIn([
        yIndex,
        xIndex,
      ])

      const newValue =
        drawMode === 'not-drawing'
          ? !currentValue
          : drawMode === 'insert-cell'
      if (drawMode === 'not-drawing') {
        setDrawMode(newValue ? 'insert-cell' : 'erase')
      }

      if (
        xIndex >= 0 &&
        xIndex < width &&
        yIndex >= 0 &&
        yIndex < height
      ) {
        setGrid(grid.setIn([yIndex, xIndex], newValue))
      }
    },
    [cellSize, drawMode, grid, setGrid, width, height],
  )

  const mouseReleased = React.useCallback(
    () => setDrawMode('not-drawing'),
    [],
  )

  return (
    <Sketch
      setup={setup}
      draw={draw}
      mousePressed={mousePressedOrDragged}
      mouseDragged={mousePressedOrDragged}
      mouseReleased={mouseReleased}
      style={{
        width: width * cellSize,
        height: height * cellSize,
        cursor: 'crosshair',
      }}
    />
  )
}
