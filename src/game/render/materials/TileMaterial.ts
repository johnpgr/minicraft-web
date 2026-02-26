import * as THREE from "three"
import { Shared } from "./Shared"

export namespace TileMaterial {
    export function create(uniforms: Shared.MaterialUniforms): THREE.ShaderMaterial {
        return Shared.createSpriteShader(uniforms, {
            depthTest: true,
            depthWrite: false,
            transparent: true,
        })
    }
}
