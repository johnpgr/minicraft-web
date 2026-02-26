import * as THREE from "three"
import { Shared } from "./Shared"

export namespace SpriteMaterial {
    export function create(uniforms: Shared.MaterialUniforms): THREE.ShaderMaterial {
        return Shared.createSpriteShader(uniforms, {
            depthTest: false,
            depthWrite: false,
            transparent: true,
        })
    }
}
