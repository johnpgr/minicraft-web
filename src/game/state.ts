import { GameTile, PlayerState, InventoryItem, Direction, MAP_SIZE, TileType } from './types';
import { generateMap } from './mapgen';
import { RECIPES } from './recipes';

export interface GameState {
  map: GameTile[][];
  player: PlayerState;
  inventory: InventoryItem[];
  gameStarted: boolean;
  craftingOpen: boolean;
}

export function createInitialState(): GameState {
  const center = Math.floor(MAP_SIZE / 2);
  return {
    map: generateMap(),
    player: {
      position: { x: center, y: center },
      direction: 'down',
      health: 10,
      maxHealth: 10,
      moving: false,
    },
    inventory: [],
    gameStarted: false,
    craftingOpen: false,
  };
}

export function canMoveTo(map: GameTile[][], x: number, y: number): boolean {
  const tileX = Math.round(x);
  const tileY = Math.round(y);
  if (tileX < 0 || tileX >= MAP_SIZE || tileY < 0 || tileY >= MAP_SIZE) return false;
  const tile = map[tileY][tileX];
  if (tile.type === TileType.WATER) return false;
  if (tile.type === TileType.STONE && !tile.harvested) return false;
  if (tile.type === TileType.TREE && !tile.harvested) return false;
  return true;
}

export function getAdjacentTile(player: PlayerState, map: GameTile[][]): { x: number; y: number; tile: GameTile } | null {
  const dx = player.direction === 'left' ? -1 : player.direction === 'right' ? 1 : 0;
  const dy = player.direction === 'up' ? -1 : player.direction === 'down' ? 1 : 0;
  const tx = Math.round(player.position.x) + dx;
  const ty = Math.round(player.position.y) + dy;
  if (tx < 0 || tx >= MAP_SIZE || ty < 0 || ty >= MAP_SIZE) return null;
  return { x: tx, y: ty, tile: map[ty][tx] };
}

export function harvestTile(state: GameState): GameState {
  const adj = getAdjacentTile(state.player, state.map);
  if (!adj || adj.tile.harvested) return state;

  let resourceId: string | null = null;
  let resourceName: string | null = null;

  if (adj.tile.type === TileType.TREE) {
    resourceId = 'wood';
    resourceName = 'Madeira';
  } else if (adj.tile.type === TileType.STONE) {
    resourceId = 'stone';
    resourceName = 'Pedra';
  }

  if (!resourceId) return state;

  const newMap = state.map.map(row => row.map(t => ({ ...t })));
  newMap[adj.y][adj.x].harvested = true;

  const newInv = [...state.inventory];
  const existing = newInv.find(i => i.id === resourceId);
  if (existing) {
    existing.quantity += 1;
  } else {
    newInv.push({ id: resourceId, name: resourceName!, quantity: 1, icon: resourceId });
  }

  return { ...state, map: newMap, inventory: newInv };
}

export function craftItem(state: GameState, recipeId: string): GameState {
  const recipe = RECIPES.find(r => r.id === recipeId);
  if (!recipe) return state;

  // Check ingredients
  for (const ing of recipe.ingredients) {
    const item = state.inventory.find(i => i.id === ing.itemId);
    if (!item || item.quantity < ing.quantity) return state;
  }

  // Consume ingredients
  const newInv = state.inventory.map(i => {
    const ing = recipe.ingredients.find(ig => ig.itemId === i.id);
    if (ing) return { ...i, quantity: i.quantity - ing.quantity };
    return { ...i };
  }).filter(i => i.quantity > 0);

  // Add result
  const existing = newInv.find(i => i.id === recipe.result.itemId);
  if (existing) {
    existing.quantity += recipe.result.quantity;
  } else {
    newInv.push({
      id: recipe.result.itemId,
      name: recipe.name,
      quantity: recipe.result.quantity,
      icon: recipe.result.itemId,
    });
  }

  return { ...state, inventory: newInv };
}
