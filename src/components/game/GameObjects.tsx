import React, { useRef, useMemo, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GameTile, MAP_SIZE, PlayerState } from '@/game/types';
import { getTileTexture, getPlayerTexture } from '@/game/textures';

interface MapRendererProps {
  map: GameTile[][];
  playerPos: { x: number; y: number };
}

const RENDER_RADIUS = 16;

export const MapRenderer: React.FC<MapRendererProps> = ({ map, playerPos }) => {
  const meshes = useMemo(() => {
    const items: { key: string; x: number; y: number; tile: GameTile }[] = [];
    const px = Math.round(playerPos.x);
    const py = Math.round(playerPos.y);

    for (let dy = -RENDER_RADIUS; dy <= RENDER_RADIUS; dy++) {
      for (let dx = -RENDER_RADIUS; dx <= RENDER_RADIUS; dx++) {
        const tx = px + dx;
        const ty = py + dy;
        if (tx >= 0 && tx < MAP_SIZE && ty >= 0 && ty < MAP_SIZE) {
          items.push({ key: `${tx}_${ty}`, x: tx, y: ty, tile: map[ty][tx] });
        }
      }
    }
    return items;
  }, [map, Math.round(playerPos.x), Math.round(playerPos.y)]);

  return (
    <>
      {meshes.map(({ key, x, y, tile }) => (
        <mesh key={key} position={[x, -y, 0]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={getTileTexture(tile.type, tile.harvested)} />
        </mesh>
      ))}
    </>
  );
};

interface PlayerRendererProps {
  player: PlayerState;
}

export const PlayerRenderer: React.FC<PlayerRendererProps> = ({ player }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const frameRef = useRef(0);
  const timerRef = useRef(0);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    meshRef.current.position.set(player.position.x, -player.position.y, 0.1);

    if (player.moving) {
      timerRef.current += delta;
      if (timerRef.current > 0.15) {
        frameRef.current = (frameRef.current + 1) % 4;
        timerRef.current = 0;
      }
    } else {
      frameRef.current = 0;
    }

    const tex = getPlayerTexture(player.direction, frameRef.current);
    (meshRef.current.material as THREE.MeshBasicMaterial).map = tex;
    (meshRef.current.material as THREE.MeshBasicMaterial).needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} position={[player.position.x, -player.position.y, 0.1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={getPlayerTexture(player.direction, 0)} transparent />
    </mesh>
  );
};

interface CameraFollowProps {
  target: { x: number; y: number };
}

export const CameraFollow: React.FC<CameraFollowProps> = ({ target }) => {
  const { camera } = useThree();

  useFrame(() => {
    const cam = camera as THREE.OrthographicCamera;
    cam.position.x += (target.x - cam.position.x) * 0.1;
    cam.position.y += (-target.y - cam.position.y) * 0.1;
    cam.position.z = 10;
  });

  return null;
};
