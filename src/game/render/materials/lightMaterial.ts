import * as THREE from 'three';
import lightVertexShader from './shaders/light.vert.glsl?raw';
import lightFragmentShader from './shaders/light.frag.glsl?raw';

export function createLightMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.NormalBlending,
        uniforms: {
            uIntensity: { value: 0.4 },
        },
        vertexShader: lightVertexShader,
        fragmentShader: lightFragmentShader,
    });
}
