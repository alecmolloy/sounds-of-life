// info on how RLE game of life files work: https://www.conwaylife.com/wiki/Run_Length_Encoded
export const printRLE = (
  board: Uint8Array,
  width: number,
  height: number,
  offsetX: number = 0,
  offsetY: number = 0,
): string => {
  const header = `x = ${width}, y = ${height}`
  const timestamp = `#O ${new Date(Date.now()).toString()}`
  const offset = `#R ${offsetX} ${offsetY}`

  let runLength = 0
  let runningValue: boolean | null = null
  let workingLinesString = ''

  // limits line length to 70 columns, per GOL RLE spec
  let runningLineLength = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = board[y * width + x] === 255
      if (runningValue === null) {
        runningValue = value
        runLength = 1
      } else if (runningValue === value) {
        runLength += 1
      } else {
        const tag = printRunLengthAndTag(runLength, runningValue)
        if (runningLineLength + tag.length > 70) {
          workingLinesString += '\n'
          runningLineLength = 0
        } else {
          runningLineLength += tag.length
        }
        workingLinesString += tag
        runLength = 1
        runningValue = value
      }
    }
    if (runningValue === null) {
      throw new Error('Selection is empty')
    }
    const tag = printRunLengthAndTag(runLength, runningValue) + '$'
    if (runningLineLength + tag.length > 70) {
      workingLinesString += '\n'
      runningLineLength = 0
    } else {
      runningLineLength += tag.length
    }
    workingLinesString += tag
    runLength = 0
    runningValue = null
  }
  workingLinesString += '!'
  return [header, timestamp, offset, workingLinesString].join('\n')
}

function printRunLengthAndTag(runLength: number, value: boolean): string {
  return `${runLength !== 1 ? runLength : ''}${value ? 'o' : 'b'}`
}
