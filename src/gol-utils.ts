import type { Grid, Row } from './game-of-life'
import { Map } from 'immutable'

export const emptyGrid = (): Grid => Map()

export const blinker = (): Grid =>
  emptyGrid().setIn([1], Map({ 1: true, 2: true, 3: true }))

export const setDeeply = (
  x: number,
  y: number,
  newValue: boolean,
  grid: Grid,
): Grid => {
  if (grid.has(y)) {
    const row = grid.get(y) as Row
    if (newValue) {
      return grid.set(y, row.set(x, newValue))
    } else {
      if (row.has(x)) {
        return row.size === 1
          ? grid.delete(y)
          : grid.set(y, row.delete(x))
      } else {
        return grid
      }
    }
  } else {
    if (newValue) {
      return grid.set(y, Map<number, true>().set(x, newValue))
    } else {
      return grid
    }
  }
}

export const soup = (
  x: number,
  y: number,
  width: number,
  height: number,
): Grid => {
  let workingGrid = emptyGrid()
  for (let xi = x; xi <= width; xi++) {
    for (let yi = y; yi <= height; yi++) {
      if (Math.random() >= 0.5) {
        workingGrid = setDeeply(xi, yi, true, workingGrid)
      }
    }
  }
  return workingGrid
}
