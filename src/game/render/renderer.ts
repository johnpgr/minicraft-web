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
    MapChunkData,
    MapChunkKey,
    RenderFrame,
    SpriteInstance,
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

function snapWorld(value: number): number {
    return Math.round(value * WORLD_ZOOM) / WORLD_ZOOM
}

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
    private scratchPos = new THREE.Vector3()
    private scratchQuat = new THREE.Quaternion()
    private scratchScale = new THREE.Vector3(1, 1, 1)
    private viewportHeight = 0
    private initialized = false

    init(canvas: HTMLCanvasElement, assets: RendererAssets): void {
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false })
        this.renderer.setPixelRatio(1)
        this.renderer.setSize(window.innerWidth, window.innerHeight, false)
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

        this.renderer.setSize(width, height, false)
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

        this.syncChunks(frame.mapChunksByKey, frame.dirtyChunkKeys)
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
            this.worldScene?.remove(chunk.mesh)
        }
        this.chunkMeshes.clear()

        this.worldSpriteBatch?.mesh.geometry.dispose()
        this.uiSpriteBatch?.mesh.geometry.dispose()

        if (this.lightBatch) {
            this.lightBatch.geometry.dispose()
            ;(this.lightBatch.material as THREE.Material).dispose()
        }

        this.tileMaterial?.dispose()
        this.spriteMaterial?.dispose()
        this.uiMaterial?.dispose()
        this.renderer?.dispose()

        this.renderer = null
        this.worldScene = null
        this.uiScene = null
        this.lightScene = null
        this.worldCamera = null
        this.uiCamera = null
        this.tileMaterial = null
        this.spriteMaterial = null
        this.uiMaterial = null
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
        frameAttr.setUsage(THREE.DynamicDrawUsage)
        flipAttr.setUsage(THREE.DynamicDrawUsage)
        tintAttr.setUsage(THREE.DynamicDrawUsage)
        alphaAttr.setUsage(THREE.DynamicDrawUsage)

        mesh.geometry.setAttribute("aFrame", frameAttr)
        mesh.geometry.setAttribute("aFlipBits", flipAttr)
        mesh.geometry.setAttribute("aTint", tintAttr)
        mesh.geometry.setAttribute("aAlpha", alphaAttr)

        mesh.count = 0
        scene.add(mesh)

        return { mesh, frameAttr, flipAttr, tintAttr, alphaAttr, maxInstances }
    }

    private syncChunks(
        mapChunksByKey: Map<MapChunkKey, MapChunkData>,
        dirtyChunkKeys: Set<MapChunkKey>,
    ): void {
        if (!this.worldScene || !this.tileMaterial) return

        if (mapChunksByKey.size === 0) {
            for (const chunk of this.chunkMeshes.values()) {
                this.worldScene.remove(chunk.mesh)
                chunk.mesh.geometry.dispose()
            }
            this.chunkMeshes.clear()
            return
        }

        if (this.chunkMeshes.size === 0) {
            for (const chunk of mapChunksByKey.values()) {
                this.updateChunkMesh(chunk)
            }
            return
        }

        if (dirtyChunkKeys.size === 0) return

        for (const chunkKey of dirtyChunkKeys) {
            const chunk = mapChunksByKey.get(chunkKey)
            if (!chunk) {
                this.removeChunkMesh(chunkKey)
                continue
            }

            this.updateChunkMesh(chunk)
        }
    }

    private removeChunkMesh(chunkKey: MapChunkKey): void {
        const existing = this.chunkMeshes.get(chunkKey)
        if (!existing) return
        this.worldScene?.remove(existing.mesh)
        existing.mesh.geometry.dispose()
        this.chunkMeshes.delete(chunkKey)
    }

    private createChunkMesh(chunkKey: MapChunkKey): ChunkMesh | null {
        if (!this.worldScene || !this.tileMaterial) return null

        const geometry = new THREE.PlaneGeometry(1, 1)
        const mesh = new THREE.InstancedMesh(geometry, this.tileMaterial, TILE_BATCH_CAPACITY)
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
        mesh.frustumCulled = true
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
        frameAttr.setUsage(THREE.DynamicDrawUsage)
        flipAttr.setUsage(THREE.DynamicDrawUsage)
        tintAttr.setUsage(THREE.DynamicDrawUsage)
        alphaAttr.setUsage(THREE.DynamicDrawUsage)

        mesh.geometry.setAttribute("aFrame", frameAttr)
        mesh.geometry.setAttribute("aFlipBits", flipAttr)
        mesh.geometry.setAttribute("aTint", tintAttr)
        mesh.geometry.setAttribute("aAlpha", alphaAttr)

        mesh.count = 0
        this.worldScene.add(mesh)
        const chunkMesh = { mesh, frameAttr, flipAttr, tintAttr, alphaAttr }
        this.chunkMeshes.set(chunkKey, chunkMesh)
        return chunkMesh
    }

    private updateChunkMesh(chunk: MapChunkData): void {
        let chunkMesh = this.chunkMeshes.get(chunk.key)
        if (!chunkMesh) {
            chunkMesh = this.createChunkMesh(chunk.key)
            if (!chunkMesh) return
        }

        const { mesh, frameAttr, flipAttr, tintAttr, alphaAttr } = chunkMesh
        let count = 0
        for (const tile of chunk.tiles) {
            if (count >= TILE_BATCH_CAPACITY) break
            this.scratchMatrix.compose(
                this.scratchPos.set(tile.worldX, -tile.worldY, 0),
                this.scratchQuat,
                this.scratchScale.set(tile.scale, tile.scale, 1),
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
        if (!mesh.boundingBox || !mesh.boundingSphere) {
            mesh.computeBoundingBox()
            mesh.computeBoundingSphere()
        }
    }

    private updateWorldSprites(sprites: SpriteInstance[]): void {
        if (!this.worldSpriteBatch) return

        const count = Math.min(sprites.length, this.worldSpriteBatch.maxInstances)
        for (let i = 0; i < count; i += 1) {
            const sprite = sprites[i]
            this.scratchMatrix.compose(
                this.scratchPos.set(
                    snapWorld(sprite.worldX),
                    -snapWorld(sprite.worldY),
                    sprite.zLayer,
                ),
                this.scratchQuat,
                this.scratchScale.set(0.5, 0.5, 1),
            )
            this.worldSpriteBatch.mesh.setMatrixAt(i, this.scratchMatrix)

            const tint = Color.unpack(sprite.tintCode)
            this.worldSpriteBatch.frameAttr.setX(i, sprite.frameId)
            this.worldSpriteBatch.flipAttr.setX(i, sprite.flipBits)
            this.worldSpriteBatch.tintAttr.setXYZW(i, tint[0], tint[1], tint[2], tint[3])
            this.worldSpriteBatch.alphaAttr.setX(i, sprite.alpha)
        }

        this.worldSpriteBatch.mesh.count = count
        this.worldSpriteBatch.mesh.instanceMatrix.needsUpdate = true
        this.worldSpriteBatch.frameAttr.needsUpdate = true
        this.worldSpriteBatch.flipAttr.needsUpdate = true
        this.worldSpriteBatch.tintAttr.needsUpdate = true
        this.worldSpriteBatch.alphaAttr.needsUpdate = true
    }

    private updateUiSprites(uiSprites: UiSpriteInstance[]): void {
        if (!this.uiSpriteBatch) return

        const count = Math.min(uiSprites.length, this.uiSpriteBatch.maxInstances)
        for (let i = 0; i < count; i += 1) {
            const sprite = uiSprites[i]
            this.scratchMatrix.compose(
                this.scratchPos.set(
                    sprite.screenX + 4,
                    this.viewportHeight - (sprite.screenY + 4),
                    0,
                ),
                this.scratchQuat,
                this.scratchScale.set(8, 8, 1),
            )
            this.uiSpriteBatch.mesh.setMatrixAt(i, this.scratchMatrix)

            const tint = Color.unpack(sprite.tintCode)
            this.uiSpriteBatch.frameAttr.setX(i, sprite.frameId)
            this.uiSpriteBatch.flipAttr.setX(i, sprite.flipBits)
            this.uiSpriteBatch.tintAttr.setXYZW(i, tint[0], tint[1], tint[2], tint[3])
            this.uiSpriteBatch.alphaAttr.setX(i, 1)
        }

        this.uiSpriteBatch.mesh.count = count
        this.uiSpriteBatch.mesh.instanceMatrix.needsUpdate = true
        this.uiSpriteBatch.frameAttr.needsUpdate = true
        this.uiSpriteBatch.flipAttr.needsUpdate = true
        this.uiSpriteBatch.tintAttr.needsUpdate = true
        this.uiSpriteBatch.alphaAttr.needsUpdate = true
    }

    private updateLights(lights: LightInstance[]): void {
        if (!this.lightBatch) return
        const count = Math.min(lights.length, MAX_LIGHTS)
        for (let i = 0; i < count; i += 1) {
            const light = lights[i]
            this.scratchMatrix.compose(
                this.scratchPos.set(light.worldX, -light.worldY, 2),
                this.scratchQuat,
                this.scratchScale.set(light.radiusTiles * 2, light.radiusTiles * 2, 1),
            )
            this.lightBatch.setMatrixAt(i, this.scratchMatrix)
        }
        this.lightBatch.count = count
        this.lightBatch.instanceMatrix.needsUpdate = true
    }
}
