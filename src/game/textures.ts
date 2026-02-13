import * as THREE from 'three';
import { TileType } from './types';

const textureCache = new Map<string, THREE.CanvasTexture>();

function createPixelCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [canvas, ctx];
}

function makeTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

export function getTileTexture(type: TileType, harvested: boolean): THREE.CanvasTexture {
  const key = `tile_${type}_${harvested}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const S = 16;
  const [canvas, ctx] = createPixelCanvas(S);

  switch (type) {
    case TileType.GRASS:
      ctx.fillStyle = '#4a7c3f';
      ctx.fillRect(0, 0, S, S);
      ctx.fillStyle = '#5a8c4f';
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(Math.floor(Math.random() * S), Math.floor(Math.random() * S), 1, 1);
      }
      break;
    case TileType.SAND:
      ctx.fillStyle = '#c2b280';
      ctx.fillRect(0, 0, S, S);
      ctx.fillStyle = '#d4c490';
      for (let i = 0; i < 6; i++) {
        ctx.fillRect(Math.floor(Math.random() * S), Math.floor(Math.random() * S), 1, 1);
      }
      break;
    case TileType.WATER:
      ctx.fillStyle = '#3d6fb4';
      ctx.fillRect(0, 0, S, S);
      ctx.fillStyle = '#5080c0';
      ctx.fillRect(2, 6, 4, 1);
      ctx.fillRect(10, 10, 3, 1);
      break;
    case TileType.STONE:
      if (harvested) {
        ctx.fillStyle = '#4a7c3f';
        ctx.fillRect(0, 0, S, S);
        ctx.fillStyle = '#707070';
        ctx.fillRect(5, 5, 6, 6);
      } else {
        ctx.fillStyle = '#707070';
        ctx.fillRect(0, 0, S, S);
        ctx.fillStyle = '#606060';
        ctx.fillRect(2, 2, 5, 4);
        ctx.fillRect(9, 8, 4, 5);
        ctx.fillStyle = '#888';
        ctx.fillRect(3, 3, 3, 2);
      }
      break;
    case TileType.TREE:
      // Ground
      ctx.fillStyle = '#4a7c3f';
      ctx.fillRect(0, 0, S, S);
      if (!harvested) {
        // Trunk
        ctx.fillStyle = '#6b4226';
        ctx.fillRect(6, 10, 4, 6);
        // Canopy
        ctx.fillStyle = '#2d5a1e';
        ctx.fillRect(3, 2, 10, 9);
        ctx.fillStyle = '#3a7028';
        ctx.fillRect(4, 3, 8, 7);
        ctx.fillStyle = '#256016';
        ctx.fillRect(5, 4, 2, 2);
      }
      break;
  }

  const tex = makeTexture(canvas);
  textureCache.set(key, tex);
  return tex;
}

export function getPlayerTexture(direction: string, frame: number): THREE.CanvasTexture {
  const key = `player_${direction}_${frame}`;
  if (textureCache.has(key)) return textureCache.get(key)!;

  const S = 16;
  const [canvas, ctx] = createPixelCanvas(S);

  // Body
  ctx.fillStyle = '#e8a060';
  ctx.fillRect(5, 2, 6, 5); // head
  ctx.fillStyle = '#4060c0';
  ctx.fillRect(4, 7, 8, 6); // body
  // Eyes
  ctx.fillStyle = '#222';
  if (direction === 'down') {
    ctx.fillRect(6, 4, 2, 2);
    ctx.fillRect(9, 4, 2, 2);
  } else if (direction === 'up') {
    // no eyes visible
  } else if (direction === 'left') {
    ctx.fillRect(5, 4, 2, 2);
  } else {
    ctx.fillRect(9, 4, 2, 2);
  }
  // Legs
  ctx.fillStyle = '#3a3a6a';
  const legOffset = frame % 2 === 0 ? 0 : 1;
  ctx.fillRect(5, 13, 3, 3 - legOffset);
  ctx.fillRect(9, 13, 3, 2 + legOffset);

  const tex = makeTexture(canvas);
  textureCache.set(key, tex);
  return tex;
}

export function getItemIcon(itemId: string): string {
  const icons: Record<string, string> = {
    wood: '🪵',
    stone: '🪨',
    wood_pickaxe: '⛏️',
    wood_sword: '🗡️',
    workbench: '🔨',
  };
  return icons[itemId] ?? '❓';
}
