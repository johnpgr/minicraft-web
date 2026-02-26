import type { Direction, PlayerState } from "../types"
import type { SpriteInstance } from "./types"

function directionToMinicraftDir(direction: Direction): number {
    if (direction === "down") return 0
    if (direction === "up") return 1
    if (direction === "left") return 2
    return 3
}

function pushMinicraftSprite(
    output: SpriteInstance[],
    xPx: number,
    yPx: number,
    frameId: number,
    flipBits: number,
    tintCode: number,
    zLayer = 1,
): void {
    output.push({
        worldX: (xPx + 4) / 16,
        worldY: (yPx + 4) / 16,
        zLayer,
        frameId,
        flipBits,
        tintCode,
        alpha: 1,
    })
}

export function createMobFrame(
    direction: Direction,
    walkDist: number,
): { frameLeft: number; frameRight: number; flipTop: number; flipBottom: number } {
    let xt = 0
    let yt = 14

    let flip1 = (walkDist >> 3) & 1
    let flip2 = (walkDist >> 3) & 1

    if (direction === "up") {
        xt += 2
    }

    if (direction === "left" || direction === "right") {
        flip1 = 0
        flip2 = (walkDist >> 4) & 1
        if (direction === "left") {
            flip1 = 1
        }
        xt += 4 + ((walkDist >> 3) & 1) * 2
    }

    return {
        frameLeft: xt + yt * 32,
        frameRight: xt + 1 + yt * 32,
        flipTop: flip1,
        flipBottom: flip2,
    }
}

export function pushPlayerSprites(
    player: PlayerState,
    tintCode: number,
    output: SpriteInstance[],
): { px: number; py: number } {
    const dir = directionToMinicraftDir(player.direction)

    let xt = 0
    let yt = 14
    let flip1 = (player.walkDist >> 3) & 1
    let flip2 = (player.walkDist >> 3) & 1

    if (dir === 1) {
        xt += 2
    }

    if (dir > 1) {
        flip1 = 0
        flip2 = (player.walkDist >> 4) & 1
        if (dir === 2) {
            flip1 = 1
        }
        xt += 4 + ((player.walkDist >> 3) & 1) * 2
    }

    const px = Math.round(player.position.x * 16)
    const py = Math.round(player.position.y * 16)

    const xo = px - 8
    const yo = py - 11

    pushMinicraftSprite(output, xo + 8 * flip1, yo, xt + yt * 32, flip1, tintCode)
    pushMinicraftSprite(output, xo + 8 - 8 * flip1, yo, xt + 1 + yt * 32, flip1, tintCode)
    pushMinicraftSprite(output, xo + 8 * flip2, yo + 8, xt + (yt + 1) * 32, flip2, tintCode)
    pushMinicraftSprite(output, xo + 8 - 8 * flip2, yo + 8, xt + 1 + (yt + 1) * 32, flip2, tintCode)

    return { px, py }
}
