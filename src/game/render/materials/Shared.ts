import * as THREE from "three"
import spriteVertexShader from "./shaders/sprite.vert.glsl?raw"
import spriteFragmentShader from "./shaders/sprite.frag.glsl?raw"

export namespace Shared {
    export interface MaterialUniforms {
        [uniform: string]: THREE.IUniform
        uAtlas: THREE.IUniform<THREE.Texture>
        uPalette: THREE.IUniform<THREE.Texture>
        uPixelSnap: THREE.IUniform<number>
    }

    export function createSpriteShader(
        uniforms: MaterialUniforms,
        options?: Partial<THREE.ShaderMaterialParameters>,
    ): THREE.ShaderMaterial {
        return new THREE.ShaderMaterial({
            transparent: true,
            depthTest: true,
            depthWrite: false,
            vertexShader: spriteVertexShader,
            fragmentShader: spriteFragmentShader,
            uniforms,
            ...options,
        })
    }
}
