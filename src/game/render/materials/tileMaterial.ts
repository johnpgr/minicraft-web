import * as THREE from 'three';
import { createSpriteShaderMaterial, type MaterialUniforms } from './shared';

export function createTileMaterial(uniforms: MaterialUniforms): THREE.ShaderMaterial {
    return createSpriteShaderMaterial(uniforms, {
        depthTest: true,
        depthWrite: false,
        transparent: true,
    });
}
