export default `#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D state;
uniform vec2 stateSize;

const vec4 on  = vec4(1.0, 1.0, 1.0, 1.0);
const vec4 off = vec4(0.0, 0.0, 0.0, 1.0);

int intGet(vec2 offset) {
    return int(texture2D(state, (gl_FragCoord.xy + offset) / stateSize).x);
}

float floatGet(vec2 offset) {
    return texture2D(state, (gl_FragCoord.xy + offset) / stateSize).x;
}


void main() {
    int sum =
        intGet(vec2(-1.0, -1.0)) +
        intGet(vec2(-1.0,  0.0)) +
        intGet(vec2(-1.0,  1.0)) +
        intGet(vec2( 0.0, -1.0)) +
        intGet(vec2( 0.0,  1.0)) +
        intGet(vec2( 1.0, -1.0)) +
        intGet(vec2( 1.0,  0.0)) +
        intGet(vec2( 1.0,  1.0));
    if (sum == 3) {
        gl_FragColor = on;
    } else if (sum == 2) {
        float current = floatGet(vec2(0.0, 0.0));
        gl_FragColor = vec4(current, current, current, 1.0);
    } else {
        gl_FragColor = off;
    }
}
`
