import { BOARD_SCENE_PART_KIND } from "./contracts.js";
import { createBoardScenePart } from "./factory.js";
import { createBoardConnectionSessionController } from "./connection-session-controller.js";
import { createBoardSceneController } from "./controller.js";
import { createBoardDragSessionController } from "./drag-session-controller.js";
import { createBoardMutationController } from "./mutation-controller.js";
import { createBoardRenderController } from "./render-controller.js";
import { createBoardSelectionController } from "./selection-controller.js";
import { createBoardStateController } from "./state-controller.js";
import { createBoardSceneViewport } from "./view.js?v=20260411-connector-bind-fix";
import { createSceneRuntimePart } from "../scene-runtime/factory.js";
import { SCENE_RUNTIME_PART_KIND } from "../scene-runtime/contracts.js";

export function createBoardSceneRuntime({
    board,
    boardVisualContentBuilder,
    boardRuntimeSchemaConfig,
    bus,
    refs,
    callbacks
}) {
    const boardState = createBoardScenePart({
        kind: BOARD_SCENE_PART_KIND.state,
        context: board,
        factory: sourceBoard => createBoardStateController(sourceBoard)
    });
    const viewport = createSceneRuntimePart({
        kind: SCENE_RUNTIME_PART_KIND.viewport,
        context: {
            edgeLayerElement: refs.svg,
            nodeLayerElement: refs.mixZone,
            viewportElement: refs.mixZone
        },
        factory: createBoardSceneViewport
    });
    const boardScene = createBoardScenePart({
        kind: BOARD_SCENE_PART_KIND.geometry,
        context: {
            defaultNodeHeight: callbacks.defaultNodeHeight,
            defaultNodeWidth: callbacks.defaultNodeWidth,
            offsets: callbacks.spawnOffsets,
            viewportElement: refs.mixZone
        },
        factory: createBoardSceneController
    });
    const boardRender = createBoardScenePart({
        kind: BOARD_SCENE_PART_KIND.render,
        context: {
            boardVisualContentBuilder,
            boardRuntimeSchemaConfig,
            boardScene,
            boardState,
            viewport
        },
        factory: createBoardRenderController
    });
    const boardSelection = createBoardScenePart({
        kind: BOARD_SCENE_PART_KIND.selection,
        context: {
            board,
            boardState,
            bus
        },
        factory: createBoardSelectionController
    });

    let boardMutation;

    const boardDragSession = createBoardScenePart({
        kind: BOARD_SCENE_PART_KIND.dragSession,
        context: {
            board,
            boardRender,
            boardSelection,
            boardState,
            captureState: () => boardMutation.captureState(),
            isNodeOutsideMixZone: callbacks.isNodeOutsideMixZone,
            isPointerOutsideViewport: callbacks.isPointerOutsideViewport,
            publishInteractionContext: callbacks.publishInteractionContext,
            removeNodes: nodeIds => boardMutation.removeNodes(nodeIds)
        },
        factory: createBoardDragSessionController
    });
    const boardConnectionSession = createBoardScenePart({
        kind: BOARD_SCENE_PART_KIND.connectionSession,
        context: {
            board,
            boardRender,
            boardSelection,
            boardState,
            captureState: () => boardMutation.captureState(),
            connectionExists: callbacks.connectionExists,
            getConnectionTargetAtPoint: callbacks.getConnectionTargetAtPoint,
            publishInteractionContext: callbacks.publishInteractionContext,
            removeConnectionByLine: line => boardMutation.removeConnectionByLine(line)
        },
        factory: createBoardConnectionSessionController
    });
    boardMutation = createBoardScenePart({
        kind: BOARD_SCENE_PART_KIND.mutation,
        context: {
            board,
            boardConnectionSession,
            boardRender,
            boardScene,
            boardSelection,
            boardState,
            getMaxNodeId: callbacks.getMaxNodeId,
            isMounted: callbacks.isMounted,
            parseNodeIndex: callbacks.parseNodeIndex,
            sync: callbacks.sync
        },
        factory: createBoardMutationController
    });

    return {
        boardConnectionSession,
        boardDragSession,
        boardMutation,
        boardRender,
        boardScene,
        boardSelection,
        boardState
        ,
        viewport
    };
}
