import { createBoardConnectionSessionController } from "../board-scene/connection-session-controller.js";
import { createBoardSceneController } from "../board-scene/controller.js";
import { createBoardDragSessionController } from "../board-scene/drag-session-controller.js";
import { createBoardRenderController } from "../board-scene/render-controller.js";
import { createBoardSelectionController } from "../board-scene/selection-controller.js";
import { createBoardStateController } from "../board-scene/state-controller.js";
import {
    getBoardNodeMetrics
} from "../board-scene/methods.js";
import { RUNTIME_EVENT_IDS } from "../contracts/event-contracts.js";
import { createEdgeKey } from "../state.js";

const DEFAULT_NODE_WIDTH = 110;
const DEFAULT_NODE_HEIGHT = 64;
const SPAWN_OFFSETS = [
    { x: 0, y: 0 },
    { x: 24, y: 18 },
    { x: -24, y: 18 },
    { x: 24, y: -18 },
    { x: -24, y: -18 },
    { x: 0, y: 36 },
    { x: 36, y: 0 },
    { x: -36, y: 0 }
];

export function createConnectionLabMechanic({ refs, state, bus }) {
    const board = state.board;
    const boardState = createBoardStateController(board);
    const elementsBySymbol = new Map(state.catalog.elements.map(element => [element.symbol, element]));
    const boardScene = createBoardSceneController({
        defaultNodeHeight: DEFAULT_NODE_HEIGHT,
        defaultNodeWidth: DEFAULT_NODE_WIDTH,
        offsets: SPAWN_OFFSETS,
        viewportElement: refs.mixZone
    });
    const boardRender = createBoardRenderController({
        boardScene,
        mixZoneElement: refs.mixZone,
        svgElement: refs.svg
    });
    const boardSelection = createBoardSelectionController({
        board,
        boardState,
        bus
    });
    let resizeObserver = null;
    let resizeSyncFrame = null;
    const publishInteractionContext = payload => {
        bus.publish(RUNTIME_EVENT_IDS.interactionContextChanged, payload);
    };
    const boardDragSession = createBoardDragSessionController({
        board,
        boardRender,
        boardSelection,
        boardState,
        captureState,
        isNodeOutsideMixZone,
        isPointerOutsideViewport,
        publishInteractionContext,
        removeNodes
    });
    const boardConnectionSession = createBoardConnectionSessionController({
        board,
        boardRender,
        boardSelection,
        boardState,
        captureState,
        connectionExists,
        getConnectionTargetAtPoint,
        publishInteractionContext,
        removeConnectionByLine
    });

    function init() {
        if (!isMounted()) {
            return;
        }

        bindWorkspaceInteractions();
        bindResizeObserver();
        restore();
        sync();
    }

    function bindResizeObserver() {
        if (resizeObserver || typeof ResizeObserver !== "function") {
            return;
        }

        resizeObserver = new ResizeObserver(() => {
            if (resizeSyncFrame !== null) {
                cancelAnimationFrame(resizeSyncFrame);
            }

            resizeSyncFrame = requestAnimationFrame(() => {
                resizeSyncFrame = null;
                sync();
            });
        });

        resizeObserver.observe(refs.mixZone);
    }

    function bindWorkspaceInteractions() {
        refs.workspace.addEventListener("dragover", event => {
            event.preventDefault();
        });

        refs.mixZone.addEventListener("pointerdown", event => {
            if (event.target.closest(".node")) {
                return;
            }

            if (event.pointerType === "mouse" && event.button !== 0) {
                return;
            }

            boardSelection.clearSelectedNodes({ notify: false });
            bus.publish(RUNTIME_EVENT_IDS.interactionContextChanged, {
                source: "mix-zone-background",
                zone: "mix-zone",
                clearPaletteSelection: true,
                inspectedSymbol: null,
                persist: false
            });
        });

        refs.workspace.addEventListener("drop", event => {
            event.preventDefault();
            if (!board.dragElementType) {
                return;
            }

            if (!isPointInsideMixZone(event.clientX, event.clientY)) {
                board.dragElementType = null;
                return;
            }

            const zoneRect = refs.mixZone.getBoundingClientRect();
            const droppedSymbol = board.dragElementType;
            const nodeMetrics = getNodeMetrics(refs.mixZone);
            const node = createNode(
                droppedSymbol,
                event.clientX - zoneRect.left - (nodeMetrics.width / 2),
                event.clientY - zoneRect.top - (nodeMetrics.height / 2)
            );
            board.dragElementType = null;

            if (node) {
                bus.publish(RUNTIME_EVENT_IDS.interactionContextChanged, {
                    source: "mix-zone-drop",
                    zone: "mix-zone",
                    clearPaletteSelection: true,
                    inspectedSymbol: droppedSymbol,
                    persist: true
                });
            }
        });
    }

    function evaluate() {
        if (!isMounted()) {
            return { status: "unknown" };
        }

        const nodeEntries = boardState.getNodeEntries().map(([id, node]) => ({
            id,
            symbol: node.dataset.symbol
        }));
        const ingredientKey = nodeEntries.map(node => node.symbol).sort().join(",");
        const candidates = state.catalog.compoundsByIngredients.get(ingredientKey) ?? [];

        if (candidates.length === 0) {
            return { status: "unknown" };
        }

        const boardGraph = createBoardGraph();

        for (const compound of candidates) {
            if (compoundMatchesBoard(compound, nodeEntries, boardGraph)) {
                return { status: "match", compound };
            }
        }

        const structuredCandidate = candidates.find(compound => compound.structure);
        if (structuredCandidate) {
            return { status: "structure-mismatch", compound: structuredCandidate };
        }

        return { status: "unknown" };
    }

    function validateValency() {
        const degreeByNodeId = new Map();

        boardState.getNodes().forEach((_, nodeId) => {
            degreeByNodeId.set(nodeId, 0);
        });

        boardState.getConnections().forEach(connection => {
            degreeByNodeId.set(connection.fromNodeId, (degreeByNodeId.get(connection.fromNodeId) ?? 0) + 1);
            degreeByNodeId.set(connection.toNodeId, (degreeByNodeId.get(connection.toNodeId) ?? 0) + 1);
        });

        const issues = boardState.getNodeEntries()
            .map(([nodeId, node]) => {
                const element = elementsBySymbol.get(node.dataset.symbol);
                const allowedBonds = Number(element?.valency);
                const actualBonds = degreeByNodeId.get(nodeId) ?? 0;

                if (!Number.isFinite(allowedBonds) || actualBonds <= allowedBonds) {
                    return null;
                }

                return {
                    actualBonds,
                    allowedBonds,
                    elementName: element?.name ?? node.dataset.symbol,
                    nodeId,
                    symbol: node.dataset.symbol
                };
            })
            .filter(Boolean);

        if (issues.length === 0) {
            return { isValid: true, issues: [], elements: [] };
        }

        const issueSymbols = [...new Set(issues.map(issue => issue.symbol))];
        const elements = issueSymbols
            .map(symbol => elementsBySymbol.get(symbol))
            .filter(Boolean)
            .map(element => ({
                name: element.name,
                symbol: element.symbol,
                valency: element.valency,
                valencyTheory: element.valencyTheory
            }));

        return {
            elements,
            isValid: false,
            issues
        };
    }

    function reset(options = {}) {
        const { preserveSavedState = false } = options;

        clearRuntimeBoard();

        if (!preserveSavedState) {
            board.savedNodes = [];
            board.savedConnections = [];
            board.nodeIdCounter = 0;
        }
    }

    function clearRuntimeBoard() {
        boardSelection.clearSelectedNodes();
        boardState.getNodeValues().forEach(node => node.remove());
        boardState.clearNodes();

        boardState.getConnections().forEach(connection => connection.line.remove());
        boardState.clearConnections();

        boardConnectionSession.removeTemporaryWire();
        sync();
    }

    function sync() {
        if (!isMounted()) {
            return;
        }

        boardRender.sync(boardState.getNodes(), boardState.getConnections(), board.movingNode);
    }

    function captureState() {
        if (!isMounted()) {
            return {
                nodeIdCounter: board.nodeIdCounter,
                savedConnections: board.savedConnections,
                savedNodes: board.savedNodes
            };
        }

        board.savedNodes = boardState.getNodeValues().map(node => ({
            id: node.dataset.id,
            localX: boardRender.getNodeLocalX(node),
            localY: boardRender.getNodeLocalY(node),
            symbol: node.dataset.symbol,
            x: boardRender.getNodeLeft(node),
            y: boardRender.getNodeTop(node)
        }));
        board.savedConnections = boardState.getConnections().map(connection => ({
            fromNodeId: connection.fromNodeId,
            fromPosition: connection.fromPosition,
            toNodeId: connection.toNodeId,
            toPosition: connection.toPosition
        }));

        return {
            nodeIdCounter: board.nodeIdCounter,
            savedConnections: board.savedConnections,
            savedNodes: board.savedNodes
        };
    }

    function restore(snapshot = null) {
        if (!isMounted()) {
            return;
        }

        const boardSnapshot = snapshot ?? {
            nodeIdCounter: board.nodeIdCounter,
            savedConnections: board.savedConnections,
            savedNodes: board.savedNodes
        };

        clearRuntimeBoard();
        board.nodeIdCounter = Math.max(boardSnapshot.nodeIdCounter ?? 0, getMaxNodeId(boardSnapshot.savedNodes ?? []));

        (boardSnapshot.savedNodes ?? []).forEach(node => {
            const hasLocalPosition = Number.isFinite(node.localX) && Number.isFinite(node.localY);
            createNode(
                node.symbol,
                hasLocalPosition ? node.localX : node.x,
                hasLocalPosition ? node.localY : node.y,
                {
                    id: node.id,
                    persist: false,
                    positionSpace: hasLocalPosition ? "local" : "pixel"
                }
            );
        });

        (boardSnapshot.savedConnections ?? []).forEach(connection => {
            restoreConnection(connection);
        });

        captureState();
        sync();
    }

    function createHelpVisual(compound) {
        const structure = getHelpStructure(compound);
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        const width = 720;
        const height = 240;
        const positions = layoutHelpNodes(structure.nodes, structure.edges, width, height);

        svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        svg.setAttribute("aria-hidden", "true");

        structure.edges.forEach(([fromIndex, toIndex], index) => {
            const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
            line.classList.add("help-line");
            line.setAttribute("x1", positions[fromIndex].x);
            line.setAttribute("y1", positions[fromIndex].y);
            line.setAttribute("x2", positions[toIndex].x);
            line.setAttribute("y2", positions[toIndex].y);
            line.style.animationDelay = `${index * 0.35}s`;
            svg.appendChild(line);
        });

        structure.nodes.forEach((symbol, index) => {
            const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            const text = document.createElementNS("http://www.w3.org/2000/svg", "text");

            group.setAttribute("transform", `translate(${positions[index].x} ${positions[index].y})`);
            circle.classList.add("help-node-circle");
            circle.setAttribute("r", "34");
            circle.style.animationDelay = `${index * 0.2}s`;

            text.classList.add("help-node-label");
            text.textContent = symbol;

            group.append(circle, text);
            svg.appendChild(group);
        });

        return svg;
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

        bus.publish(RUNTIME_EVENT_IDS.interactionContextChanged, {
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

    function createBoardGraph() {
        const edgeSet = new Set();
        const adjacency = new Map();

        boardState.getConnections().forEach(connection => {
            const key = createEdgeKey(connection.fromNodeId, connection.toNodeId);
            edgeSet.add(key);

            const fromList = adjacency.get(connection.fromNodeId) ?? new Set();
            fromList.add(connection.toNodeId);
            adjacency.set(connection.fromNodeId, fromList);

            const toList = adjacency.get(connection.toNodeId) ?? new Set();
            toList.add(connection.fromNodeId);
            adjacency.set(connection.toNodeId, toList);
        });

        return { edgeSet, adjacency };
    }

    function compoundMatchesBoard(compound, nodeEntries, boardGraph) {
        if (compound.ingredients.length !== nodeEntries.length) {
            return false;
        }

        if (!compound.structure) {
            return true;
        }

        return structureMatchesBoard(compound.structure, nodeEntries, boardGraph);
    }

    function createNode(symbol, x, y, options = {}) {
        if (!isMounted()) {
            return null;
        }

        const requestedId = options.id ?? `node-${board.nodeIdCounter + 1}`;
        const id = requestedId;
        const position = options.positionSpace === "local"
            ? boardRender.localToPixelPosition(x, y)
            : boardScene.clampPosition(x, y);

        board.nodeIdCounter = Math.max(board.nodeIdCounter + (options.id ? 0 : 1), parseNodeIndex(id));

        const node = boardRender.createNode({
            id,
            onConnectorPointerDown: boardConnectionSession.startConnection,
            onNodeDragStart: preventNativeDrag,
            onNodePointerDown: boardDragSession.startMoveNode,
            position,
            symbol
        });
        boardState.addNode(id, node);

        if (options.persist !== false) {
            captureState();
        }

        return node;
    }

    function restoreConnection(connection) {
        if (!isMounted()) {
            return;
        }

        const fromNode = boardState.getNode(connection.fromNodeId);
        const toNode = boardState.getNode(connection.toNodeId);
        if (!fromNode || !toNode) {
            return;
        }

        const fromConnector = fromNode.querySelector(`.connector.${connection.fromPosition}`);
        const toConnector = toNode.querySelector(`.connector.${connection.toPosition}`);
        if (!fromConnector || !toConnector) {
            return;
        }

        const line = boardRender.createConnection({
            onClick: () => {
                boardSelection.clearSelectedNodes();
                removeConnectionByLine(line);
            },
            stroke: "var(--wire-solid)"
        });

        boardState.addConnection({
            fromNodeId: connection.fromNodeId,
            fromPosition: connection.fromPosition,
            toNodeId: connection.toNodeId,
            toPosition: connection.toPosition,
            line
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
            return null;
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

    function structureMatchesBoard(structure, nodeEntries, boardGraph) {
        if (structure.nodes.length !== nodeEntries.length) {
            return false;
        }

        const patternAdjacency = createPatternAdjacency(structure);
        const boardDegrees = new Map(
            nodeEntries.map(node => [node.id, (boardGraph.adjacency.get(node.id) ?? new Set()).size])
        );
        const order = structure.nodes
            .map((symbol, index) => ({
                degree: patternAdjacency.get(index).size,
                index,
                symbol
            }))
            .sort((left, right) => right.degree - left.degree);

        return backtrackStructure(order, 0, new Map(), new Set(), patternAdjacency, nodeEntries, boardGraph.edgeSet, boardDegrees);
    }

    function createPatternAdjacency(structure) {
        const adjacency = new Map();

        structure.nodes.forEach((_, index) => {
            adjacency.set(index, new Set());
        });

        structure.edges.forEach(([fromIndex, toIndex]) => {
            adjacency.get(fromIndex).add(toIndex);
            adjacency.get(toIndex).add(fromIndex);
        });

        return adjacency;
    }

    function backtrackStructure(order, depth, mapping, usedBoardNodes, patternAdjacency, nodeEntries, boardEdgeSet, boardDegrees) {
        if (depth === order.length) {
            return true;
        }

        const target = order[depth];
        const candidates = nodeEntries.filter(node =>
            node.symbol === target.symbol &&
            !usedBoardNodes.has(node.id) &&
            boardDegrees.get(node.id) === target.degree
        );

        for (const candidate of candidates) {
            if (!isConsistentMapping(target.index, candidate.id, mapping, patternAdjacency, boardEdgeSet)) {
                continue;
            }

            mapping.set(target.index, candidate.id);
            usedBoardNodes.add(candidate.id);

            if (backtrackStructure(order, depth + 1, mapping, usedBoardNodes, patternAdjacency, nodeEntries, boardEdgeSet, boardDegrees)) {
                return true;
            }

            mapping.delete(target.index);
            usedBoardNodes.delete(candidate.id);
        }

        return false;
    }

    function isConsistentMapping(patternIndex, boardNodeId, mapping, patternAdjacency, boardEdgeSet) {
        for (const [mappedPatternIndex, mappedBoardNodeId] of mapping.entries()) {
            const patternHasEdge = patternAdjacency.get(patternIndex).has(mappedPatternIndex);
            const boardHasEdge = boardEdgeSet.has(createEdgeKey(boardNodeId, mappedBoardNodeId));

            if (patternHasEdge !== boardHasEdge) {
                return false;
            }
        }

        return true;
    }

    function connectionExists(startNodeId, endNodeId) {
        return boardState.getConnections().some(connection =>
            (connection.fromNodeId === startNodeId && connection.toNodeId === endNodeId) ||
            (connection.fromNodeId === endNodeId && connection.toNodeId === startNodeId)
        );
    }

    function clampNodePosition(x, y) {
        return boardScene.clampPosition(x, y);
    }

    function removeConnectionByLine(line) {
        const index = boardState.getConnections().findIndex(connection => connection.line === line);
        if (index === -1) {
            return;
        }

        boardState.getConnections()[index].line.remove();
        boardState.removeConnectionAt(index);
        captureState();
    }

    function removeNode(nodeId, options = {}) {
        const { notifySelection = true } = options;
        const node = boardState.getNode(nodeId);
        if (!node) {
            return;
        }

        let selectionChanged = false;
        if (boardState.hasSelectedNode(nodeId)) {
            boardState.deleteSelectedNode(nodeId);
            boardState.syncPrimarySelectedNodeId();
            selectionChanged = true;
        }

        node.remove();
        boardState.deleteNode(nodeId);

        for (let index = boardState.getConnections().length - 1; index >= 0; index -= 1) {
            const connection = boardState.getConnections()[index];
            if (connection.fromNodeId === nodeId || connection.toNodeId === nodeId) {
                connection.line.remove();
                boardState.removeConnectionAt(index);
            }
        }

        captureState();

        if (selectionChanged && notifySelection) {
            boardSelection.notifySelectionState();
        }
    }

    function removeNodes(nodeIds = []) {
        const uniqueNodeIds = [...new Set(nodeIds.filter(nodeId => typeof nodeId === "string"))];
        if (uniqueNodeIds.length === 0) {
            return;
        }

        uniqueNodeIds.forEach(nodeId => {
            removeNode(nodeId, {
                notifySelection: false
            });
        });

        boardSelection.notifySelectionState();
        captureState();
    }

    function isNodeOutsideMixZone(x, y) {
        return boardScene.isNodeOutside(x, y);
    }

    function preventNativeDrag(event) {
        event.preventDefault();
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
        captureState,
        clearSelection: (options = {}) => boardSelection.clearSelectedNodes({ notify: !options.silent }),
        createHelpVisual,
        evaluate,
        validateValency,
        getSelectedNodeIds: boardSelection.getSelectedNodeIds,
        id: "connection-lab",
        init,
        removeNodeById: removeNode,
        removeNodesByIds: removeNodes,
        reset,
        restore,
        spawnElement,
        spawnElementAtClientPoint,
        sync
    };
}

function parseNodeIndex(nodeId) {
    const match = /^node-(\d+)$/.exec(nodeId ?? "");
    return match ? Number(match[1]) : 0;
}

function isPointerOutsideViewport(clientX, clientY) {
    return (
        clientX < 0 ||
        clientY < 0 ||
        clientX > document.documentElement.clientWidth ||
        clientY > document.documentElement.clientHeight
    );
}

function getNodeMetrics(mixZone) {
    return getBoardNodeMetrics(mixZone, {
        height: DEFAULT_NODE_HEIGHT,
        width: DEFAULT_NODE_WIDTH
    });
}

function getMaxNodeId(nodes) {
    return (nodes ?? []).reduce((maxValue, node) => Math.max(maxValue, parseNodeIndex(node.id)), 0);
}

function getHelpStructure(compound) {
    if (compound.structure) {
        return compound.structure;
    }

    const nodes = compound.ingredients.slice();
    const edges = [];

    for (let index = 0; index < nodes.length - 1; index += 1) {
        edges.push([index, index + 1]);
    }

    return { nodes, edges };
}

function layoutHelpNodes(nodes, edges, width, height) {
    const degrees = new Map(nodes.map((_, index) => [index, 0]));
    edges.forEach(([fromIndex, toIndex]) => {
        degrees.set(fromIndex, degrees.get(fromIndex) + 1);
        degrees.set(toIndex, degrees.get(toIndex) + 1);
    });

    const maxDegree = Math.max(...degrees.values());

    if (maxDegree <= 2) {
        const gap = width / (nodes.length + 1);
        return nodes.map((_, index) => ({
            x: gap * (index + 1),
            y: height / 2
        }));
    }

    const centerIndex = [...degrees.entries()].sort((left, right) => right[1] - left[1])[0][0];
    const positions = nodes.map(() => ({ x: width / 2, y: height / 2 }));
    const outerIndexes = nodes.map((_, index) => index).filter(index => index !== centerIndex);
    const radius = 78;

    positions[centerIndex] = { x: width / 2, y: height / 2 };
    outerIndexes.forEach((index, outerPosition) => {
        const angle = (-Math.PI / 2) + (outerPosition * (2 * Math.PI / Math.max(outerIndexes.length, 1)));
        positions[index] = {
            x: width / 2 + Math.cos(angle) * radius,
            y: height / 2 + Math.sin(angle) * radius
        };
    });

    return positions;
}
