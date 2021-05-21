export function createProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
): WebGLProgram {
  const program = gl.createProgram()
  if (!program) {
    throw new Error(`Program couldn't be created`)
  }
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  const success = gl.getProgramParameter(program, gl.LINK_STATUS)
  if (success) {
    return program
  } else {
    gl.deleteProgram(program)
    throw new Error(gl.getProgramInfoLog(program) ?? 'Program did not compile.')
  }
}

export function createShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) {
    throw new Error('Shader could not be loaded.')
  }
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    return shader
  } else {
    throw new Error(
      `Shader did not compile: ${gl.getShaderParameter(
        shader,
        gl.COMPILE_STATUS,
      )}, ${gl.getShaderInfoLog(shader)}`,
    )
  }
}

export function createSimpleProgram(
  gl: WebGLRenderingContext,
  vertexShaderSource: string,
  fragmentShaderSource: string,
): WebGLProgram {
  const program = createProgram(
    gl,
    createShader(gl, gl.VERTEX_SHADER, vertexShaderSource),
    createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource),
  )
  gl.linkProgram(program)
  if (gl.getProgramParameter(program, gl.LINK_STATUS) !== true) {
    throw new Error(gl.getProgramInfoLog(program))
  } else {
    return program
  }
}

export const QUAD2 = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])
