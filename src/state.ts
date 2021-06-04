import * as Recoil from 'recoil'
import { GridShowState } from './game-of-life'
import { CanvasMode, Selection2D } from './utils'

export const cellSizeState = Recoil.atom({
  key: 'cellSize',
  default: 10,
})

export const offsetState = Recoil.atom({
  key: 'offset',
  default: new Float32Array([0, 0]),
})

export const selectionState = Recoil.atom<Selection2D | null>({
  key: 'selection',
  default: null,
})

export const modeState = Recoil.atom<CanvasMode>({
  key: 'mode',
  default: 'selection-default',
})

export const countState = Recoil.atom({
  key: 'count',
  default: 0,
})

export const liveState = Recoil.atom({
  key: 'live',
  default: false,
})

export const speedState = Recoil.atom({
  key: 'speed',
  default: 200,
})

export const showControlsState = Recoil.atom({
  key: 'showControls',
  default: true,
})

export const showGridState = Recoil.atom({
  key: 'showGrid',
  default: GridShowState.auto,
})
