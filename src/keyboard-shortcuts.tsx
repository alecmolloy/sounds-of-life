import * as React from 'react'
import { CanvasMode, Selection2D } from './utils'

interface KeyboardShortcutsProps {
  live: boolean
  runGeneration: () => void
  setLive: React.Dispatch<React.SetStateAction<boolean>>
  setCount: React.Dispatch<React.SetStateAction<number>>
  setCellSize: React.Dispatch<React.SetStateAction<number>>
  setSpeed: React.Dispatch<React.SetStateAction<number>>
  setOffset: React.Dispatch<React.SetStateAction<Float32Array>>
  setShowControls: React.Dispatch<React.SetStateAction<boolean>>
  setMode: React.Dispatch<React.SetStateAction<CanvasMode>>
  setSelection: React.Dispatch<React.SetStateAction<Selection2D | null>>
}

export const KeyboardShortcuts: React.FunctionComponent<KeyboardShortcutsProps> =
  ({
    live,
    setLive,
    runGeneration,
    setCount,
    setCellSize,
    setSpeed,
    setOffset,
    setShowControls,
    children,
    setMode,
    setSelection,
  }) => {
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
