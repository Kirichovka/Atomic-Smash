export function createSceneActionRegistry(initialActions = {}) {
    const handlers = new Map();

    registerMany(initialActions);

    function register(actionId, handler) {
        if (typeof actionId !== "string" || !actionId.trim() || typeof handler !== "function") {
            return;
        }

        handlers.set(actionId, handler);
    }

    function registerMany(actions = {}) {
        Object.entries(actions).forEach(([actionId, handler]) => {
            register(actionId, handler);
        });
    }

    function get(actionId) {
        return handlers.get(actionId) ?? null;
    }

    function has(actionId) {
        return handlers.has(actionId);
    }

    function resolve(actionId, args) {
        const handler = get(actionId);
        if (typeof handler !== "function") {
            return undefined;
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
