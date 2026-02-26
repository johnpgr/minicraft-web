import * as THREE from "three"
import { Color } from "../assets/Color"
import { Chunks } from "./Chunks"
import { LightMaterial } from "./materials/LightMaterial"
import { SpriteMaterial } from "./materials/SpriteMaterial"
import { TileMaterial } from "./materials/TileMaterial"
import { UiMaterial } from "./materials/UiMaterial"
import type { GameState } from "../types"
import type {
    LightInstance,
    RenderFrame,
    SpriteInstance,
    TileInstance,
    UiSpriteInstance,
} from "./types"

interface ChunkMesh {
    mesh: THREE.InstancedMesh
    frameAttr: THREE.InstancedBufferAttribute
    flipAttr: THREE.InstancedBufferAttribute
    tintAttr: THREE.InstancedBufferAttribute
    alphaAttr: THREE.InstancedBufferAttribute
}

interface DynamicBatch {
    mesh: THREE.InstancedMesh
    frameAttr: THREE.InstancedBufferAttribute
    flipAttr: THREE.InstancedBufferAttribute
    tintAttr: THREE.InstancedBufferAttribute
    alphaAttr: THREE.InstancedBufferAttribute
    maxInstances: number
}

export interface RendererAssets {
    atlasTexture: THREE.Texture
    paletteTexture: THREE.Texture
}

const TILE_BATCH_CAPACITY = Chunks.CHUNK_SIZE * Chunks.CHUNK_SIZE * 6
const MAX_WORLD_SPRITES = 4096
const MAX_UI_SPRITES = 2048
const MAX_LIGHTS = 128
const WORLD_ZOOM = 16

export class Renderer {
    private renderer: THREE.WebGLRenderer | null = null
    private worldScene: THREE.Scene | null = null
    private lightScene: THREE.Scene | null = null
    private uiScene: THREE.Scene | null = null

    private worldCamera: THREE.OrthographicCamera | null = null
    private uiCamera: THREE.OrthographicCamera | null = null

    private tileMaterial: THREE.ShaderMaterial | null = null
    private spriteMaterial: THREE.ShaderMaterial | null = null
    private uiMaterial: THREE.ShaderMaterial | null = null

    private chunkMeshes = new Map<Chunks.ChunkKey, ChunkMesh>()
    private worldSpriteBatch: DynamicBatch | null = null
    private uiSpriteBatch: DynamicBatch | null = null
    private lightBatch: THREE.InstancedMesh | null = null

    private scratchMatrix = new THREE.Matrix4()
    private viewportHeight = 0
    private initialized = false

    init(canvas: HTMLCanvasElement, assets: RendererAssets): void {
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false })
        this.renderer.setPixelRatio(1)
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        this.renderer.autoClear = true

        this.worldScene = new THREE.Scene()
        this.lightScene = new THREE.Scene()
        this.uiScene = new THREE.Scene()
        this.viewportHeight = window.innerHeight

        this.worldCamera = new THREE.OrthographicCamera(-10, 10, 10, -10, -100, 100)
        this.worldCamera.position.set(0, 0, 10)

        this.uiCamera = new THREE.OrthographicCamera(
            0,
            window.innerWidth,
            window.innerHeight,
            0,
            -100,
            100,
        )
        this.uiCamera.position.set(0, 0, 10)

        const uniforms = {
            uAtlas: { value: assets.atlasTexture },
            uPalette: { value: assets.paletteTexture },
            uPixelSnap: { value: 1 },
        }

        this.tileMaterial = TileMaterial.create(uniforms)
        this.spriteMaterial = SpriteMaterial.create(uniforms)
        this.uiMaterial = UiMaterial.create(uniforms)

        this.worldSpriteBatch = this.createBatch(
            MAX_WORLD_SPRITES,
            this.spriteMaterial,
            this.worldScene,
        )
        this.worldSpriteBatch.mesh.renderOrder = 100
        this.uiSpriteBatch = this.createBatch(MAX_UI_SPRITES, this.uiMaterial, this.uiScene)
        this.uiSpriteBatch.mesh.renderOrder = 200

        const lightMaterial = LightMaterial.create()
        const lightGeo = new THREE.PlaneGeometry(1, 1)
        this.lightBatch = new THREE.InstancedMesh(lightGeo, lightMaterial, MAX_LIGHTS)
        this.lightBatch.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
        this.lightBatch.frustumCulled = false
        this.lightBatch.renderOrder = 150
        this.lightBatch.count = 0
        this.lightScene.add(this.lightBatch)

        this.initialized = true
    }

    resize(width: number, height: number): void {
        if (!this.renderer || !this.worldCamera || !this.uiCamera) return

        this.renderer.setSize(width, height)
        this.viewportHeight = height

        const halfW = width / (2 * WORLD_ZOOM)
        const halfH = height / (2 * WORLD_ZOOM)
        this.worldCamera.left = -halfW
        this.worldCamera.right = halfW
        this.worldCamera.top = halfH
        this.worldCamera.bottom = -halfH
        this.worldCamera.updateProjectionMatrix()

        this.uiCamera.left = 0
        this.uiCamera.right = width
        this.uiCamera.top = height
        this.uiCamera.bottom = 0
        this.uiCamera.updateProjectionMatrix()
    }

    render(state: GameState, frame: RenderFrame): void {
        if (
            !this.initialized ||
            !this.renderer ||
            !this.worldScene ||
            !this.uiScene ||
            !this.worldCamera ||
            !this.uiCamera
        ) {
            return
        }

        this.syncChunks(frame.mapTiles, frame.dirtyTiles)
        this.updateWorldSprites(frame.sprites)
        this.updateUiSprites(frame.uiSprites)
        this.updateLights(frame.lights)

        this.worldCamera.position.x = Math.round(frame.cameraX * WORLD_ZOOM) / WORLD_ZOOM
        this.worldCamera.position.y = -Math.round(frame.cameraY * WORLD_ZOOM) / WORLD_ZOOM

        this.renderer.setClearColor(0x000000)
        this.renderer.clear()
        this.renderer.render(this.worldScene, this.worldCamera)
        this.renderer.autoClear = false
        if (this.lightScene) {
            this.renderer.render(this.lightScene, this.worldCamera)
        }
        this.renderer.render(this.uiScene, this.uiCamera)
        this.renderer.autoClear = true
    }

    dispose(): void {
        for (const chunk of this.chunkMeshes.values()) {
            chunk.mesh.geometry.dispose()
            ;(chunk.mesh.material as THREE.Material).dispose()
            this.worldScene?.remove(chunk.mesh)
        }
        this.chunkMeshes.clear()

        this.worldSpriteBatch?.mesh.geometry.dispose()
        ;(this.worldSpriteBatch?.mesh.material as THREE.Material | undefined)?.dispose()
        this.uiSpriteBatch?.mesh.geometry.dispose()
        ;(this.uiSpriteBatch?.mesh.material as THREE.Material | undefined)?.dispose()

        if (this.lightBatch) {
            this.lightBatch.geometry.dispose()
            ;(this.lightBatch.material as THREE.Material).dispose()
        }

        this.renderer?.dispose()

        this.renderer = null
        this.worldScene = null
        this.uiScene = null
        this.lightScene = null
        this.worldCamera = null
        this.uiCamera = null
        this.initialized = false
    }

    private createBatch(
        maxInstances: number,
        material: THREE.ShaderMaterial,
        scene: THREE.Scene,
    ): DynamicBatch {
        const geometry = new THREE.PlaneGeometry(1, 1)
        const mesh = new THREE.InstancedMesh(geometry, material, maxInstances)
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
        mesh.frustumCulled = false

        const frameAttr = new THREE.InstancedBufferAttribute(new Float32Array(maxInstances), 1)
        const flipAttr = new THREE.InstancedBufferAttribute(new Float32Array(maxInstances), 1)
        const tintAttr = new THREE.InstancedBufferAttribute(new Float32Array(maxInstances * 4), 4)
        const alphaAttr = new THREE.InstancedBufferAttribute(new Float32Array(maxInstances), 1)

        mesh.geometry.setAttribute("aFrame", frameAttr)
        mesh.geometry.setAttribute("aFlipBits", flipAttr)
        mesh.geometry.setAttribute("aTint", tintAttr)
        mesh.geometry.setAttribute("aAlpha", alphaAttr)

        mesh.count = 0
        scene.add(mesh)

        return { mesh, frameAttr, flipAttr, tintAttr, alphaAttr, maxInstances }
    }

    private syncChunks(
        mapTiles: TileInstance[],
        dirtyTiles: Array<{ x: number; y: number }>,
    ): void {
        if (!this.worldScene || !this.tileMaterial) return

        if (mapTiles.length === 0) {
            for (const chunk of this.chunkMeshes.values()) {
                this.worldScene.remove(chunk.mesh)
                chunk.mesh.geometry.dispose()
                ;(chunk.mesh.material as THREE.Material).dispose()
            }
            this.chunkMeshes.clear()
            return
        }

        if (this.chunkMeshes.size === 0) {
            const allChunks = Chunks.groupTiles(mapTiles)
            for (const chunk of allChunks.values()) {
                this.rebuildChunk(chunk)
            }
            return
        }

        const dirty = Chunks.dirtyRegion(dirtyTiles)
        if (!dirty) return

        for (let chunkY = dirty.minChunkY; chunkY <= dirty.maxChunkY; chunkY += 1) {
            for (let chunkX = dirty.minChunkX; chunkX <= dirty.maxChunkX; chunkX += 1) {
                const tiles = mapTiles.filter((tile) => {
                    const { chunkX: cx, chunkY: cy } = Chunks.coords(
                        tile.worldX,
                        tile.worldY,
                    )
                    return cx === chunkX && cy === chunkY
                })

                const key = Chunks.key(chunkX, chunkY)
                if (tiles.length === 0) {
                    const existing = this.chunkMeshes.get(key)
                    if (existing) {
                        this.worldScene.remove(existing.mesh)
                        this.chunkMeshes.delete(key)
                    }
                    continue
                }

                this.rebuildChunk({ key, chunkX, chunkY, tiles })
            }
        }
    }

    private rebuildChunk(chunk: Chunks.ChunkData): void {
        if (!this.worldScene || !this.tileMaterial) return

        const existing = this.chunkMeshes.get(chunk.key)
        if (existing) {
            this.worldScene.remove(existing.mesh)
            existing.mesh.geometry.dispose()
            ;(existing.mesh.material as THREE.Material).dispose()
        }

        const geometry = new THREE.PlaneGeometry(1, 1)
        const mesh = new THREE.InstancedMesh(
            geometry,
            this.tileMaterial.clone(),
            TILE_BATCH_CAPACITY,
        )
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
        mesh.frustumCulled = false
        mesh.renderOrder = 10

        const frameAttr = new THREE.InstancedBufferAttribute(
            new Float32Array(TILE_BATCH_CAPACITY),
            1,
        )
        const flipAttr = new THREE.InstancedBufferAttribute(
            new Float32Array(TILE_BATCH_CAPACITY),
            1,
        )
        const tintAttr = new THREE.InstancedBufferAttribute(
            new Float32Array(TILE_BATCH_CAPACITY * 4),
            4,
        )
        const alphaAttr = new THREE.InstancedBufferAttribute(
            new Float32Array(TILE_BATCH_CAPACITY),
            1,
        )

        mesh.geometry.setAttribute("aFrame", frameAttr)
        mesh.geometry.setAttribute("aFlipBits", flipAttr)
        mesh.geometry.setAttribute("aTint", tintAttr)
        mesh.geometry.setAttribute("aAlpha", alphaAttr)

        let count = 0
        for (const tile of chunk.tiles) {
            if (count >= TILE_BATCH_CAPACITY) break
            this.scratchMatrix.compose(
                new THREE.Vector3(tile.worldX, -tile.worldY, 0),
                new THREE.Quaternion(),
                new THREE.Vector3(tile.scale, tile.scale, 1),
            )
            mesh.setMatrixAt(count, this.scratchMatrix)

            const tint = Color.unpack(tile.tintCode)
            frameAttr.setX(count, tile.tileId + tile.variant)
            flipAttr.setX(count, tile.flipBits)
            tintAttr.setXYZW(count, tint[0], tint[1], tint[2], tint[3])
            alphaAttr.setX(count, 1)
            count += 1
        }

        mesh.count = count
        mesh.instanceMatrix.needsUpdate = true
        frameAttr.needsUpdate = true
        flipAttr.needsUpdate = true
        tintAttr.needsUpdate = true
        alphaAttr.needsUpdate = true

        this.worldScene.add(mesh)
        this.chunkMeshes.set(chunk.key, { mesh, frameAttr, flipAttr, tintAttr, alphaAttr })
    }

    private updateWorldSprites(sprites: SpriteInstance[]): void {
        if (!this.worldSpriteBatch) return
        this.writeBatch(this.worldSpriteBatch, sprites.length, (index) => {
            const sprite = sprites[index]
            this.scratchMatrix.compose(
                new THREE.Vector3(sprite.worldX, -sprite.worldY, sprite.zLayer),
                new THREE.Quaternion(),
                new THREE.Vector3(0.5, 0.5, 1),
            )
            const tint = Color.unpack(sprite.tintCode)
            return {
                matrix: this.scratchMatrix,
                frame: sprite.frameId,
                flip: sprite.flipBits,
                tint,
                alpha: sprite.alpha,
            }
        })
    }

    private updateUiSprites(uiSprites: UiSpriteInstance[]): void {
        if (!this.uiSpriteBatch) return
        this.writeBatch(this.uiSpriteBatch, uiSprites.length, (index) => {
            const sprite = uiSprites[index]
            this.scratchMatrix.compose(
                new THREE.Vector3(
                    sprite.screenX + 4,
                    this.viewportHeight - (sprite.screenY + 4),
                    0,
                ),
                new THREE.Quaternion(),
                new THREE.Vector3(8, 8, 1),
            )
            const tint = Color.unpack(sprite.tintCode)
            return {
                matrix: this.scratchMatrix,
                frame: sprite.frameId,
                flip: sprite.flipBits,
                tint,
                alpha: 1,
            }
        })
    }

    private updateLights(lights: LightInstance[]): void {
        if (!this.lightBatch) return
        const count = Math.min(lights.length, MAX_LIGHTS)
        for (let i = 0; i < count; i += 1) {
            const light = lights[i]
            this.scratchMatrix.compose(
                new THREE.Vector3(light.worldX, -light.worldY, 2),
                new THREE.Quaternion(),
                new THREE.Vector3(light.radiusTiles * 2, light.radiusTiles * 2, 1),
            )
            this.lightBatch.setMatrixAt(i, this.scratchMatrix)
        }
        this.lightBatch.count = count
        this.lightBatch.instanceMatrix.needsUpdate = true
    }

    private writeBatch(
        batch: DynamicBatch,
        requestedCount: number,
        fill: (index: number) => {
            matrix: THREE.Matrix4
            frame: number
            flip: number
            tint: [number, number, number, number]
            alpha: number
        },
    ): void {
        const count = Math.min(requestedCount, batch.maxInstances)

        for (let i = 0; i < count; i += 1) {
            const data = fill(i)
            batch.mesh.setMatrixAt(i, data.matrix)
            batch.frameAttr.setX(i, data.frame)
            batch.flipAttr.setX(i, data.flip)
            batch.tintAttr.setXYZW(i, data.tint[0], data.tint[1], data.tint[2], data.tint[3])
            batch.alphaAttr.setX(i, data.alpha)
        }

        batch.mesh.count = count
        batch.mesh.instanceMatrix.needsUpdate = true
        batch.frameAttr.needsUpdate = true
        batch.flipAttr.needsUpdate = true
        batch.tintAttr.needsUpdate = true
        batch.alphaAttr.needsUpdate = true
    }
}
