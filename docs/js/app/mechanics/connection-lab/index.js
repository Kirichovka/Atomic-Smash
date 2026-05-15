import { createBoardSceneRuntime } from "../../board-scene/runtime.js?v=20260509-board-selection-modifier";
import { createBoardVisualRuntimeContentBuilder } from "../../board-visual-runtime/content-builders.js";
import { RUNTIME_EVENT_IDS } from "../../contracts/event-contracts.js";
import { createRuntimeContentBuilder } from "../../runtime-content/factory.js";
import { RUNTIME_CONTENT_BUILDER_KIND } from "../../runtime-content/contracts.js";
import { getCompoundById, getCurrentLevel } from "../../state.js?v=20260515-balance-flow";
import {
    DEFAULT_NODE_HEIGHT,
    DEFAULT_NODE_WIDTH,
    SPAWN_OFFSETS,
    getMaxNodeId,
    getNodeMetrics,
    isPointerOutsideViewport,
    parseNodeIndex
} from "./constants.js";
import { createConnectionLabEvaluation } from "./evaluation.js?v=20260515-chemistry-engine";
import {
    bindConnectionLabResizeObserver,
    bindConnectionLabWorkspaceInteractions
} from "./workspace-events.js";

export function createConnectionLabMechanic({ refs, state, bus, boardRuntimeSchemaConfig }) {
    const board = state.board;
    const elementsBySymbol = new Map(state.catalog.elements.map(element => [element.symbol, element]));
    const boardVisualContentBuilder = createRuntimeContentBuilder({
        kind: RUNTIME_CONTENT_BUILDER_KIND.boardVisual,
        factory: createBoardVisualRuntimeContentBuilder
    });
    let resizeBinding = null;
    let workspaceBinding = null;
    const publishInteractionContext = payload => {
        bus.publish(RUNTIME_EVENT_IDS.interactionContextChanged, payload);
    };
    const {
        boardConnectionSession,
        boardDragSession,
        boardMutation,
        boardRender,
        boardScene,
        boardSelection,
        boardState,
        viewport
    } = createBoardSceneRuntime({
        board,
        boardVisualContentBuilder,
        boardRuntimeSchemaConfig,
        bus,
        refs,
        callbacks: {
            connectionExists,
            defaultNodeHeight: DEFAULT_NODE_HEIGHT,
            defaultNodeWidth: DEFAULT_NODE_WIDTH,
            getConnectionTargetAtPoint,
            getMaxNodeId,
            isMounted,
            isNodeOutsideMixZone,
            isPointerOutsideViewport,
            parseNodeIndex,
            publishInteractionContext,
            spawnOffsets: SPAWN_OFFSETS,
            sync,
            validateConnectionAttempt
        }
    });
    const evaluation = createConnectionLabEvaluation({
        boardState,
        compoundsByIngredients: state.catalog.compoundsByIngredients,
        elementsBySymbol
    });

    function init() {
        if (!isMounted()) {
            return;
        }

        workspaceBinding ??= bindConnectionLabWorkspaceInteractions({
            refs,
            board,
            boardSelection,
            createNodeFromDrop: spawnElementAtClientPoint,
            isPointInsideMixZone,
            publishInteractionContext
        });
        resizeBinding ??= bindConnectionLabResizeObserver({
            mixZone: refs.mixZone,
            sync
        });
        restore();
        sync();
    }

    function activate() {
        sync();
    }

    function deactivate() {
        boardConnectionSession.removeTemporaryWire();
        boardDragSession.cleanupMovingNode();
    }

    function reset(options = {}) {
        const { preserveSavedState = false } = options;

        boardMutation.clearRuntimeBoard();

        if (!preserveSavedState) {
            board.savedNodes = [];
            board.savedConnections = [];
            board.nodeIdCounter = 0;
        }
    }

    function sync() {
        if (!isMounted()) {
            return;
        }

        boardRender.sync(boardState.getNodes(), boardState.getConnections(), board.movingNode);
    }

    function captureState() {
        return boardMutation.captureState();
    }

    function restore(snapshot = null) {
        boardMutation.restore(
            snapshot,
            (symbol, x, y, options) => createNode(symbol, x, y, options),
            connection => restoreConnection(connection)
        );
    }

    function createHelpVisual(compound) {
        return boardVisualContentBuilder.renderHelpVisual({
            compound
        });
    }

    function spawnElement(symbol) {
        if (!symbol || !isMounted()) {
            return null;
        }

        const position = getSuggestedSpawnPosition();
        const node = createNode(symbol, position.x, position.y);
        sync();
        return node;
    }

    function spawnElementAtClientPoint(symbol, clientX, clientY) {
        if (!symbol || !isMounted() || !isPointInsideMixZone(clientX, clientY)) {
            return null;
        }

        const zoneRect = refs.mixZone.getBoundingClientRect();
        const nodeMetrics = getNodeMetrics(refs.mixZone);
        const node = createNode(
            symbol,
            clientX - zoneRect.left - (nodeMetrics.width / 2),
            clientY - zoneRect.top - (nodeMetrics.height / 2)
        );

        if (!node) {
            return null;
        }

        publishInteractionContext({
            source: "mix-zone-drop",
            zone: "mix-zone",
            clearPaletteSelection: true,
            inspectedSymbol: symbol,
            persist: true
        });
        sync();
        return node;
    }

    function getSuggestedSpawnPosition() {
        return boardScene.createSpawnPosition(boardState.getNodes().size);
    }

    function createNode(symbol, x, y, options = {}) {
        return boardMutation.createNode(symbol, x, y, {
            ...options,
            onNodePointerDown: boardDragSession.startMoveNode
        });
    }

    function restoreConnection(connection) {
        boardMutation.restoreConnection(connection, line => {
            boardSelection.clearSelectedNodes();
            boardMutation.removeConnectionByLine(line);
        });
    }

    function getConnectionTargetAtPoint(clientX, clientY) {
        if (!isMounted()) {
            return null;
        }

        const element = document.elementFromPoint(clientX, clientY);

        if (!element) {
            return null;
        }

        const connector = element.closest(".connector");
        if (connector) {
            return connector;
        }

        const node = element.closest(".node");
        if (!node) {
            return getClosestConnectorOnNearestOtherNode(clientX, clientY);
        }

        return getClosestConnector(node, clientX, clientY);
    }

    function getClosestConnector(node, clientX, clientY) {
        const connectors = [...node.querySelectorAll(".connector")];
        let closestConnector = null;
        let closestDistance = Infinity;

        connectors.forEach(connector => {
            const rect = connector.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const distance = Math.hypot(clientX - centerX, clientY - centerY);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestConnector = connector;
            }
        });

        return closestConnector;
    }

    function getClosestConnectorOnNearestOtherNode(clientX, clientY) {
        const startNodeId = board.startConnector?.dataset?.nodeId ?? null;
        const nodes = [...refs.mixZone.querySelectorAll(".node")]
            .filter(node => node.dataset?.id && node.dataset.id !== startNodeId);
        let closestNode = null;
        let closestDistance = Infinity;

        nodes.forEach(node => {
            const rect = node.getBoundingClientRect();
            const centerX = rect.left + (rect.width / 2);
            const centerY = rect.top + (rect.height / 2);
            const distance = Math.hypot(clientX - centerX, clientY - centerY);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestNode = node;
            }
        });

        if (!closestNode || closestDistance > 120) {
            return null;
        }

        return getClosestConnector(closestNode, clientX, clientY);
    }

    function connectionExists(startNodeId, endNodeId) {
        return boardState.getConnections().some(connection =>
            (connection.fromNodeId === startNodeId && connection.toNodeId === endNodeId) ||
            (connection.fromNodeId === endNodeId && connection.toNodeId === startNodeId)
        );
    }

    function validateConnectionAttempt({ startNodeId, endNodeId, preview = false }) {
        if (!isBasicFirstTutorialActive()) {
            return { isValid: true };
        }

        const issue = getBasicFirstTutorialConnectionIssue(startNodeId, endNodeId);
        if (!issue) {
            if (!preview) {
                state.ui.basicTutorialConnectionFeedback = null;
            }
            return { isValid: true };
        }

        if (!preview) {
            state.ui.basicTutorialConnectionFeedback = issue;
        }
        return {
            isValid: false,
            reason: issue
        };
    }

    function isBasicFirstTutorialActive() {
        if (state.progress.basicTutorialCompleted || state.progress.completedLevelIds.has("level-1")) {
            return false;
        }

        const currentLevel = getCurrentLevel(state);
        return currentLevel?.id === "level-1" && currentLevel.themeId === "basic";
    }

    function getBasicFirstTutorialConnectionIssue(startNodeId, endNodeId) {
        if (!startNodeId || !endNodeId) {
            return "Release the bond on another atom connector.";
        }

        if (startNodeId === endNodeId) {
            return "A bond needs two different atoms. Start on one atom and release on another.";
        }

        if (connectionExists(startNodeId, endNodeId)) {
            return "Those two atoms are already connected. For water, each Hydrogen needs one bond to Oxygen.";
        }

        const startSymbol = boardState.getNodeSymbol(startNodeId);
        const endSymbol = boardState.getNodeSymbol(endNodeId);
        if (!startSymbol || !endSymbol) {
            return "The game cannot read one of those atoms yet. Try releasing directly on a connector.";
        }

        const currentLevel = getCurrentLevel(state);
        const targetCompound = currentLevel ? getCompoundById(state, currentLevel.targetCompoundId) : null;
        if (targetCompound?.id === "water" && !isHydrogenOxygenPair(startSymbol, endSymbol)) {
            return "Water needs Hydrogen bonded to Oxygen. A Hydrogen-to-Hydrogen bond will not make H2O.";
        }

        const valencyIssue = getConnectionValencyIssue(startNodeId, endNodeId);
        if (valencyIssue) {
            return valencyIssue;
        }

        return null;
    }

    function isHydrogenOxygenPair(leftSymbol, rightSymbol) {
        return (
            (leftSymbol === "H" && rightSymbol === "O") ||
            (leftSymbol === "O" && rightSymbol === "H")
        );
    }

    function getConnectionValencyIssue(startNodeId, endNodeId) {
        return [startNodeId, endNodeId]
            .map(nodeId => {
                const symbol = boardState.getNodeSymbol(nodeId);
                const element = elementsBySymbol.get(symbol);
                const allowedBonds = Number(element?.valency);
                if (!Number.isFinite(allowedBonds)) {
                    return null;
                }

                const nextBondCount = getNodeDegree(nodeId) + 1;
                if (nextBondCount <= allowedBonds) {
                    return null;
                }

                return `${element.name ?? symbol} can only make ${allowedBonds} bond${allowedBonds === 1 ? "" : "s"}. This connection would give it ${nextBondCount}.`;
            })
            .find(Boolean) ?? null;
    }

    function getNodeDegree(nodeId) {
        return boardState.getConnections().reduce((degree, connection) => {
            if (connection.fromNodeId === nodeId || connection.toNodeId === nodeId) {
                return degree + 1;
            }

            return degree;
        }, 0);
    }

    function removeNode(nodeId, options = {}) {
        boardMutation.removeNode(nodeId, options);
    }

    function removeNodes(nodeIds = []) {
        boardMutation.removeNodes(nodeIds);
    }

    function isNodeOutsideMixZone(x, y) {
        return boardScene.isNodeOutside(x, y);
    }

    function isPointInsideMixZone(clientX, clientY) {
        const rect = refs.mixZone.getBoundingClientRect();

        return (
            clientX >= rect.left &&
            clientX <= rect.right &&
            clientY >= rect.top &&
            clientY <= rect.bottom
        );
    }

    function isMounted() {
        return Boolean(refs.workspace && refs.mixZone && refs.svg);
    }

    return {
        activate,
        captureState,
        clearSelection: (options = {}) => boardSelection.clearSelectedNodes({ notify: !options.silent }),
        createHelpVisual,
        deactivate,
        evaluate: evaluation.evaluate,
        getSceneRuntime: () => ({
            boardConnectionSession,
            boardDragSession,
            boardMutation,
            boardRender,
            boardScene,
            boardSelection,
            boardState,
            viewport
        }),
        getSceneViewport: () => viewport,
        getSelectedNodeIds: boardSelection.getSelectedNodeIds,
        id: "connection-lab",
        init,
        removeNodeById: removeNode,
        removeNodesByIds: removeNodes,
        reset,
        restore,
        spawnElement,
        spawnElementAtClientPoint,
        sync,
        validateValency: evaluation.validateValency
    };
}
