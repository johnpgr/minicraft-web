export namespace Color {
    function decodeBase6Triplet(value: number): number {
        if (value < 0) return 255
        const r = Math.floor(value / 100) % 10
        const g = Math.floor(value / 10) % 10
        const b = value % 10
        return r * 36 + g * 6 + b
    }

    export function get(a: number, b: number, c: number, d: number): number {
        return (
            ((decodeBase6Triplet(d) << 24) +
                (decodeBase6Triplet(c) << 16) +
                (decodeBase6Triplet(b) << 8) +
                decodeBase6Triplet(a)) >>>
            0
        )
    }
}
