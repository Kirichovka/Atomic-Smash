import { createSceneActionRegistry } from "../scene-ui/action-registry.js";
import { assertKnownActionId } from "../contracts/action-ids.js";

export function createRuntimeActionRegistry() {
    const registry = createSceneActionRegistry();

    function registerNavigationActions(actions) {
        registry.registerMany(actions);
    }

    function registerLevelIntroAction({ actionId, handler }) {
        assertKnownActionId(actionId, "runtime action");
        registry.register(actionId, handler);
    }

    return {
        registry,
        registerLevelIntroAction,
        registerNavigationActions
    };
}
