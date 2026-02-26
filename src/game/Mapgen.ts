import { GameTile, MAP_SIZE, TileType } from "./types"

export namespace Mapgen {
    const MULTIPLIER = 0x5deece66dn
    const ADDEND = 0xbn
    const MASK = (1n << 48n) - 1n

    enum SourceTile {
        WATER = 0,
        GRASS = 1,
        ROCK = 2,
        SAND = 3,
        TREE = 4,
        FLOWER = 5,
        CACTUS = 6,
        STAIRS_DOWN = 7,
    }

    interface RandomGenerator {
        nextFloat: () => number
        nextInt: (bound: number) => number
    }

    namespace Random48 {
        interface State {
            seed: bigint
        }

        function next(state: State, bits: number): number {
            state.seed = (state.seed * MULTIPLIER + ADDEND) & MASK
            return Number(state.seed >> BigInt(48 - bits))
        }

        export function create(seed: number): RandomGenerator {
            const state: State = {
                seed: (BigInt(Math.floor(seed)) ^ MULTIPLIER) & MASK,
            }

            const nextFloat = (): number => next(state, 24) / (1 << 24)

            const nextInt = (bound: number): number => {
                if (bound <= 0) {
                    throw new Error("bound must be positive")
                }

                if ((bound & -bound) === bound) {
                    return Math.floor((bound * next(state, 31)) / 0x80000000)
                }

                let bits = 0
                let value = 0
                do {
                    bits = next(state, 31)
                    value = bits % bound
                } while (((bits - value + (bound - 1)) | 0) < 0)

                return value
            }

            return { nextFloat, nextInt }
        }
    }

    interface NoiseField {
        values: number[]
        w: number
        h: number
    }

    namespace NoiseField {
        function sample(field: NoiseField, x: number, y: number): number {
            return field.values[(x & (field.w - 1)) + (y & (field.h - 1)) * field.w]
        }

        function setSample(field: NoiseField, x: number, y: number, value: number): void {
            field.values[(x & (field.w - 1)) + (y & (field.h - 1)) * field.w] = value
        }

        export function create(
            w: number,
            h: number,
            featureSize: number,
            random: RandomGenerator,
        ): NoiseField {
            const field: NoiseField = {
                w,
                h,
                values: new Array<number>(w * h).fill(0),
            }

            for (let y = 0; y < w; y += featureSize) {
                for (let x = 0; x < w; x += featureSize) {
                    setSample(field, x, y, random.nextFloat() * 2 - 1)
                }
            }

            let stepSize = featureSize
            let scale = 1.0 / w
            let scaleMod = 1
            do {
                const halfStep = Math.floor(stepSize / 2)
                for (let y = 0; y < w; y += stepSize) {
                    for (let x = 0; x < w; x += stepSize) {
                        const a = sample(field, x, y)
                        const b = sample(field, x + stepSize, y)
                        const c = sample(field, x, y + stepSize)
                        const d = sample(field, x + stepSize, y + stepSize)
                        const e =
                            (a + b + c + d) / 4.0 + (random.nextFloat() * 2 - 1) * stepSize * scale
                        setSample(field, x + halfStep, y + halfStep, e)
                    }
                }

                for (let y = 0; y < w; y += stepSize) {
                    for (let x = 0; x < w; x += stepSize) {
                        const a = sample(field, x, y)
                        const b = sample(field, x + stepSize, y)
                        const c = sample(field, x, y + stepSize)
                        const d = sample(field, x + halfStep, y + halfStep)
                        const e = sample(field, x + halfStep, y - halfStep)
                        const f = sample(field, x - halfStep, y + halfStep)

                        const H =
                            (a + b + d + e) / 4.0 +
                            (random.nextFloat() * 2 - 1) * stepSize * scale * 0.5
                        const g =
                            (a + c + d + f) / 4.0 +
                            (random.nextFloat() * 2 - 1) * stepSize * scale * 0.5

                        setSample(field, x + halfStep, y, H)
                        setSample(field, x, y + halfStep, g)
                    }
                }

                stepSize = Math.floor(stepSize / 2)
                scale *= scaleMod + 0.8
                scaleMod *= 0.3
            } while (stepSize > 1)

            return field
        }
    }

    function createTile(type: TileType): GameTile {
        return { type, damage: 0 }
    }

    function createTopMap(
        w: number,
        h: number,
        random: RandomGenerator,
    ): { map: number[]; data: number[] } {
        const mnoise1 = NoiseField.create(w, h, 16, random)
        const mnoise2 = NoiseField.create(w, h, 16, random)
        const mnoise3 = NoiseField.create(w, h, 16, random)

        const noise1 = NoiseField.create(w, h, 32, random)
        const noise2 = NoiseField.create(w, h, 32, random)

        const map = new Array<number>(w * h).fill(SourceTile.GRASS)
        const data = new Array<number>(w * h).fill(0)

        for (let y = 0; y < h; y += 1) {
            for (let x = 0; x < w; x += 1) {
                const i = x + y * w

                let val = Math.abs(noise1.values[i] - noise2.values[i]) * 3 - 2
                let mval = Math.abs(mnoise1.values[i] - mnoise2.values[i])
                mval = Math.abs(mval - mnoise3.values[i]) * 3 - 2

                let xd = (x / (w - 1.0)) * 2 - 1
                let yd = (y / (h - 1.0)) * 2 - 1
                if (xd < 0) xd = -xd
                if (yd < 0) yd = -yd

                let dist = xd >= yd ? xd : yd
                dist = dist * dist * dist * dist
                dist = dist * dist * dist * dist
                val = val + 1 - dist * 20

                if (val < -0.5) {
                    map[i] = SourceTile.WATER
                } else if (val > 0.5 && mval < -1.5) {
                    map[i] = SourceTile.ROCK
                } else {
                    map[i] = SourceTile.GRASS
                }
            }
        }

        for (let i = 0; i < (w * h) / 2800; i += 1) {
            const xs = random.nextInt(w)
            const ys = random.nextInt(h)
            for (let k = 0; k < 10; k += 1) {
                const x = xs + random.nextInt(21) - 10
                const y = ys + random.nextInt(21) - 10
                for (let j = 0; j < 100; j += 1) {
                    const xo = x + random.nextInt(5) - random.nextInt(5)
                    const yo = y + random.nextInt(5) - random.nextInt(5)
                    for (let yy = yo - 1; yy <= yo + 1; yy += 1) {
                        for (let xx = xo - 1; xx <= xo + 1; xx += 1) {
                            if (xx >= 0 && yy >= 0 && xx < w && yy < h) {
                                if (map[xx + yy * w] === SourceTile.GRASS) {
                                    map[xx + yy * w] = SourceTile.SAND
                                }
                            }
                        }
                    }
                }
            }
        }

        for (let i = 0; i < (w * h) / 400; i += 1) {
            const x = random.nextInt(w)
            const y = random.nextInt(h)
            for (let j = 0; j < 200; j += 1) {
                const xx = x + random.nextInt(15) - random.nextInt(15)
                const yy = y + random.nextInt(15) - random.nextInt(15)
                if (xx >= 0 && yy >= 0 && xx < w && yy < h) {
                    if (map[xx + yy * w] === SourceTile.GRASS) {
                        map[xx + yy * w] = SourceTile.TREE
                    }
                }
            }
        }

        for (let i = 0; i < (w * h) / 400; i += 1) {
            const x = random.nextInt(w)
            const y = random.nextInt(h)
            const col = random.nextInt(4)
            for (let j = 0; j < 30; j += 1) {
                const xx = x + random.nextInt(5) - random.nextInt(5)
                const yy = y + random.nextInt(5) - random.nextInt(5)
                if (xx >= 0 && yy >= 0 && xx < w && yy < h) {
                    if (map[xx + yy * w] === SourceTile.GRASS) {
                        map[xx + yy * w] = SourceTile.FLOWER
                        data[xx + yy * w] = col + random.nextInt(4) * 16
                    }
                }
            }
        }

        for (let i = 0; i < (w * h) / 100; i += 1) {
            const xx = random.nextInt(w)
            const yy = random.nextInt(h)
            if (xx >= 0 && yy >= 0 && xx < w && yy < h) {
                if (map[xx + yy * w] === SourceTile.SAND) {
                    map[xx + yy * w] = SourceTile.CACTUS
                }
            }
        }

        let count = 0
        stairsLoop: for (let i = 0; i < (w * h) / 100; i += 1) {
            const x = random.nextInt(w - 2) + 1
            const y = random.nextInt(h - 2) + 1

            for (let yy = y - 1; yy <= y + 1; yy += 1) {
                for (let xx = x - 1; xx <= x + 1; xx += 1) {
                    if (map[xx + yy * w] !== SourceTile.ROCK) {
                        continue stairsLoop
                    }
                }
            }

            map[x + y * w] = SourceTile.STAIRS_DOWN
            count += 1
            if (count === 4) break
        }

        return { map, data }
    }

    function mapSourceTileToGameTile(type: number): TileType {
        if (type === SourceTile.WATER) return TileType.WATER
        if (type === SourceTile.GRASS) return TileType.GRASS
        if (type === SourceTile.ROCK) return TileType.ROCK
        if (type === SourceTile.SAND) return TileType.SAND
        if (type === SourceTile.TREE) return TileType.TREE
        if (type === SourceTile.FLOWER) return TileType.FLOWER
        if (type === SourceTile.CACTUS) return TileType.CACTUS
        return TileType.ROCK
    }

    export function generate(seed?: number): GameTile[][] {
        const defaultSeed = Date.now() + Math.floor(Math.random() * 1_000_000)
        const random = Random48.create(seed ?? defaultSeed)
        const w = MAP_SIZE
        const h = MAP_SIZE

        while (true) {
            const { map } = createTopMap(w, h, random)
            let rockCount = 0
            let sandCount = 0
            let grassCount = 0
            let treeCount = 0
            let stairsCount = 0

            for (let i = 0; i < w * h; i += 1) {
                const tile = map[i]
                if (tile === SourceTile.ROCK) rockCount += 1
                if (tile === SourceTile.SAND) sandCount += 1
                if (tile === SourceTile.GRASS) grassCount += 1
                if (tile === SourceTile.TREE) treeCount += 1
                if (tile === SourceTile.STAIRS_DOWN) stairsCount += 1
            }

            if (rockCount < 100) continue
            if (sandCount < 100) continue
            if (grassCount < 100) continue
            if (treeCount < 100) continue
            if (stairsCount < 2) continue

            const output: GameTile[][] = []
            for (let y = 0; y < h; y += 1) {
                const row: GameTile[] = []
                for (let x = 0; x < w; x += 1) {
                    row.push(createTile(mapSourceTileToGameTile(map[x + y * w])))
                }
                output.push(row)
            }
            return output
        }
    }
}
