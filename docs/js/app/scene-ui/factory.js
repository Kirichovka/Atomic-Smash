import { createSceneLayoutEngine } from "./engine.js";

export function createSceneUiFactory({ layoutEngine = createSceneLayoutEngine() } = {}) {
    function createElement(definition) {
        const element = document.createElement(definition.tagName);

        if (definition.id) {
            element.id = definition.id;
        }

        if (definition.classNames?.length) {
            element.className = definition.classNames.join(" ");
        }

        if (definition.textContent) {
            element.textContent = definition.textContent;
        }

        Object.entries(definition.attributes ?? {}).forEach(([name, value]) => {
            if (value === false || value === null || value === undefined) {
                return;
            }

            if (value === true) {
                element.setAttribute(name, "");
                return;
            }

            element.setAttribute(name, String(value));
        });

        Object.entries(definition.dataset ?? {}).forEach(([name, value]) => {
            if (value !== null && value !== undefined) {
                element.dataset[name] = String(value);
            }
        });

        layoutEngine.applyStyles(element, definition.styles ?? {});

        (definition.listeners ?? []).forEach(({ eventName, handler }) => {
            if (eventName && typeof handler === "function") {
                element.addEventListener(eventName, handler);
            }
        });

        (definition.children ?? []).forEach(childDefinition => {
            element.appendChild(createElement(childDefinition));
        });

        return element;
    }

    return {
        createElement
    };
}
