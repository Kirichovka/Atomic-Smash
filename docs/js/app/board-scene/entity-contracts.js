import { assertBoardSceneEntityContract, BOARD_SCENE_ENTITY_KIND } from "./contracts.js";

export function attachBoardEntityMetadata(entity, kind) {
    return Object.assign(entity, {
        boardSceneEntityKind: kind
    });
}

export function validateBoardNodeEntity(entity) {
    const validatedEntity = assertBoardSceneEntityContract(entity, BOARD_SCENE_ENTITY_KIND.node);

    const numericKeys = ["localX", "localY", "pixelX", "pixelY"];
    numericKeys.forEach(key => {
        if (!Number.isFinite(validatedEntity.metadata[key])) {
            throw new Error(`Invalid board scene node: metadata "${key}" must be a finite number.`);
        }
    });

    if (typeof validatedEntity.metadata.symbol !== "string" || validatedEntity.metadata.symbol.trim() === "") {
        throw new Error("Invalid board scene node: metadata \"symbol\" must be a non-empty string.");
    }

    return validatedEntity;
}

export function validateBoardEdgeEntity(entity) {
    const validatedEntity = assertBoardSceneEntityContract(entity, BOARD_SCENE_ENTITY_KIND.edge);

    ["fromNodeId", "fromPosition", "toNodeId", "toPosition"].forEach(key => {
        if (typeof validatedEntity.metadata[key] !== "string" || validatedEntity.metadata[key].trim() === "") {
            throw new Error(`Invalid board scene edge: metadata "${key}" must be a non-empty string.`);
        }
    });

    return validatedEntity;
}
