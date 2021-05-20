import grid from './glsl/grid.frag'
import quad from './glsl/quad.vert'
import gol from './glsl/gol.frag'
import { createSimpleProgram, QUAD2 } from './webgl-utils'
import { WebGLDebugUtils } from './scripts/webgl-debug'

export enum GridShowState {
  off,
  on,
  auto,
}

/**
 * Game of Life simulation and display.
 * @param {HTMLCanvasElement} canvas Render target
 * @param {number} [cellSize] Size of each cell in pixels (power of 2)
 */
export class GOL {
  cellSize: number
  viewSize: Float32Array
  stateSize: Float32Array
  offset: Float32Array
  showGrid: 0 | 1 | 2

  gl: WebGLRenderingContext
  programs: { grid: WebGLProgram; gol: WebGLProgram }
  buffers: { quad: WebGLBuffer }
  textures: { front: WebGLTexture; back: WebGLTexture }
  framebuffers: {
    step: WebGLFramebuffer
    defaultFrameBuffer: WebGLFramebuffer
  }

  constructor(
    canvas: HTMLCanvasElement,
    cellSize: number = 4,
    renderWidth: number,
    renderHeight: number,
    boardWidth: number = 2 ** 12,
    boardHeight: number = 2 ** 12,
    showGrid: GridShowState = GridShowState.auto,
  ) {
    const gl = WebGLDebugUtils.makeDebugContext(canvas.getContext('webgl'))
    if (gl == null) {
      throw Error('Could not initialize WebGL!')
    }
    this.gl = gl

    this.cellSize = cellSize
    this.viewSize = new Float32Array([renderWidth, renderHeight])
    this.stateSize = new Float32Array([boardWidth, boardHeight])
    this.offset = new Float32Array([0, 0])
    this.showGrid = showGrid

    gl.disable(gl.DEPTH_TEST)
    this.programs = {
      grid: createSimpleProgram(gl, quad, grid),
      gol: createSimpleProgram(gl, quad, gol),
    }

    const quadBuffer = gl.createBuffer()
    if (quadBuffer == null) {
      throw Error('Could not create quadBuffer!')
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, QUAD2, gl.STATIC_DRAW)
    this.buffers = {
      quad: quadBuffer,
    }

    const front = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, front)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

    const back = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, back)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

    const step = gl.createFramebuffer()
    const defaultFrameBuffer = gl.createFramebuffer()

    if (
      front == null ||
      back == null ||
      step == null ||
      defaultFrameBuffer == null
    ) {
      throw Error('Could not create quadBuffer!')
    }

    this.textures = {
      front,
      back,
    }
    this.framebuffers = {
      step,
      defaultFrameBuffer,
    }
    // hmm
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers.step)
    window.GOL = this
  }

  /**
   * Set the entire simulation state at once.
   * @state should be a one-dimensional `Uint8Array` of size (w × h),
   * with on cells set to `255` and off to `0`.
   */
  setState = (state: Uint8Array): this => {
    const { gl } = this
    const rgba = new Uint8Array(this.stateSize[0] * this.stateSize[1] * 4)
    state.forEach((newValue, i) => {
      const ii = i * 4
      rgba[ii] = newValue
      rgba[ii + 1] = newValue
      rgba[ii + 2] = newValue
      rgba[ii + 3] = 255
    })
    gl.bindTexture(gl.TEXTURE_2D, this.textures.front)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      this.stateSize[0],
      this.stateSize[1],
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      rgba,
    )
    return this
  }

  getState = (): Uint8Array => {
    const { gl } = this
    const w = this.stateSize[0]
    const h = this.stateSize[1]
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers.step)
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.textures.front,
      0,
    )

    const rgba = new Uint8Array(w * h * 4)
    this.gl.readPixels(0, 0, w, h, this.gl.RGBA, this.gl.UNSIGNED_BYTE, rgba)
    const state = new Uint8Array(w * h)
    for (let i = 0; i < w * h; i++) {
      state[i] = rgba[i * 4]
    }
    return state
  }

  /**
   * Clear the simulation state to empty.
   */
  setEmpty = () => {
    this.setState(new Uint8Array(this.stateSize[0] * this.stateSize[1]))
    return this
  }

  /**
   * Swap the texture buffers.
   */
  swap = () => {
    const tmp = this.textures.front
    this.textures.front = this.textures.back
    this.textures.back = tmp
    return this
  }

  /**
   * Step the Game of Life state on the GPU without rendering anything.
   */
  step = () => {
    const { gl } = this
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffers.step)
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.textures.back,
      0,
    )

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.textures.front)

    gl.viewport(0, 0, this.stateSize[0], this.stateSize[1])
    gl.useProgram(this.programs.gol)

    const quadLocation = gl.getAttribLocation(this.programs.gol, 'quad')
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.quad)
    gl.enableVertexAttribArray(quadLocation)
    gl.vertexAttribPointer(quadLocation, 2, gl.FLOAT, false, 0, 0)

    // TODO: why do we need to declare this here if it is passed from a GL program?
    gl.uniform1i(gl.getUniformLocation(this.programs.gol, 'state'), 0)
    gl.uniform2fv(
      gl.getUniformLocation(this.programs.gol, 'viewSize'),
      this.viewSize,
    )
    gl.uniform2fv(
      gl.getUniformLocation(this.programs.gol, 'stateSize'),
      this.stateSize,
    )
    gl.uniform1f(
      gl.getUniformLocation(this.programs.gol, 'cellSize'),
      this.cellSize,
    )

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    this.swap()
    return this
  }

  /**
   * Render the Game of Life state stored on the GPU.
   */
  render = () => {
    const { gl } = this

    // this.igloo.defaultFramebuffer.bind()
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers.defaultFrameBuffer)

    // this.textures.front.bind(0)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.textures.front)

    gl.viewport(0, 0, this.viewSize[0], this.viewSize[1])

    // this.programs.grid
    //   .use()
    gl.useProgram(this.programs.grid)

    //   .attrib('quad', this.buffers.quad, 2)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.quad)
    const quadLocation = gl.getAttribLocation(this.programs.grid, 'quad')
    gl.enableVertexAttribArray(quadLocation)
    gl.vertexAttribPointer(quadLocation, 2, gl.FLOAT, false, 0, 0)

    //   .uniformi('state', 0)
    gl.uniform1i(gl.getUniformLocation(this.programs.grid, 'state'), 0)

    //   .uniform('viewSize', this.viewSize)
    gl.uniform2fv(
      gl.getUniformLocation(this.programs.grid, 'viewSize'),
      this.viewSize,
    )
    //   .uniform('stateSize', this.stateSize)
    gl.uniform2fv(
      gl.getUniformLocation(this.programs.grid, 'stateSize'),
      this.stateSize,
    )
    //    .uniform('cellSize', this.cellSize)
    gl.uniform1f(
      gl.getUniformLocation(this.programs.grid, 'cellSize'),
      this.cellSize,
    )
    //    .uniform('offset', this.offset)
    gl.uniform2fv(
      gl.getUniformLocation(this.programs.grid, 'offset'),
      this.offset,
    )
    //    .uniform('devicePixelRatio', window.devicePixelRatio)
    gl.uniform1f(
      gl.getUniformLocation(this.programs.grid, 'devicePixelRatio'),
      window.devicePixelRatio,
    )
    //    .uniform('u_resolution', this.viewSize)
    gl.uniform2fv(
      gl.getUniformLocation(this.programs.grid, 'u_resolution'),
      this.viewSize,
    )
    //    .uniformi('showGrid', this.showGrid)
    gl.uniform1i(
      gl.getUniformLocation(this.programs.grid, 'showGrid'),
      this.showGrid,
    )

    //    .draw(gl.TRIANGLE_STRIP, 4)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  static wrap(number: number, max: number): number {
    return ((number % max) + max) % max
  }

  /**
   * Set the state at a specific cell.
   */
  setCell = (x: number, y: number, newValue: boolean) => {
    const { gl } = this
    const v = newValue ? 255 : 0

    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      GOL.wrap(x, this.stateSize[0]),
      GOL.wrap(y, this.stateSize[1]),
      1,
      1,
      gl.RGB,
      gl.UNSIGNED_BYTE,
      new Uint8Array([v, v, v]),
    )
  }

  /**
   * Get the state at a specific cell.
   */
  getCell = (x: number, y: number): boolean => {
    const { gl } = this
    const rgb = new Uint8Array(3)
    gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffers.step)
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.textures.front,
      0,
    )
    // framebuffer is incomplete comes from readPixels.
    // everything here looks good, i think there is something
    // wrong with the framebuffer, or maybe texture.
    gl.readPixels(
      GOL.wrap(x, this.stateSize[0]),
      GOL.wrap(y, this.stateSize[1]),
      1,
      1,
      gl.RGB,
      gl.UNSIGNED_BYTE,
      rgb,
    )
    console.log(this.framebuffers.step, this.textures.front)

    return rgb[0] === 255
  }
}
