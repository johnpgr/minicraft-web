import { GameTile, TileType, MAP_SIZE } from './types';

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

function hash2D(x: number, y: number, seed: number): number {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 0.6180339887) * 43758.5453123;
  return (value - Math.floor(value)) * 2 - 1;
}

function valueNoise2D(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;

  const sx = smoothstep(x - x0);
  const sy = smoothstep(y - y0);

  const n00 = hash2D(x0, y0, seed);
  const n10 = hash2D(x1, y0, seed);
  const n01 = hash2D(x0, y1, seed);
  const n11 = hash2D(x1, y1, seed);

  const nx0 = lerp(n00, n10, sx);
  const nx1 = lerp(n01, n11, sx);
  return lerp(nx0, nx1, sy);
}

function fractalNoise2D(x: number, y: number, seed: number): number {
  const octaves = 4;
  let frequency = 1;
  let amplitude = 1;
  let total = 0;
  let normalization = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    total += valueNoise2D(x * frequency, y * frequency, seed + octave * 17) * amplitude;
    normalization += amplitude;
    frequency *= 2;
    amplitude *= 0.5;
  }

  return total / normalization;
}

export function generateMap(seed?: number): GameTile[][] {
  const resolvedSeed = seed ?? Math.floor(Math.random() * 1_000_000);
  const map: GameTile[][] = [];

  for (let y = 0; y < MAP_SIZE; y += 1) {
    const row: GameTile[] = [];

    for (let x = 0; x < MAP_SIZE; x += 1) {
      const nx = x / MAP_SIZE;
      const ny = y / MAP_SIZE;

      const elevation = fractalNoise2D(nx * 6, ny * 6, resolvedSeed);
      const treeValue = fractalNoise2D(nx * 10, ny * 10, resolvedSeed + 101);

      let type: TileType;
      if (elevation < -0.3) {
        type = TileType.WATER;
      } else if (elevation < -0.1) {
        type = TileType.SAND;
      } else if (elevation > 0.5) {
        type = TileType.STONE;
      } else if (treeValue > 0.4 && elevation > 0.0) {
        type = TileType.TREE;
      } else {
        type = TileType.GRASS;
      }

      row.push({ type, harvested: false });
    }

    map.push(row);
  }

  const center = Math.floor(MAP_SIZE / 2);
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const tileX = center + dx;
      const tileY = center + dy;
      if (tileX >= 0 && tileX < MAP_SIZE && tileY >= 0 && tileY < MAP_SIZE) {
        map[tileY][tileX] = { type: TileType.GRASS, harvested: false };
      }
    }
  }

  return map;
}
