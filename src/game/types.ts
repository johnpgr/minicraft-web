export enum TileType {
    GRASS = 0,
    ROCK = 1,
    WATER = 2,
    FLOWER = 3,
    TREE = 4,
    DIRT = 5,
    SAND = 6,
    CACTUS = 7,
}

export interface GameTile {
    type: TileType;
    damage: number;
}

export interface Position {
    x: number;
    y: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface PlayerState {
    position: Position;
    direction: Direction;
    health: number;
    maxHealth: number;
    stamina: number;
    maxStamina: number;
    staminaRecharge: number;
    staminaRechargeDelay: number;
    moving: boolean;
    hurtTime: number;
    invulnerableTime: number;
    attackTime: number;
    attackDir: Direction;
    attackCooldown: number;
    score: number;
}

export type EnemyKind = 'slime' | 'zombie';

export interface EnemyState {
    id: number;
    kind: EnemyKind;
    position: Position;
    direction: Direction;
    health: number;
    maxHealth: number;
    level: number;
    hurtTime: number;
    xKnockback: number;
    yKnockback: number;
    walkDist: number;
    xa: number;
    ya: number;
    jumpTime: number;
    randomWalkTime: number;
    tickTime: number;
}

export interface ItemDrop {
    id: number;
    itemId: string;
    name: string;
    quantity: number;
    position: Position;
    velocity: Position;
    z: number;
    za: number;
    age: number;
    lifeTime: number;
}

export interface FloatingText {
    id: number;
    text: string;
    position: Position;
    velocity: Position;
    z: number;
    za: number;
    age: number;
    lifeTime: number;
    tintCode: number;
}

export interface InventoryItem {
    id: string;
    name: string;
    quantity: number;
}

export type GameMode = 'title' | 'playing' | 'dead';

export interface GameState {
    map: GameTile[][];
    player: PlayerState;
    enemies: EnemyState[];
    drops: ItemDrop[];
    floatingTexts: FloatingText[];
    inventory: InventoryItem[];
    mode: GameMode;
    tickCount: number;
    gameTime: number;
}

export const MAP_SIZE = 128;

export const FONT_CHARS =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ      ' + '0123456789.,!?\'"-+=/\\%()<>:;     ';
