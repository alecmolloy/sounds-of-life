/**
 * A TypeScript Port of IglooJS - taken from https://github.com/skeeto/igloojs
 *
 */
export const GL_RGBA = 0x1908
export const GL_CLAMP_TO_EDGE = 0x812f
export const GL_LINEAR = 0x2601

export class Program {
  private vars: {
    [index: string]: WebGLUniformLocation | number
  } = {}
  private program: WebGLProgram

  /** Tell WebGL to use this program right now. */
  public use(): Program {
    this.gl.useProgram(this.program)
    return this
  }

  /**
   * Declare/set a uniform or set a uniform's data.
   * @param {string} name uniform variable name
   * @param {number|Array|ArrayBufferView} [value]
   * @param {boolean} [i] if true use the integer version
   * @returns {Igloo.Program} this
   */
  public uniform(
    name: string,
    value:
      | number
      | boolean
      | Array<number>
      | ArrayBufferView
      | Float32Array = null,
    i: boolean = false,
  ): Program {
    if (value == null) {
      this.vars[name] = this.gl.getUniformLocation(this.program, name)
    } else {
      if (this.vars[name] == null) this.uniform(name)
      const v = this.vars[name]
      if (typeof value === 'number' || typeof value === 'boolean') {
        if (i) {
          this.gl.uniform1i(v, <number>value)
        } else {
          this.gl.uniform1f(v, <number>value)
        }
      } else {
        const method = 'uniform' + value.length + (i ? 'i' : 'f') + 'v'
        this.gl[method](v, value)
      }
    }
    return this
  }

  private isArrayBufferView(
    matrix: Array<number> | ArrayBufferView,
  ): matrix is ArrayBufferView {
    return typeof matrix === 'ArrayBufferView'
  }

  /**
   * Set a uniform's data to a specific matrix.
   * @param {string} name uniform variable name
   * @param {Array|ArrayBufferView} matrix
   * @param {boolean} [transpose=false]
   * @returns {Igloo.Program} this
   */
  private matrix(
    name: string,
    matrix: Array<number> | ArrayBufferView,
    transpose = false,
  ): Program {
    if (this.vars[name] == null) this.uniform(name)
    let length = 0
    if (this.isArrayBufferView(matrix)) {
      length = matrix.byteLength
    } else {
      length = matrix.length
    }
    var method = 'uniformMatrix' + Math.sqrt(length) + 'fv'
    this.gl[method](this.vars[name], Boolean(transpose), matrix)
    return this
  }

  /**
   * Like the uniform() method, but using integers.
   * @returns {Igloo.Program} this
   */
  uniformi(name: string, value: number): Program {
    return this.uniform(name, value, true)
  }

  /**
   * Declare an attrib or set an attrib's buffer.
   * @param {string} name attrib variable name
   * @param {WebGLBuffer} [value]
   * @param {number} [size] element size (required if value is provided)
   * @param {number} [stride=0]
   * @returns {Igloo.Program} this
   */
  public attrib(
    name: string,
    value: Buffer | null = null,
    size: number = 0,
    stride: number = 0,
  ): Program {
    const gl = this.gl
    if (value == null) {
      this.vars[name] = gl.getAttribLocation(this.program, name)
    } else {
      if (this.vars[name] == null) this.attrib(name) // get location
      value.bind()
      gl.enableVertexAttribArray(this.vars[name] as any)
      gl.vertexAttribPointer(
        this.vars[name] as any,
        size,
        gl.FLOAT,
        false,
        stride,
        0,
      )
    }
    return this
  }

  /**
   * Call glDrawArrays or glDrawElements with this program.
   * @param {number} mode
   * @param {number} count the number of vertex attribs to render
   * @param {GLenum} [type] use glDrawElements of this type
   * @returns {Igloo.Program} this
   */
  public draw(
    mode: number,
    count: number,
    type: GLenum | null = null,
  ): Program {
    const gl = this.gl
    if (type == null) {
      gl.drawArrays(mode, 0, count)
    } else {
      gl.drawElements(mode, count, type, 0)
    }
    const error = gl.getError()
    if (error !== gl.NO_ERROR) {
      throw new Error(`WebGL rendering error ${error}`)
    }
    return this
  }

  /**
   * Disables all attribs from this program.
   * @returns {Igloo.Program} this
   */
  private disable(): Program {
    for (let attrib in this.vars) {
      const location = this.vars[attrib]
      if (this.vars.hasOwnProperty(attrib)) {
        if (typeof location === 'number') {
          this.gl.disableVertexAttribArray(location)
        }
      }
    }
    return this
  }
}

export default class Igloo {
  public gl: WebGLRenderingContext
  private canvas: HTMLCanvasElement

  /** To be used in a vec2 GL_TRIANGLE_STRIP draw. */
  static QUAD2 = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
  public defaultFramebuffer: Framebuffer

  /** Create a new GL_ARRAY_BUFFER with optional data. */
  public array(
    data: ArrayBuffer | ArrayBufferView | null = null,
    usage: GLenum | null = null,
  ): Buffer {
    const gl = this.gl
    const buffer = new Buffer(gl, gl.ARRAY_BUFFER)
    if (data != null) {
      buffer.update(data, usage == null ? gl.STATIC_DRAW : usage)
    }
    return buffer
  }

  /** Create a new GL_ELEMENT_ARRAY_BUFFER with optional data.*/
  private elements(
    data: ArrayBuffer | ArrayBufferView | null = null,
    usage: GLenum | null = null,
  ): Buffer {
    var gl = this.gl,
      buffer = new Buffer(gl, gl.ELEMENT_ARRAY_BUFFER)
    if (data != null) {
      buffer.update(data, usage == null ? gl.STATIC_DRAW : usage)
    }
    return buffer
  }

  /** */
  texture(
    // added null
    source: ImageData | null,
    format: GLenum = GL_RGBA,
    wrap: GLenum = GL_CLAMP_TO_EDGE,
    filter: GLenum = GL_LINEAR,
  ): Texture {
    var texture = new Texture(this.gl, format, wrap, filter)
    if (source != null) {
      texture.set(source)
    }
    return texture
  }
}

export class Buffer {
  private target: GLenum
  private buffer: WebGLBuffer
  private size: number

  /** Fluent WebGLBuffer wrapper.
   * @param {WebGLRenderingContext} gl
   * @param {GLenum} [target] either GL_ARRAY_BUFFER or GL_ELEMENT_ARRAY_BUFFER
   * @returns {WebGLProgram}
   * @constructor
   */
  constructor(private gl: WebGLRenderingContext, target: GLenum) {
    this.buffer = gl.createBuffer()
    this.target = target == null ? gl.ARRAY_BUFFER : target
    this.size = -1
  }

  /**
   * Binds this buffer to ARRAY_BUFFER.
   * @returns {Buffer} this
   */
  public bind(): Buffer {
    this.gl.bindBuffer(this.target, this.buffer)
    return this
  }

  /**
   * @param
   * @param {ArrayBuffer|ArrayBufferView} data
   * @param {GLenum} [usage]
   * @returns {Buffer} this
   */
  public update(data: ArrayBuffer | ArrayBufferView, usage: GLenum): Buffer {
    const gl = this.gl
    if (data instanceof Array) {
      data = new Float32Array(data)
    }
    usage = usage == null ? gl.DYNAMIC_DRAW : usage
    this.bind()
    if (this.size !== data.byteLength) {
      gl.bufferData(this.target, data, usage)
      this.size = data.byteLength
    } else {
      gl.bufferSubData(this.target, 0, data)
    }
    return this
  }
}
