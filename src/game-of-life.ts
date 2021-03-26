import type { Map } from 'immutable'
import { emptyGrid, setDeeply } from './gol-utils'

export type Row = Map<number, true>
export type Grid = Map<number, Row>

export function countNeighbors(
  x: number,
  y: number,
  grid: Grid,
): number {
  const top = y - 1
  const right = x + 1
  const bottom = y + 1
  const left = x - 1
  const centerX = x
  const centerY = y

  // CoolScript.js 😎
  const topLeft = grid.getIn([top, left]) ? 1 : 0
  const topCenter = grid.getIn([top, centerX]) ? 1 : 0
  const topRight = grid.getIn([top, right]) ? 1 : 0

  const centerLeft = grid.getIn([centerY, left]) ? 1 : 0
  const centerRight = grid.getIn([centerY, right]) ? 1 : 0

  const bottomLeft = grid.getIn([bottom, left]) ? 1 : 0
  const bottomCenter = grid.getIn([bottom, centerX]) ? 1 : 0
  const bottomRight = grid.getIn([bottom, right]) ? 1 : 0
  return (
    topLeft +
    topCenter +
    topRight +
    centerLeft +
    centerRight +
    bottomLeft +
    bottomCenter +
    bottomRight
  )
}

function getSlightlyLargerBoundingBox(
  original: BoundingBox,
): BoundingBox {
  return {
    top: original.top - 1,
    right: original.right + 1,
    bottom: original.bottom + 1,
    left: original.left - 1,
  }
}

interface BoundingBox {
  top: number
  right: number
  bottom: number
  left: number
}

function getLiveBoundingBoxFromGrid(grid: Grid): BoundingBox | null {
  let top: number = Infinity
  let right: number = -Infinity
  let bottom: number = -Infinity
  let left: number = Infinity

  for (const [rowKey, rowValue] of grid.entries()) {
    top = Math.min(rowKey, top)
    bottom = Math.max(rowKey, bottom)
    for (const [cellKey] of rowValue.entries()) {
      right = Math.max(cellKey, right)
      left = Math.min(cellKey, left)
    }
  }
  if (
    top === Infinity ||
    right === -Infinity ||
    top === -Infinity ||
    right === Infinity
  ) {
    if (grid.size !== 0) {
      throw Error('Ya goofed')
    }
    return null
  } else {
    return { top, right, bottom, left }
  }
}

// TODO Maybe: sophisticated algo that checks live cells first then
// adds the dead neighbors to a list to check if they are born

export function generate(grid: Grid): Grid {
  const boundingBox = getLiveBoundingBoxFromGrid(grid)
  if (boundingBox == null) {
    return grid
  }
  const workingArea = getSlightlyLargerBoundingBox(boundingBox)

  let workingGrid = emptyGrid()
  for (let y = workingArea.top; y <= workingArea.bottom; y++) {
    const row = grid.get(y)
    for (let x = workingArea.left; x <= workingArea.right; x++) {
      if (x === 2 && y === 0) debugger
      const neighbors = countNeighbors(x, y, grid)
      if (row != null && row.get(x) === true) {
        if (neighbors < 2 || neighbors > 3) {
          workingGrid = setDeeply(x, y, false, workingGrid)
        } else {
          workingGrid = setDeeply(x, y, true, workingGrid)
        }
      } else {
        if (neighbors === 3) {
          workingGrid = setDeeply(x, y, true, workingGrid)
        } else {
          workingGrid = setDeeply(x, y, false, workingGrid)
        }
      }
    }
  }

  return workingGrid
}
