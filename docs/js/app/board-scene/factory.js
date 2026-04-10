import { assertBoardScenePartContract } from "./contracts.js";

export function createBoardScenePart({
    factory,
    kind,
    context
}) {
    if (typeof factory !== "function") {
        throw new Error(`Cannot create board scene ${kind}: factory is not a function.`);
    }

    const part = factory(context);
    assertBoardScenePartContract(part, kind);
    return Object.assign(part, {
        boardScenePartKind: kind
    });
}
