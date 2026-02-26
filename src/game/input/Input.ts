import { State } from "../State"

export namespace Input {
    export interface KeyAction {
        presses: number
        absorbs: number
        down: boolean
        clicked: boolean
        toggle: (pressed: boolean) => void
        tick: () => void
    }

    export interface InputController {
        up: KeyAction
        down: KeyAction
        left: KeyAction
        right: KeyAction
        attack: KeyAction
        menu: KeyAction
        tick: () => void
        releaseAll: () => void
        bind: () => void
    }

    function createKeyAction(): KeyAction {
        const action: KeyAction = {
            presses: 0,
            absorbs: 0,
            down: false,
            clicked: false,
            toggle: (pressed: boolean) => {
                if (pressed !== action.down) {
                    action.down = pressed
                }
                if (pressed) {
                    action.presses += 1
                }
            },
            tick: () => {
                if (action.absorbs < action.presses) {
                    action.absorbs += 1
                    action.clicked = true
                } else {
                    action.clicked = false
                }
            },
        }

        return action
    }

    export function createInputController(): InputController {
        const controller: InputController = {
            up: createKeyAction(),
            down: createKeyAction(),
            left: createKeyAction(),
            right: createKeyAction(),
            attack: createKeyAction(),
            menu: createKeyAction(),
            tick: () => {
                for (const key of allKeys) key.tick()
            },
            releaseAll: () => {
                for (const key of allKeys) key.down = false
            },
            bind: () => {
                window.addEventListener("keydown", (event) => toggle(event, true))
                window.addEventListener("keyup", (event) => toggle(event, false))
                window.addEventListener("blur", () => controller.releaseAll())
            },
        }

        const allKeys = [
            controller.up,
            controller.down,
            controller.left,
            controller.right,
            controller.attack,
            controller.menu,
        ]

        const toggle = (event: KeyboardEvent, pressed: boolean): void => {
            const code = event.code

            if (code === "ArrowUp" || code === "KeyW" || code === "Numpad8")
                controller.up.toggle(pressed)
            if (code === "ArrowDown" || code === "KeyS" || code === "Numpad2")
                controller.down.toggle(pressed)
            if (code === "ArrowLeft" || code === "KeyA" || code === "Numpad4")
                controller.left.toggle(pressed)
            if (code === "ArrowRight" || code === "KeyD" || code === "Numpad6")
                controller.right.toggle(pressed)

            if (code === "Space" || code === "KeyC" || code === "Numpad0") {
                controller.attack.toggle(pressed)
                event.preventDefault()
            }

            if (code === "Tab" || code === "Enter" || code === "KeyX") {
                controller.menu.toggle(pressed)
                event.preventDefault()
            }
        }

        return controller
    }

    export function getInputState(input: InputController): State.InputState {
        return {
            up: input.up.down,
            down: input.down.down,
            left: input.left.down,
            right: input.right.down,
            upClicked: input.up.clicked,
            downClicked: input.down.clicked,
            attackClicked: input.attack.clicked,
            menuClicked: input.menu.clicked,
        }
    }
}
