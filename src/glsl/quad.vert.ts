export default `#ifdef GL_ES
precision mediump float;
#endif

attribute vec3 quad;

void main() {
    gl_Position = vec4(quad, 1.0);
}
`
