export default `#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D state;
uniform float cellSize;
uniform vec2 viewSize;
uniform vec2 stateSize;
uniform vec2 offset;
uniform vec2 u_resolution;

const vec4 white = vec4(1.0, 1.0, 1.0, 1.0);
const vec4 gridLineEmphasized = vec4(0.5, 0.5, 0.5, 1.0);
const vec4 gridLine = vec4(0.2, 0.2, 0.2, 1.0);

void main() {
    vec2 screenOffset = offset * cellSize;
    vec2 screenCoord = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);

    vec4 grid = vec4(0.0);
    if (cellSize >= 7.0) {
        vec2 screenCoordOffset = screenCoord + screenOffset;
        float x = clamp(-abs(-mod(screenCoordOffset.x + 0.5, cellSize) + 1.0) + 1.0, 0.0, 1.0);
        float y = clamp(-abs(-mod(screenCoordOffset.y + 0.5, cellSize) + 1.0) + 1.0, 0.0, 1.0);
        vec3 xy = vec3(0.15 * clamp(x + y, 0.0, 1.0));
        
        float x10 = clamp(-abs(-mod(screenCoordOffset.x + 0.5, cellSize * 10.0) + 1.0) + 1.0, 0.0, 1.0);
        float y10 = clamp(-abs(-mod(screenCoordOffset.y + 0.5, cellSize * 10.0) + 1.0) + 1.0, 0.0, 1.0);
        vec3 xy10 = vec3(clamp(x10 + y10, 0.0, 1.0));
        grid = vec4(clamp(xy + xy10, 0.0, 0.2), 0.0);
    }

    gl_FragColor = texture2D(state, ((screenCoord.xy + screenOffset) / stateSize) / cellSize) + 
        grid;
}
`
