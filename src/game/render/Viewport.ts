export namespace Viewport {
    const GAME_WIDTH = 160
    const GAME_HEIGHT = 120
    const WORLD_PIXEL_GRID = 16

    export function getRenderViewportSize(): { width: number; height: number } {
        return { width: GAME_WIDTH, height: GAME_HEIGHT }
    }

    export function snapWorldPosition(value: number): number {
        return Math.round(value * WORLD_PIXEL_GRID) / WORLD_PIXEL_GRID
    }
}
