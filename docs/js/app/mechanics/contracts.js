export const MECHANIC_CONTRACT_VERSION = 1;

export const REQUIRED_MECHANIC_METHODS = Object.freeze([
    "captureState",
    "init",
    "reset",
    "sync"
]);

export const OPTIONAL_MECHANIC_METHODS = Object.freeze([
    "activate",
    "clearSelection",
    "createHelpVisual",
    "deactivate",
    "evaluate",
    "getSceneRuntime",
    "getSceneViewport",
    "getSelectedNodeIds",
    "removeNodeById",
    "removeNodesByIds",
    "restore",
    "spawnElement",
    "spawnElementAtClientPoint",
    "teardown",
    "validateValency"
]);

export function assertMechanicContract(mechanic, config = {}) {
    const mechanicId = config.id ?? mechanic?.id ?? "unknown-mechanic";

    if (!mechanic || typeof mechanic !== "object") {
        throw new Error(`Invalid mechanic "${mechanicId}": mechanic factory must return an object.`);
    }

    if (typeof mechanic.id !== "string" || mechanic.id.length === 0) {
        throw new Error(`Invalid mechanic "${mechanicId}": mechanic must expose a non-empty string id.`);
    }

    REQUIRED_MECHANIC_METHODS.forEach(methodName => {
        if (typeof mechanic[methodName] !== "function") {
            throw new Error(
                `Invalid mechanic "${mechanic.id}": required method "${methodName}()" is missing.`
            );
        }
    });

    OPTIONAL_MECHANIC_METHODS.forEach(methodName => {
        if (mechanic[methodName] != null && typeof mechanic[methodName] !== "function") {
            throw new Error(
                `Invalid mechanic "${mechanic.id}": optional method "${methodName}" must be a function when provided.`
            );
        }
    });

    return mechanic;
}

export function attachMechanicMetadata(mechanic, config = {}) {
    return Object.assign(mechanic, {
        capabilities: Object.freeze([...(config.capabilities ?? mechanic.capabilities ?? [])]),
        contractVersion: MECHANIC_CONTRACT_VERSION,
        displayName: config.name ?? mechanic.displayName ?? mechanic.id,
        mechanicConfig: config,
        mechanicManifestId: config.manifestId ?? mechanic.mechanicManifestId ?? mechanic.id,
        mechanicLifecycle: Object.freeze({
            hasActivate: typeof mechanic.activate === "function",
            hasDeactivate: typeof mechanic.deactivate === "function",
            hasSceneRuntime: typeof mechanic.getSceneRuntime === "function",
            hasSceneViewport: typeof mechanic.getSceneViewport === "function",
            hasTeardown: typeof mechanic.teardown === "function"
        })
    });
}
