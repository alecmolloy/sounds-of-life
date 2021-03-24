import * as Immutable from 'immutable'
import type { List } from 'immutable'

type GridRow = List<boolean>
export type Grid = List<GridRow>

export function countNeighbours(
  x: number,
  y: number,
  grid: Grid,
  wrapEdges = false,
): number {
  const height = grid.size
  const zerothRow = grid.get(0)
  if (zerothRow == null) {
    throw Error('Improperly formed grid.')
  }
  const width = zerothRow.size

  const top = wrapEdges || y > 0 ? y - 1 : undefined
  const right =
    wrapEdges || x < width ? (x + 1) % width : undefined
  const bottom =
    wrapEdges || y < height ? (y + 1) % height : undefined
  const left = wrapEdges || x > 0 ? x - 1 : undefined

  const topLeft = grid.getIn([top, left])
  const topCenter = grid.getIn([top, x])
  const topRight = grid.getIn([top, right])

  const centerLeft = grid.getIn([y, left])
  const centerRight = grid.getIn([y, right])

  const bottomLeft = grid.getIn([bottom, left])
  const bottomCenter = grid.getIn([bottom, x])
  const bottomRight = grid.getIn([bottom, right])
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

export function generate(
  grid: Grid,
  wrapEdges: boolean,
): Grid {
  const newGrid = new Array<Array<Boolean>>()
  grid.forEach((row, y) => {
    const newRow = new Array<boolean>()
    row.forEach((cell, x) => {
      const neighbours = countNeighbours(
        x,
        y,
        grid,
        wrapEdges,
      )
      if (cell) {
        if (neighbours < 2 || neighbours > 3) {
          newRow.push(false)
        } else {
          newRow.push(true)
        }
      } else {
        if (neighbours === 3) {
          newRow.push(true)
        } else {
          newRow.push(false)
        }
      }
    })
    newGrid.push(newRow)
  })
  return Immutable.fromJS(newGrid)
}
