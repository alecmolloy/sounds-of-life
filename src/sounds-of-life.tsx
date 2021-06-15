import * as React from 'react'
import { GameOfLife } from './game-of-life'

// TODO: rethink the whole state bridge between react and GOL, can this be done somehow?
// maybe turn the GOL component into a react component?

// TODO: fix selection so it turns off when drawing + make sure mousedown works properly with "newMode"
// TODO: maybe allow users to change size of board, check to see if it is lossy
// TODO: change board size if RLE is too big, warn users
// TODO: a nice UI
// TODO: fix pinch to zoom on safari: https://dev.to/danburzo/pinch-me-i-m-zooming-gestures-in-the-dom-a0e
// TODO: figure out why chrome goes @1x suddenly while resizing or after swapping windows

export const SoundsOfLife: React.FunctionComponent = () => {
  return <GameOfLife />
}
