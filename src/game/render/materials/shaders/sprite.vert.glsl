attribute float aFrame;
attribute float aFlipBits;
attribute vec4 aTint;
attribute float aAlpha;

varying vec2 vUvLocal;
varying float vFrame;
varying float vFlipBits;
varying vec4 vTint;
varying float vAlpha;

void main() {
  vUvLocal = uv;
  vFrame = aFrame;
  vFlipBits = aFlipBits;
  vTint = aTint;
  vAlpha = aAlpha;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}
