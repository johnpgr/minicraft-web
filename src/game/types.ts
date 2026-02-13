export enum TileType {
  GRASS = 0,
  SAND = 1,
  WATER = 2,
  STONE = 3,
  TREE = 4,
}

export interface GameTile {
  type: TileType;
  harvested: boolean;
}

export interface Position {
  x: number;
  y: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface PlayerState {
  position: Position;
  direction: Direction;
  health: number;
  maxHealth: number;
  moving: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  icon: string; // color key for rendering
  equipped?: boolean;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  ingredients: { itemId: string; quantity: number }[];
  result: { itemId: string; quantity: number };
}

export const MAP_SIZE = 64;
export const TILE_SIZE = 1;

export const TILE_COLORS: Record<TileType, string> = {
  [TileType.GRASS]: '#4a7c3f',
  [TileType.SAND]: '#c2b280',
  [TileType.WATER]: '#3d6fb4',
  [TileType.STONE]: '#808080',
  [TileType.TREE]: '#2d5a1e',
};

export const SOLID_TILES = [TileType.WATER, TileType.STONE, TileType.TREE];
