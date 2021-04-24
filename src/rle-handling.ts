// thanks to ALEXANDER SHCHAPOV for his code here:
// https://darednaxella.name/pages/writing-javascript-parser-for-rle-files/

// @ts-ignore
import { GOL } from './game-of-life'
import * as parser from './scripts/rle-parser'

export const setBoardFromRLE = (
  rleText: string,
  gameOfLife: GOL,
): GOL => {
  const parsed: unknown = parser.parse(rleText)
  if (Array.isArray(parsed)) {
    const parsedGOLLines = parsed.find(
      (item) => item?.type === 'lines',
    )
    if (parsedGOLLines != null) {
      const lines: Array<Array<[number, 'b' | 'o']>> =
        parsedGOLLines.items

      lines.forEach((row, y) => {
        let xIndex = 0
        row.forEach((cell) => {
          const count = cell[0]
          const value = cell[1] === 'o'
          for (let i = 0; i < count; i++) {
            if (value) {
              gameOfLife.setCell(xIndex, y, value)
            }
            xIndex++
          }
        })
      })
      return gameOfLife
    }
  }
  throw Error('Error parsing RLE file')
}
