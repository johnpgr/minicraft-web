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
        hasFocus: boolean,
    ): RenderFrame {
        const mapBuild = TileBuilder.buildMapChunks(state, dirtyTiles)
        return {
            cameraX: state.player.position.x,
            cameraY: state.player.position.y,
            mapChunksByKey: mapBuild.mapChunksByKey,
            dirtyChunkKeys: mapBuild.dirtyChunkKeys,
            animatedChunkKeys: mapBuild.animatedChunkKeys,
            sprites: WorldSpriteBuilder.buildWorldSprites(state),
            uiSprites: UiBuilder.buildUiSprites(state, width, height, hasFocus),
            lights: [],
        }
    }
}
