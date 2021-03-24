// thanks to ALEXANDER SHCHAPOV for his code here:
// https://darednaxella.name/pages/writing-javascript-parser-for-rle-files/

// @ts-ignore
import * as parser from './scripts/rle-parser'
import type { List } from 'immutable'
import { emptyBoardArray } from './gol-utils'
import * as Immutable from 'immutable'

export const getBoardFromRLE = (
  rleText: string,
  width: number,
  height: number,
): List<List<boolean>> | null => {
  const parsed = parser.parse(rleText)
  if (Array.isArray(parsed)) {
    const parsedGOLLines = parsed.find(
      (item) => item?.type === 'lines',
    )
    if (parsedGOLLines != null) {
      const lines: Array<Array<[number, 'b' | 'o']>> =
        parsedGOLLines.items
      const board = emptyBoardArray(width, height)
      lines.forEach((row, y) => {
        let xIndex = 0
        row.forEach((cell) => {
          const count = cell[0]
          const value = cell[1] === 'o'
          for (let i = 0; i < count; i++) {
            board[y][xIndex] = value
            xIndex++
          }
        })
      })
      return Immutable.fromJS(board)
    } else {
      return null
    }
  } else {
    return null
  }
}
