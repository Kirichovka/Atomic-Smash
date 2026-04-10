import { assertKnownActionId } from "../contracts/action-ids.js";

export function createSceneActionRegistry(initialActions = {}) {
    const handlers = new Map();

    registerMany(initialActions);

    function register(actionId, handler) {
        if (typeof handler !== "function") {
            return;
        }

        assertKnownActionId(actionId, "scene action");
        handlers.set(actionId, handler);
    }

    function registerMany(actions = {}) {
        Object.entries(actions).forEach(([actionId, handler]) => {
            register(actionId, handler);
        });
    }

    function get(actionId) {
        assertKnownActionId(actionId, "scene action");
        return handlers.get(actionId) ?? null;
    }

    function has(actionId) {
        assertKnownActionId(actionId, "scene action");
        return handlers.has(actionId);
    }

    function resolve(actionId, args) {
        assertKnownActionId(actionId, "scene action");
        const handler = get(actionId);
        if (typeof handler !== "function") {
            throw new Error(`No handler registered for scene action: ${actionId}`);
        }

        if (args === undefined) {
            return handler;
        }

        return event => handler(args, event);
    }

    return {
        get,
        has,
        register,
        registerMany,
        resolve
    };
}
