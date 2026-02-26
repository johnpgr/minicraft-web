import lightVertexShader from "./shaders/light.vert.glsl?raw"
import lightFragmentShader from "./shaders/light.frag.glsl?raw"
import { NormalBlending, ShaderMaterial } from "three"

export namespace LightMaterial {
    export function create(): ShaderMaterial {
        return new ShaderMaterial({
            transparent: true,
            depthWrite: false,
            depthTest: false,
            blending: NormalBlending,
            uniforms: {
                uIntensity: { value: 0.4 },
            },
            vertexShader: lightVertexShader,
            fragmentShader: lightFragmentShader,
        })
    }
}
