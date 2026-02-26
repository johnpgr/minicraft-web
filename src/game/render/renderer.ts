import {
    DynamicDrawUsage,
    InstancedBufferAttribute,
    InstancedMesh,
    Material,
    Matrix4,
    OrthographicCamera,
    PlaneGeometry,
    Quaternion,
    Scene,
    ShaderMaterial,
    Texture,
    Vector3,
    WebGLRenderer,
} from "three"
import type { GameState } from "../types"
import { Chunks } from "./Chunks"
import { LightMaterial } from "./materials/LightMaterial"
import { SpriteMaterial } from "./materials/SpriteMaterial"
import { TileMaterial } from "./materials/TileMaterial"
import { UiMaterial } from "./materials/UiMaterial"
import type {
    LightInstance,
    MapChunkData,
    MapChunkKey,
    RenderFrame,
    SpriteInstance,
    UiSpriteInstance,
} from "./types"

interface ChunkMesh {
    mesh: InstancedMesh
    frameAttr: InstancedBufferAttribute
    flipAttr: InstancedBufferAttribute
    tintAttr: InstancedBufferAttribute
    alphaAttr: InstancedBufferAttribute
}

interface DynamicBatch {
    mesh: InstancedMesh
    frameAttr: InstancedBufferAttribute
    flipAttr: InstancedBufferAttribute
    tintAttr: InstancedBufferAttribute
    alphaAttr: InstancedBufferAttribute
    maxInstances: number
}

export interface RendererAssets {
    atlasTexture: Texture
    paletteTexture: Texture
}

const TILE_BATCH_CAPACITY = Chunks.CHUNK_SIZE * Chunks.CHUNK_SIZE * 6
const MAX_WORLD_SPRITES = 4096
const MAX_UI_SPRITES = 2048
const MAX_LIGHTS = 128
const WORLD_ZOOM = 16

function snapWorld(value: number): number {
    return Math.round(value * WORLD_ZOOM) / WORLD_ZOOM
}

export namespace Renderer {
    export interface Controller {
        init: (canvas: HTMLCanvasElement, assets: RendererAssets) => void
        resize: (width: number, height: number) => void
        render: (_state: GameState, frame: RenderFrame) => void
        dispose: () => void
    }

    export function create(): Controller {
        let renderer: WebGLRenderer | null = null
        let worldScene: Scene | null = null
        let lightScene: Scene | null = null
        let uiScene: Scene | null = null

        let worldCamera: OrthographicCamera | null = null
        let uiCamera: OrthographicCamera | null = null

        let tileMaterial: ShaderMaterial | null = null
        let spriteMaterial: ShaderMaterial | null = null
        let uiMaterial: ShaderMaterial | null = null

        const chunkMeshes = new Map<MapChunkKey, ChunkMesh>()
        let worldSpriteBatch: DynamicBatch | null = null
        let uiSpriteBatch: DynamicBatch | null = null
        let lightBatch: InstancedMesh | null = null

        const scratchMatrix = new Matrix4()
        const scratchPos = new Vector3()
        const scratchQuat = new Quaternion()
        const scratchScale = new Vector3(1, 1, 1)
        let viewportHeight = 0
        let initialized = false

        function init(canvas: HTMLCanvasElement, assets: RendererAssets): void {
            renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false })
            renderer.setPixelRatio(1)
            renderer.setSize(window.innerWidth, window.innerHeight, false)
            renderer.autoClear = true

            worldScene = new Scene()
            lightScene = new Scene()
            uiScene = new Scene()
            viewportHeight = window.innerHeight

            worldCamera = new OrthographicCamera(-10, 10, 10, -10, -100, 100)
            worldCamera.position.set(0, 0, 10)

            uiCamera = new OrthographicCamera(
                0,
                window.innerWidth,
                window.innerHeight,
                0,
                -100,
                100,
            )
            uiCamera.position.set(0, 0, 10)

            const uniforms = {
                uAtlas: { value: assets.atlasTexture },
                uPalette: { value: assets.paletteTexture },
                uPixelSnap: { value: 1 },
            }

            tileMaterial = TileMaterial.create(uniforms)
            spriteMaterial = SpriteMaterial.create(uniforms)
            uiMaterial = UiMaterial.create(uniforms)

            worldSpriteBatch = createBatch(MAX_WORLD_SPRITES, spriteMaterial, worldScene)
            worldSpriteBatch.mesh.renderOrder = 100
            uiSpriteBatch = createBatch(MAX_UI_SPRITES, uiMaterial, uiScene)
            uiSpriteBatch.mesh.renderOrder = 200

            const lightMaterial = LightMaterial.create()
            const lightGeo = new PlaneGeometry(1, 1)
            lightBatch = new InstancedMesh(lightGeo, lightMaterial, MAX_LIGHTS)
            lightBatch.instanceMatrix.setUsage(DynamicDrawUsage)
            lightBatch.frustumCulled = false
            lightBatch.renderOrder = 150
            lightBatch.count = 0
            lightScene.add(lightBatch)

            initialized = true
        }

        function resize(width: number, height: number): void {
            if (!renderer || !worldCamera || !uiCamera) return

            renderer.setSize(width, height, false)
            viewportHeight = height

            const halfW = width / (2 * WORLD_ZOOM)
            const halfH = height / (2 * WORLD_ZOOM)
            worldCamera.left = -halfW
            worldCamera.right = halfW
            worldCamera.top = halfH
            worldCamera.bottom = -halfH
            worldCamera.updateProjectionMatrix()

            uiCamera.left = 0
            uiCamera.right = width
            uiCamera.top = height
            uiCamera.bottom = 0
            uiCamera.updateProjectionMatrix()
        }

        function render(_state: GameState, frame: RenderFrame): void {
            if (!initialized || !renderer || !worldScene || !uiScene || !worldCamera || !uiCamera) {
                return
            }

            syncChunks(frame.mapChunksByKey, frame.dirtyChunkKeys, frame.animatedChunkKeys)
            updateWorldSprites(frame.sprites)
            updateUiSprites(frame.uiSprites)
            updateLights(frame.lights)

            worldCamera.position.x = Math.round(frame.cameraX * WORLD_ZOOM) / WORLD_ZOOM
            worldCamera.position.y = -Math.round(frame.cameraY * WORLD_ZOOM) / WORLD_ZOOM

            renderer.setClearColor(0x000000)
            renderer.clear()
            renderer.render(worldScene, worldCamera)
            renderer.autoClear = false
            if (lightScene && lightBatch && lightBatch.count > 0) {
                renderer.render(lightScene, worldCamera)
            }
            renderer.render(uiScene, uiCamera)
            renderer.autoClear = true
        }

        function dispose(): void {
            for (const chunk of chunkMeshes.values()) {
                chunk.mesh.geometry.dispose()
                worldScene?.remove(chunk.mesh)
            }
            chunkMeshes.clear()

            worldSpriteBatch?.mesh.geometry.dispose()
            uiSpriteBatch?.mesh.geometry.dispose()

            if (lightBatch) {
                lightBatch.geometry.dispose()
                ;(lightBatch.material as Material).dispose()
            }

            tileMaterial?.dispose()
            spriteMaterial?.dispose()
            uiMaterial?.dispose()
            renderer?.dispose()

            renderer = null
            worldScene = null
            uiScene = null
            lightScene = null
            worldCamera = null
            uiCamera = null
            tileMaterial = null
            spriteMaterial = null
            uiMaterial = null
            worldSpriteBatch = null
            uiSpriteBatch = null
            lightBatch = null
            initialized = false
        }

        function createBatch(
            maxInstances: number,
            material: ShaderMaterial,
            scene: Scene,
        ): DynamicBatch {
            const geometry = new PlaneGeometry(1, 1)
            const mesh = new InstancedMesh(geometry, material, maxInstances)
            mesh.instanceMatrix.setUsage(DynamicDrawUsage)
            mesh.frustumCulled = false

            const frameAttr = new InstancedBufferAttribute(new Float32Array(maxInstances), 1)
            const flipAttr = new InstancedBufferAttribute(new Float32Array(maxInstances), 1)
            const tintAttr = new InstancedBufferAttribute(new Float32Array(maxInstances * 4), 4)
            const alphaAttr = new InstancedBufferAttribute(new Float32Array(maxInstances), 1)
            frameAttr.setUsage(DynamicDrawUsage)
            flipAttr.setUsage(DynamicDrawUsage)
            tintAttr.setUsage(DynamicDrawUsage)
            alphaAttr.setUsage(DynamicDrawUsage)

            mesh.geometry.setAttribute("aFrame", frameAttr)
            mesh.geometry.setAttribute("aFlipBits", flipAttr)
            mesh.geometry.setAttribute("aTint", tintAttr)
            mesh.geometry.setAttribute("aAlpha", alphaAttr)

            mesh.count = 0
            scene.add(mesh)

            return { mesh, frameAttr, flipAttr, tintAttr, alphaAttr, maxInstances }
        }

        function markAttributeRange(
            attribute: InstancedBufferAttribute,
            start: number,
            count: number,
        ): void {
            if (count <= 0) return
            attribute.clearUpdateRanges()
            attribute.addUpdateRange(start, count)
            attribute.needsUpdate = true
        }

        function markMatrixRange(matrix: InstancedBufferAttribute, countInstances: number): void {
            if (countInstances <= 0) return
            matrix.clearUpdateRanges()
            matrix.addUpdateRange(0, countInstances * 16)
            matrix.needsUpdate = true
        }

        function syncChunks(
            mapChunksByKey: Map<MapChunkKey, MapChunkData>,
            dirtyChunkKeys: Set<MapChunkKey>,
            animatedChunkKeys: Set<MapChunkKey>,
        ): void {
            if (!worldScene || !tileMaterial) return

            if (mapChunksByKey.size === 0) {
                for (const chunk of chunkMeshes.values()) {
                    worldScene.remove(chunk.mesh)
                    chunk.mesh.geometry.dispose()
                }
                chunkMeshes.clear()
                return
            }

            if (chunkMeshes.size === 0) {
                for (const chunk of mapChunksByKey.values()) {
                    updateChunkMesh(chunk)
                }
                return
            }

            if (dirtyChunkKeys.size === 0) return

            for (const chunkKey of dirtyChunkKeys) {
                const chunk = mapChunksByKey.get(chunkKey)
                if (!chunk) {
                    removeChunkMesh(chunkKey)
                    continue
                }

                if (animatedChunkKeys.has(chunkKey)) {
                    updateChunkAnimation(chunk)
                } else {
                    updateChunkMesh(chunk)
                }
            }
        }

        function removeChunkMesh(chunkKey: MapChunkKey): void {
            const existing = chunkMeshes.get(chunkKey)
            if (!existing) return
            worldScene?.remove(existing.mesh)
            existing.mesh.geometry.dispose()
            chunkMeshes.delete(chunkKey)
        }

        function createChunkMesh(chunkKey: MapChunkKey): ChunkMesh | null {
            if (!worldScene || !tileMaterial) return null

            const geometry = new PlaneGeometry(1, 1)
            const mesh = new InstancedMesh(geometry, tileMaterial, TILE_BATCH_CAPACITY)
            mesh.instanceMatrix.setUsage(DynamicDrawUsage)
            mesh.frustumCulled = true
            mesh.renderOrder = 10

            const frameAttr = new InstancedBufferAttribute(new Float32Array(TILE_BATCH_CAPACITY), 1)
            const flipAttr = new InstancedBufferAttribute(new Float32Array(TILE_BATCH_CAPACITY), 1)
            const tintAttr = new InstancedBufferAttribute(
                new Float32Array(TILE_BATCH_CAPACITY * 4),
                4,
            )
            const alphaAttr = new InstancedBufferAttribute(new Float32Array(TILE_BATCH_CAPACITY), 1)
            frameAttr.setUsage(DynamicDrawUsage)
            flipAttr.setUsage(DynamicDrawUsage)
            tintAttr.setUsage(DynamicDrawUsage)
            alphaAttr.setUsage(DynamicDrawUsage)

            mesh.geometry.setAttribute("aFrame", frameAttr)
            mesh.geometry.setAttribute("aFlipBits", flipAttr)
            mesh.geometry.setAttribute("aTint", tintAttr)
            mesh.geometry.setAttribute("aAlpha", alphaAttr)

            mesh.count = 0
            worldScene.add(mesh)
            const chunkMesh = { mesh, frameAttr, flipAttr, tintAttr, alphaAttr }
            chunkMeshes.set(chunkKey, chunkMesh)
            return chunkMesh
        }

        function updateChunkMesh(chunk: MapChunkData): void {
            let chunkMesh = chunkMeshes.get(chunk.key)
            if (!chunkMesh) {
                chunkMesh = createChunkMesh(chunk.key)
                if (!chunkMesh) return
            }

            const { mesh, frameAttr, flipAttr, tintAttr, alphaAttr } = chunkMesh
            const tintArray = tintAttr.array as Float32Array
            let count = 0
            for (const tile of chunk.tiles) {
                if (count >= TILE_BATCH_CAPACITY) break
                scratchMatrix.compose(
                    scratchPos.set(tile.worldX, -tile.worldY, 0),
                    scratchQuat,
                    scratchScale.set(tile.scale, tile.scale, 1),
                )
                mesh.setMatrixAt(count, scratchMatrix)

                frameAttr.setX(count, tile.tileId + tile.variant)
                flipAttr.setX(count, tile.flipBits)
                const base = count * 4
                const tintCode = tile.tintCode
                tintArray[base] = tintCode & 255
                tintArray[base + 1] = (tintCode >>> 8) & 255
                tintArray[base + 2] = (tintCode >>> 16) & 255
                tintArray[base + 3] = (tintCode >>> 24) & 255
                alphaAttr.setX(count, 1)
                count += 1
            }

            mesh.count = count
            markMatrixRange(mesh.instanceMatrix, count)
            markAttributeRange(frameAttr, 0, count)
            markAttributeRange(flipAttr, 0, count)
            markAttributeRange(tintAttr, 0, count * 4)
            markAttributeRange(alphaAttr, 0, count)
            if (!mesh.boundingBox || !mesh.boundingSphere) {
                mesh.computeBoundingBox()
                mesh.computeBoundingSphere()
            }
        }

        function updateChunkAnimation(chunk: MapChunkData): void {
            const chunkMesh = chunkMeshes.get(chunk.key)
            if (!chunkMesh) {
                updateChunkMesh(chunk)
                return
            }
            if (chunk.waterAnim.length === 0) return

            const { frameAttr, flipAttr } = chunkMesh
            let minIndex = Number.POSITIVE_INFINITY
            let maxIndex = Number.NEGATIVE_INFINITY

            for (const anim of chunk.waterAnim) {
                const index = anim.instanceIndex
                const tile = chunk.tiles[index]
                frameAttr.setX(index, tile.tileId + tile.variant)
                flipAttr.setX(index, tile.flipBits)
                minIndex = Math.min(minIndex, index)
                maxIndex = Math.max(maxIndex, index)
            }

            if (maxIndex >= minIndex) {
                const range = maxIndex - minIndex + 1
                markAttributeRange(frameAttr, minIndex, range)
                markAttributeRange(flipAttr, minIndex, range)
            }
        }

        function updateWorldSprites(sprites: SpriteInstance[]): void {
            if (!worldSpriteBatch) return

            const count = Math.min(sprites.length, worldSpriteBatch.maxInstances)
            worldSpriteBatch.mesh.count = count
            if (count === 0) return

            const tintArray = worldSpriteBatch.tintAttr.array as Float32Array
            for (let i = 0; i < count; i += 1) {
                const sprite = sprites[i]
                scratchMatrix.compose(
                    scratchPos.set(
                        snapWorld(sprite.worldX),
                        -snapWorld(sprite.worldY),
                        sprite.zLayer,
                    ),
                    scratchQuat,
                    scratchScale.set(0.5, 0.5, 1),
                )
                worldSpriteBatch.mesh.setMatrixAt(i, scratchMatrix)

                worldSpriteBatch.frameAttr.setX(i, sprite.frameId)
                worldSpriteBatch.flipAttr.setX(i, sprite.flipBits)
                const base = i * 4
                const tintCode = sprite.tintCode
                tintArray[base] = tintCode & 255
                tintArray[base + 1] = (tintCode >>> 8) & 255
                tintArray[base + 2] = (tintCode >>> 16) & 255
                tintArray[base + 3] = (tintCode >>> 24) & 255
                worldSpriteBatch.alphaAttr.setX(i, sprite.alpha)
            }

            markMatrixRange(worldSpriteBatch.mesh.instanceMatrix, count)
            markAttributeRange(worldSpriteBatch.frameAttr, 0, count)
            markAttributeRange(worldSpriteBatch.flipAttr, 0, count)
            markAttributeRange(worldSpriteBatch.tintAttr, 0, count * 4)
            markAttributeRange(worldSpriteBatch.alphaAttr, 0, count)
        }

        function updateUiSprites(uiSprites: UiSpriteInstance[]): void {
            if (!uiSpriteBatch) return

            const count = Math.min(uiSprites.length, uiSpriteBatch.maxInstances)
            uiSpriteBatch.mesh.count = count
            if (count === 0) return

            const tintArray = uiSpriteBatch.tintAttr.array as Float32Array
            for (let i = 0; i < count; i += 1) {
                const sprite = uiSprites[i]
                scratchMatrix.compose(
                    scratchPos.set(sprite.screenX + 4, viewportHeight - (sprite.screenY + 4), 0),
                    scratchQuat,
                    scratchScale.set(8, 8, 1),
                )
                uiSpriteBatch.mesh.setMatrixAt(i, scratchMatrix)

                uiSpriteBatch.frameAttr.setX(i, sprite.frameId)
                uiSpriteBatch.flipAttr.setX(i, sprite.flipBits)
                const base = i * 4
                const tintCode = sprite.tintCode
                tintArray[base] = tintCode & 255
                tintArray[base + 1] = (tintCode >>> 8) & 255
                tintArray[base + 2] = (tintCode >>> 16) & 255
                tintArray[base + 3] = (tintCode >>> 24) & 255
                uiSpriteBatch.alphaAttr.setX(i, 1)
            }

            markMatrixRange(uiSpriteBatch.mesh.instanceMatrix, count)
            markAttributeRange(uiSpriteBatch.frameAttr, 0, count)
            markAttributeRange(uiSpriteBatch.flipAttr, 0, count)
            markAttributeRange(uiSpriteBatch.tintAttr, 0, count * 4)
            markAttributeRange(uiSpriteBatch.alphaAttr, 0, count)
        }

        function updateLights(lights: LightInstance[]): void {
            if (!lightBatch) return
            const count = Math.min(lights.length, MAX_LIGHTS)
            lightBatch.count = count
            if (count === 0) return

            for (let i = 0; i < count; i += 1) {
                const light = lights[i]
                scratchMatrix.compose(
                    scratchPos.set(light.worldX, -light.worldY, 2),
                    scratchQuat,
                    scratchScale.set(light.radiusTiles * 2, light.radiusTiles * 2, 1),
                )
                lightBatch.setMatrixAt(i, scratchMatrix)
            }
            markMatrixRange(lightBatch.instanceMatrix, count)
        }

        return {
            init,
            resize,
            render,
            dispose,
        }
    }
}
