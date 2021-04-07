import type { Map } from 'immutable'
import { emptyGrid, getInGrid, setInGrid } from './gol-utils'

export type Row = Map<number, true>
export type Grid = Map<number, Row>

// TODO: sophisticated algo that checks live cells first then
// adds the dead neighbors to a list to check if they are born

export function generate(grid: Grid): Grid {
  let workingGrid = emptyGrid()
  let workingPotentialNewNeighbors = emptyGrid()
  // Check on cells, record all neighbors to on cells
  grid.forEach((row, y) => {
    row.forEach((cell, x) => {
      let neighbors = 0
      for (let hOffset = -1; hOffset <= 1; hOffset++) {
        for (let vOffset = -1; vOffset <= 1; vOffset++) {
          if (hOffset !== 0 || vOffset !== 0) {
            const neighborValue = getInGrid(
              x + hOffset,
              y + vOffset,
              grid,
            )
            if (neighborValue) {
              neighbors += 1
            } else {
              workingPotentialNewNeighbors = setInGrid(
                x + hOffset,
                y + vOffset,
                true,
                workingPotentialNewNeighbors,
              )
            }
          }
        }
      }

      if (neighbors < 2 || neighbors > 3) {
        workingGrid = setInGrid(x, y, false, workingGrid)
      } else {
        workingGrid = setInGrid(x, y, true, workingGrid)
      }
    })
  })

  // Check cells adjacent to on cells
  workingPotentialNewNeighbors.forEach((row, y) => {
    row.forEach((cell, x) => {
      let neighbors = 0
      for (let hOffset = -1; hOffset <= 1; hOffset++) {
        for (let vOffset = -1; vOffset <= 1; vOffset++) {
          if (hOffset !== 0 || vOffset !== 0) {
            const neighborValue = getInGrid(
              x + hOffset,
              y + vOffset,
              grid,
            )
            if (neighborValue) {
              neighbors += 1
            }
          }
        }
      }
      if (neighbors === 3) {
        workingGrid = setInGrid(x, y, true, workingGrid)
      }
    })
  })

  return workingGrid
}
