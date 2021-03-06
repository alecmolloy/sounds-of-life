// thanks to ALEXANDER SHCHAPOV for his code here:
// https://darednaxella.name/pages/writing-javascript-parser-for-rle-files/

import Recoil from 'recoil'
import * as parser from './scripts/rle-parser'

interface Cells {
  type: 'lines'
  items: Array<[number, 'b' | 'o' | '$']>
}

interface Name {
  type: 'name'
  value: string
}

interface Author {
  type: 'author'
  value: string
}

interface Comment {
  type: 'comment'
  value: string
}

interface Header {
  type: 'header'
  rule: string
  x: number
  y: number
}

interface TopLeftCoordinates {
  type: 'topLeftCoordinates'
  x: number
  y: number
}

type Line = Cells | Name | Author | Comment | Header | TopLeftCoordinates

export const parseRLEAndUpdateBoard = (
  rleText: string,
  setBoardState: (state: Uint8Array) => void,
  setOffset: Recoil.SetterOrUpdater<Float32Array>,
  boardSize: Float32Array,
): void => {
  const parsed = parser.parse(rleText) as Array<Line>
  if (Array.isArray(parsed)) {
    // Create new board state
    const parsedGOLCells = parsed.find(
      (item): item is Cells => item.type === 'lines',
    )
    if (parsedGOLCells != null) {
      const workingStateArray = new Uint8Array(
        boardSize[0] * boardSize[1] * 4,
      ).fill(0)
      const cells = parsedGOLCells.items

      let xIndex = 0
      let yIndex = 0
      const boardWidth = boardSize[0] * 4
      cells.forEach((cell) => {
        const count = cell[0]
        const value = cell[1]
        if (value === 'o') {
          for (let i = 0; i < count; i++) {
            workingStateArray[xIndex * 4 + boardWidth * yIndex + 0] = 255
            workingStateArray[xIndex * 4 + boardWidth * yIndex + 1] = 255
            workingStateArray[xIndex * 4 + boardWidth * yIndex + 2] = 255
            workingStateArray[xIndex * 4 + boardWidth * yIndex + 3] = 255
            xIndex++
          }
        } else if (value === 'b') {
          workingStateArray[xIndex * 4 + boardWidth * yIndex + 3] = 255
          xIndex += count
        } else {
          xIndex = 0
          yIndex += count
        }
      })

      const header = parsed.find((v): v is Header => v.type === 'header')

      // only set state if rule isn't defined or is GOL rule
      if (
        header == null ||
        header.rule == null ||
        header.rule.toUpperCase() === 'B3/S23'
      ) {
        setBoardState(workingStateArray)
        const topLeftCoordinates = parsed.find(
          (v): v is TopLeftCoordinates => v.type === 'topLeftCoordinates',
        )
        if (topLeftCoordinates != null) {
          setOffset(
            new Float32Array([topLeftCoordinates.x, topLeftCoordinates.y]),
          )
        }
      } else {
        throw Error('Error parsing RLE file')
      }
      // Set origin if available
    }
  }
}
