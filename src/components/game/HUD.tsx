import React from 'react';
import { InventoryItem } from '@/game/types';
import { getItemIcon } from '@/game/textures';

interface HUDProps {
  health: number;
  maxHealth: number;
  inventory: InventoryItem[];
}

const HUD: React.FC<HUDProps> = ({ health, maxHealth, inventory }) => {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        pointerEvents: 'none',
        fontFamily: 'monospace',
        imageRendering: 'pixelated',
        zIndex: 10,
      }}
    >
      {/* Health bar */}
      <div style={{ padding: '12px', display: 'flex', gap: '4px', alignItems: 'center' }}>
        <span style={{ color: '#ff4444', fontSize: '16px', marginRight: '4px' }}>❤️</span>
        <div
          style={{
            width: '120px',
            height: '16px',
            background: '#333',
            border: '2px solid #555',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: `${(health / maxHealth) * 100}%`,
              height: '100%',
              background: health > 3 ? '#e04040' : '#ff2020',
              transition: 'width 0.3s',
            }}
          />
        </div>
        <span style={{ color: '#fff', fontSize: '12px', marginLeft: '4px' }}>
          {health}/{maxHealth}
        </span>
      </div>

      {/* Inventory */}
      {inventory.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(0,0,0,0.7)',
            border: '2px solid #555',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            minWidth: '100px',
          }}
        >
          <span style={{ color: '#aaa', fontSize: '10px', borderBottom: '1px solid #444', paddingBottom: '4px' }}>
            INVENTÁRIO
          </span>
          {inventory.map((item) => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '14px' }}>{getItemIcon(item.id)}</span>
              <span style={{ color: '#ddd', fontSize: '11px' }}>{item.name}</span>
              <span style={{ color: '#888', fontSize: '11px', marginLeft: 'auto' }}>×{item.quantity}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HUD;
