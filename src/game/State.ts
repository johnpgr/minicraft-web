import { Mapgen } from "./Mapgen"
import {
    type Direction,
    type EnemyState,
    type FloatingText,
    type GameState,
    type InventoryItem,
    MAP_SIZE,
    type Position,
    TileType,
} from "./types"

export namespace State {
    let nextEnemyId = 1
    let nextDropId = 1
    let nextTextId = 1
    const MOB_XR = 4 / 16
    const MOB_YR = 3 / 16

    type ActorRef = { kind: "player" } | { kind: "enemy"; enemy: EnemyState }

    function worldToTile(value: number): number {
        // World tiles are centered on integer coordinates in this renderer.
        // Convert world coordinate to tile index with a half-tile offset.
        return Math.floor(value + 0.5)
    }

    function clamp(value: number, min: number, max: number): number {
        return Math.max(min, Math.min(max, value))
    }

    function randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min
    }

    function randomDirection(): Direction {
        const dir = randomInt(0, 3)
        if (dir === 0) return "down"
        if (dir === 1) return "up"
        if (dir === 2) return "left"
        return "right"
    }

    function tileMayPass(type: TileType, canSwim: boolean): boolean {
        if (type === TileType.WATER) return canSwim
        return type !== TileType.ROCK && type !== TileType.TREE && type !== TileType.CACTUS
    }

    function isPassable(type: TileType): boolean {
        return tileMayPass(type, false)
    }

    function tileAt(state: GameState, x: number, y: number) {
        if (x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE) return null
        return state.map[y][x]
    }

    function findStartPosition(map: GameState["map"]): Position {
        const center = Math.floor(MAP_SIZE / 2)
        if (isPassable(map[center][center].type)) {
            return { x: center, y: center }
        }

        for (let radius = 1; radius < MAP_SIZE; radius += 1) {
            const minX = Math.max(0, center - radius)
            const maxX = Math.min(MAP_SIZE - 1, center + radius)
            const minY = Math.max(0, center - radius)
            const maxY = Math.min(MAP_SIZE - 1, center + radius)

            for (let y = minY; y <= maxY; y += 1) {
                for (let x = minX; x <= maxX; x += 1) {
                    const onBorder = x === minX || x === maxX || y === minY || y === maxY
                    if (!onBorder) continue
                    if (isPassable(map[y][x].type)) {
                        return { x, y }
                    }
                }
            }
        }

        return { x: center, y: center }
    }

    export interface InputState {
        up: boolean
        down: boolean
        left: boolean
        right: boolean
        upClicked: boolean
        downClicked: boolean
        attackClicked: boolean
        menuClicked: boolean
    }

    export interface TickResult {
        dirtyTiles: Array<{ x: number; y: number }>
    }

    export function create(): GameState {
        const map = Mapgen.generate()
        const startPosition = findStartPosition(map)
        return {
            map,
            player: {
                position: startPosition,
                direction: "down",
                walkDist: 0,
                health: 10,
                maxHealth: 10,
                stamina: 10,
                maxStamina: 10,
                staminaRecharge: 0,
                staminaRechargeDelay: 0,
                moving: false,
                hurtTime: 0,
                invulnerableTime: 0,
                attackTime: 0,
                attackDir: "down",
                attackCooldown: 0,
                xKnockback: 0,
                yKnockback: 0,
                swimTimer: 0,
                score: 0,
            },
            enemies: [],
            drops: [],
            floatingTexts: [],
            inventory: [],
            titleSelection: 0,
            mode: "title",
            tickCount: 0,
            gameTime: 0,
        }
    }

    function addInventory(state: GameState, id: string, name: string, quantity: number): void {
        const existing = state.inventory.find((item) => item.id === id)
        if (existing) {
            existing.quantity += quantity
        } else {
            state.inventory.push({ id, name, quantity })
        }
    }

    function addText(state: GameState, text: string, pos: Position, tintCode: number): void {
        const entry: FloatingText = {
            id: nextTextId++,
            text,
            position: { x: pos.x, y: pos.y },
            velocity: { x: (Math.random() - 0.5) * 0.2, y: -0.05 - Math.random() * 0.08 },
            z: 0,
            za: 0.35 + Math.random() * 0.4,
            age: 0,
            lifeTime: 60,
            tintCode,
        }
        state.floatingTexts.push(entry)
    }

    function actorId(actor: ActorRef): string {
        if (actor.kind === "player") return "player"
        return `enemy:${actor.enemy.id}`
    }

    function actorPosition(state: GameState, actor: ActorRef): Position {
        if (actor.kind === "player") return state.player.position
        return actor.enemy.position
    }

    function actorCanSwim(actor: ActorRef): boolean {
        return actor.kind === "player"
    }

    function actorBlocks(actor: ActorRef, _mover: ActorRef): boolean {
        // Player and mobs are all blockable by mobs in original Minicraft.
        return actor.kind === "player" || actor.kind === "enemy"
    }

    function intersectsRect(
        pos: Position,
        x0: number,
        y0: number,
        x1: number,
        y1: number,
    ): boolean {
        return !(
            pos.x + MOB_XR < x0 ||
            pos.y + MOB_YR < y0 ||
            pos.x - MOB_XR > x1 ||
            pos.y - MOB_YR > y1
        )
    }

    function queryActorsInRect(
        state: GameState,
        x0: number,
        y0: number,
        x1: number,
        y1: number,
    ): ActorRef[] {
        const result: ActorRef[] = []
        if (intersectsRect(state.player.position, x0, y0, x1, y1)) {
            result.push({ kind: "player" })
        }

        for (const enemy of state.enemies) {
            if (enemy.health <= 0) continue
            if (intersectsRect(enemy.position, x0, y0, x1, y1)) {
                result.push({ kind: "enemy", enemy })
            }
        }

        return result
    }

    function handleTouch(state: GameState, target: ActorRef, source: ActorRef): void {
        if (target.kind === "player" && source.kind === "enemy") {
            const damage =
                source.enemy.kind === "slime" ? source.enemy.level : source.enemy.level + 1
            hurtPlayer(state, damage, source.enemy.direction)
            return
        }
        if (target.kind === "enemy" && source.kind === "player") {
            const damage =
                target.enemy.kind === "slime" ? target.enemy.level : target.enemy.level + 1
            hurtPlayer(state, damage, target.enemy.direction)
        }
    }

    function moveAxis(state: GameState, mover: ActorRef, xa: number, ya: number): boolean {
        if (xa !== 0 && ya !== 0) {
            throw new Error("moveAxis can only move along one axis at a time")
        }

        const pos = actorPosition(state, mover)
        const x = pos.x
        const y = pos.y

        const xto0 = worldToTile(x - MOB_XR)
        const yto0 = worldToTile(y - MOB_YR)
        const xto1 = worldToTile(x + MOB_XR)
        const yto1 = worldToTile(y + MOB_YR)

        const xt0 = worldToTile(x + xa - MOB_XR)
        const yt0 = worldToTile(y + ya - MOB_YR)
        const xt1 = worldToTile(x + xa + MOB_XR)
        const yt1 = worldToTile(y + ya + MOB_YR)

        for (let yt = yt0; yt <= yt1; yt += 1) {
            for (let xt = xt0; xt <= xt1; xt += 1) {
                if (xt >= xto0 && xt <= xto1 && yt >= yto0 && yt <= yto1) continue
                const tile = tileAt(state, xt, yt)
                if (!tile || !tileMayPass(tile.type, actorCanSwim(mover))) {
                    return false
                }
            }
        }

        const wasInside = queryActorsInRect(
            state,
            x - MOB_XR,
            y - MOB_YR,
            x + MOB_XR,
            y + MOB_YR,
        ).filter((actor) => actorId(actor) !== actorId(mover))
        const isInside = queryActorsInRect(
            state,
            x + xa - MOB_XR,
            y + ya - MOB_YR,
            x + xa + MOB_XR,
            y + ya + MOB_YR,
        ).filter((actor) => actorId(actor) !== actorId(mover))

        for (const actor of isInside) {
            handleTouch(state, actor, mover)
        }

        const wasInsideIds = new Set(wasInside.map((actor) => actorId(actor)))
        for (const actor of isInside) {
            if (wasInsideIds.has(actorId(actor))) continue
            if (actorBlocks(actor, mover)) {
                return false
            }
        }

        pos.x += xa
        pos.y += ya
        return true
    }

    function moveActor(state: GameState, actor: ActorRef, xa: number, ya: number): boolean {
        if (xa === 0 && ya === 0) return true

        let stopped = true
        if (xa !== 0 && moveAxis(state, actor, xa, 0)) stopped = false
        if (ya !== 0 && moveAxis(state, actor, 0, ya)) stopped = false
        return !stopped
    }

    export function canMoveTo(state: GameState, x: number, y: number): boolean {
        const x0 = worldToTile(x - MOB_XR)
        const x1 = worldToTile(x + MOB_XR)
        const y0 = worldToTile(y - MOB_YR)
        const y1 = worldToTile(y + MOB_YR)

        for (let ty = y0; ty <= y1; ty += 1) {
            for (let tx = x0; tx <= x1; tx += 1) {
                const tile = tileAt(state, tx, ty)
                if (!tile || !tileMayPass(tile.type, false)) return false
            }
        }

        return true
    }

    function spawnEnemy(state: GameState): void {
        if (state.enemies.length > 80) return
        if (state.tickCount % 60 !== 0) return

        if (Math.random() > 0.35) return

        const kind = Math.random() < 0.5 ? "slime" : "zombie"
        const level = 1

        for (let attempt = 0; attempt < 30; attempt += 1) {
            const x = randomInt(0, MAP_SIZE - 1)
            const y = randomInt(0, MAP_SIZE - 1)

            if (!canMoveTo(state, x, y)) continue

            const dx = state.player.position.x - x
            const dy = state.player.position.y - y
            if (dx * dx + dy * dy < 64) continue

            state.enemies.push({
                id: nextEnemyId++,
                kind,
                position: { x, y },
                direction: randomDirection(),
                health: kind === "slime" ? 5 : 10,
                maxHealth: kind === "slime" ? 5 : 10,
                level,
                hurtTime: 0,
                xKnockback: 0,
                yKnockback: 0,
                walkDist: 0,
                xa: 0,
                ya: 0,
                jumpTime: 0,
                randomWalkTime: 0,
                tickTime: 0,
            })
            return
        }
    }

    function updatePlayerMovement(state: GameState, input: InputState): void {
        const player = state.player

        let xa = 0
        let ya = 0

        if (input.up) {
            ya -= 1
        }
        if (input.down) {
            ya += 1
        }
        if (input.left) {
            xa -= 1
        }
        if (input.right) {
            xa += 1
        }

        const moving = xa !== 0 || ya !== 0
        player.moving = moving

        // Original Minicraft updates movement every other frame while stamina recharge delay is active.
        if (player.staminaRechargeDelay % 2 !== 0) return

        if (isPlayerSwimming(state)) {
            if (player.swimTimer++ % 2 === 0) return
        }

        while (player.xKnockback < 0) {
            moveAxis(state, { kind: "player" }, -1 / 16, 0)
            player.xKnockback += 1
        }
        while (player.xKnockback > 0) {
            moveAxis(state, { kind: "player" }, 1 / 16, 0)
            player.xKnockback -= 1
        }
        while (player.yKnockback < 0) {
            moveAxis(state, { kind: "player" }, 0, -1 / 16)
            player.yKnockback += 1
        }
        while (player.yKnockback > 0) {
            moveAxis(state, { kind: "player" }, 0, 1 / 16)
            player.yKnockback -= 1
        }

        if (player.hurtTime > 0) return
        if (!moving) return

        if (xa < 0) player.direction = "left"
        if (xa > 0) player.direction = "right"
        if (ya < 0) player.direction = "up"
        if (ya > 0) player.direction = "down"

        player.walkDist += 1
        moveActor(state, { kind: "player" }, xa / 16, ya / 16)
    }

    function isPlayerSwimming(state: GameState): boolean {
        const x = worldToTile(state.player.position.x)
        const y = worldToTile(state.player.position.y)
        const tile = tileAt(state, x, y)
        return tile?.type === TileType.WATER
    }

    function getAttackTargetRect(state: GameState): {
        x0: number
        y0: number
        x1: number
        y1: number
    } {
        const player = state.player
        const range = 1.25
        const x = player.position.x
        const y = player.position.y

        if (player.attackDir === "down") {
            return { x0: x - 0.6, x1: x + 0.6, y0: y + 0.3, y1: y + range }
        }
        if (player.attackDir === "up") {
            return { x0: x - 0.6, x1: x + 0.6, y0: y - range, y1: y - 0.3 }
        }
        if (player.attackDir === "left") {
            return { x0: x - range, x1: x - 0.3, y0: y - 0.6, y1: y + 0.6 }
        }
        return { x0: x + 0.3, x1: x + range, y0: y - 0.6, y1: y + 0.6 }
    }

    function handleTileAttack(state: GameState, dirtyTiles: Array<{ x: number; y: number }>): void {
        const player = state.player
        let tx = Math.round(player.position.x)
        let ty = Math.round(player.position.y)

        if (player.attackDir === "down") ty += 1
        if (player.attackDir === "up") ty -= 1
        if (player.attackDir === "left") tx -= 1
        if (player.attackDir === "right") tx += 1

        const tile = tileAt(state, tx, ty)
        if (!tile) return

        if (tile.type === TileType.TREE) {
            const dmg = randomInt(10, 20)
            tile.damage += dmg
            addText(state, String(dmg), { x: tx, y: ty }, 0xffb4b4b4)
            if (tile.damage >= 20) {
                tile.type = TileType.GRASS
                tile.damage = 0
                addInventory(state, "wood", "Wood", randomInt(1, 2))
            }
            dirtyTiles.push({ x: tx, y: ty })
        } else if (tile.type === TileType.ROCK) {
            const dmg = randomInt(10, 20)
            tile.damage += dmg
            addText(state, String(dmg), { x: tx, y: ty }, 0xffb4b4b4)
            if (tile.damage >= 50) {
                tile.type = TileType.DIRT
                tile.damage = 0
                addInventory(state, "stone", "Stone", randomInt(1, 4))
            }
            dirtyTiles.push({ x: tx, y: ty })
        } else if (tile.type === TileType.CACTUS) {
            tile.type = TileType.SAND
            tile.damage = 0
            addInventory(state, "cactus", "Cactus", 1)
            dirtyTiles.push({ x: tx, y: ty })
        }
    }

    function handleAttack(
        state: GameState,
        input: InputState,
        dirtyTiles: Array<{ x: number; y: number }>,
    ): void {
        const player = state.player
        if (!input.attackClicked) return
        if (player.attackCooldown > 0) return
        if (player.stamina <= 0) return

        player.stamina -= 1
        player.staminaRecharge = 0
        player.attackTime = 8
        player.attackCooldown = 8
        player.attackDir = player.direction

        const rect = getAttackTargetRect(state)

        for (const enemy of state.enemies) {
            if (enemy.health <= 0) continue
            const withinX = enemy.position.x >= rect.x0 && enemy.position.x <= rect.x1
            const withinY = enemy.position.y >= rect.y0 && enemy.position.y <= rect.y1
            if (!withinX || !withinY) continue

            const damage = randomInt(1, 3)
            enemy.health -= damage
            enemy.hurtTime = 10
            if (player.attackDir === "down") enemy.yKnockback = 6
            if (player.attackDir === "up") enemy.yKnockback = -6
            if (player.attackDir === "left") enemy.xKnockback = -6
            if (player.attackDir === "right") enemy.xKnockback = 6
            addText(state, String(damage), enemy.position, 0xffd8d8d8)
        }

        handleTileAttack(state, dirtyTiles)
    }

    function updateEnemyAI(state: GameState): void {
        const player = state.player

        for (const enemy of state.enemies) {
            if (enemy.health <= 0) continue

            const actor: ActorRef = { kind: "enemy", enemy }
            enemy.tickTime += 1

            if (enemy.hurtTime > 0) enemy.hurtTime -= 1

            while (enemy.xKnockback < 0) {
                moveAxis(state, actor, -1 / 16, 0)
                enemy.xKnockback += 1
            }
            while (enemy.xKnockback > 0) {
                moveAxis(state, actor, 1 / 16, 0)
                enemy.xKnockback -= 1
            }
            while (enemy.yKnockback < 0) {
                moveAxis(state, actor, 0, -1 / 16)
                enemy.yKnockback += 1
            }
            while (enemy.yKnockback > 0) {
                moveAxis(state, actor, 0, 1 / 16)
                enemy.yKnockback -= 1
            }

            const xdPx = Math.round((player.position.x - enemy.position.x) * 16)
            const ydPx = Math.round((player.position.y - enemy.position.y) * 16)
            const dist2 = xdPx * xdPx + ydPx * ydPx

            if (enemy.kind === "slime") {
                let moved = true
                if (enemy.hurtTime === 0) {
                    if (enemy.xa < 0) enemy.direction = "left"
                    if (enemy.xa > 0) enemy.direction = "right"
                    if (enemy.ya < 0) enemy.direction = "up"
                    if (enemy.ya > 0) enemy.direction = "down"
                    if (enemy.xa !== 0 || enemy.ya !== 0) enemy.walkDist += 1
                    moved = moveActor(state, actor, enemy.xa / 16, enemy.ya / 16)
                }

                if (!moved || randomInt(0, 39) === 0) {
                    if (enemy.jumpTime <= -10) {
                        enemy.xa = randomInt(-1, 1)
                        enemy.ya = randomInt(-1, 1)

                        if (dist2 < 50 * 50) {
                            if (xdPx < 0) enemy.xa = -1
                            if (xdPx > 0) enemy.xa = 1
                            if (ydPx < 0) enemy.ya = -1
                            if (ydPx > 0) enemy.ya = 1
                        }

                        if (enemy.xa !== 0 || enemy.ya !== 0) {
                            enemy.jumpTime = 10
                        }
                    }
                }

                enemy.jumpTime -= 1
                if (enemy.jumpTime === 0) {
                    enemy.xa = 0
                    enemy.ya = 0
                }
            } else {
                if (enemy.randomWalkTime === 0 && dist2 < 50 * 50) {
                    enemy.xa = 0
                    enemy.ya = 0
                    if (xdPx < 0) enemy.xa = -1
                    if (xdPx > 0) enemy.xa = 1
                    if (ydPx < 0) enemy.ya = -1
                    if (ydPx > 0) enemy.ya = 1
                }

                const speed = enemy.tickTime & 1
                let moved = true
                if (enemy.hurtTime === 0) {
                    const moveXa = enemy.xa * speed
                    const moveYa = enemy.ya * speed
                    if (moveXa < 0) enemy.direction = "left"
                    if (moveXa > 0) enemy.direction = "right"
                    if (moveYa < 0) enemy.direction = "up"
                    if (moveYa > 0) enemy.direction = "down"
                    if (moveXa !== 0 || moveYa !== 0) enemy.walkDist += 1
                    moved = moveActor(state, actor, moveXa / 16, moveYa / 16)
                }

                if (!moved || randomInt(0, 199) === 0) {
                    enemy.randomWalkTime = 60
                    enemy.xa = randomInt(-1, 1) * randomInt(0, 1)
                    enemy.ya = randomInt(-1, 1) * randomInt(0, 1)
                }
                if (enemy.randomWalkTime > 0) enemy.randomWalkTime -= 1
            }
        }
    }

    function hurtPlayer(state: GameState, damage: number, attackDir: Direction): void {
        const player = state.player
        if (player.hurtTime > 0 || player.invulnerableTime > 0) return

        player.health -= damage
        player.hurtTime = 10
        player.invulnerableTime = 30

        if (attackDir === "down") player.yKnockback = 6
        if (attackDir === "up") player.yKnockback = -6
        if (attackDir === "left") player.xKnockback = -6
        if (attackDir === "right") player.xKnockback = 6

        addText(state, String(damage), player.position, 0xffc8c8c8)

        if (player.health <= 0) {
            state.mode = "dead"
        }
    }

    function handleEnemyDeaths(state: GameState): void {
        const alive: EnemyState[] = []

        for (const enemy of state.enemies) {
            if (enemy.health > 0) {
                alive.push(enemy)
                continue
            }

            const itemId = enemy.kind === "slime" ? "slime" : "cloth"
            const itemName = enemy.kind === "slime" ? "Slime" : "Cloth"
            state.player.score += enemy.kind === "slime" ? 25 : 50

            state.drops.push({
                id: nextDropId++,
                itemId,
                name: itemName,
                quantity: 1,
                position: { x: enemy.position.x, y: enemy.position.y },
                velocity: { x: (Math.random() - 0.5) * 0.05, y: (Math.random() - 0.5) * 0.05 },
                z: 0.2,
                za: 0.2,
                age: 0,
                lifeTime: 60 * 12,
            })
        }

        state.enemies = alive
    }

    function updateDrops(state: GameState): void {
        const kept = []

        for (const drop of state.drops) {
            drop.age += 1
            drop.position.x += drop.velocity.x
            drop.position.y += drop.velocity.y
            drop.z += drop.za
            drop.za -= 0.03

            if (drop.z < 0) {
                drop.z = 0
                drop.za *= -0.4
                drop.velocity.x *= 0.7
                drop.velocity.y *= 0.7
            }

            if (drop.age > drop.lifeTime) {
                continue
            }

            const dx = state.player.position.x - drop.position.x
            const dy = state.player.position.y - drop.position.y
            if (drop.age > 20 && dx * dx + dy * dy < 0.6 * 0.6) {
                addInventory(state, drop.itemId, drop.name, drop.quantity)
                state.player.score += 1
                continue
            }

            kept.push(drop)
        }

        state.drops = kept
    }

    function updateFloatingText(state: GameState): void {
        const next: FloatingText[] = []

        for (const text of state.floatingTexts) {
            text.age += 1
            text.position.x += text.velocity.x
            text.position.y += text.velocity.y
            text.z += text.za
            text.za -= 0.02

            if (text.z < 0) {
                text.z = 0
                text.za *= -0.3
                text.velocity.x *= 0.6
                text.velocity.y *= 0.6
            }

            if (text.age <= text.lifeTime) {
                next.push(text)
            }
        }

        state.floatingTexts = next
    }

    function updatePlayerVitals(state: GameState): void {
        const player = state.player

        if (player.hurtTime > 0) player.hurtTime -= 1
        if (player.invulnerableTime > 0) player.invulnerableTime -= 1
        if (player.attackTime > 0) player.attackTime -= 1
        if (player.attackCooldown > 0) player.attackCooldown -= 1

        if (
            player.stamina <= 0 &&
            player.staminaRechargeDelay === 0 &&
            player.staminaRecharge === 0
        ) {
            player.staminaRechargeDelay = 40
        }

        if (player.staminaRechargeDelay > 0) {
            player.staminaRechargeDelay -= 1
        }

        if (player.staminaRechargeDelay === 0) {
            player.staminaRecharge += 1
            while (player.staminaRecharge > 10) {
                player.staminaRecharge -= 10
                player.stamina = clamp(player.stamina + 1, 0, player.maxStamina)
            }
        }
    }

    export function tick(state: GameState, input: InputState): TickResult {
        const dirtyTiles: Array<{ x: number; y: number }> = []

        if (state.mode === "title") {
            if (input.upClicked) state.titleSelection -= 1
            if (input.downClicked) state.titleSelection += 1

            const menuSize = 3
            if (state.titleSelection < 0) state.titleSelection += menuSize
            if (state.titleSelection >= menuSize) state.titleSelection -= menuSize

            if (input.attackClicked || input.menuClicked) {
                if (state.titleSelection === 0) {
                    state.mode = "playing"
                } else if (state.titleSelection === 1) {
                    state.mode = "instructions"
                } else if (state.titleSelection === 2) {
                    state.mode = "about"
                }
            }
            return { dirtyTiles }
        }

        if (state.mode === "instructions" || state.mode === "about") {
            if (input.attackClicked || input.menuClicked) {
                state.mode = "title"
            }
            return { dirtyTiles }
        }

        if (state.mode === "dead") {
            if (input.attackClicked || input.menuClicked) {
                const fresh = create()
                state.map = fresh.map
                state.player = fresh.player
                state.enemies = fresh.enemies
                state.drops = fresh.drops
                state.floatingTexts = fresh.floatingTexts
                state.inventory = fresh.inventory
                state.titleSelection = fresh.titleSelection
                state.tickCount = 0
                state.gameTime = 0
                state.mode = "title"
            }
            return { dirtyTiles }
        }

        state.tickCount += 1
        state.gameTime += 1

        updatePlayerMovement(state, input)
        handleAttack(state, input, dirtyTiles)
        updateEnemyAI(state)
        handleEnemyDeaths(state)
        updateDrops(state)
        updateFloatingText(state)
        updatePlayerVitals(state)
        spawnEnemy(state)

        return { dirtyTiles }
    }

    export function inventoryAmount(inventory: InventoryItem[], id: string): number {
        return inventory.find((item) => item.id === id)?.quantity ?? 0
    }
}
