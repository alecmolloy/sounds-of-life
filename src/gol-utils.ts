import type { Grid } from './game-of-life'
import * as Immutable from 'immutable'

export const emptyBoardArray = (
  width: number,
  height: number,
): Array<Array<boolean>> =>
  new Array(width).fill(new Array(height).fill(false))

export const emptyBoard = (
  width: number,
  height: number,
): Grid => Immutable.fromJS(emptyBoardArray(width, height))

export const soup = (width: number, height: number): Grid =>
  Immutable.fromJS(
    new Array(width)
      .fill(new Array(height).fill(false))
      .map((row) => row.map(() => Math.random() >= 0.5)),
  )

export const blinker = (
  width: number,
  height: number,
): Grid =>
  Immutable.fromJS(
    new Array<Array<boolean>>(width)
      .fill(new Array(height).fill(false))
      .map((column, x) =>
        column.map((_, y) => x < 3 && y === 1),
      ),
  )
