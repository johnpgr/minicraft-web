import * as THREE from 'three';
import spriteVertexShader from './shaders/sprite.vert.glsl?raw';
import spriteFragmentShader from './shaders/sprite.frag.glsl?raw';

export interface MaterialUniforms {
    uAtlas: { value: THREE.Texture };
    uPalette: { value: THREE.Texture };
    uPixelSnap: { value: number };
}

export function createSpriteShaderMaterial(
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
    });
}
