import Sketch from 'react-p5'
import * as P5 from 'p5'
import * as React from 'react'
import { Grid } from './game-of-life'
import { setDeeply } from './gol-utils'

type DrawMode = 'insert-cell' | 'erase' | 'not-drawing'

interface GameCanvasProps {
  width: number
  height: number
  grid: Grid
  setGrid: React.Dispatch<React.SetStateAction<Grid>>
  cellSize: number
}

export const GameCanvas = ({
  grid,
  setGrid,
  cellSize,
}: GameCanvasProps) => {
  const [drawMode, setDrawMode] = React.useState<DrawMode>(
    'not-drawing',
  )

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
    for (let x = 1; x < window.innerWidth / cellSize; x++) {
      p5.line(x * cellSize, 0, x * cellSize, window.innerHeight)
    }
    for (let y = 1; y < window.innerHeight / cellSize; y++) {
      p5.line(0, y * cellSize, window.innerWidth, y * cellSize)
    }

    p5.stroke(0, 0, 0)
    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          p5.rect(x * cellSize, y * cellSize, cellSize, cellSize)
        }
      })
    })
  }

  const mousePressedOrDragged = React.useCallback(
    (event: any) => {
      const xIndex = Math.floor(event.mouseX / cellSize)
      const yIndex = Math.floor(event.mouseY / cellSize)

      const currentValue = grid.getIn([yIndex, xIndex]) ?? false
      if (drawMode === 'not-drawing') {
        const newValue = !currentValue
        setDrawMode(newValue ? 'insert-cell' : 'erase')
        setGrid(setDeeply(xIndex, yIndex, newValue, grid))
      } else {
        const newValue = drawMode === 'insert-cell'
        setGrid(setDeeply(xIndex, yIndex, newValue, grid))
      }
    },
    [cellSize, drawMode, grid, setGrid],
  )

  const mouseReleased = React.useCallback(
    () => setDrawMode('not-drawing'),
    [],
  )

  return (
    <Sketch
      className='gol-grid'
      setup={setup}
      draw={draw}
      mousePressed={mousePressedOrDragged}
      mouseDragged={mousePressedOrDragged}
      mouseReleased={mouseReleased}
      windowResized={windowResize}
      style={{
        cursor: 'crosshair',
      }}
    />
  )
}
