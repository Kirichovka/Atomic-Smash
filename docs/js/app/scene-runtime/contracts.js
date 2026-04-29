export const SCENE_RUNTIME_PART_KIND = Object.freeze({
    runtime: "runtime",
    viewport: "viewport"
});

const REQUIRED_METHODS_BY_KIND = Object.freeze({
    [SCENE_RUNTIME_PART_KIND.runtime]: [
        "sync"
    ],
    [SCENE_RUNTIME_PART_KIND.viewport]: [
        "clear",
        "getRect",
        "observeResize"
    ]
});

export function assertSceneRuntimePartContract(part, kind) {
    if (!kind || !REQUIRED_METHODS_BY_KIND[kind]) {
        throw new Error(`Unknown scene runtime part kind: "${kind}".`);
    }

    if (!part || typeof part !== "object") {
        throw new Error(`Invalid scene runtime ${kind}: factory must return an object.`);
    }

    REQUIRED_METHODS_BY_KIND[kind].forEach(methodName => {
        if (typeof part[methodName] !== "function") {
            throw new Error(
                `Invalid scene runtime ${kind}: required method "${methodName}()" is missing.`
            );
        }
    });

    return part;
}
