import type { GameState } from "../types"
import { TileBuilder } from "./TileBuilder"
import type { RenderFrame } from "./types"
import { UiBuilder } from "./UiBuilder"
import { WorldSpriteBuilder } from "./WorldSpriteBuilder"

export namespace FrameBuilder {
    export function buildRenderFrame(
        state: GameState,
        dirtyTiles: Array<{ x: number; y: number }>,
        width: number,
        height: number,
    ): RenderFrame {
        return {
            cameraX: state.player.position.x,
            cameraY: state.player.position.y,
            mapTiles: TileBuilder.buildMapTiles(state),
            sprites: WorldSpriteBuilder.buildWorldSprites(state),
            uiSprites: UiBuilder.buildUiSprites(state, width, height),
            lights: [],
            dirtyTiles,
        }
    }
}
