export interface Point {
  x: number
  y: number
}

export const preventDefault = (e: { preventDefault: () => void }) => {
  e.preventDefault()
}
