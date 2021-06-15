// Taken from https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm
export function bresenhamLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  newValue: boolean,
  setCell: (x: number, y: number, newValue: boolean) => void,
): void {
  const deltaX = Math.abs(x1 - x0)
  const stepX = x0 < x1 ? 1 : -1
  const deltaY = -Math.abs(y1 - y0)
  const stepY = y0 < y1 ? 1 : -1

  let error = deltaX + deltaY
  setCell(x0, y0, newValue)
  let workingX = x0
  let workingY = y0
  while (workingX !== x1 || workingY !== y1) {
    const errorX2 = error * 2
    if (errorX2 >= deltaY) {
      error += deltaY
      workingX += stepX
    }
    if (errorX2 <= deltaX) {
      error += deltaX
      workingY += stepY
    }
    setCell(workingX, workingY, newValue)
  }
}
