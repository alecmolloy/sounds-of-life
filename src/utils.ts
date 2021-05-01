export interface Point {
  x: number
  y: number
}

export const preventDefault = (e: { preventDefault: () => void }) => {
  e.preventDefault()
}

export function roundToHaypixel(
  value: number,
  roundToInt: boolean,
): number {
  if (roundToInt) {
    return Math.round(value)
  } else {
    const newFloor = Math.floor(value)
    const newFract = (() => {
      const oldFract = value % 1
      if (oldFract < 0.25) {
        return 0
      } else if (oldFract < 0.75) {
        return 0.5
      } else {
        return 1.0
      }
    })()
    return newFloor + newFract
  }
}

export function getRenderSize(): [number, number] {
  return [
    Math.round(window.innerWidth * window.devicePixelRatio),
    Math.round(window.innerHeight * window.devicePixelRatio),
  ]
}
