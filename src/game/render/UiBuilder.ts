import { Color } from "../assets/Color"
import { FONT_CHARS, type GameState } from "../types"
import type { UiSpriteInstance } from "./types"

export namespace UiBuilder {
    const TEXT_TINT = Color.get(-1, 555, 555, 555)
    const UI_TINT = Color.get(-1, 555, 555, 555)
    const UI_HIGHLIGHT_TINT = Color.get(-1, 550, 550, 550)
    const UI_DIM_TINT = Color.get(-1, 333, 333, 333)
    const TITLE_OPTION_TINT = Color.get(0, 222, 222, 222)
    const TITLE_FOOTER_TINT = Color.get(0, 111, 111, 111)
    const MENU_BORDER_TINT = Color.get(-1, 1, 5, 445)
    const MENU_FILL_TINT = Color.get(5, 5, 5, 5)
    const FOCUS_TEXT_DIM_TINT = Color.get(5, 333, 333, 333)
    const FOCUS_TEXT_BRIGHT_TINT = Color.get(5, 555, 555, 555)
    const FONT_ROW = 30
    const FONT_INDEX_BY_CODE = new Int16Array(128).fill(-1)

    for (let i = 0; i < FONT_CHARS.length; i += 1) {
        const code = FONT_CHARS.charCodeAt(i)
        if (code < FONT_INDEX_BY_CODE.length) {
            FONT_INDEX_BY_CODE[code] = i
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
            const code = upper.charCodeAt(i)
            const index = code < FONT_INDEX_BY_CODE.length ? FONT_INDEX_BY_CODE[code] : -1
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

    function pushUiSprite(
        output: UiSpriteInstance[],
        tileX: number,
        tileY: number,
        frameId: number,
        tintCode: number,
        flipBits = 0,
    ): void {
        output.push({
            screenX: tileX * 8,
            screenY: tileY * 8,
            frameId,
            flipBits,
            tintCode,
        })
    }

    function renderUiFrame(
        output: UiSpriteInstance[],
        x0: number,
        y0: number,
        x1: number,
        y1: number,
    ): void {
        for (let y = y0; y <= y1; y += 1) {
            for (let x = x0; x <= x1; x += 1) {
                if (x === x0 && y === y0) {
                    pushUiSprite(output, x, y, 13 * 32, MENU_BORDER_TINT, 0)
                } else if (x === x1 && y === y0) {
                    pushUiSprite(output, x, y, 13 * 32, MENU_BORDER_TINT, 1)
                } else if (x === x0 && y === y1) {
                    pushUiSprite(output, x, y, 13 * 32, MENU_BORDER_TINT, 2)
                } else if (x === x1 && y === y1) {
                    pushUiSprite(output, x, y, 13 * 32, MENU_BORDER_TINT, 3)
                } else if (y === y0) {
                    pushUiSprite(output, x, y, 1 + 13 * 32, MENU_BORDER_TINT, 0)
                } else if (y === y1) {
                    pushUiSprite(output, x, y, 1 + 13 * 32, MENU_BORDER_TINT, 2)
                } else if (x === x0) {
                    pushUiSprite(output, x, y, 2 + 13 * 32, MENU_BORDER_TINT, 0)
                } else if (x === x1) {
                    pushUiSprite(output, x, y, 2 + 13 * 32, MENU_BORDER_TINT, 1)
                } else {
                    pushUiSprite(output, x, y, 2 + 13 * 32, MENU_FILL_TINT, 1)
                }
            }
        }
    }

    function centeredFrame(
        width: number,
        height: number,
        frameWidthTiles: number,
        frameHeightTiles: number,
        yOffsetTiles = 0,
    ): { x0: number; y0: number; x1: number; y1: number } {
        const cols = Math.max(frameWidthTiles, Math.floor(width / 8))
        const rows = Math.max(frameHeightTiles, Math.floor(height / 8))
        const maxX0 = Math.max(0, cols - frameWidthTiles)
        const maxY0 = Math.max(0, rows - frameHeightTiles)
        const x0 = Math.min(maxX0, Math.max(0, Math.floor((cols - frameWidthTiles) / 2)))
        const y0 = Math.min(
            maxY0,
            Math.max(0, Math.floor((rows - frameHeightTiles) / 2) + yOffsetTiles),
        )

        return {
            x0,
            y0,
            x1: x0 + frameWidthTiles - 1,
            y1: y0 + frameHeightTiles - 1,
        }
    }

    function formatGameTime(ticks: number): string {
        let seconds = Math.floor(ticks / 60)
        let minutes = Math.floor(seconds / 60)
        const hours = Math.floor(minutes / 60)
        minutes %= 60
        seconds %= 60

        if (hours > 0) {
            return `${hours}H${minutes < 10 ? "0" : ""}${minutes}M`
        }
        return `${minutes}M ${seconds < 10 ? "0" : ""}${seconds}S`
    }

    function renderFocusNagger(output: UiSpriteInstance[], width: number, height: number): void {
        const msg = "CLICK TO FOCUS!"
        const focusBox = centeredFrame(width, height, msg.length + 2, 3)
        renderUiFrame(output, focusBox.x0, focusBox.y0, focusBox.x1, focusBox.y1)
        const blinkOn = Math.floor(performance.now() / 500) % 2 === 0
        addTextSprites(
            msg,
            (focusBox.x0 + 1) * 8,
            (focusBox.y0 + 1) * 8,
            blinkOn ? FOCUS_TEXT_DIM_TINT : FOCUS_TEXT_BRIGHT_TINT,
            output,
        )
    }

    export function buildUiSprites(
        state: GameState,
        width: number,
        height: number,
        hasFocus: boolean,
    ): UiSpriteInstance[] {
        const uiSprites: UiSpriteInstance[] = []

        if (state.mode === "title") {
            const titleColor = Color.get(0, 10, 131, 551)
            const xo = Math.floor((width - 13 * 8) / 2)
            const yo = 24

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

            const options = ["START GAME", "HOW TO PLAY", "ABOUT"]
            for (let i = 0; i < options.length; i += 1) {
                let msg = options[i]
                let tint = TITLE_OPTION_TINT
                if (i === state.titleSelection) {
                    msg = `> ${msg} <`
                    tint = UI_TINT
                }
                addTextSprites(msg, Math.floor((width - msg.length * 8) / 2), (8 + i) * 8, tint, uiSprites)
            }

            addTextSprites("(ARROW KEYS,X AND C)", 0, height - 8, TITLE_FOOTER_TINT, uiSprites)

            if (!hasFocus) {
                renderFocusNagger(uiSprites, width, height)
            }
            return uiSprites
        }

        if (state.mode === "instructions") {
            addTextSprites("HOW TO PLAY", 4 * 8 + 4, 1 * 8, UI_TINT, uiSprites)
            addTextSprites("Move your character", 4, 3 * 8, UI_DIM_TINT, uiSprites)
            addTextSprites("with the arrow keys", 4, 4 * 8, UI_DIM_TINT, uiSprites)
            addTextSprites("press C to attack", 4, 5 * 8, UI_DIM_TINT, uiSprites)
            addTextSprites("and X to open the", 4, 6 * 8, UI_DIM_TINT, uiSprites)
            addTextSprites("inventory and to", 4, 7 * 8, UI_DIM_TINT, uiSprites)
            addTextSprites("use items.", 4, 8 * 8, UI_DIM_TINT, uiSprites)
            addTextSprites("Select an item in", 4, 9 * 8, UI_DIM_TINT, uiSprites)
            addTextSprites("the inventory to", 4, 10 * 8, UI_DIM_TINT, uiSprites)
            addTextSprites("equip it.", 4, 11 * 8, UI_DIM_TINT, uiSprites)
            addTextSprites("Kill the air wizard", 4, 12 * 8, UI_DIM_TINT, uiSprites)
            addTextSprites("to win the game!", 4, 13 * 8, UI_DIM_TINT, uiSprites)

            if (!hasFocus) {
                renderFocusNagger(uiSprites, width, height)
            }
            return uiSprites
        }

        if (state.mode === "about") {
            addTextSprites("About Minicraft", 2 * 8 + 4, 1 * 8, UI_TINT, uiSprites)
            addTextSprites("Minicraft was made", 4, 3 * 8, UI_DIM_TINT, uiSprites)
            addTextSprites("by Markus Persson", 4, 4 * 8, UI_DIM_TINT, uiSprites)
            addTextSprites("For the 22'nd ludum", 4, 5 * 8, UI_DIM_TINT, uiSprites)
            addTextSprites("dare competition in", 4, 6 * 8, UI_DIM_TINT, uiSprites)
            addTextSprites("december 2011.", 4, 7 * 8, UI_DIM_TINT, uiSprites)
            addTextSprites("it is dedicated to", 4, 9 * 8, UI_DIM_TINT, uiSprites)
            addTextSprites("my father. <3", 4, 10 * 8, UI_DIM_TINT, uiSprites)

            if (!hasFocus) {
                renderFocusNagger(uiSprites, width, height)
            }
            return uiSprites
        }

        const hudColumns = Math.ceil(width / 8)
        for (let y = 0; y < 2; y += 1) {
            for (let x = 0; x < hudColumns; x += 1) {
                uiSprites.push({
                    screenX: x * 8,
                    screenY: height - 16 + y * 8,
                    frameId: 12 * 32,
                    flipBits: 0,
                    tintCode: Color.get(0, 0, 0, 0),
                })
            }
        }

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

        if (state.mode === "dead") {
            const deadBox = centeredFrame(width, height, 18, 7, -1)
            renderUiFrame(uiSprites, deadBox.x0, deadBox.y0, deadBox.x1, deadBox.y1)
            addTextSprites(
                "YOU DIED! AWW!",
                (deadBox.x0 + 1) * 8,
                (deadBox.y0 + 1) * 8,
                TEXT_TINT,
                uiSprites,
            )
            addTextSprites("TIME:", (deadBox.x0 + 1) * 8, (deadBox.y0 + 2) * 8, TEXT_TINT, uiSprites)
            addTextSprites(
                formatGameTime(state.gameTime),
                (deadBox.x0 + 6) * 8,
                (deadBox.y0 + 2) * 8,
                UI_HIGHLIGHT_TINT,
                uiSprites,
            )
            addTextSprites("SCORE:", (deadBox.x0 + 1) * 8, (deadBox.y0 + 3) * 8, TEXT_TINT, uiSprites)
            addTextSprites(
                `${state.player.score}`,
                (deadBox.x0 + 7) * 8,
                (deadBox.y0 + 3) * 8,
                UI_HIGHLIGHT_TINT,
                uiSprites,
            )
            addTextSprites(
                "PRESS C TO LOSE",
                (deadBox.x0 + 1) * 8,
                (deadBox.y0 + 5) * 8,
                UI_DIM_TINT,
                uiSprites,
            )
        }

        if (!hasFocus) {
            renderFocusNagger(uiSprites, width, height)
        }

        return uiSprites
    }
}
