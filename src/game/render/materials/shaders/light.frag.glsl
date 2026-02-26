uniform float uIntensity;
varying vec2 vUvLocal;

void main() {
  float d = distance(vUvLocal, vec2(0.5));
  float a = smoothstep(0.55, 0.0, d) * uIntensity;
  gl_FragColor = vec4(0.0, 0.0, 0.0, a);
}
