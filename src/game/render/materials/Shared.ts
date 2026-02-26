import spriteVertexShader from "./shaders/sprite.vert.glsl?raw"
import spriteFragmentShader from "./shaders/sprite.frag.glsl?raw"
import { IUniform, Texture, ShaderMaterialParameters, ShaderMaterial } from "three"

export namespace Shared {
    export interface MaterialUniforms {
        [uniform: string]: IUniform
        uAtlas: IUniform<Texture>
        uPalette: IUniform<Texture>
        uPixelSnap: IUniform<number>
    }

    export function createSpriteShader(
        uniforms: MaterialUniforms,
        options?: Partial<ShaderMaterialParameters>,
    ): ShaderMaterial {
        return new ShaderMaterial({
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
