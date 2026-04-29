import { assertSceneRuntimePartContract } from "./contracts.js";

export function createSceneRuntimePart({
    context,
    factory,
    kind
}) {
    if (typeof factory !== "function") {
        throw new Error(`Cannot create scene runtime ${kind}: factory is not a function.`);
    }

    const part = factory(context);
    assertSceneRuntimePartContract(part, kind);

    return Object.assign(part, {
        sceneRuntimePartKind: kind
    });
}
