import React from 'react'
import Recoil from 'recoil'
import {
  cellSizeState,
  countState,
  liveState,
  modeState,
  offsetState,
  selectionState,
  showControlsState,
  speedState,
} from './state'

interface KeyboardShortcutsProps {
  live: boolean
  runGeneration: () => void
}

export const KeyboardShortcuts: React.FunctionComponent<KeyboardShortcutsProps> =
  ({ live, runGeneration, children }) => {
    const setSelection = Recoil.useSetRecoilState(selectionState)
    const setLive = Recoil.useSetRecoilState(liveState)
    const setCount = Recoil.useSetRecoilState(countState)
    const setCellSize = Recoil.useSetRecoilState(cellSizeState)
    const setSpeed = Recoil.useSetRecoilState(speedState)
    const setOffset = Recoil.useSetRecoilState(offsetState)
    const setShowControls = Recoil.useSetRecoilState(showControlsState)
    const setMode = Recoil.useSetRecoilState(modeState)

    const onKeyDown = (e: React.KeyboardEvent) => {
      switch (e.code) {
        case 'MetaLeft':
        case 'MetaRight':
        case 'ControlLeft':
        case 'ControlRight': {
          setMode('drawing-default')
          break
        }
        case 'KeyC': {
          setShowControls((v) => !v)
          break
        }
        case 'KeyG':
        case 'Enter': {
          if (live) {
            setLive(false)
          }
          runGeneration()
          break
        }
        case 'KeyR': {
          // setGrid(emptyGrid())
          setCount(0)
          break
        }
        case 'Space': {
          setLive((v) => !v)
          break
        }
        case 'Equal': {
          if (e.metaKey) {
            e.preventDefault()
            setCellSize((v) => v * 1.1)
          } else {
            setSpeed((speed) => Math.round(speed / 1.1))
          }
          break
        }
        case 'Minus': {
          if (e.metaKey) {
            e.preventDefault()
            setCellSize((v) => Math.max(1, v / 1.1))
          } else {
            setSpeed((speed) => Math.round(speed * 1.1))
          }
          break
        }
        case 'Digit0':
        case 'Digit1': {
          if (e.metaKey) {
            setCellSize(10)
            setOffset(new Float32Array([0, 0]))
          }
          break
        }
      }
    }
    const onKeyUp = (e: React.KeyboardEvent) => {
      switch (e.code) {
        case 'MetaLeft':
        case 'MetaRight':
        case 'ControlLeft':
        case 'ControlRight': {
          setMode('selection-default')
          break
        }
        case 'Escape': {
          setSelection(null)
          break
        }
      }
    }
    return (
      <div
        tabIndex={0}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        style={{ outline: 'none' }}
      >
        {children}
      </div>
    )
  }
