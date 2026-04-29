export const MECHANIC_CAPABILITY = Object.freeze({
    activationLifecycle: "activation-lifecycle",
    boardSceneRuntime: "board-scene-runtime",
    helpVisual: "help-visual",
    selection: "selection",
    spawnAtPoint: "spawn-at-point",
    valencyValidation: "valency-validation"
});

export const REQUIRED_MECHANIC_MANIFEST_FIELDS = Object.freeze([
    "create",
    "id"
]);

export function assertMechanicManifestContract(manifest) {
    if (!manifest || typeof manifest !== "object") {
        throw new Error("Invalid mechanic manifest: manifest must be an object.");
    }

    REQUIRED_MECHANIC_MANIFEST_FIELDS.forEach(fieldName => {
        if (!(fieldName in manifest)) {
            throw new Error(`Invalid mechanic manifest: required field "${fieldName}" is missing.`);
        }
    });

    if (typeof manifest.id !== "string" || manifest.id.trim() === "") {
        throw new Error("Invalid mechanic manifest: id must be a non-empty string.");
    }

    if (typeof manifest.create !== "function") {
        throw new Error(`Invalid mechanic manifest "${manifest.id}": create must be a function.`);
    }

    if (manifest.capabilities != null) {
        if (!Array.isArray(manifest.capabilities)) {
            throw new Error(`Invalid mechanic manifest "${manifest.id}": capabilities must be an array.`);
        }

        manifest.capabilities.forEach(capability => {
            if (!Object.values(MECHANIC_CAPABILITY).includes(capability)) {
                throw new Error(
                    `Invalid mechanic manifest "${manifest.id}": unknown capability "${capability}".`
                );
            }
        });
    }

    return manifest;
}

export function attachMechanicManifestMetadata(manifest) {
    return Object.assign(manifest, {
        capabilities: Object.freeze([...(manifest.capabilities ?? [])])
    });
}
