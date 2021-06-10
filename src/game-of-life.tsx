import { useInterval } from 'beautiful-react-hooks'
import React from 'react'
import Dropzone from 'react-dropzone'
import { Helmet } from 'react-helmet'
import Recoil from 'recoil'
import { bresenhamLine } from './bresenham-line'
import { Controls } from './controls'
import gol from './glsl/gol.frag'
import grid from './glsl/grid.frag'
import quad from './glsl/quad.vert'
import { KeyboardShortcuts } from './keyboard-shortcuts'
import { parseRLEAndUpdateBoard } from './rle-handling'
import {
  boardSizeState,
  cellSizeState,
  liveState,
  modeState,
  offsetState,
  selectionState,
  showGridState,
  speedState,
  viewSizeState,
} from './state'
import {
  CanvasMode,
  getRenderSize,
  modeIsDrawing,
  modeIsSelecting,
  Point,
  roundToHaypixel,
  selection2D,
} from './utils'
import { createSimpleProgram, QUAD2 } from './webgl-utils'

interface GOLPrograms {
  grid: WebGLProgram
  gol: WebGLProgram
}

interface GOLFrameBuffers {
  step: WebGLFramebuffer
  defaultFrameBuffer: null
}

interface GOLTextures {
  front: WebGLTexture
  back: WebGLTexture
}

interface GOLBuffers {
  quad: WebGLBuffer
}

function wrap(number: number, max: number): number {
  return ((number % max) + max) % max
}

function calculateOffsetForZoom(
  mouseX: number,
  mouseY: number,
  oldOffset: Float32Array,
  oldCellSize: number,
  newCellSize: number,
): Float32Array {
  const x = mouseX / oldCellSize
  const y = mouseY / oldCellSize
  const scaleFactor = newCellSize / oldCellSize
  return new Float32Array([
    x - x / scaleFactor + oldOffset[0],
    y - y / scaleFactor + oldOffset[1],
  ])
}

function getAndSetNewMode(
  mode: CanvasMode,
  setMode: React.Dispatch<React.SetStateAction<CanvasMode>>,
  e: React.MouseEvent,
): CanvasMode {
  let newMode: CanvasMode = mode
  if (e.metaKey || e.ctrlKey) {
    switch (mode) {
      case 'selection-selecting': {
        newMode = 'drawing-insert-cell'
        break
      }
      case 'selection-default': {
        newMode = 'drawing-default'
        break
      }
    }
  }
  setMode(newMode)
  return newMode
}

/**
 * Game of Life simulation and display.
 * @param {HTMLCanvasElement} canvas Render target
 * @param {number} [cellSize] Size of each cell in pixels (power of 2)
 */
export const GameOfLife: React.FunctionComponent = () => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  const frameID = React.useRef<number | null>(null)

  const glR = React.useRef<WebGLRenderingContext | null>(null)
  const programs = React.useRef<GOLPrograms | null>(null)
  const framebuffers = React.useRef<GOLFrameBuffers | null>(null)
  const textures = React.useRef<GOLTextures | null>(null)
  const buffers = React.useRef<GOLBuffers | null>(null)

  const scrollTimeoutID = React.useRef<number | null>(null)
  const zoomTimeoutID = React.useRef<number | null>(null)

  const [cellSize, setCellSize] = Recoil.useRecoilState(cellSizeState)
  const [offset, setOffset] = Recoil.useRecoilState(offsetState)
  const [mode, setMode] = Recoil.useRecoilState(modeState)
  const [selection, setSelection] = Recoil.useRecoilState(selectionState)
  const [viewSize, setViewSize] = Recoil.useRecoilState(viewSizeState)
  const stateSize = Recoil.useRecoilValue(boardSizeState)
  const showGrid = Recoil.useRecoilValue(showGridState)
  const speed = Recoil.useRecoilValue(speedState)
  const live = Recoil.useRecoilValue(liveState)

  const [canvasDrawingSize, setCanvasDrawingSize] = React.useState(
    getRenderSize(),
  )
  const [canvasStyleSize, setCanvasStyleSize] = React.useState([
    window.innerWidth,
    window.innerHeight,
  ])

  const [lastDraggedFramePosition, setLastDraggedFramePosition] =
    React.useState<Point | null>(null)
  const [mouseX, setMouseX] = React.useState<number | null>(null)
  const [mouseY, setMouseY] = React.useState<number | null>(null)

  React.useEffect(() => {
    glR.current = canvasRef.current?.getContext('webgl') ?? null
    if (glR.current == null) {
      throw Error('Could not initialize WebGL!')
    }
    const gl = glR.current

    programs.current = {
      grid: createSimpleProgram(gl, quad, grid),
      gol: createSimpleProgram(gl, quad, gol),
    }

    const quadBuffer = gl.createBuffer()
    if (quadBuffer == null) {
      throw Error('Could not create quadBuffer!')
    }

    gl.disable(gl.DEPTH_TEST)

    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, QUAD2, gl.STATIC_DRAW)
    buffers.current = {
      quad: quadBuffer,
    }

    const front = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, front)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

    gl.bindTexture(gl.TEXTURE_2D, front)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      stateSize[0],
      stateSize[1],
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    )

    const back = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, back)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.bindTexture(gl.TEXTURE_2D, back)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      stateSize[0],
      stateSize[1],
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    )

    const stepFramebuffer = gl.createFramebuffer()

    if (front == null || back == null || stepFramebuffer == null) {
      throw Error('Could not create quadBuffer!')
    }

    textures.current = {
      front,
      back,
    }

    framebuffers.current = {
      step: stepFramebuffer,
      defaultFrameBuffer: null,
    }
    // only want this on load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /**
   * Set the entire simulation state at once.
   * @state should be a one-dimensional `Uint8Array` of size (w × h),
   * with on cells set to `255` and off to `0`.
   */
  const setBoardState = React.useCallback(
    (state: Uint8Array) => {
      if (
        glR.current == null ||
        textures.current == null ||
        buffers.current == null ||
        framebuffers.current == null ||
        programs.current == null
      ) {
        return
      }
      const gl = glR.current

      const rgba = new Uint8Array(stateSize[0] * stateSize[1] * 4)
      state.forEach((newValue, i) => {
        const ii = i * 4
        rgba[ii] = newValue
        rgba[ii + 1] = newValue
        rgba[ii + 2] = newValue
        rgba[ii + 3] = 255
      })
      gl.bindTexture(gl.TEXTURE_2D, textures.current.front)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        stateSize[0],
        stateSize[1],
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        rgba,
      )
    },
    [buffers, framebuffers, glR, programs, stateSize, textures],
  )

  const getState = React.useCallback((): Uint8Array => {
    if (
      glR.current == null ||
      textures.current == null ||
      framebuffers.current == null
    ) {
      return new Uint8Array()
    }
    const gl = glR.current

    const w = stateSize[0]
    const h = stateSize[1]
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.current.step)
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      textures.current.front,
      0,
    )

    const rgba = new Uint8Array(w * h * 4)
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, rgba)
    const state = new Uint8Array(w * h)
    for (let i = 0; i < w * h; i++) {
      state[i] = rgba[i * 4]
    }
    return state
  }, [stateSize])

  /**
   * Clear the simulation state to empty.
   */
  const setEmpty = React.useCallback(() => {
    setBoardState(new Uint8Array(stateSize[0] * stateSize[1]))
  }, [setBoardState, stateSize])

  /**
   * Swap the texture buffers.
   */
  const swap = React.useCallback(() => {
    if (textures.current == null) {
      return
    }
    textures.current = {
      front: textures.current.back,
      back: textures.current.front,
    }
  }, [])

  /**
   * Step the Game of Life state on the GPU without rendering anything.
   */
  const generate = React.useCallback(() => {
    if (
      glR.current == null ||
      textures.current == null ||
      buffers.current == null ||
      framebuffers.current == null ||
      programs.current == null
    ) {
      return
    }
    const gl = glR.current

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.current.step)
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      textures.current.back,
      0,
    )

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, textures.current.front)

    gl.viewport(0, 0, stateSize[0], stateSize[1])

    gl.useProgram(programs.current.gol)

    const quadLocation = gl.getAttribLocation(programs.current.gol, 'quad')
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.current.quad)
    gl.enableVertexAttribArray(quadLocation)
    gl.vertexAttribPointer(quadLocation, 2, gl.FLOAT, false, 0, 0)

    // TODO: why do we need to declare this here if it is passed from a GL program?
    gl.uniform1i(gl.getUniformLocation(programs.current.gol, 'state'), 0)
    gl.uniform2fv(
      gl.getUniformLocation(programs.current.gol, 'viewSize'),
      viewSize,
    )
    gl.uniform2fv(
      gl.getUniformLocation(programs.current.gol, 'stateSize'),
      stateSize,
    )
    gl.uniform1f(
      gl.getUniformLocation(programs.current.gol, 'cellSize'),
      cellSize,
    )

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    swap()
  }, [cellSize, stateSize, swap, viewSize])

  /**
   * Render the Game of Life state stored on the GPU.
   */
  const render = React.useCallback(() => {
    if (
      glR.current == null ||
      textures.current == null ||
      buffers.current == null ||
      framebuffers.current == null ||
      programs.current == null
    ) {
      return
    }
    const gl = glR.current

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.current.defaultFrameBuffer)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, textures.current.front)

    gl.viewport(0, 0, viewSize[0], viewSize[1])

    gl.useProgram(programs.current.grid)

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.current.quad)
    const quadLocation = gl.getAttribLocation(programs.current.grid, 'quad')
    gl.enableVertexAttribArray(quadLocation)
    gl.vertexAttribPointer(quadLocation, 2, gl.FLOAT, false, 0, 0)

    gl.uniform1i(gl.getUniformLocation(programs.current.grid, 'state'), 0)

    gl.uniform2fv(
      gl.getUniformLocation(programs.current.grid, 'viewSize'),
      viewSize,
    )
    gl.uniform2fv(
      gl.getUniformLocation(programs.current.grid, 'stateSize'),
      stateSize,
    )
    gl.uniform1f(
      gl.getUniformLocation(programs.current.grid, 'cellSize'),
      cellSize,
    )
    gl.uniform2fv(
      gl.getUniformLocation(programs.current.grid, 'offset'),
      offset,
    )
    gl.uniform1f(
      gl.getUniformLocation(programs.current.grid, 'devicePixelRatio'),
      window.devicePixelRatio,
    )
    gl.uniform2fv(
      gl.getUniformLocation(programs.current.grid, 'u_resolution'),
      viewSize,
    )
    gl.uniform1i(
      gl.getUniformLocation(programs.current.grid, 'showGrid'),
      showGrid,
    )

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }, [cellSize, offset, showGrid, stateSize, viewSize])

  /**
   * Set the state at a specific cell.
   */
  const setCell = React.useCallback(
    (x: number, y: number, newValue: boolean) => {
      if (
        glR.current == null ||
        textures.current == null ||
        buffers.current == null ||
        framebuffers.current == null ||
        programs.current == null
      ) {
        return
      }
      const gl = glR.current

      const v = newValue ? 255 : 0
      gl.bindTexture(gl.TEXTURE_2D, textures.current.front)
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        wrap(x, stateSize[0]),
        wrap(y, stateSize[1]),
        1,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([v, v, v, 255]),
      )
    },
    [stateSize],
  )

  /**
   * Get the state at a specific cell.
   */
  const getCell = React.useCallback(
    (x: number, y: number): boolean => {
      if (
        glR.current == null ||
        textures.current == null ||
        buffers.current == null ||
        framebuffers.current == null ||
        programs.current == null
      ) {
        return false
      }
      const gl = glR.current

      const rgba = new Uint8Array(4)
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.current.step)
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        textures.current.front,
        0,
      )
      gl.readPixels(
        wrap(x, stateSize[0]),
        wrap(y, stateSize[1]),
        1,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        rgba,
      )

      return rgba[0] === 255
    },
    [stateSize],
  )

  const animate = React.useCallback(() => {
    render()
    window.requestAnimationFrame(animate)
  }, [render])

  const onResize = React.useCallback(() => {
    const [newRenderWidth, newRenderHeight] = getRenderSize()
    setCanvasDrawingSize([newRenderWidth, newRenderHeight])
    setCanvasStyleSize([window.innerWidth, window.innerHeight])
    setViewSize(new Float32Array([newRenderWidth, newRenderHeight]))
  }, [setViewSize])

  const onMouseDown = React.useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const x = Math.floor(e.clientX / cellSize + offset[0])
      const y = Math.floor(e.clientY / cellSize + offset[1])

      const currentValue = getCell(x, y)
      const newMode = getAndSetNewMode(mode, setMode, e)
      switch (newMode) {
        case 'drawing-default': {
          const newValue = !currentValue
          setMode(newValue ? 'drawing-insert-cell' : 'drawing-erase')
          break
        }
        case 'selection-default': {
          setSelection(selection2D(x, y, x + 1, y + 1, x, y))
          setMode('selection-selecting')
          break
        }
        default: {
          console.error(newMode)
        }
      }
      setLastDraggedFramePosition({ x, y })
    },
    [cellSize, offset, getCell, mode, setMode, setSelection],
  )

  const onMouseMove = React.useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const x = Math.floor(e.clientX / cellSize + offset[0])
      const y = Math.floor(e.clientY / cellSize + offset[1])

      // TODO: support haypixels
      setMouseX(x)
      setMouseY(y)
      const newMode = getAndSetNewMode(mode, setMode, e)
      switch (newMode) {
        case 'drawing-default':
        case 'selection-default': {
          break
        }
        case 'drawing-erase':
        case 'drawing-insert-cell': {
          const newValue = newMode === 'drawing-insert-cell'
          if (lastDraggedFramePosition != null) {
            bresenhamLine(
              lastDraggedFramePosition.x,
              lastDraggedFramePosition.y,
              x,
              y,
              newValue,
              setCell,
            )
          } else {
            setCell(x, y, newValue)
          }
          setLastDraggedFramePosition({ x, y })
          break
        }
        case 'selection-selecting': {
          if (selection !== null) {
            const { newLeft, newRight } = (() => {
              if (x > selection.originX) {
                return { newLeft: selection.originX, newRight: x + 1 }
              } else {
                return { newLeft: x, newRight: selection.originX + 1 }
              }
            })()
            const { newTop, newBottom } = (() => {
              if (y > selection.originY) {
                return { newTop: selection.originY, newBottom: y + 1 }
              } else {
                return { newTop: y, newBottom: selection.originY + 1 }
              }
            })()
            setSelection(
              selection2D(
                newLeft,
                newTop,
                newRight,
                newBottom,
                selection.originX,
                selection.originY,
              ),
            )
          } else {
            throw new Error('Selection not set')
          }
          break
        }
        default: {
          const _exhaustiveCheck: never = newMode
          throw new Error(`${_exhaustiveCheck} not accounted for`)
        }
      }
    },
    [
      cellSize,
      offset,
      mode,
      setMode,
      lastDraggedFramePosition,
      setCell,
      selection,
      setSelection,
    ],
  )

  const onMouseUp = React.useCallback(() => {
    if (modeIsDrawing(mode)) {
      setMode('drawing-default')
    } else if (modeIsSelecting(mode)) {
      setMode('selection-default')
    }
  }, [mode, setMode])

  const onWheel = React.useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey) {
        const newCellSize = Math.min(
          20,
          Math.max(0.5, cellSize + (cellSize * -e.deltaY) / 100),
        )
        setOffset((v) =>
          calculateOffsetForZoom(e.x, e.y, v, cellSize, newCellSize),
        )
        setCellSize(newCellSize)

        if (zoomTimeoutID.current != null) {
          clearTimeout(zoomTimeoutID.current)
        }
        zoomTimeoutID.current = window.setTimeout(() => {
          const targetNewCellSize = roundToHaypixel(
            newCellSize,
            newCellSize > 1,
          )
          setCellSize(targetNewCellSize)
          setOffset((v) =>
            calculateOffsetForZoom(e.x, e.y, v, newCellSize, targetNewCellSize),
          )
        }, 500)
      } else {
        setOffset(
          (v) =>
            new Float32Array([
              v[0] + e.deltaX / cellSize,
              v[1] + e.deltaY / cellSize,
            ]),
        )

        if (scrollTimeoutID.current != null) {
          clearTimeout(scrollTimeoutID.current)
        }
        scrollTimeoutID.current = window.setTimeout(() => {
          setOffset(
            (v) =>
              new Float32Array([
                roundToHaypixel(v[0] * cellSize, cellSize < 1) / cellSize,
                roundToHaypixel(v[1] * cellSize, cellSize < 1) / cellSize,
              ]),
          )
        }, 500)
      }
    },
    [setCellSize, setOffset, cellSize],
  )

  React.useEffect(() => {
    frameID.current = window.requestAnimationFrame(animate)
    return () => {
      if (frameID.current != null) {
        window.cancelAnimationFrame(frameID.current)
      }
    }
  }, [animate])

  React.useEffect(() => {
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [onResize])

  React.useEffect(() => {
    document.body.addEventListener('wheel', onWheel, {
      passive: false,
    })

    return () => {
      document.body.removeEventListener('wheel', onWheel)
    }
  }, [onWheel])

  const selectionWidth = selection?.width() ?? 0
  const selectionHeight = selection?.height() ?? 0

  useInterval(() => {
    if (live) {
      generate()
    }
  }, speed)

  const onPaste = React.useCallback(
    (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text')
      if (text != null) {
        parseRLEAndUpdateBoard(text, setBoardState, setOffset, stateSize)
      }
    },
    [setBoardState, setOffset, stateSize],
  )

  React.useEffect(() => {
    window.addEventListener('paste', onPaste as any)
    return () => window.removeEventListener('paste', onPaste as any)
  })

  React.useEffect(() => {
    onResize()
  }, [onResize])

  return (
    <>
      <Helmet>
        <style type='text/css'>
          {`
            body {
              margin: 0;
              overflow: hidden;
              background-color: black;
            }
            iframe {
              display: none;
            }
          `}
        </style>
      </Helmet>
      <Dropzone
        onDrop={(acceptedFiles) => {
          const zeroth = acceptedFiles[0]
          if (zeroth instanceof window.File) {
            zeroth.text().then((text) => {
              parseRLEAndUpdateBoard(text, setBoardState, setOffset, stateSize)
            })
          }
        }}
      >
        {({ getRootProps }) => (
          <div {...getRootProps()} style={{ outline: 'none' }}>
            <KeyboardShortcuts live={live} runGeneration={generate}>
              <>
                <canvas
                  ref={canvasRef}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  style={{
                    cursor: modeIsSelecting(mode)
                      ? 'cell'
                      : `-webkit-image-set(
            url(/icons/pencil@2x.png) 2x,
            url(/icons/pencil@1x.png) 1x) 3 18, default`,
                    width: canvasStyleSize[0],
                    height: canvasStyleSize[1],
                  }}
                  width={canvasDrawingSize[0]}
                  height={canvasDrawingSize[1]}
                />
                {mouseX != null && mouseY != null ? (
                  <div
                    style={{
                      userSelect: 'none',
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      color: 'white',
                      fontFamily: 'monospace',
                      fontSize: 10,
                      padding: 2,
                    }}
                  >
                    ({mouseX}, {mouseY})
                  </div>
                ) : null}
                {selection != null &&
                selectionWidth !== 0 &&
                selectionHeight !== 0 ? (
                  <div
                    style={{
                      width: selectionWidth * cellSize,
                      height: selectionHeight * cellSize,
                      left: (-offset[0] + selection.left) * cellSize,
                      top: (-offset[1] + selection.top) * cellSize,
                      pointerEvents: 'none',
                      backgroundColor: '#0f02',
                      boxShadow: '0 0 0 0.5px #0f06 inset',
                      position: 'absolute',
                      boxSizing: 'border-box',
                    }}
                  />
                ) : null}
              </>
            </KeyboardShortcuts>
            <Controls runGeneration={generate} />
          </div>
        )}
      </Dropzone>
    </>
  )
}
