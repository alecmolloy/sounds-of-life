export enum GridShowState {
  Off,
  On,
  Auto,
}

export interface Point {
  x: number
  y: number
}

export const preventDefault = (e: { preventDefault: () => void }): void => {
  e.preventDefault()
}

export const stopPropagation = (e: { stopPropagation: () => void }): void => {
  e.stopPropagation()
}

export function roundToHaypixel(value: number, roundToInt: boolean): number {
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

export interface Selection2D {
  left: number
  top: number
  right: number
  bottom: number
  height: () => number
  width: () => number
  originX: number
  originY: number
}
export const selection2D = (
  left: number,
  top: number,
  right: number,
  bottom: number,
  originX: number,
  originY: number,
): Selection2D => ({
  left,
  top,
  right,
  bottom,
  width: () => right - left,
  height: () => bottom - top,
  originX,
  originY,
})

export type CanvasMode =
  | 'drawing-insert-cell'
  | 'drawing-erase'
  | 'drawing-default'
  | 'selection-selecting'
  | 'selection-default'

export function modeIsDrawing(
  mode: CanvasMode,
): mode is 'drawing-insert-cell' | 'drawing-erase' | 'drawing-default' {
  return (
    mode === 'drawing-insert-cell' ||
    mode === 'drawing-erase' ||
    mode === 'drawing-default'
  )
}
export function modeIsSelecting(
  mode: CanvasMode,
): mode is 'selection-selecting' | 'selection-default' {
  return mode === 'selection-selecting' || mode === 'selection-default'
}

export function modeIsInteracting(
  mode: CanvasMode,
): mode is 'selection-selecting' | 'drawing-insert-cell' | 'drawing-erase' {
  return (
    mode === 'selection-selecting' ||
    mode === 'drawing-insert-cell' ||
    mode === 'drawing-erase'
  )
}

export const maxFps = 120
