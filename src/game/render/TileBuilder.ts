import { Color } from "../assets/Color"
import { type GameState, TileType } from "../types"
import { Chunks } from "./Chunks"
import type {
    MapChunkBuildResult,
    MapChunkData,
    MapChunkKey,
    TileInstance,
    WaterAnimInstance,
} from "./types"

export namespace TileBuilder {
    const WATER_ANIM_TICK_DIVISOR = 10

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
        waterAnim: WaterAnimInstance[],
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
        const animated: [boolean, boolean, boolean, boolean] = [
            !u && !l,
            !u && !r,
            !d && !l,
            !d && !r,
        ]
        const baseIndex = output.length

        const frames: [number, number, number, number] = [
            animated[0] ? anim(0) : (l ? 14 : 15) + (u ? 0 : 1) * 32,
            animated[1] ? anim(1) : (r ? 16 : 15) + (u ? 0 : 1) * 32,
            animated[2] ? anim(2) : (l ? 14 : 15) + (d ? 2 : 1) * 32,
            animated[3] ? anim(3) : (r ? 16 : 15) + (d ? 2 : 1) * 32,
        ]

        const flips: [number, number, number, number] = [
            animated[0] ? anim(4) : 0,
            animated[1] ? anim(5) : 0,
            animated[2] ? anim(6) : 0,
            animated[3] ? anim(7) : 0,
        ]

        const tints: [number, number, number, number] = [
            !u && !l ? col : su || sl ? transition2 : transition1,
            !u && !r ? col : su || sr ? transition2 : transition1,
            !d && !l ? col : sd || sl ? transition2 : transition1,
            !d && !r ? col : sd || sr ? transition2 : transition1,
        ]

        pushTileQuad(output, x, y, frames, tints, flips)
        for (let i = 0; i < 4; i += 1) {
            if (!animated[i]) continue
            waterAnim.push({
                instanceIndex: baseIndex + i,
                tileX: x,
                tileY: y,
                frameSalt: i,
                flipSalt: i + 4,
            })
        }
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
        waterAnim: WaterAnimInstance[],
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
            pushWaterTile(state, x, y, tick, output, waterAnim)
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
        if (tileType === TileType.CACTUS) {
            // Render sand underneath and overlay cactus with transparent background.
            pushSandTile(state, x, y, output)
            const cactus = Color.get(20, 40, 50, -1)
            pushTileQuad(
                output,
                x,
                y,
                [8 + 2 * 32, 9 + 2 * 32, 8 + 3 * 32, 9 + 3 * 32],
                [cactus, cactus, cactus, cactus],
            )
            return
        }
    }

    let cachedMapRef: GameState["map"] | null = null
    let lastAnimatedTick = -1
    const cachedMapChunksByKey = new Map<MapChunkKey, MapChunkData>()
    const waterChunkKeys = new Set<MapChunkKey>()

    function parseChunkKey(chunkKey: MapChunkKey): { chunkX: number; chunkY: number } {
        const [rawX, rawY] = chunkKey.split(":")
        return { chunkX: Number(rawX), chunkY: Number(rawY) }
    }

    function clearCache(): void {
        cachedMapChunksByKey.clear()
        waterChunkKeys.clear()
    }

    function mapSize(state: GameState): { width: number; height: number } {
        return { width: state.map[0]?.length ?? 0, height: state.map.length }
    }

    function chunkBounds(
        state: GameState,
    ): { minChunkX: number; minChunkY: number; maxChunkX: number; maxChunkY: number } | null {
        const { width, height } = mapSize(state)
        if (width === 0 || height === 0) return null

        const min = Chunks.coords(0, 0)
        const max = Chunks.coords(width - 1, height - 1)
        return {
            minChunkX: min.chunkX,
            minChunkY: min.chunkY,
            maxChunkX: max.chunkX,
            maxChunkY: max.chunkY,
        }
    }

    function allChunkKeys(state: GameState): Set<MapChunkKey> {
        const keys = new Set<MapChunkKey>()
        const bounds = chunkBounds(state)
        if (!bounds) return keys

        for (let chunkY = bounds.minChunkY; chunkY <= bounds.maxChunkY; chunkY += 1) {
            for (let chunkX = bounds.minChunkX; chunkX <= bounds.maxChunkX; chunkX += 1) {
                keys.add(Chunks.key(chunkX, chunkY))
            }
        }
        return keys
    }

    function addNeighborChunkKeys(
        dirtyChunkKeys: Set<MapChunkKey>,
        tileX: number,
        tileY: number,
    ): void {
        for (let ny = tileY - 1; ny <= tileY + 1; ny += 1) {
            for (let nx = tileX - 1; nx <= tileX + 1; nx += 1) {
                const { chunkX, chunkY } = Chunks.coords(nx, ny)
                dirtyChunkKeys.add(Chunks.key(chunkX, chunkY))
            }
        }
    }

    function rebuildChunk(
        state: GameState,
        chunkKey: MapChunkKey,
        tick: number,
    ): void {
        const { width, height } = mapSize(state)
        const { chunkX, chunkY } = parseChunkKey(chunkKey)

        const rawStartX = chunkX * Chunks.CHUNK_SIZE
        const rawStartY = chunkY * Chunks.CHUNK_SIZE
        const rawEndX = rawStartX + Chunks.CHUNK_SIZE - 1
        const rawEndY = rawStartY + Chunks.CHUNK_SIZE - 1

        const startX = Math.max(0, rawStartX)
        const startY = Math.max(0, rawStartY)
        const endX = Math.min(width - 1, rawEndX)
        const endY = Math.min(height - 1, rawEndY)

        if (startX > endX || startY > endY) {
            cachedMapChunksByKey.delete(chunkKey)
            waterChunkKeys.delete(chunkKey)
            return
        }

        const tiles: TileInstance[] = []
        const waterAnim: WaterAnimInstance[] = []
        let hasWater = false

        for (let y = startY; y <= endY; y += 1) {
            for (let x = startX; x <= endX; x += 1) {
                buildTileInstances(state, x, y, tick, tiles, waterAnim)
                if (state.map[y][x].type === TileType.WATER) {
                    hasWater = true
                }
            }
        }

        cachedMapChunksByKey.set(chunkKey, {
            key: chunkKey,
            chunkX,
            chunkY,
            tiles,
            waterAnim,
        })
        if (hasWater) {
            waterChunkKeys.add(chunkKey)
        } else {
            waterChunkKeys.delete(chunkKey)
        }
    }

    function applyWaterAnimation(chunk: MapChunkData, tick: number): void {
        if (chunk.waterAnim.length === 0) return
        for (const anim of chunk.waterAnim) {
            const frame = Math.abs(
                (anim.tileX * 97_531 + anim.tileY * 31_777 + tick * 131 + anim.frameSalt * 71) | 0,
            ) % 4
            const flip = Math.abs(
                (anim.tileX * 97_531 + anim.tileY * 31_777 + tick * 131 + anim.flipSalt * 71) | 0,
            ) % 4
            const tile = chunk.tiles[anim.instanceIndex]
            tile.tileId = frame
            tile.flipBits = flip
        }
    }

    export function buildMapChunks(
        state: GameState,
        dirtyTiles: Array<{ x: number; y: number }>,
    ): MapChunkBuildResult {
        if (state.mode === "title") {
            clearCache()
            return {
                mapChunksByKey: cachedMapChunksByKey,
                dirtyChunkKeys: new Set<MapChunkKey>(),
                animatedChunkKeys: new Set<MapChunkKey>(),
            }
        }

        const mapChanged = cachedMapRef !== state.map
        if (mapChanged) {
            cachedMapRef = state.map
            lastAnimatedTick = -1
            clearCache()
        }
        const waterAnimTick = Math.floor(state.tickCount / WATER_ANIM_TICK_DIVISOR)

        const dirtyChunkKeys = new Set<MapChunkKey>()
        const animatedChunkKeys = new Set<MapChunkKey>()
        if (cachedMapChunksByKey.size === 0 || mapChanged) {
            for (const chunkKey of allChunkKeys(state)) {
                dirtyChunkKeys.add(chunkKey)
            }
        }

        for (const dirty of dirtyTiles) {
            addNeighborChunkKeys(dirtyChunkKeys, dirty.x, dirty.y)
        }

        if (waterAnimTick !== lastAnimatedTick) {
            for (const chunkKey of waterChunkKeys) {
                if (dirtyChunkKeys.has(chunkKey)) continue
                const chunk = cachedMapChunksByKey.get(chunkKey)
                if (!chunk) continue
                applyWaterAnimation(chunk, waterAnimTick)
                dirtyChunkKeys.add(chunkKey)
                animatedChunkKeys.add(chunkKey)
            }
            lastAnimatedTick = waterAnimTick
        }

        for (const chunkKey of dirtyChunkKeys) {
            rebuildChunk(state, chunkKey, waterAnimTick)
        }

        return {
            mapChunksByKey: cachedMapChunksByKey,
            dirtyChunkKeys,
            animatedChunkKeys,
        }
    }
}
