import * as THREE from 'three';

function decodeBase6Color(value: number): number {
  if (value < 0) return 255;
  const r = Math.floor(value / 100) % 10;
  const g = Math.floor(value / 10) % 10;
  const b = value % 10;
  return r * 36 + g * 6 + b;
}

export function colorGet(a: number, b: number, c: number, d: number): number {
  return (
    (decodeBase6Color(d) << 24) +
    (decodeBase6Color(c) << 16) +
    (decodeBase6Color(b) << 8) +
    decodeBase6Color(a)
  ) >>> 0;
}

export function unpackTint(colorCode: number): [number, number, number, number] {
  return [
    colorCode & 255,
    (colorCode >>> 8) & 255,
    (colorCode >>> 16) & 255,
    (colorCode >>> 24) & 255,
  ];
}

export function createPaletteTexture(): THREE.DataTexture {
  const data = new Uint8Array(256 * 4);
  let index = 0;

  for (let r = 0; r < 6; r += 1) {
    for (let g = 0; g < 6; g += 1) {
      for (let b = 0; b < 6; b += 1) {
        const rr = Math.floor((r * 255) / 5);
        const gg = Math.floor((g * 255) / 5);
        const bb = Math.floor((b * 255) / 5);
        const mid = Math.floor((rr * 30 + gg * 59 + bb * 11) / 100);

        const r1 = Math.floor((((rr + mid) / 2) * 230) / 255 + 10);
        const g1 = Math.floor((((gg + mid) / 2) * 230) / 255 + 10);
        const b1 = Math.floor((((bb + mid) / 2) * 230) / 255 + 10);

        data[index * 4 + 0] = r1;
        data[index * 4 + 1] = g1;
        data[index * 4 + 2] = b1;
        data[index * 4 + 3] = 255;
        index += 1;
      }
    }
  }

  while (index < 256) {
    data[index * 4 + 0] = 0;
    data[index * 4 + 1] = 0;
    data[index * 4 + 2] = 0;
    data[index * 4 + 3] = 255;
    index += 1;
  }

  const texture = new THREE.DataTexture(data, 256, 1, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}
