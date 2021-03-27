import Sketch from 'react-p5'
import * as P5 from 'p5'
import * as React from 'react'
import { Grid } from './game-of-life'
import { setDeeply } from './gol-utils'

type DrawMode = 'insert-cell' | 'erase' | 'not-drawing'

interface GameCanvasProps {
  grid: Grid
  setGrid: React.Dispatch<React.SetStateAction<Grid>>
  zoomLevel: number
  originX: number
  originY: number
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>
}

export const GameCanvas = ({
  grid,
  setGrid,
  zoomLevel,
  setZoomLevel,
  originX,
  originY,
}: GameCanvasProps) => {
  const viewportRight = window.innerWidth + originX
  const viewportBottom = window.innerHeight + originY

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
    p5.stroke(20)

    /*
     we have the idea is that we have a grid that only draws for what is on the screen.
     we need to know where to start drawing. 

     lets say we have scrolled to the right, with the origin is 12 pixels to the left.
     so originX = -12.

     We want to draw the first line at 2, and then we want to draw subsequent lines, every cell until
     we come to the window width
     */

    if (zoomLevel > 4) {
      for (
        let x = originX % zoomLevel;
        x < window.innerWidth;
        x += zoomLevel
      ) {
        p5.line(x, 0, x, window.innerHeight)
      }
      for (
        let y = originY % zoomLevel;
        y < window.innerHeight;
        y += zoomLevel
      ) {
        p5.line(0, y, window.innerWidth, y)
      }
    }

    if (zoomLevel > 4) {
      p5.stroke(0, 0, 0)
      p5.strokeWeight(1)
    } else {
      p5.strokeWeight(0)
    }
    grid.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) {
          const canvasX = x * zoomLevel
          const canvasY = y * zoomLevel
          if (
            canvasX + zoomLevel > originX &&
            canvasX < viewportRight &&
            canvasY + zoomLevel > originY &&
            canvasY < viewportBottom
          )
            p5.rect(
              canvasX - originX,
              canvasY - originY,
              zoomLevel,
              zoomLevel,
            )
        }
      })
    })
  }

  const mousePressedOrDragged = React.useCallback(
    (event: any) => {
      const xIndex = Math.floor((event.mouseX + originX) / zoomLevel)
      const yIndex = Math.floor((event.mouseY + originY) / zoomLevel)

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
    [drawMode, grid, setGrid, zoomLevel, originX, originY],
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
