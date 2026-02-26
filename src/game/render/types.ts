export interface TileInstance {
    worldX: number;
    worldY: number;
    scale: number;
    tileId: number;
    variant: number;
    flipBits: number;
    tintCode: number;
}

export interface SpriteInstance {
    worldX: number;
    worldY: number;
    zLayer: number;
    frameId: number;
    flipBits: number;
    tintCode: number;
    alpha: number;
}

export interface UiSpriteInstance {
    screenX: number;
    screenY: number;
    frameId: number;
    flipBits: number;
    tintCode: number;
}

export interface LightInstance {
    worldX: number;
    worldY: number;
    radiusTiles: number;
}

export interface RenderFrame {
    cameraX: number;
    cameraY: number;
    mapTiles: TileInstance[];
    sprites: SpriteInstance[];
    uiSprites: UiSpriteInstance[];
    lights: LightInstance[];
    dirtyTiles: Array<{ x: number; y: number }>;
}
