import type { TileInstance } from './types';

export const CHUNK_SIZE = 32;

export type ChunkKey = `${number}:${number}`;

export interface DirtyRegion {
    minChunkX: number;
    minChunkY: number;
    maxChunkX: number;
    maxChunkY: number;
}

export interface ChunkData {
    key: ChunkKey;
    chunkX: number;
    chunkY: number;
    tiles: TileInstance[];
}

export function getChunkCoords(x: number, y: number): { chunkX: number; chunkY: number } {
    return {
        chunkX: Math.floor((x + 0.5) / CHUNK_SIZE),
        chunkY: Math.floor((y + 0.5) / CHUNK_SIZE),
    };
}

export function createChunkKey(chunkX: number, chunkY: number): ChunkKey {
    return `${chunkX}:${chunkY}`;
}

export function getDirtyRegion(dirtyTiles: Array<{ x: number; y: number }>): DirtyRegion | null {
    if (dirtyTiles.length === 0) return null;

    let minChunkX = Number.POSITIVE_INFINITY;
    let minChunkY = Number.POSITIVE_INFINITY;
    let maxChunkX = Number.NEGATIVE_INFINITY;
    let maxChunkY = Number.NEGATIVE_INFINITY;

    for (const tile of dirtyTiles) {
        const { chunkX, chunkY } = getChunkCoords(tile.x, tile.y);
        minChunkX = Math.min(minChunkX, chunkX);
        minChunkY = Math.min(minChunkY, chunkY);
        maxChunkX = Math.max(maxChunkX, chunkX);
        maxChunkY = Math.max(maxChunkY, chunkY);
    }

    return { minChunkX, minChunkY, maxChunkX, maxChunkY };
}

export function groupTilesByChunk(tiles: TileInstance[]): Map<ChunkKey, ChunkData> {
    const chunks = new Map<ChunkKey, ChunkData>();

    for (const tile of tiles) {
        const { chunkX, chunkY } = getChunkCoords(tile.worldX, tile.worldY);
        const key = createChunkKey(chunkX, chunkY);
        const existing = chunks.get(key);

        if (existing) {
            existing.tiles.push(tile);
        } else {
            chunks.set(key, { key, chunkX, chunkY, tiles: [tile] });
        }
    }

    return chunks;
}
