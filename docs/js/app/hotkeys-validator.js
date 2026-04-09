import { assertKnownActionId } from "./contracts/action-ids.js";

export function validateHotkeysConfig(config) {
    if (!config || typeof config !== "object" || Array.isArray(config)) {
        throw new Error("Hotkeys config must be an object.");
    }

    if (!Array.isArray(config.bindings)) {
        throw new Error("Hotkeys config must contain a bindings array.");
    }

    config.bindings.forEach((binding, index) => {
        if (!binding || typeof binding !== "object" || Array.isArray(binding)) {
            throw new Error(`Hotkey binding at index ${index} must be an object.`);
        }

        if (typeof binding.key !== "string" || !binding.key.trim()) {
            throw new Error(`Hotkey binding at index ${index} must define a non-empty key.`);
        }

        assertKnownActionId(binding.action, `hotkey action at index ${index}`);
    });

    return config;
}
