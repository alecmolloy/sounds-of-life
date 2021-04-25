// thanks to ALEXANDER SHCHAPOV for his code here:
// https://darednaxella.name/pages/writing-javascript-parser-for-rle-files/

import { GOL } from './game-of-life'
// @ts-ignore
import * as parser from './scripts/rle-parser'

export const setBoardFromRLE = (rleText: string, gameOfLife: GOL) => {
  const parsed: unknown = parser.parse(rleText)

  if (Array.isArray(parsed)) {
    const parsedGOLLines = parsed.find(
      (item) => item?.type === 'lines',
    )
    if (parsedGOLLines != null) {
      const width = gameOfLife.stateSize[0]
      const height = gameOfLife.stateSize[0]
      const workingStateArray = new Uint8Array(width * height).fill(0)
      const cells: Array<[number, 'b' | 'o' | '$']> =
        parsedGOLLines.items

      let xIndex = 0
      let yIndex = 0
      cells.forEach((cell) => {
        const count = cell[0]
        const value = cell[1]
        if (value === 'o') {
          for (let i = 0; i < count; i++) {
            workingStateArray[xIndex + width * yIndex] = 255
            xIndex++
          }
        } else if (value === 'b') {
          xIndex += count
        } else {
          xIndex = 0
          yIndex += count
        }
      })
      gameOfLife.setState(workingStateArray)
    }
  }
  throw Error('Error parsing RLE file')
}
