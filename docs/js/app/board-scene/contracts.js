export const BOARD_SCENE_ENTITY_KIND = Object.freeze({
    edge: "edge",
    node: "node",
    space: "space"
});

export const BOARD_SCENE_ENTITY_REQUIRED_METADATA = Object.freeze({
    [BOARD_SCENE_ENTITY_KIND.edge]: [
        "fromNodeId",
        "fromPosition",
        "toNodeId",
        "toPosition"
    ],
    [BOARD_SCENE_ENTITY_KIND.node]: [
        "localX",
        "localY",
        "pixelX",
        "pixelY",
        "symbol"
    ],
    [BOARD_SCENE_ENTITY_KIND.space]: [
        "defaultNodeHeight",
        "defaultNodeWidth",
        "nodeHeight",
        "nodeWidth",
        "viewportHeight",
        "viewportWidth"
    ]
});

export const BOARD_SCENE_POSITION_SPACE = Object.freeze({
    local: "local",
    pixel: "pixel"
});

export const BOARD_SCENE_PART_KIND = Object.freeze({
    connectionSession: "connection-session",
    dragSession: "drag-session",
    geometry: "geometry",
    mutation: "mutation",
    render: "render",
    selection: "selection",
    state: "state"
});

const REQUIRED_METHODS_BY_KIND = Object.freeze({
    [BOARD_SCENE_PART_KIND.geometry]: [
        "clampPosition",
        "createSpawnPosition",
        "getNodeMetrics",
        "isNodeOutside",
        "sync",
        "toLocal",
        "toPixel"
    ],
    [BOARD_SCENE_PART_KIND.render]: [
        "createConnection",
        "createNode",
        "getNodeLeft",
        "getNodeLocalX",
        "getNodeLocalY",
        "getNodeTop",
        "localToPixelPosition",
        "pixelToLocalPosition",
        "setNodePosition",
        "sync",
        "syncNodeLayout"
    ],
    [BOARD_SCENE_PART_KIND.selection]: [
        "clearSelectedNodes",
        "getMovingGroup",
        "getSelectedNodeIds",
        "notifySelectionState",
        "selectSingleNode",
        "toggleNodeSelection"
    ],
    [BOARD_SCENE_PART_KIND.dragSession]: [
        "cleanupMovingNode",
        "moveNode",
        "startMoveNode",
        "stopMoveNode"
    ],
    [BOARD_SCENE_PART_KIND.connectionSession]: [
        "drawTemporaryWire",
        "finishConnection",
        "removeTemporaryWire",
        "startConnection"
    ],
    [BOARD_SCENE_PART_KIND.mutation]: [
        "captureState",
        "clearRuntimeBoard",
        "createNode",
        "removeConnectionByLine",
        "removeNode",
        "removeNodes",
        "restore",
        "restoreConnection"
    ],
    [BOARD_SCENE_PART_KIND.state]: [
        "addConnection",
        "addEdgeEntity",
        "addNode",
        "addNodeEntity",
        "clearConnections",
        "clearEdgeEntities",
        "clearNodes",
        "clearNodeEntities",
        "clearSelection",
        "deleteNode",
        "deleteEdgeEntity",
        "deleteNodeEntity",
        "deleteSelectedNode",
        "getConnections",
        "getEdgeEntity",
        "getEdgeEntityValues",
        "getNode",
        "getNodeEntries",
        "getNodeIdFromElement",
        "getNodeEntity",
        "getNodeEntityByElement",
        "getNodeEntityValues",
        "getNodeSymbol",
        "getNodes",
        "getNodeValues",
        "getPrimarySelectedNodeId",
        "getSelectedNodeIds",
        "hasNode",
        "hasSelectedNode",
        "removeConnectionAt",
        "replaceSelectedNodeId",
        "addSelectedNode",
        "syncPrimarySelectedNodeId"
    ]
});

export function assertBoardScenePartContract(part, kind) {
    if (!kind || !REQUIRED_METHODS_BY_KIND[kind]) {
        throw new Error(`Unknown board scene part kind: "${kind}".`);
    }

    if (!part || typeof part !== "object") {
        throw new Error(`Invalid board scene ${kind}: controller factory must return an object.`);
    }

    REQUIRED_METHODS_BY_KIND[kind].forEach(methodName => {
        if (typeof part[methodName] !== "function") {
            throw new Error(
                `Invalid board scene ${kind}: required method "${methodName}()" is missing.`
            );
        }
    });

    return part;
}

export function assertBoardSceneEntityContract(entity, kind) {
    if (!kind || !BOARD_SCENE_ENTITY_REQUIRED_METADATA[kind]) {
        throw new Error(`Unknown board scene entity kind: "${kind}".`);
    }

    if (!entity || typeof entity !== "object") {
        throw new Error(`Invalid board scene ${kind}: entity factory must return an object.`);
    }

    if (entity.kind !== kind) {
        throw new Error(`Invalid board scene ${kind}: entity kind mismatch ("${entity.kind ?? "unknown"}").`);
    }

    if (typeof entity.id !== "string" || entity.id.trim() === "") {
        throw new Error(`Invalid board scene ${kind}: entity id must be a non-empty string.`);
    }

    if (!entity.metadata || typeof entity.metadata !== "object") {
        throw new Error(`Invalid board scene ${kind}: metadata must be an object.`);
    }

    BOARD_SCENE_ENTITY_REQUIRED_METADATA[kind].forEach(metadataKey => {
        if (!(metadataKey in entity.metadata)) {
            throw new Error(
                `Invalid board scene ${kind}: required metadata "${metadataKey}" is missing.`
            );
        }
    });

    return entity;
}
