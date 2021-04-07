import * as React from 'react'
import { Grid } from './game-of-life'
import { emptyGrid } from './gol-utils'

interface KeyboardShortcutsProps {
  live: boolean
  runGeneration: () => void
  setLive: React.Dispatch<React.SetStateAction<boolean>>
  setGrid: React.Dispatch<React.SetStateAction<Grid>>
  setCount: React.Dispatch<React.SetStateAction<number>>
  setCellSize: React.Dispatch<React.SetStateAction<number>>
  setSpeed: React.Dispatch<React.SetStateAction<number>>
  setOffsetX: React.Dispatch<React.SetStateAction<number>>
  setOffsetY: React.Dispatch<React.SetStateAction<number>>
  setShowControls: React.Dispatch<React.SetStateAction<boolean>>
}

export const KeyboardShortcuts: React.FunctionComponent<KeyboardShortcutsProps> = ({
  live,
  setLive,
  runGeneration,
  setGrid,
  setCount,
  setCellSize,
  setSpeed,
  setOffsetX,
  setOffsetY,
  setShowControls,
  children,
}) => {
  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.code) {
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
        setGrid(emptyGrid())
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
          setOffsetX(0)
          setOffsetY(0)
        }
        break
      }
    }
  }
  return (
    <div tabIndex={0} onKeyDown={onKeyDown}>
      {children}
    </div>
  )
}
