import { BOARD_SCENE_ENTITY_KIND } from "./contracts.js";
import { attachBoardEntityMetadata, validateBoardEdgeEntity, validateBoardNodeEntity } from "./entity-contracts.js";

export function createBoardSceneEntity({
    factory,
    kind,
    context
}) {
    if (typeof factory !== "function") {
        throw new Error(`Cannot create board scene ${kind}: entity factory is not a function.`);
    }

    const entity = factory(context);

    switch (kind) {
        case BOARD_SCENE_ENTITY_KIND.node:
            return attachBoardEntityMetadata(validateBoardNodeEntity(entity), kind);
        case BOARD_SCENE_ENTITY_KIND.edge:
            return attachBoardEntityMetadata(validateBoardEdgeEntity(entity), kind);
        default:
            throw new Error(`Unsupported board scene entity kind: "${kind}".`);
    }
}
