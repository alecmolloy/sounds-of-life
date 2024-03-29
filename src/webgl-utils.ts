export function createProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
): WebGLProgram {
  const program = gl.createProgram()
  if (program == null) {
    throw new Error(`Program couldn't be created`)
  }
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  gl.validateProgram(program)
  const linkStatusSuccess: boolean = gl.getProgramParameter(
    program,
    gl.LINK_STATUS,
  )
  const validateStatusSuccess: boolean = gl.getProgramParameter(
    program,
    gl.VALIDATE_STATUS,
  )
  if (linkStatusSuccess) {
    if (validateStatusSuccess) {
      return program
    } else {
      gl.deleteProgram(program)
      throw new Error(
        gl.getProgramInfoLog(program) ?? 'Program did not validate.',
      )
    }
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
  if (shader == null) {
    throw new Error('Shader could not be loaded.')
  }
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  const compileStatus: boolean = gl.getShaderParameter(
    shader,
    gl.COMPILE_STATUS,
  )
  if (compileStatus) {
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
  return createProgram(
    gl,
    createShader(gl, gl.VERTEX_SHADER, vertexShaderSource),
    createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource),
  )
}

export const QuadVertices = new Float32Array([-1, -1, -1, 1, 1, -1, 1, 1])
