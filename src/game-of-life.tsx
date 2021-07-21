import { useInterval } from 'beautiful-react-hooks'
import React from 'react'
import Dropzone from 'react-dropzone'
import Recoil from 'recoil'
import { CanvasInteractions } from './canvas-interactions'
import { Controls } from './controls'
import gol from './glsl/gol.frag'
import grid from './glsl/grid.frag'
import quad from './glsl/quad.vert'
import { parseRLEAndUpdateBoard } from './rle-parser'
import { WebGLDebugUtils } from './scripts/webgl-debug'
import {
  boardSizeState,
  cellSizeState,
  countState,
  fpsState,
  liveState,
  modeState,
  offsetState,
  selectionState,
  showGridState,
  viewSizeState,
} from './state'
import { getRenderSize, modeIsSelecting } from './utils'
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

  const [offset, setOffset] = Recoil.useRecoilState(offsetState)
  const [viewSize, setViewSize] = Recoil.useRecoilState(viewSizeState)

  const boardSize = Recoil.useRecoilValue(boardSizeState)
  const showGrid = Recoil.useRecoilValue(showGridState)
  const fps = Recoil.useRecoilValue(fpsState)
  const frameLength = 1000 / fps
  const live = Recoil.useRecoilValue(liveState)
  const selection = Recoil.useRecoilValue(selectionState)
  const cellSize = Recoil.useRecoilValue(cellSizeState)
  const mode = Recoil.useRecoilValue(modeState)

  const setCount = Recoil.useSetRecoilState(countState)

  const [canvasDrawingSize, setCanvasDrawingSize] = React.useState(
    getRenderSize(),
  )
  const [canvasStyleSize, setCanvasStyleSize] = React.useState([
    window.innerWidth,
    window.innerHeight,
  ])

  /***
   * Set up WebGL Context once when everything loads
   */
  React.useEffect(() => {
    glR.current = canvasRef.current?.getContext('webgl') ?? null
    if (glR.current == null) {
      throw Error('Could not initialize WebGL!')
    }
    glR.current = WebGLDebugUtils.makeDebugContext(
      glR.current,
    ) as WebGLRenderingContext
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
      boardSize[0],
      boardSize[1],
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
      boardSize[0],
      boardSize[1],
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

      gl.bindTexture(gl.TEXTURE_2D, textures.current.front)
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        boardSize[0],
        boardSize[1],
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        state,
      )
    },
    [buffers, framebuffers, glR, programs, boardSize, textures],
  )

  const getBoardSection = React.useCallback(
    (x: number, y: number, width: number, height: number): Uint8Array => {
      if (
        glR.current == null ||
        textures.current == null ||
        framebuffers.current == null
      ) {
        return new Uint8Array()
      }
      const gl = glR.current

      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.current.step)
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        textures.current.front,
        0,
      )
      const rgba = new Uint8Array(width * height * 4)
      gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, rgba)
      const state = new Uint8Array(width * height)
      for (let i = 0; i < width * height; i++) {
        state[i] = rgba[i * 4]
      }
      return state
    },
    [],
  )

  const getBoard = React.useCallback(
    () => getBoardSection(0, 0, boardSize[0], boardSize[1]),
    [boardSize, getBoardSection],
  )

  const getCell = React.useCallback(
    (x: number, y: number) => getBoardSection(x, y, 1, 1)[0] === 255,
    [getBoardSection],
  )

  // TODO: explore generating this in a lazy way that could be then prioritized if actually needed?
  const emptyBoard = React.useMemo(
    () => new Uint8Array(boardSize[0] * boardSize[1] * 4),
    [boardSize],
  )

  /**
   * Clear the simulation state to empty.
   */
  const setEmpty = React.useCallback(() => {
    setBoardState(emptyBoard)
  }, [emptyBoard, setBoardState])

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

    gl.viewport(0, 0, boardSize[0], boardSize[1])

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
      boardSize,
    )
    gl.uniform1f(
      gl.getUniformLocation(programs.current.gol, 'cellSize'),
      cellSize,
    )

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

    swap()

    setCount((v) => v + 1)
  }, [boardSize, viewSize, cellSize, swap, setCount])

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
      boardSize,
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
  }, [cellSize, offset, showGrid, boardSize, viewSize])

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
        wrap(x, boardSize[0]),
        wrap(y, boardSize[1]),
        1,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([v, v, v, 255]),
      )
    },
    [boardSize],
  )

  const animate = React.useCallback(() => {
    render()
    frameID.current = window.requestAnimationFrame(animate)
  }, [render])

  useInterval(() => {
    if (live) {
      generate()
    }
  }, frameLength)

  React.useEffect(() => {
    frameID.current = window.requestAnimationFrame(animate)
    return () => {
      if (frameID.current != null) {
        window.cancelAnimationFrame(frameID.current)
      }
    }
  }, [animate])

  const onResize = React.useCallback(() => {
    const [newRenderWidth, newRenderHeight] = getRenderSize()
    setCanvasDrawingSize([newRenderWidth, newRenderHeight])
    setCanvasStyleSize([window.innerWidth, window.innerHeight])
    setViewSize(new Float32Array([newRenderWidth, newRenderHeight]))
  }, [setViewSize])

  React.useEffect(() => {
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [onResize])

  const selectionWidth = selection?.width() ?? 0
  const selectionHeight = selection?.height() ?? 0

  const onDrop = React.useCallback(
    (acceptedFiles) => {
      const zeroth = acceptedFiles[0]
      if (zeroth instanceof window.File) {
        zeroth.text().then((text) => {
          parseRLEAndUpdateBoard(text, setBoardState, setOffset, boardSize)
        })
      }
    },
    [boardSize, setBoardState, setOffset],
  )

  return (
    <CanvasInteractions
      runGeneration={generate}
      setBoardState={setBoardState}
      getCell={getCell}
      setCell={setCell}
      getBoardSection={getBoardSection}
      setEmpty={setEmpty}
    >
      <Dropzone onDrop={onDrop}>
        {({ getRootProps }) => (
          <div {...getRootProps()} style={{ outline: 'none' }}>
            <canvas
              id={CanvasId}
              ref={canvasRef}
              style={{
                cursor: modeIsSelecting(mode)
                  ? `-webkit-image-set(
                      url(/icons/selection-tool-cursor@2x.png) 2x,
                      url(/icons/selection-tool-cursor.png) 1x) 12 12, default`
                  : `-webkit-image-set(
                          url(/icons/pencil-tool-cursor@2x.png) 2x,
                          url(/icons/pencil-tool-cursor.png) 1x) 3 18, default`,
                width: canvasStyleSize[0],
                height: canvasStyleSize[1],
              }}
              width={canvasDrawingSize[0]}
              height={canvasDrawingSize[1]}
            />
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
            <Controls generate={generate} getBoard={getBoard} />
          </div>
        )}
      </Dropzone>
    </CanvasInteractions>
  )
}

export const CanvasId = 'canvas'
