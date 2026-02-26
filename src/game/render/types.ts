export interface TileInstance {
    worldX: number
    worldY: number
    scale: number
    tileId: number
    variant: number
    flipBits: number
    tintCode: number
}

export type MapChunkKey = `${number}:${number}`

export interface MapChunkData {
    key: MapChunkKey
    chunkX: number
    chunkY: number
    tiles: TileInstance[]
}

export interface MapChunkBuildResult {
    mapChunksByKey: Map<MapChunkKey, MapChunkData>
    dirtyChunkKeys: Set<MapChunkKey>
}

export interface SpriteInstance {
    worldX: number
    worldY: number
    zLayer: number
    frameId: number
    flipBits: number
    tintCode: number
    alpha: number
}

export interface UiSpriteInstance {
    screenX: number
    screenY: number
    frameId: number
    flipBits: number
    tintCode: number
}

export interface LightInstance {
    worldX: number
    worldY: number
    radiusTiles: number
}

export interface RenderFrame {
    cameraX: number
    cameraY: number
    mapChunksByKey: Map<MapChunkKey, MapChunkData>
    dirtyChunkKeys: Set<MapChunkKey>
    sprites: SpriteInstance[]
    uiSprites: UiSpriteInstance[]
    lights: LightInstance[]
}
