import * as THREE from "three"
import { Palette } from "./game/assets/Palette"
import { Color } from "./game/assets/Color"
import { State } from "./game/State"
import { Renderer } from "./game/render/renderer"
import type {
    RenderFrame,
    SpriteInstance,
    TileInstance,
    UiSpriteInstance,
} from "./game/render/types"
import { FONT_CHARS, type Direction, type GameState, TileType } from "./game/types"
import "./index.css"

const TICK_RATE = 60
const TICK_MS = 1000 / TICK_RATE

const PLAYER_TINT = Color.get(-1, 100, 220, 532)
const PLAYER_HURT_TINT = Color.get(-1, 555, 555, 555)
const ZOMBIE_TINT = Color.get(-1, 10, 252, 50)
const SLIME_TINT = Color.get(-1, 10, 252, 555)
const TEXT_TINT = Color.get(-1, 555, 555, 555)
const UI_TINT = Color.get(-1, 555, 555, 555)
const UI_DIM_TINT = Color.get(-1, 333, 333, 333)
const FONT_ROW = 30
const SPRITE_LEFT_X = -0.25
const SPRITE_RIGHT_X = 0.25
const SPRITE_TOP_Y = -7 / 16
const SPRITE_BOTTOM_Y = 1 / 16

function getTileType(state: GameState, x: number, y: number): TileType | null {
    if (y < 0 || y >= state.map.length || x < 0 || x >= state.map[y].length) {
        return null
    }
    return state.map[y][x].type
}

function pushTile(
    output: TileInstance[],
    x: number,
    y: number,
    frameId: number,
    tintCode: number,
    flipBits = 0,
): void {
    output.push({
        worldX: x,
        worldY: y,
        scale: 0.5,
        tileId: frameId,
        variant: 0,
        flipBits,
        tintCode,
    })
}

function pushTileQuad(
    output: TileInstance[],
    tileX: number,
    tileY: number,
    frames: [number, number, number, number],
    tints: [number, number, number, number],
    flips: [number, number, number, number] = [0, 0, 0, 0],
): void {
    pushTile(output, tileX - 0.25, tileY - 0.25, frames[0], tints[0], flips[0])
    pushTile(output, tileX + 0.25, tileY - 0.25, frames[1], tints[1], flips[1])
    pushTile(output, tileX - 0.25, tileY + 0.25, frames[2], tints[2], flips[2])
    pushTile(output, tileX + 0.25, tileY + 0.25, frames[3], tints[3], flips[3])
}

function pushGrassTile(state: GameState, x: number, y: number, output: TileInstance[]): void {
    const connectsToGrass = (type: TileType | null): boolean =>
        type === TileType.GRASS || type === TileType.TREE || type === TileType.FLOWER

    const u = !connectsToGrass(getTileType(state, x, y - 1))
    const d = !connectsToGrass(getTileType(state, x, y + 1))
    const l = !connectsToGrass(getTileType(state, x - 1, y))
    const r = !connectsToGrass(getTileType(state, x + 1, y))

    const col = Color.get(141, 141, 252, 252)
    const transition = Color.get(30, 141, 252, 322)

    const frames: [number, number, number, number] = [
        !u && !l ? 0 : (l ? 11 : 12) + (u ? 0 : 1) * 32,
        !u && !r ? 1 : (r ? 13 : 12) + (u ? 0 : 1) * 32,
        !d && !l ? 2 : (l ? 11 : 12) + (d ? 2 : 1) * 32,
        !d && !r ? 3 : (r ? 13 : 12) + (d ? 2 : 1) * 32,
    ]

    const tints: [number, number, number, number] = [
        !u && !l ? col : transition,
        !u && !r ? col : transition,
        !d && !l ? col : transition,
        !d && !r ? col : transition,
    ]

    pushTileQuad(output, x, y, frames, tints)
}

function pushSandTile(state: GameState, x: number, y: number, output: TileInstance[]): void {
    const connectsToSand = (type: TileType | null): boolean =>
        type === TileType.SAND || type === TileType.CACTUS
    const u = !connectsToSand(getTileType(state, x, y - 1))
    const d = !connectsToSand(getTileType(state, x, y + 1))
    const l = !connectsToSand(getTileType(state, x - 1, y))
    const r = !connectsToSand(getTileType(state, x + 1, y))
    const ul = !connectsToSand(getTileType(state, x - 1, y - 1))
    const dr = !connectsToSand(getTileType(state, x + 1, y + 1))

    const col = Color.get(550, 550, 121, 121)
    const transition = Color.get(440, 550, 141, 322)

    const tl = !u && !l ? (!ul ? 0 : 3 + 1 * 32) : (l ? 11 : 12) + (u ? 0 : 1) * 32
    const tr = !u && !r ? 1 : (r ? 13 : 12) + (u ? 0 : 1) * 32
    const bl = !d && !l ? 2 : (l ? 11 : 12) + (d ? 2 : 1) * 32
    const br = !d && !r ? (!dr ? 3 : 3 + 1 * 32) : (r ? 13 : 12) + (d ? 2 : 1) * 32

    const tints: [number, number, number, number] = [
        !u && !l ? col : transition,
        !u && !r ? col : transition,
        !d && !l ? col : transition,
        !d && !r ? col : transition,
    ]

    pushTileQuad(output, x, y, [tl, tr, bl, br], tints)
}

function pushWaterTile(
    state: GameState,
    x: number,
    y: number,
    tick: number,
    output: TileInstance[],
): void {
    const liquid = (type: TileType | null): boolean => type === TileType.WATER
    const sand = (type: TileType | null): boolean => type === TileType.SAND

    const u = !liquid(getTileType(state, x, y - 1))
    const d = !liquid(getTileType(state, x, y + 1))
    const l = !liquid(getTileType(state, x - 1, y))
    const r = !liquid(getTileType(state, x + 1, y))

    const su = sand(getTileType(state, x, y - 1))
    const sd = sand(getTileType(state, x, y + 1))
    const sl = sand(getTileType(state, x - 1, y))
    const sr = sand(getTileType(state, x + 1, y))

    const col = Color.get(5, 5, 115, 115)
    const transition1 = Color.get(3, 5, 115, -1)
    const transition2 = Color.get(4, 5, 115, 332)
    const anim = (salt: number): number =>
        Math.abs((x * 97_531 + y * 31_777 + tick * 131 + salt * 71) | 0) % 4

    const frames: [number, number, number, number] = [
        !u && !l ? anim(0) : (l ? 14 : 15) + (u ? 0 : 1) * 32,
        !u && !r ? anim(1) : (r ? 16 : 15) + (u ? 0 : 1) * 32,
        !d && !l ? anim(2) : (l ? 14 : 15) + (d ? 2 : 1) * 32,
        !d && !r ? anim(3) : (r ? 16 : 15) + (d ? 2 : 1) * 32,
    ]

    const flips: [number, number, number, number] = [
        !u && !l ? anim(4) : 0,
        !u && !r ? anim(5) : 0,
        !d && !l ? anim(6) : 0,
        !d && !r ? anim(7) : 0,
    ]

    const tints: [number, number, number, number] = [
        !u && !l ? col : su || sl ? transition2 : transition1,
        !u && !r ? col : su || sr ? transition2 : transition1,
        !d && !l ? col : sd || sl ? transition2 : transition1,
        !d && !r ? col : sd || sr ? transition2 : transition1,
    ]

    pushTileQuad(output, x, y, frames, tints, flips)
}

function pushRockTile(state: GameState, x: number, y: number, output: TileInstance[]): void {
    const rock = (type: TileType | null): boolean => type === TileType.ROCK
    const u = !rock(getTileType(state, x, y - 1))
    const d = !rock(getTileType(state, x, y + 1))
    const l = !rock(getTileType(state, x - 1, y))
    const r = !rock(getTileType(state, x + 1, y))
    const ul = !rock(getTileType(state, x - 1, y - 1))
    const ur = !rock(getTileType(state, x + 1, y - 1))
    const dl = !rock(getTileType(state, x - 1, y + 1))
    const dr = !rock(getTileType(state, x + 1, y + 1))

    const col = Color.get(444, 444, 333, 333)
    const transition = Color.get(111, 444, 555, 322)

    const frameTl = !u && !l ? (!ul ? 0 : 7 + 0 * 32) : (l ? 6 : 5) + (u ? 2 : 1) * 32
    const frameTr = !u && !r ? (!ur ? 1 : 8 + 0 * 32) : (r ? 4 : 5) + (u ? 2 : 1) * 32
    const frameBl = !d && !l ? (!dl ? 2 : 7 + 1 * 32) : (l ? 6 : 5) + (d ? 0 : 1) * 32
    const frameBr = !d && !r ? (!dr ? 3 : 8 + 1 * 32) : (r ? 4 : 5) + (d ? 0 : 1) * 32

    const flipTl = !u && !l && !ul ? 0 : 3
    const flipTr = !u && !r && !ur ? 0 : 3
    const flipBl = !d && !l && !dl ? 0 : 3
    const flipBr = !d && !r && !dr ? 0 : 3

    const tintTl = !u && !l && !ul ? col : transition
    const tintTr = !u && !r && !ur ? col : transition
    const tintBl = !d && !l && !dl ? col : transition
    const tintBr = !d && !r && !dr ? col : transition

    pushTileQuad(
        output,
        x,
        y,
        [frameTl, frameTr, frameBl, frameBr],
        [tintTl, tintTr, tintBl, tintBr],
        [flipTl, flipTr, flipBl, flipBr],
    )
}

function pushTreeTile(state: GameState, x: number, y: number, output: TileInstance[]): void {
    const tree = (type: TileType | null): boolean => type === TileType.TREE
    const u = tree(getTileType(state, x, y - 1))
    const l = tree(getTileType(state, x - 1, y))
    const r = tree(getTileType(state, x + 1, y))
    const d = tree(getTileType(state, x, y + 1))
    const ul = tree(getTileType(state, x - 1, y - 1))
    const ur = tree(getTileType(state, x + 1, y - 1))
    const dl = tree(getTileType(state, x - 1, y + 1))
    const dr = tree(getTileType(state, x + 1, y + 1))

    const col = Color.get(10, 30, 151, 141)
    const barkCol1 = Color.get(10, 30, 430, 141)
    const barkCol2 = Color.get(10, 30, 320, 141)

    const tlConnected = u && ul && l
    const trConnected = u && ur && r
    const blConnected = d && dl && l
    const brConnected = d && dr && r

    const frames: [number, number, number, number] = [
        tlConnected ? 10 + 1 * 32 : 9,
        trConnected ? 10 + 2 * 32 : 10,
        blConnected ? 10 + 2 * 32 : 9 + 1 * 32,
        brConnected ? 10 + 1 * 32 : 10 + 3 * 32,
    ]

    const tints: [number, number, number, number] = [
        col,
        trConnected ? barkCol2 : col,
        blConnected ? barkCol2 : barkCol1,
        brConnected ? col : barkCol2,
    ]

    pushTileQuad(output, x, y, frames, tints)
}

function buildTileInstances(
    state: GameState,
    x: number,
    y: number,
    tick: number,
    output: TileInstance[],
): void {
    const tileType = state.map[y][x].type
    if (tileType === TileType.GRASS) {
        pushGrassTile(state, x, y, output)
        return
    }
    if (tileType === TileType.FLOWER) {
        pushGrassTile(state, x, y, output)
        const flowerTint = Color.get(10, 141, 555, 440)
        const shape = (x + y) % 2
        if (shape === 0) {
            pushTile(output, x - 0.25, y - 0.25, 1 + 1 * 32, flowerTint, 0)
            pushTile(output, x + 0.25, y + 0.25, 1 + 1 * 32, flowerTint, 0)
        } else {
            pushTile(output, x + 0.25, y - 0.25, 1 + 1 * 32, flowerTint, 0)
            pushTile(output, x - 0.25, y + 0.25, 1 + 1 * 32, flowerTint, 0)
        }
        return
    }
    if (tileType === TileType.SAND) {
        pushSandTile(state, x, y, output)
        return
    }
    if (tileType === TileType.WATER) {
        pushWaterTile(state, x, y, tick, output)
        return
    }
    if (tileType === TileType.ROCK) {
        pushRockTile(state, x, y, output)
        return
    }
    if (tileType === TileType.TREE) {
        pushTreeTile(state, x, y, output)
        return
    }
    if (tileType === TileType.DIRT) {
        const dirt = Color.get(322, 322, 322, 322)
        pushTileQuad(output, x, y, [0, 1, 2, 3], [dirt, dirt, dirt, dirt])
        return
    }
    const cactus = Color.get(-1, 10, 40, 50)
    pushTileQuad(
        output,
        x,
        y,
        [8 + 2 * 32, 9 + 2 * 32, 8 + 3 * 32, 9 + 3 * 32],
        [cactus, cactus, cactus, cactus],
    )
}

function createMobFrame(
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

class KeyAction {
    presses = 0
    absorbs = 0
    down = false
    clicked = false

    toggle(pressed: boolean): void {
        if (pressed !== this.down) {
            this.down = pressed
        }
        if (pressed) {
            this.presses += 1
        }
    }

    tick(): void {
        if (this.absorbs < this.presses) {
            this.absorbs += 1
            this.clicked = true
        } else {
            this.clicked = false
        }
    }
}

class InputController {
    up = new KeyAction()
    down = new KeyAction()
    left = new KeyAction()
    right = new KeyAction()
    attack = new KeyAction()
    menu = new KeyAction()

    private allKeys = [this.up, this.down, this.left, this.right, this.attack, this.menu]

    tick(): void {
        for (const key of this.allKeys) key.tick()
    }

    releaseAll(): void {
        for (const key of this.allKeys) key.down = false
    }

    bind(): void {
        window.addEventListener("keydown", (event) => this.toggle(event, true))
        window.addEventListener("keyup", (event) => this.toggle(event, false))
        window.addEventListener("blur", () => this.releaseAll())
    }

    private toggle(event: KeyboardEvent, pressed: boolean): void {
        const code = event.code

        if (code === "ArrowUp" || code === "KeyW" || code === "Numpad8") this.up.toggle(pressed)
        if (code === "ArrowDown" || code === "KeyS" || code === "Numpad2") this.down.toggle(pressed)
        if (code === "ArrowLeft" || code === "KeyA" || code === "Numpad4") this.left.toggle(pressed)
        if (code === "ArrowRight" || code === "KeyD" || code === "Numpad6")
            this.right.toggle(pressed)

        if (code === "Space" || code === "ControlLeft" || code === "KeyC" || code === "Numpad0") {
            this.attack.toggle(pressed)
            event.preventDefault()
        }

        if (code === "Tab" || code === "Enter" || code === "KeyX" || code === "AltLeft") {
            this.menu.toggle(pressed)
            event.preventDefault()
        }
    }
}

function getInputState(input: InputController): State.InputState {
    return {
        up: input.up.down,
        down: input.down.down,
        left: input.left.down,
        right: input.right.down,
        attackClicked: input.attack.clicked,
        menuClicked: input.menu.clicked,
    }
}

function addTextSprites(
    text: string,
    x: number,
    y: number,
    tintCode: number,
    output: UiSpriteInstance[],
): void {
    const upper = text.toUpperCase()
    for (let i = 0; i < upper.length; i += 1) {
        const index = FONT_CHARS.indexOf(upper[i])
        if (index < 0) continue
        output.push({
            screenX: x + i * 8,
            screenY: y,
            frameId: index + FONT_ROW * 32,
            flipBits: 0,
            tintCode,
        })
    }
}

function buildRenderFrame(
    state: GameState,
    dirtyTiles: Array<{ x: number; y: number }>,
    width: number,
    height: number,
): RenderFrame {
    const mapTiles: TileInstance[] = []
    if (state.mode !== "title") {
        for (let y = 0; y < state.map.length; y += 1) {
            for (let x = 0; x < state.map[y].length; x += 1) {
                buildTileInstances(state, x, y, state.tickCount, mapTiles)
            }
        }
    }

    const sprites: SpriteInstance[] = []

    if (state.mode === "playing" || state.mode === "dead") {
        const walkDist = state.player.moving ? state.tickCount : 0
        const playerFrames = createMobFrame(state.player.direction, walkDist)
        const playerTint = state.player.hurtTime > 0 ? PLAYER_HURT_TINT : PLAYER_TINT
        const px = state.player.position.x
        const py = state.player.position.y

        sprites.push({
            worldX: px + SPRITE_LEFT_X,
            worldY: py + SPRITE_TOP_Y,
            zLayer: 1,
            frameId: playerFrames.flipTop ? playerFrames.frameRight : playerFrames.frameLeft,
            flipBits: playerFrames.flipTop,
            tintCode: playerTint,
            alpha: 1,
        })
        sprites.push({
            worldX: px + SPRITE_RIGHT_X,
            worldY: py + SPRITE_TOP_Y,
            zLayer: 1,
            frameId: playerFrames.flipTop ? playerFrames.frameLeft : playerFrames.frameRight,
            flipBits: playerFrames.flipTop,
            tintCode: playerTint,
            alpha: 1,
        })
        sprites.push({
            worldX: px + SPRITE_LEFT_X,
            worldY: py + SPRITE_BOTTOM_Y,
            zLayer: 1,
            frameId: playerFrames.flipBottom
                ? playerFrames.frameRight + 32
                : playerFrames.frameLeft + 32,
            flipBits: playerFrames.flipBottom,
            tintCode: playerTint,
            alpha: 1,
        })
        sprites.push({
            worldX: px + SPRITE_RIGHT_X,
            worldY: py + SPRITE_BOTTOM_Y,
            zLayer: 1,
            frameId: playerFrames.flipBottom
                ? playerFrames.frameLeft + 32
                : playerFrames.frameRight + 32,
            flipBits: playerFrames.flipBottom,
            tintCode: playerTint,
            alpha: 1,
        })

        if (state.player.attackTime > 0) {
            let ax = px
            let ay = py
            if (state.player.attackDir === "up") ay -= 0.9
            if (state.player.attackDir === "down") ay += 0.9
            if (state.player.attackDir === "left") ax -= 0.9
            if (state.player.attackDir === "right") ax += 0.9

            sprites.push({
                worldX: ax,
                worldY: ay,
                zLayer: 1.4,
                frameId: 6 + 13 * 32,
                flipBits: 0,
                tintCode: Color.get(-1, 555, 555, 555),
                alpha: 1,
            })
        }

        for (const enemy of state.enemies) {
            const enemyFrames = createMobFrame(enemy.direction, enemy.walkDist + state.tickCount)
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
                    worldX: enemy.position.x + SPRITE_LEFT_X,
                    worldY: enemy.position.y + SPRITE_TOP_Y + jumpOffset,
                    zLayer: 1,
                    frameId: slimeBase,
                    flipBits: 0,
                    tintCode: tint,
                    alpha: 1,
                })
                sprites.push({
                    worldX: enemy.position.x + SPRITE_RIGHT_X,
                    worldY: enemy.position.y + SPRITE_TOP_Y + jumpOffset,
                    zLayer: 1,
                    frameId: slimeBase + 1,
                    flipBits: 0,
                    tintCode: tint,
                    alpha: 1,
                })
                sprites.push({
                    worldX: enemy.position.x + SPRITE_LEFT_X,
                    worldY: enemy.position.y + SPRITE_BOTTOM_Y + jumpOffset,
                    zLayer: 1,
                    frameId: slimeBase + 32,
                    flipBits: 0,
                    tintCode: tint,
                    alpha: 1,
                })
                sprites.push({
                    worldX: enemy.position.x + SPRITE_RIGHT_X,
                    worldY: enemy.position.y + SPRITE_BOTTOM_Y + jumpOffset,
                    zLayer: 1,
                    frameId: slimeBase + 33,
                    flipBits: 0,
                    tintCode: tint,
                    alpha: 1,
                })
            } else {
                sprites.push({
                    worldX: enemy.position.x + SPRITE_LEFT_X,
                    worldY: enemy.position.y + SPRITE_TOP_Y,
                    zLayer: 1,
                    frameId: enemyFrames.flipTop ? enemyFrames.frameRight : enemyFrames.frameLeft,
                    flipBits: enemyFrames.flipTop,
                    tintCode: tint,
                    alpha: 1,
                })
                sprites.push({
                    worldX: enemy.position.x + SPRITE_RIGHT_X,
                    worldY: enemy.position.y + SPRITE_TOP_Y,
                    zLayer: 1,
                    frameId: enemyFrames.flipTop ? enemyFrames.frameLeft : enemyFrames.frameRight,
                    flipBits: enemyFrames.flipTop,
                    tintCode: tint,
                    alpha: 1,
                })
                sprites.push({
                    worldX: enemy.position.x + SPRITE_LEFT_X,
                    worldY: enemy.position.y + SPRITE_BOTTOM_Y,
                    zLayer: 1,
                    frameId: enemyFrames.flipBottom
                        ? enemyFrames.frameRight + 32
                        : enemyFrames.frameLeft + 32,
                    flipBits: enemyFrames.flipBottom,
                    tintCode: tint,
                    alpha: 1,
                })
                sprites.push({
                    worldX: enemy.position.x + SPRITE_RIGHT_X,
                    worldY: enemy.position.y + SPRITE_BOTTOM_Y,
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
            for (let i = 0; i < text.text.length; i += 1) {
                const ch = text.text[i].toUpperCase()
                const index = FONT_CHARS.indexOf(ch)
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
    }

    const uiSprites: UiSpriteInstance[] = []

    if (state.mode === "title") {
        const titleColor = Color.get(0, 10, 131, 551)
        const xo = Math.floor(width / 2) - Math.floor((13 * 8) / 2)
        const yo = Math.floor(height / 2) - 64

        for (let row = 0; row < 2; row += 1) {
            for (let col = 0; col < 13; col += 1) {
                uiSprites.push({
                    screenX: xo + col * 8,
                    screenY: yo + row * 8,
                    frameId: col + (row + 6) * 32,
                    flipBits: 0,
                    tintCode: titleColor,
                })
            }
        }

        addTextSprites(
            "> START GAME <",
            Math.floor(width / 2) - 56,
            Math.floor(height / 2) - 8,
            UI_TINT,
            uiSprites,
        )
        addTextSprites(
            "PRESS C TO START",
            Math.floor(width / 2) - 56,
            Math.floor(height / 2) + 8,
            UI_DIM_TINT,
            uiSprites,
        )
        addTextSprites(
            "ARROWS OR WASD",
            Math.floor(width / 2) - 52,
            Math.floor(height / 2) + 24,
            UI_DIM_TINT,
            uiSprites,
        )
    } else {
        for (let i = 0; i < 10; i += 1) {
            const healthTint =
                i < state.player.health ? Color.get(0, 200, 500, 533) : Color.get(0, 100, 0, 0)
            uiSprites.push({
                screenX: i * 8,
                screenY: height - 16,
                frameId: 12 * 32,
                flipBits: 0,
                tintCode: healthTint,
            })

            const staminaTint =
                state.player.staminaRechargeDelay > 0
                    ? (state.player.staminaRechargeDelay / 4) % 2 === 0
                        ? Color.get(0, 555, 0, 0)
                        : Color.get(0, 110, 0, 0)
                    : i < state.player.stamina
                      ? Color.get(0, 220, 550, 553)
                      : Color.get(0, 110, 0, 0)

            uiSprites.push({
                screenX: i * 8,
                screenY: height - 8,
                frameId: 1 + 12 * 32,
                flipBits: 0,
                tintCode: staminaTint,
            })
        }

        addTextSprites(`SCORE ${state.player.score}`, 96, height - 16, UI_TINT, uiSprites)
        addTextSprites(
            `SLIME ${State.inventoryAmount(state.inventory, "slime")}`,
            96,
            height - 8,
            UI_DIM_TINT,
            uiSprites,
        )

        if (state.mode === "dead") {
            addTextSprites(
                "YOU DIED",
                Math.floor(width / 2) - 28,
                Math.floor(height / 2) - 8,
                TEXT_TINT,
                uiSprites,
            )
            addTextSprites(
                "PRESS C TO RESTART",
                Math.floor(width / 2) - 68,
                Math.floor(height / 2) + 8,
                UI_DIM_TINT,
                uiSprites,
            )
        }
    }

    return {
        cameraX: state.player.position.x,
        cameraY: state.player.position.y,
        mapTiles,
        sprites,
        uiSprites,
        lights: [],
        dirtyTiles,
    }
}

async function loadAssets(): Promise<{
    atlasTexture: THREE.Texture
    paletteTexture: THREE.DataTexture
}> {
    const loader = new THREE.TextureLoader()
    const atlasTexture = await loader.loadAsync("/assets/minicraft/icons.png")
    atlasTexture.flipY = false
    atlasTexture.magFilter = THREE.NearestFilter
    atlasTexture.minFilter = THREE.NearestFilter
    atlasTexture.generateMipmaps = false
    atlasTexture.wrapS = THREE.ClampToEdgeWrapping
    atlasTexture.wrapT = THREE.ClampToEdgeWrapping
    atlasTexture.needsUpdate = true

    const paletteTexture = Palette.create()

    return { atlasTexture, paletteTexture }
}

async function bootstrap(): Promise<void> {
    if (!(window as unknown as { WebGL2RenderingContext?: unknown }).WebGL2RenderingContext) {
        throw new Error("WebGL2 is required")
    }

    const root = document.getElementById("root")
    if (!root) throw new Error("Missing #root")

    const canvas = document.createElement("canvas")
    canvas.className = "game-canvas"
    root.appendChild(canvas)

    const assets = await loadAssets()
    const renderer = new Renderer()
    renderer.init(canvas, assets)
    renderer.resize(window.innerWidth, window.innerHeight)

    const input = new InputController()
    input.bind()

    const state = State.create()
    let dirtyTiles: Array<{ x: number; y: number }> = []

    let accumulator = 0
    let last = performance.now()

    const frame = () => {
        const now = performance.now()
        const delta = now - last
        last = now
        accumulator += Math.min(delta, 100)

        while (accumulator >= TICK_MS) {
            input.tick()
            const result = State.tick(state, getInputState(input))
            dirtyTiles = result.dirtyTiles
            accumulator -= TICK_MS
        }

        const renderFrame = buildRenderFrame(
            state,
            dirtyTiles,
            window.innerWidth,
            window.innerHeight,
        )
        renderer.render(state, renderFrame)
        dirtyTiles = []
        requestAnimationFrame(frame)
    }

    window.addEventListener("resize", () => {
        renderer.resize(window.innerWidth, window.innerHeight)
    })

    requestAnimationFrame(frame)
}

bootstrap().catch((error) => {
    const root = document.getElementById("root")
    if (root) {
        root.innerHTML =
            '<p style="padding:16px;color:#fff;background:#111">Unable to start game.</p>'
    }
    console.error(error)
})
