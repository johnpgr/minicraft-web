import { CraftingRecipe } from './types';

export const RECIPES: CraftingRecipe[] = [
  {
    id: 'wood_pickaxe',
    name: 'Picareta de Madeira',
    ingredients: [{ itemId: 'wood', quantity: 5 }],
    result: { itemId: 'wood_pickaxe', quantity: 1 },
  },
  {
    id: 'wood_sword',
    name: 'Espada de Madeira',
    ingredients: [
      { itemId: 'wood', quantity: 3 },
      { itemId: 'stone', quantity: 2 },
    ],
    result: { itemId: 'wood_sword', quantity: 1 },
  },
  {
    id: 'workbench',
    name: 'Bancada de Trabalho',
    ingredients: [{ itemId: 'wood', quantity: 10 }],
    result: { itemId: 'workbench', quantity: 1 },
  },
];
