import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { MapRenderer, PlayerRenderer, CameraFollow } from './GameObjects';
import HUD from './HUD';
import CraftingMenu from './CraftingMenu';
import { GameState, createInitialState, canMoveTo, harvestTile, craftItem } from '@/game/state';
import { Direction } from '@/game/types';

const MOVE_SPEED = 4;

const GameCanvas: React.FC = () => {
  const [state, setState] = useState<GameState>(createInitialState);
  const keysRef = useRef<Set<string>>(new Set());
  const stateRef = useRef(state);
  stateRef.current = state;

  // Key handlers
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());

      if (e.key === ' ' || e.key === 'e') {
        e.preventDefault();
        setState((s) => harvestTile(s));
      }
      if (e.key === 'c') {
        setState((s) => ({ ...s, craftingOpen: !s.craftingOpen }));
      }
      if (e.key === 'Escape') {
        setState((s) => ({ ...s, craftingOpen: false }));
      }
    };
    const onUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  // Game loop for movement
  useEffect(() => {
    let lastTime = performance.now();
    let animFrame: number;

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const keys = keysRef.current;
      const s = stateRef.current;
      if (s.craftingOpen) {
        animFrame = requestAnimationFrame(loop);
        return;
      }

      let dx = 0, dy = 0;
      let dir: Direction | null = null;

      if (keys.has('w') || keys.has('arrowup')) { dy = -1; dir = 'up'; }
      if (keys.has('s') || keys.has('arrowdown')) { dy = 1; dir = 'down'; }
      if (keys.has('a') || keys.has('arrowleft')) { dx = -1; dir = 'left'; }
      if (keys.has('d') || keys.has('arrowright')) { dx = 1; dir = 'right'; }

      const moving = dx !== 0 || dy !== 0;

      if (moving) {
        // Normalize diagonal
        const len = Math.sqrt(dx * dx + dy * dy);
        dx /= len;
        dy /= len;

        const newX = s.player.position.x + dx * MOVE_SPEED * dt;
        const newY = s.player.position.y + dy * MOVE_SPEED * dt;

        const finalX = canMoveTo(s.map, newX, s.player.position.y) ? newX : s.player.position.x;
        const finalY = canMoveTo(s.map, s.player.position.x, newY) ? newY : s.player.position.y;

        setState((prev) => ({
          ...prev,
          player: {
            ...prev.player,
            position: { x: finalX, y: finalY },
            direction: dir || prev.player.direction,
            moving: true,
          },
        }));
      } else {
        setState((prev) =>
          prev.player.moving ? { ...prev, player: { ...prev.player, moving: false } } : prev
        );
      }

      animFrame = requestAnimationFrame(loop);
    };

    animFrame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrame);
  }, []);

  const handleCraft = useCallback((recipeId: string) => {
    setState((s) => craftItem(s, recipeId));
  }, []);

  const zoom = 12;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#111', overflow: 'hidden' }}>
      <Canvas
        orthographic
        camera={{
          zoom,
          position: [state.player.position.x, -state.player.position.y, 10],
          near: 0.1,
          far: 100,
        }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: false }}
      >
        <MapRenderer map={state.map} playerPos={state.player.position} />
        <PlayerRenderer player={state.player} />
        <CameraFollow target={state.player.position} />
      </Canvas>

      <HUD health={state.player.health} maxHealth={state.player.maxHealth} inventory={state.inventory} />

      {state.craftingOpen && (
        <CraftingMenu
          inventory={state.inventory}
          onCraft={handleCraft}
          onClose={() => setState((s) => ({ ...s, craftingOpen: false }))}
        />
      )}

      {/* Action hint */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#666',
          fontSize: '11px',
          fontFamily: 'monospace',
          pointerEvents: 'none',
        }}
      >
        WASD: mover • ESPAÇO: coletar • C: crafting
      </div>
    </div>
  );
};

export default GameCanvas;
