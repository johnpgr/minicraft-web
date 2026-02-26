import { ClampToEdgeWrapping, DataTexture, NearestFilter, RGBAFormat } from "three"

export namespace Palette {
    export function create(): DataTexture {
        const data = new Uint8Array(256 * 4)
        let index = 0

        for (let r = 0; r < 6; r += 1) {
            for (let g = 0; g < 6; g += 1) {
                for (let b = 0; b < 6; b += 1) {
                    const rr = Math.floor((r * 255) / 5)
                    const gg = Math.floor((g * 255) / 5)
                    const bb = Math.floor((b * 255) / 5)
                    const mid = Math.floor((rr * 30 + gg * 59 + bb * 11) / 100)

                    const r1 = Math.floor((((rr + mid) / 2) * 230) / 255 + 10)
                    const g1 = Math.floor((((gg + mid) / 2) * 230) / 255 + 10)
                    const b1 = Math.floor((((bb + mid) / 2) * 230) / 255 + 10)

                    data[index * 4 + 0] = r1
                    data[index * 4 + 1] = g1
                    data[index * 4 + 2] = b1
                    data[index * 4 + 3] = 255
                    index += 1
                }
            }
        }

        while (index < 256) {
            data[index * 4 + 0] = 0
            data[index * 4 + 1] = 0
            data[index * 4 + 2] = 0
            data[index * 4 + 3] = 255
            index += 1
        }

        const texture = new DataTexture(data, 256, 1, RGBAFormat)
        texture.needsUpdate = true
        texture.magFilter = NearestFilter
        texture.minFilter = NearestFilter
        texture.generateMipmaps = false
        texture.wrapS = ClampToEdgeWrapping
        texture.wrapT = ClampToEdgeWrapping
        return texture
    }
}
