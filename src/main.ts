import * as THREE from "three"
import { Palette } from "./game/assets/Palette"
import { State } from "./game/State"
import { Input } from "./game/input/Input"
import { FrameBuilder } from "./game/render/FrameBuilder"
import { Renderer } from "./game/render/renderer"
import { Viewport } from "./game/render/Viewport"
import "./index.css"

const TICK_RATE = 60
const TICK_MS = 1000 / TICK_RATE

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
    const initialViewport = Viewport.getRenderViewportSize()
    renderer.resize(initialViewport.width, initialViewport.height)

    const input = new Input.InputController()
    input.bind()

    const state = State.create()
    let dirtyTiles: Array<{ x: number; y: number }> = []

    let accumulator = 0
    let last = performance.now()
    let frames = 0
    let ticks = 0
    let lastStats = performance.now()
    let wasFocused = document.visibilityState === "visible" && document.hasFocus()

    const frame = () => {
        const now = performance.now()
        const delta = now - last
        last = now
        accumulator += Math.min(delta, 100)
        const isFocused = document.visibilityState === "visible" && document.hasFocus()
        const justRegainedFocus = isFocused && !wasFocused

        while (accumulator >= TICK_MS) {
            if (isFocused) {
                input.tick()
                const result = State.tick(state, Input.getInputState(input))
                dirtyTiles = result.dirtyTiles
                ticks += 1
            } else {
                input.releaseAll()
            }
            accumulator -= TICK_MS
        }

        const viewport = Viewport.getRenderViewportSize()
        const renderFrame = FrameBuilder.buildRenderFrame(
            state,
            dirtyTiles,
            viewport.width,
            viewport.height,
            isFocused,
        )
        renderer.render(state, renderFrame)
        if (isFocused) frames += 1
        dirtyTiles = []

        if (!isFocused || justRegainedFocus) {
            lastStats = now
            frames = 0
            ticks = 0
        } else if (now - lastStats >= 1000) {
            console.log(`${ticks} ticks, ${frames} fps`)
            lastStats = now
            frames = 0
            ticks = 0
        }

        wasFocused = isFocused
        requestAnimationFrame(frame)
    }

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
