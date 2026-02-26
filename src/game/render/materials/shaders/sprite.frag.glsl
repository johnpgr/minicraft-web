uniform sampler2D uAtlas;
uniform sampler2D uPalette;
uniform float uPixelSnap;

varying vec2 vUvLocal;
varying float vFrame;
varying float vFlipBits;
varying vec4 vTint;
varying float vAlpha;

float pickTint(float idx) {
  if (idx < 0.5) return vTint.x;
  if (idx < 1.5) return vTint.y;
  if (idx < 2.5) return vTint.z;
  return vTint.w;
}

void main() {
  vec2 localUv = vec2(vUvLocal.x, 1.0 - vUvLocal.y);
  if (mod(vFlipBits, 2.0) >= 1.0) {
    localUv.x = 1.0 - localUv.x;
  }
  if (floor(vFlipBits / 2.0) >= 1.0) {
    localUv.y = 1.0 - localUv.y;
  }

  float frame = floor(vFrame + 0.5);
  float tileX = mod(frame, 32.0);
  float tileY = floor(frame / 32.0);
  vec2 atlasUv = (vec2(tileX, tileY) + localUv) / 32.0;

  float encoded = floor(texture2D(uAtlas, atlasUv).b * 255.0 + 0.5);
  float px = floor(encoded / 64.0);
  float paletteIndex = pickTint(px);

  if (paletteIndex > 254.5) {
    discard;
  }

  vec3 rgb = texture2D(uPalette, vec2((paletteIndex + 0.5) / 256.0, 0.5)).rgb;
  gl_FragColor = vec4(rgb, vAlpha);
}
