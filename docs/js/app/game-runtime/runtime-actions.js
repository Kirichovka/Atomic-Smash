import { createSceneActionRegistry } from "../scene-ui/action-registry.js";

export function createRuntimeActionRegistry() {
    const registry = createSceneActionRegistry();

    function registerNavigationActions(actions) {
        registry.registerMany(actions);
    }

    function registerLevelIntroAction({ actionId, handler }) {
        registry.register(actionId, handler);
    }

    return {
        registry,
        registerLevelIntroAction,
        registerNavigationActions
    };
}
