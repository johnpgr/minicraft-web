import * as THREE from "three"
import { createSpriteShaderMaterial, type MaterialUniforms } from "./shared"

export function createSpriteMaterial(uniforms: MaterialUniforms): THREE.ShaderMaterial {
    return createSpriteShaderMaterial(uniforms, {
        depthTest: false,
        depthWrite: false,
        transparent: true,
    })
}
