// thanks to ALEXANDER SHCHAPOV for his code here:
// https://darednaxella.name/pages/writing-javascript-parser-for-rle-files/

// @ts-ignore
import * as parser from './scripts/rle-parser'
import { Grid } from './game-of-life'
import { Map } from 'immutable'

export const getBoardFromRLE = (
  rleText: string,
  width: number,
  height: number,
): Grid | null => {
  const parsed = parser.parse(rleText)
  if (Array.isArray(parsed)) {
    const parsedGOLLines = parsed.find(
      (item) => item?.type === 'lines',
    )
    if (parsedGOLLines != null) {
      const lines: Array<Array<[number, 'b' | 'o']>> =
        parsedGOLLines.items
      let workingBoard: Grid = Map({
        ...new Array(height).fill(
          Map({
            ...new Array(width).fill(false),
          }),
        ),
      })

      lines.forEach((row, y) => {
        let xIndex = 0
        row.forEach((cell) => {
          const count = cell[0]
          const value = cell[1] === 'o'
          for (let i = 0; i < count; i++) {
            if (value) {
              workingBoard = workingBoard.setIn(
                [y, xIndex],
                value,
              )
            }
            xIndex++
          }
        })
      })
      return workingBoard
    } else {
      return null
    }
  } else {
    return null
  }
}
