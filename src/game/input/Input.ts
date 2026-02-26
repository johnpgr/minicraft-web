import { State } from "../State"

export namespace Input {
    class KeyAction {
        presses = 0
        absorbs = 0
        down = false
        clicked = false

        toggle(pressed: boolean): void {
            if (pressed !== this.down) {
                this.down = pressed
            }
            if (pressed) {
                this.presses += 1
            }
        }

        tick(): void {
            if (this.absorbs < this.presses) {
                this.absorbs += 1
                this.clicked = true
            } else {
                this.clicked = false
            }
        }
    }

    export class InputController {
        up = new KeyAction()
        down = new KeyAction()
        left = new KeyAction()
        right = new KeyAction()
        attack = new KeyAction()
        menu = new KeyAction()

        private allKeys = [this.up, this.down, this.left, this.right, this.attack, this.menu]

        tick(): void {
            for (const key of this.allKeys) key.tick()
        }

        releaseAll(): void {
            for (const key of this.allKeys) key.down = false
        }

        bind(): void {
            window.addEventListener("keydown", (event) => this.toggle(event, true))
            window.addEventListener("keyup", (event) => this.toggle(event, false))
            window.addEventListener("blur", () => this.releaseAll())
        }

        private toggle(event: KeyboardEvent, pressed: boolean): void {
            const code = event.code

            if (code === "ArrowUp" || code === "KeyW" || code === "Numpad8") this.up.toggle(pressed)
            if (code === "ArrowDown" || code === "KeyS" || code === "Numpad2") this.down.toggle(pressed)
            if (code === "ArrowLeft" || code === "KeyA" || code === "Numpad4") this.left.toggle(pressed)
            if (code === "ArrowRight" || code === "KeyD" || code === "Numpad6")
                this.right.toggle(pressed)

            if (code === "Space" || code === "ControlLeft" || code === "KeyC" || code === "Numpad0") {
                this.attack.toggle(pressed)
                event.preventDefault()
            }

            if (code === "Tab" || code === "Enter" || code === "KeyX" || code === "AltLeft") {
                this.menu.toggle(pressed)
                event.preventDefault()
            }
        }
    }

    export function getInputState(input: InputController): State.InputState {
        return {
            up: input.up.down,
            down: input.down.down,
            left: input.left.down,
            right: input.right.down,
            attackClicked: input.attack.clicked,
            menuClicked: input.menu.clicked,
        }
    }
}
