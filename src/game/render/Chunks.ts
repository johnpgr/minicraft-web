import type { TileInstance } from "./types"

export namespace Chunks {
export const CHUNK_SIZE = 32

export type ChunkKey = `${number}:${number}`

export interface DirtyRegion {
    minChunkX: number
    minChunkY: number
    maxChunkX: number
    maxChunkY: number
}

export interface ChunkData {
    key: ChunkKey
    chunkX: number
    chunkY: number
    tiles: TileInstance[]
}

export function coords(x: number, y: number): { chunkX: number; chunkY: number } {
    return {
        chunkX: Math.floor((x + 0.5) / CHUNK_SIZE),
        chunkY: Math.floor((y + 0.5) / CHUNK_SIZE),
    }
}

export function key(chunkX: number, chunkY: number): ChunkKey {
    return `${chunkX}:${chunkY}`
}

export function dirtyRegion(dirtyTiles: Array<{ x: number; y: number }>): DirtyRegion | null {
    if (dirtyTiles.length === 0) return null

    let minChunkX = Number.POSITIVE_INFINITY
    let minChunkY = Number.POSITIVE_INFINITY
    let maxChunkX = Number.NEGATIVE_INFINITY
    let maxChunkY = Number.NEGATIVE_INFINITY

    for (const tile of dirtyTiles) {
        const { chunkX, chunkY } = coords(tile.x, tile.y)
        minChunkX = Math.min(minChunkX, chunkX)
        minChunkY = Math.min(minChunkY, chunkY)
        maxChunkX = Math.max(maxChunkX, chunkX)
        maxChunkY = Math.max(maxChunkY, chunkY)
    }

    return { minChunkX, minChunkY, maxChunkX, maxChunkY }
}

export function groupTiles(tiles: TileInstance[]): Map<ChunkKey, ChunkData> {
    const chunks = new Map<ChunkKey, ChunkData>()

    for (const tile of tiles) {
        const { chunkX, chunkY } = coords(tile.worldX, tile.worldY)
        const chunkKey = key(chunkX, chunkY)
        const existing = chunks.get(chunkKey)

        if (existing) {
            existing.tiles.push(tile)
        } else {
            chunks.set(chunkKey, { key: chunkKey, chunkX, chunkY, tiles: [tile] })
        }
    }

    return chunks
}
}
