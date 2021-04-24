import Igloo, {
  Buffer,
  Framebuffer,
  Program,
  Texture,
} from './libs/igloo-ts'
import quad from './glsl/quad.vert'
import gol from './glsl/gol.frag'
import grid from './glsl/grid.frag'

/**
 * Game of Life simulation and display.
 * @param {HTMLCanvasElement} canvas Render target
 * @param {number} [cellSize] Size of each cell in pixels (power of 2)
 */
export class GOL {
  igloo: Igloo
  cellSize: number
  viewSize: Float32Array
  stateSize: Float32Array
  programs: { grid: Program; gol: Program }
  buffers: { quad: Buffer }
  textures: { front: Texture; back: Texture }
  framebuffers: { step: Framebuffer }
  offset: Float32Array
  width: number
  height: number

  constructor(
    canvas: HTMLCanvasElement,
    cellSize: number = 4,
    width: number = 2 ** 10,
    height: number = 2 ** 10,
  ) {
    this.igloo = new Igloo(canvas)
    const gl = this.igloo.gl
    if (gl == null) {
      throw Error('Could not initialize WebGL!')
    }
    this.cellSize = cellSize
    this.width = width
    this.height = height
    this.viewSize = new Float32Array([
      window.innerWidth,
      window.innerHeight,
    ])
    this.stateSize = new Float32Array([width, height])
    this.offset = new Float32Array([0, 0])

    gl.disable(gl.DEPTH_TEST)
    this.programs = {
      grid: this.igloo.program(quad, grid),
      gol: this.igloo.program(quad, gol),
    }
    this.buffers = {
      quad: this.igloo.array(Igloo.QUAD2),
    }
    this.textures = {
      front: this.igloo
        .texture(null, gl.RGBA, gl.REPEAT, gl.NEAREST)
        .blank(this.stateSize[0], this.stateSize[1]),
      back: this.igloo
        .texture(null, gl.RGBA, gl.REPEAT, gl.NEAREST)
        .blank(this.stateSize[0], this.stateSize[1]),
    }
    this.framebuffers = {
      step: this.igloo.framebuffer(),
    }
    window.GOL = this
  }

  /**
   * Set the entire simulation state at once.
   */
  setState = (state: Uint8Array): this => {
    const rgba = new Uint8Array(
      this.stateSize[0] * this.stateSize[1] * 4,
    )
    for (let i = 0; i < state.length; i++) {
      const ii = i * 4
      const newValue = state[i] ? 255 : 0
      rgba[ii] = newValue
      rgba[ii + 1] = newValue
      rgba[ii + 2] = newValue
      rgba[ii + 3] = 255
    }
    this.textures.front.subset(
      rgba,
      0,
      0,
      this.stateSize[0],
      this.stateSize[1],
    )
    return this
  }

  getState = (): Uint8Array => {
    const gl = this.igloo.gl
    const w = this.stateSize[0]
    const h = this.stateSize[1]
    this.framebuffers.step.attach(this.textures.front)
    const rgba = new Uint8Array(w * h * 4)
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, rgba)
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
    this.setState(
      new Uint8Array(this.stateSize[0] * this.stateSize[1]),
    )
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
    const gl = this.igloo.gl
    this.framebuffers.step.attach(this.textures.back)
    this.textures.front.bind(0)
    gl.viewport(0, 0, this.stateSize[0], this.stateSize[1])
    this.programs.gol
      .use()
      .attrib('quad', this.buffers.quad, 2)
      .uniformi('state', 0)
      .uniform('viewSize', this.viewSize)
      .uniform('stateSize', this.stateSize)
      .uniform('cellSize', this.cellSize)
      .draw(gl.TRIANGLE_STRIP, 4)
    this.swap()
    return this
  }

  /**
   * Render the Game of Life state stored on the GPU.
   */
  render = () => {
    const gl = this.igloo.gl
    this.igloo.defaultFramebuffer.bind()
    this.textures.front.bind(0)
    gl.viewport(0, 0, this.viewSize[0], this.viewSize[1])
    this.programs.grid
      .use()
      .attrib('quad', this.buffers.quad, 2)
      .uniformi('state', 0)
      .uniform('stateSize', this.stateSize)
      .uniform('cellSize', this.cellSize)
      .uniform('viewSize', this.viewSize)
      .uniform('offset', this.offset)
      .uniform(
        'u_resolution',
        new Float32Array([window.innerWidth, window.innerHeight]),
      )
      .draw(gl.TRIANGLE_STRIP, 4)
    return this
  }

  static wrap(number: number, max: number): number {
    return ((number % max) + max) % max
  }

  /**
   * Set the state at a specific cell.
   */
  setCell = (x: number, y: number, newValue: boolean): this => {
    const v = newValue ? 255 : 0
    this.textures.front.subset(
      [v, v, v, 255],
      GOL.wrap(x, this.width),
      GOL.wrap(y, this.height),
      1,
      1,
    )
    return this
  }

  /**
   * Get the state at a specific cell.
   */
  getCell = (x: number, y: number): boolean => {
    const gl = this.igloo.gl
    const rgba = new Uint8Array(4)
    gl.readPixels(
      GOL.wrap(x, this.width),
      GOL.wrap(y, this.height),
      1,
      1,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      rgba,
    )
    return rgba[0] === 1
  }
}
