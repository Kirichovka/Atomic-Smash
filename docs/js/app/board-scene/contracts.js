export const BOARD_SCENE_ENTITY_KIND = Object.freeze({
    edge: "edge",
    node: "node",
    space: "space"
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
        "addNode",
        "clearConnections",
        "clearNodes",
        "clearSelection",
        "deleteNode",
        "deleteSelectedNode",
        "getConnections",
        "getNode",
        "getNodeEntries",
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
