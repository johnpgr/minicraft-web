varying vec2 vUvLocal;

void main() {
  vUvLocal = uv;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}
