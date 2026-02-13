import { createNoise2D } from 'simplex-noise';
import { GameTile, TileType, MAP_SIZE } from './types';

export function generateMap(seed?: number): GameTile[][] {
  const noise2D = createNoise2D(() => seed ?? Math.random());
  const treeNoise = createNoise2D(() => (seed ?? Math.random()) + 0.5);

  const map: GameTile[][] = [];

  for (let y = 0; y < MAP_SIZE; y++) {
    const row: GameTile[] = [];
    for (let x = 0; x < MAP_SIZE; x++) {
      const nx = x / MAP_SIZE;
      const ny = y / MAP_SIZE;

      const elevation = noise2D(nx * 6, ny * 6) * 0.6 +
        noise2D(nx * 12, ny * 12) * 0.3 +
        noise2D(nx * 24, ny * 24) * 0.1;

      const treeVal = treeNoise(nx * 10, ny * 10);

      let type: TileType;

      if (elevation < -0.3) {
        type = TileType.WATER;
      } else if (elevation < -0.1) {
        type = TileType.SAND;
      } else if (elevation > 0.5) {
        type = TileType.STONE;
      } else if (treeVal > 0.4 && elevation > 0.0) {
        type = TileType.TREE;
      } else {
        type = TileType.GRASS;
      }

      row.push({ type, harvested: false });
    }
    map.push(row);
  }

  // Clear spawn area
  const center = Math.floor(MAP_SIZE / 2);
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const tx = center + dx;
      const ty = center + dy;
      if (tx >= 0 && tx < MAP_SIZE && ty >= 0 && ty < MAP_SIZE) {
        map[ty][tx] = { type: TileType.GRASS, harvested: false };
      }
    }
  }

  return map;
}
