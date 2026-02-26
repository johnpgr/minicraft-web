import { Color } from "../assets/Color"
import { type GameState, TileType } from "../types"
import type { TileInstance } from "./types"

export namespace TileBuilder {
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

    export function buildMapTiles(state: GameState): TileInstance[] {
        const mapTiles: TileInstance[] = []
        if (state.mode === "title") return mapTiles

        for (let y = 0; y < state.map.length; y += 1) {
            for (let x = 0; x < state.map[y].length; x += 1) {
                buildTileInstances(state, x, y, state.tickCount, mapTiles)
            }
        }

        return mapTiles
    }
}
