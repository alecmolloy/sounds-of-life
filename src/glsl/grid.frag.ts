export default `#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D state;
uniform float cellSize;
uniform vec2 viewSize;
uniform vec2 stateSize;
uniform vec2 offset;
uniform vec2 u_resolution;
uniform float devicePixelRatio;

const vec4 white = vec4(1.0, 1.0, 1.0, 1.0);
const vec4 gridLineEmphasized = vec4(0.5, 0.5, 0.5, 1.0);
const vec4 gridLine = vec4(0.2, 0.2, 0.2, 1.0);

float gridShaping(float offsetComponent, float gridDivisor, float intensity) {
    return clamp(-abs(-mod((offsetComponent + 0.5) * 2.0 + 1.0, (cellSize * gridDivisor) * 2.0) + 1.5) + 1.5, 0.0, intensity);
}

void main() {
    vec2 screenOffset = offset * cellSize;
    vec2 screenOffsetToHaypixel = floor((screenOffset + .5) * 2.0) / 2.0;
    vec2 screenCoord = vec2(
        gl_FragCoord.x / devicePixelRatio,
        (u_resolution.y - gl_FragCoord.y) / devicePixelRatio
    );
    vec2 screenCoordOffset = screenCoord + screenOffset;

    // Draw grid
    vec3 grid = vec3(0.0);
    if (cellSize >= 10.0) {
        float x = gridShaping(screenCoordOffset.x, 1.0, 0.15);
        float y = gridShaping(screenCoordOffset.y, 1.0, 0.15);
        vec3 xy = vec3(max(x, y));
        
        float x10 = gridShaping(screenCoordOffset.x, 10.0, 0.4);
        float y10 = gridShaping(screenCoordOffset.y, 10.0, 0.4);
        vec3 xy10 = vec3(max(x10, y10));
        
        grid = max(xy, xy10);
    }

    gl_FragColor = vec4(texture2D(state, (screenCoordOffset / stateSize) / cellSize).rgb + 
        grid, 1.0);
    }
`
