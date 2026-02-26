import { Color } from "../assets/Color"
import type { GameState } from "../types"
import { createMobFrame, pushPlayerSprites } from "./playerSprites"
import type { SpriteInstance } from "./types"
import { Viewport } from "./Viewport"
import { FONT_CHARS } from "../types"

export namespace WorldSpriteBuilder {
    const PLAYER_TINT = Color.get(-1, 100, 220, 532)
    const PLAYER_HURT_TINT = Color.get(-1, 555, 555, 555)
    const ZOMBIE_TINT = Color.get(-1, 10, 252, 50)
    const SLIME_TINT = Color.get(-1, 10, 252, 555)
    const FONT_ROW = 30
    const SPRITE_LEFT_X = -0.25
    const SPRITE_RIGHT_X = 0.25
    const SPRITE_TOP_Y = -7 / 16
    const SPRITE_BOTTOM_Y = 1 / 16
    const FONT_INDEX_BY_CODE = new Int16Array(128).fill(-1)

    for (let i = 0; i < FONT_CHARS.length; i += 1) {
        const code = FONT_CHARS.charCodeAt(i)
        if (code < FONT_INDEX_BY_CODE.length) {
            FONT_INDEX_BY_CODE[code] = i
        }
    }

    function pushAttackSplash(
        sprites: SpriteInstance[],
        xPx: number,
        yPx: number,
        frameId: number,
        flipBits: number,
    ): void {
        sprites.push({
            worldX: (xPx + 4) / 16,
            worldY: (yPx + 4) / 16,
            zLayer: 1.4,
            frameId,
            flipBits,
            tintCode: Color.get(-1, 555, 555, 555),
            alpha: 1,
        })
    }

    export function buildWorldSprites(state: GameState): SpriteInstance[] {
        const sprites: SpriteInstance[] = []

        if (state.mode !== "playing" && state.mode !== "dead") {
            return sprites
        }

        const playerTint = state.player.hurtTime > 0 ? PLAYER_HURT_TINT : PLAYER_TINT
        const playerPixels = pushPlayerSprites(state.player, playerTint, sprites)

        if (state.player.attackTime > 0) {
            const xo = playerPixels.px - 8
            const yo = playerPixels.py - 11

            if (state.player.attackDir === "up") {
                pushAttackSplash(sprites, xo, yo - 4, 6 + 13 * 32, 0)
                pushAttackSplash(sprites, xo + 8, yo - 4, 6 + 13 * 32, 1)
            }
            if (state.player.attackDir === "left") {
                pushAttackSplash(sprites, xo - 4, yo, 7 + 13 * 32, 1)
                pushAttackSplash(sprites, xo - 4, yo + 8, 7 + 13 * 32, 3)
            }
            if (state.player.attackDir === "right") {
                pushAttackSplash(sprites, xo + 12, yo, 7 + 13 * 32, 0)
                pushAttackSplash(sprites, xo + 12, yo + 8, 7 + 13 * 32, 2)
            }
            if (state.player.attackDir === "down") {
                pushAttackSplash(sprites, xo, yo + 12, 6 + 13 * 32, 2)
                pushAttackSplash(sprites, xo + 8, yo + 12, 6 + 13 * 32, 3)
            }
        }

        for (const enemy of state.enemies) {
            const enemyFrames = createMobFrame(enemy.direction, enemy.walkDist)
            const ex = Viewport.snapWorldPosition(enemy.position.x)
            const ey = Viewport.snapWorldPosition(enemy.position.y)
            const tint =
                enemy.hurtTime > 0
                    ? PLAYER_HURT_TINT
                    : enemy.kind === "slime"
                      ? SLIME_TINT
                      : ZOMBIE_TINT

            if (enemy.kind === "slime") {
                const slimeBase = enemy.jumpTime > 0 ? 2 + 18 * 32 : 18 * 32
                const jumpOffset = enemy.jumpTime > 0 ? -4 / 16 : 0
                sprites.push({
                    worldX: ex + SPRITE_LEFT_X,
                    worldY: ey + SPRITE_TOP_Y + jumpOffset,
                    zLayer: 1,
                    frameId: slimeBase,
                    flipBits: 0,
                    tintCode: tint,
                    alpha: 1,
                })
                sprites.push({
                    worldX: ex + SPRITE_RIGHT_X,
                    worldY: ey + SPRITE_TOP_Y + jumpOffset,
                    zLayer: 1,
                    frameId: slimeBase + 1,
                    flipBits: 0,
                    tintCode: tint,
                    alpha: 1,
                })
                sprites.push({
                    worldX: ex + SPRITE_LEFT_X,
                    worldY: ey + SPRITE_BOTTOM_Y + jumpOffset,
                    zLayer: 1,
                    frameId: slimeBase + 32,
                    flipBits: 0,
                    tintCode: tint,
                    alpha: 1,
                })
                sprites.push({
                    worldX: ex + SPRITE_RIGHT_X,
                    worldY: ey + SPRITE_BOTTOM_Y + jumpOffset,
                    zLayer: 1,
                    frameId: slimeBase + 33,
                    flipBits: 0,
                    tintCode: tint,
                    alpha: 1,
                })
            } else {
                sprites.push({
                    worldX: ex + SPRITE_LEFT_X,
                    worldY: ey + SPRITE_TOP_Y,
                    zLayer: 1,
                    frameId: enemyFrames.flipTop ? enemyFrames.frameRight : enemyFrames.frameLeft,
                    flipBits: enemyFrames.flipTop,
                    tintCode: tint,
                    alpha: 1,
                })
                sprites.push({
                    worldX: ex + SPRITE_RIGHT_X,
                    worldY: ey + SPRITE_TOP_Y,
                    zLayer: 1,
                    frameId: enemyFrames.flipTop ? enemyFrames.frameLeft : enemyFrames.frameRight,
                    flipBits: enemyFrames.flipTop,
                    tintCode: tint,
                    alpha: 1,
                })
                sprites.push({
                    worldX: ex + SPRITE_LEFT_X,
                    worldY: ey + SPRITE_BOTTOM_Y,
                    zLayer: 1,
                    frameId: enemyFrames.flipBottom
                        ? enemyFrames.frameRight + 32
                        : enemyFrames.frameLeft + 32,
                    flipBits: enemyFrames.flipBottom,
                    tintCode: tint,
                    alpha: 1,
                })
                sprites.push({
                    worldX: ex + SPRITE_RIGHT_X,
                    worldY: ey + SPRITE_BOTTOM_Y,
                    zLayer: 1,
                    frameId: enemyFrames.flipBottom
                        ? enemyFrames.frameLeft + 32
                        : enemyFrames.frameRight + 32,
                    flipBits: enemyFrames.flipBottom,
                    tintCode: tint,
                    alpha: 1,
                })
            }
        }

        for (const drop of state.drops) {
            let frame = 10 + 4 * 32
            let tint = Color.get(-1, 10, 30, 50)
            if (drop.itemId === "cloth") {
                frame = 1 + 4 * 32
                tint = Color.get(-1, 25, 252, 141)
            }
            if (drop.itemId === "wood") {
                frame = 1 + 4 * 32
                tint = Color.get(-1, 200, 531, 430)
            }
            if (drop.itemId === "stone") {
                frame = 2 + 4 * 32
                tint = Color.get(-1, 111, 333, 555)
            }

            sprites.push({
                worldX: drop.position.x,
                worldY: drop.position.y - drop.z,
                zLayer: 1,
                frameId: frame,
                flipBits: 0,
                tintCode: tint,
                alpha: 1,
            })
        }

        for (const text of state.floatingTexts) {
            const upper = text.text.toUpperCase()
            for (let i = 0; i < text.text.length; i += 1) {
                const code = upper.charCodeAt(i)
                const index = code < FONT_INDEX_BY_CODE.length ? FONT_INDEX_BY_CODE[code] : -1
                if (index < 0) continue
                sprites.push({
                    worldX: text.position.x - text.text.length * 0.2 + i * 0.3,
                    worldY: text.position.y - text.z - 0.7,
                    zLayer: 2,
                    frameId: index + FONT_ROW * 32,
                    flipBits: 0,
                    tintCode: text.tintCode,
                    alpha: 1,
                })
            }
        }

        sprites.sort((a, b) => a.worldY - b.worldY)
        return sprites
    }
}
