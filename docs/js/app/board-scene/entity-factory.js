import { BOARD_SCENE_ENTITY_KIND } from "./contracts.js";
import { createBoardEdgeEntityBuilder, createBoardNodeEntityBuilder } from "./entity-builders.js";
import { createBoardSceneEntity } from "./entity-factory-runtime.js";

export function createBoardNodeEntity({
    element = null,
    id,
    localX = 0,
    localY = 0,
    pixelX = 0,
    pixelY = 0,
    symbol
}) {
    return createBoardSceneEntity({
        kind: BOARD_SCENE_ENTITY_KIND.node,
        context: {
            element,
            id,
            localX,
            localY,
            pixelX,
            pixelY,
            symbol
        },
        factory: source =>
            createBoardNodeEntityBuilder()
                .id(source.id)
                .symbol(source.symbol)
                .localPosition(source.localX, source.localY)
                .pixelPosition(source.pixelX, source.pixelY)
                .element(source.element)
                .build()
    });
}

export function createBoardEdgeEntity({
    fromNodeId,
    fromPosition,
    line = null,
    id = null,
    toNodeId,
    toPosition
}) {
    return createBoardSceneEntity({
        kind: BOARD_SCENE_ENTITY_KIND.edge,
        context: {
            fromNodeId,
            fromPosition,
            id: id ?? createBoardEdgeEntityId({ fromNodeId, fromPosition, toNodeId, toPosition }),
            line,
            toNodeId,
            toPosition
        },
        factory: source =>
            createBoardEdgeEntityBuilder()
                .id(source.id)
                .from(source.fromNodeId, source.fromPosition)
                .to(source.toNodeId, source.toPosition)
                .line(source.line)
                .build()
    });
}

export function createBoardEdgeEntityId({
    fromNodeId,
    fromPosition,
    toNodeId,
    toPosition
}) {
    return `${fromNodeId}:${fromPosition}->${toNodeId}:${toPosition}`;
}
