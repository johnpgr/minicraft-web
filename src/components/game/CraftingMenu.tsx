import React from 'react';
import { InventoryItem } from '@/game/types';
import { RECIPES } from '@/game/recipes';
import { getItemIcon } from '@/game/textures';

interface CraftingMenuProps {
  inventory: InventoryItem[];
  onCraft: (recipeId: string) => void;
  onClose: () => void;
}

const CraftingMenu: React.FC<CraftingMenuProps> = ({ inventory, onCraft, onClose }) => {
  const canCraft = (recipeId: string): boolean => {
    const recipe = RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return false;
    return recipe.ingredients.every((ing) => {
      const item = inventory.find((i) => i.id === ing.itemId);
      return item && item.quantity >= ing.quantity;
    });
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)',
        zIndex: 20,
        fontFamily: 'monospace',
      }}
    >
      <div
        style={{
          background: '#1a1a2e',
          border: '4px solid #4a7c3f',
          padding: '24px',
          minWidth: '320px',
          maxWidth: '400px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ color: '#5aaf4c', fontSize: '20px', margin: 0 }}>⚒️ CRAFTING</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: '2px solid #666',
              color: '#aaa',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '2px 8px',
              fontFamily: 'monospace',
            }}
          >
            ESC
          </button>
        </div>

        {RECIPES.map((recipe) => {
          const available = canCraft(recipe.id);
          return (
            <div
              key={recipe.id}
              style={{
                background: available ? 'rgba(74,124,63,0.2)' : 'rgba(100,100,100,0.1)',
                border: `2px solid ${available ? '#4a7c3f' : '#333'}`,
                padding: '12px',
                marginBottom: '8px',
                cursor: available ? 'pointer' : 'default',
                opacity: available ? 1 : 0.5,
              }}
              onClick={() => available && onCraft(recipe.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '18px' }}>{getItemIcon(recipe.result.itemId)}</span>
                <span style={{ color: '#ddd', fontSize: '14px', fontWeight: 'bold' }}>{recipe.name}</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {recipe.ingredients.map((ing) => {
                  const have = inventory.find((i) => i.id === ing.itemId)?.quantity ?? 0;
                  return (
                    <span
                      key={ing.itemId}
                      style={{
                        color: have >= ing.quantity ? '#8c8' : '#c88',
                        fontSize: '11px',
                      }}
                    >
                      {getItemIcon(ing.itemId)} {ing.itemId} {have}/{ing.quantity}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}

        <p style={{ color: '#555', fontSize: '10px', marginTop: '12px', textAlign: 'center' }}>
          Clique para craftar • C ou ESC para fechar
        </p>
      </div>
    </div>
  );
};

export default CraftingMenu;
