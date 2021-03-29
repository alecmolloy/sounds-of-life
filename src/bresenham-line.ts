import { Grid } from './game-of-life'
import { setDeeply } from './gol-utils'

// Taken from https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm
export function bresenhamLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  newValue: boolean,
  grid: Grid,
): Grid {
  let workingGrid = grid

  const deltaX = Math.abs(x1 - x0)
  const stepX = x0 < x1 ? 1 : -1
  const deltaY = -Math.abs(y1 - y0)
  const stepY = y0 < y1 ? 1 : -1

  let error = deltaX + deltaY
  while (true) {
    workingGrid = setDeeply(x0, y0, newValue, workingGrid)
    if (x0 === x1 && y0 === y1) {
      break
    }
    const errorX2 = error * 2
    if (errorX2 >= deltaY) {
      error += deltaY
      x0 += stepX
    }
    if (errorX2 <= deltaX) {
      error += deltaX
      y0 += stepY
    }
  }
  return workingGrid
}
