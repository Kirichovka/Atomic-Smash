import {
    createSvgLine,
    getConnectorCenter,
    redrawConnections,
    syncConnectionsLayer
} from "../../svg.js";
import { RUNTIME_EVENT_IDS } from "../contracts/event-contracts.js";
import { createEdgeKey } from "../state.js";

const DEFAULT_NODE_WIDTH = 110;
const DEFAULT_NODE_HEIGHT = 64;
const CONNECTOR_POSITIONS = ["left", "right", "top", "bottom"];
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
    const elementsBySymbol = new Map(state.catalog.elements.map(element => [element.symbol, element]));
    let resizeObserver = null;
    let resizeSyncFrame = null;
    let movingGroup = [];

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

            clearSelectedNodes({ notify: false });
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

        const nodeEntries = [...board.nodes.entries()].map(([id, node]) => ({
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

        board.nodes.forEach((_, nodeId) => {
            degreeByNodeId.set(nodeId, 0);
        });

        board.connections.forEach(connection => {
            degreeByNodeId.set(connection.fromNodeId, (degreeByNodeId.get(connection.fromNodeId) ?? 0) + 1);
            degreeByNodeId.set(connection.toNodeId, (degreeByNodeId.get(connection.toNodeId) ?? 0) + 1);
        });

        const issues = [...board.nodes.entries()]
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
        clearSelectedNodes();
        [...board.nodes.values()].forEach(node => node.remove());
        board.nodes.clear();

        board.connections.forEach(connection => connection.line.remove());
        board.connections.length = 0;

        removeTemporaryWire();
        sync();
    }

    function sync() {
        if (!isMounted()) {
            return;
        }

        syncNodeLayoutToCurrentMixZone();
        syncConnectionsLayer(refs.svg, refs.mixZone);
        redrawConnections(board.connections, board.nodes, refs.svg);
    }

    function captureState() {
        if (!isMounted()) {
            return {
                nodeIdCounter: board.nodeIdCounter,
                savedConnections: board.savedConnections,
                savedNodes: board.savedNodes
            };
        }

        board.savedNodes = [...board.nodes.values()].map(node => ({
            id: node.dataset.id,
            localX: getNodeLocalX(node),
            localY: getNodeLocalY(node),
            symbol: node.dataset.symbol,
            x: getNodeLeft(node),
            y: getNodeTop(node)
        }));
        board.savedConnections = board.connections.map(connection => ({
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
        const nodeMetrics = getNodeMetrics(refs.mixZone);
        const rawPosition = getSuggestedSpawnPositionForCount(
            board.nodes.size,
            refs.mixZone.clientWidth,
            refs.mixZone.clientHeight,
            nodeMetrics.width,
            nodeMetrics.height
        );

        return clampNodePosition(rawPosition.x, rawPosition.y);
    }

    function createBoardGraph() {
        const edgeSet = new Set();
        const adjacency = new Map();

        board.connections.forEach(connection => {
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

        const node = document.createElement("div");
        const label = document.createElement("span");
        const requestedId = options.id ?? `node-${board.nodeIdCounter + 1}`;
        const id = requestedId;
        const position = options.positionSpace === "local"
            ? localToPixelPosition(x, y)
            : clampNodePosition(x, y);

        board.nodeIdCounter = Math.max(board.nodeIdCounter + (options.id ? 0 : 1), parseNodeIndex(id));

        node.className = "node";
        node.dataset.id = id;
        node.dataset.symbol = symbol;
        node.draggable = false;
        setNodePosition(node, position.x, position.y);

        label.className = "node-label";
        label.textContent = symbol;
        node.appendChild(label);

        CONNECTOR_POSITIONS.forEach(connectorPosition => {
            const connector = document.createElement("div");
            connector.className = `connector ${connectorPosition}`;
            connector.dataset.nodeId = id;
            connector.dataset.position = connectorPosition;
            connector.addEventListener("pointerdown", startConnection);
            node.appendChild(connector);
        });

        node.addEventListener("pointerdown", startMoveNode);
        node.addEventListener("dragstart", preventNativeDrag);

        refs.mixZone.appendChild(node);
        board.nodes.set(id, node);

        if (options.persist !== false) {
            captureState();
        }

        return node;
    }

    function restoreConnection(connection) {
        if (!isMounted()) {
            return;
        }

        const fromNode = board.nodes.get(connection.fromNodeId);
        const toNode = board.nodes.get(connection.toNodeId);
        if (!fromNode || !toNode) {
            return;
        }

        const fromConnector = fromNode.querySelector(`.connector.${connection.fromPosition}`);
        const toConnector = toNode.querySelector(`.connector.${connection.toPosition}`);
        if (!fromConnector || !toConnector) {
            return;
        }

        const line = createSvgLine("var(--wire-solid)");
        line.classList.add("connection-hitbox");
        line.addEventListener("click", () => {
            clearSelectedNodes();
            removeConnectionByLine(line);
        });
        refs.svg.appendChild(line);

        board.connections.push({
            fromNodeId: connection.fromNodeId,
            fromPosition: connection.fromPosition,
            toNodeId: connection.toNodeId,
            toPosition: connection.toPosition,
            line
        });
    }

    function startMoveNode(event) {
        if (board.currentWire || board.startConnector) {
            return;
        }

        if (event.pointerType === "mouse" && event.button !== 0) {
            return;
        }

        if (event.target.closest(".connector")) {
            return;
        }

        event.preventDefault();
        const draggedNodeId = event.currentTarget.dataset.id;
        if (event.ctrlKey) {
            toggleNodeSelection(draggedNodeId);
            return;
        }

        const shouldPreserveMultiSelection =
            board.selectedNodeIds.has(draggedNodeId)
            && board.selectedNodeIds.size > 1;

        if (!shouldPreserveMultiSelection) {
            selectSingleNode(draggedNodeId, { notify: false });
        } else {
            board.selectedNodeId = draggedNodeId;
        }

        bus.publish(RUNTIME_EVENT_IDS.interactionContextChanged, {
            source: "mix-zone-node",
            zone: "mix-zone",
            clearPaletteSelection: true,
            inspectedSymbol: event.currentTarget.dataset.symbol,
            persist: false
        });

        board.movingNode = event.currentTarget;
        board.movingPointerId = event.pointerId;
        movingGroup = getMovingGroup(board.movingNode);
        movingGroup.forEach(item => {
            item.node.classList.add("dragging");
        });
        document.body.classList.add("dragging-element");
        board.movingNode.setPointerCapture(event.pointerId);

        const rect = board.movingNode.getBoundingClientRect();
        board.moveOffsetX = event.clientX - rect.left;
        board.moveOffsetY = event.clientY - rect.top;

        document.addEventListener("pointermove", moveNode);
        document.addEventListener("pointerup", stopMoveNode);
        document.addEventListener("pointercancel", stopMoveNode);
    }

    function moveNode(event) {
        if (!board.movingNode || event.pointerId !== board.movingPointerId) {
            return;
        }

        if (isPointerOutsideViewport(event.clientX, event.clientY)) {
            const removedNodeIds = movingGroup.map(item => item.node.dataset.id);
            cleanupMovingNode();
            removeNodes(removedNodeIds);
            return;
        }

        const zoneRect = refs.mixZone.getBoundingClientRect();
        const anchorPosition = {
            x: event.clientX - zoneRect.left - board.moveOffsetX,
            y: event.clientY - zoneRect.top - board.moveOffsetY
        };

        movingGroup.forEach(item => {
            const position = {
                x: anchorPosition.x + item.deltaX,
                y: anchorPosition.y + item.deltaY
            };

            setNodePosition(item.node, position.x, position.y, { clamp: false });
            item.node.classList.toggle(
                "outside-zone",
                isNodeOutsideMixZone(getNodeLeft(item.node), getNodeTop(item.node))
            );
        });

        redrawConnections(board.connections, board.nodes, refs.svg);
    }

    function stopMoveNode(event) {
        if (event && event.pointerId !== board.movingPointerId) {
            return;
        }

        const releasedNodeIds = movingGroup
            .filter(item => isNodeOutsideMixZone(getNodeLeft(item.node), getNodeTop(item.node)))
            .map(item => item.node.dataset.id);
        cleanupMovingNode();

        if (releasedNodeIds.length > 0) {
            removeNodes(releasedNodeIds);
            return;
        }

        captureState();
    }

    function cleanupMovingNode() {
        movingGroup.forEach(item => {
            item.node.classList.remove("dragging");
            item.node.classList.remove("outside-zone");
        });

        if (board.movingNode) {
            if (board.movingPointerId !== null && board.movingNode.hasPointerCapture(board.movingPointerId)) {
                board.movingNode.releasePointerCapture(board.movingPointerId);
            }
        }

        movingGroup = [];
        board.movingNode = null;
        board.movingPointerId = null;
        document.body.classList.remove("dragging-element");

        document.removeEventListener("pointermove", moveNode);
        document.removeEventListener("pointerup", stopMoveNode);
        document.removeEventListener("pointercancel", stopMoveNode);
    }

    function startConnection(event) {
        if (event.pointerType === "mouse" && event.button !== 0) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        removeTemporaryWire();

        board.startConnector = event.currentTarget;
        const startNode = board.nodes.get(board.startConnector.dataset.nodeId) ?? null;
        selectSingleNode(board.startConnector.dataset.nodeId, { notify: false });
        bus.publish(RUNTIME_EVENT_IDS.interactionContextChanged, {
            source: "mix-zone-connector",
            zone: "mix-zone",
            clearPaletteSelection: true,
            inspectedSymbol: startNode?.dataset.symbol ?? null,
            persist: false
        });
        board.connectionPointerId = event.pointerId;
        board.startConnector.setPointerCapture(event.pointerId);

        sync();

        const startPoint = getConnectorCenter(board.startConnector, refs.svg);
        board.currentWire = createSvgLine("var(--wire-temp)", true);
        board.currentWire.setAttribute("x1", startPoint.x);
        board.currentWire.setAttribute("y1", startPoint.y);
        board.currentWire.setAttribute("x2", startPoint.x);
        board.currentWire.setAttribute("y2", startPoint.y);

        refs.svg.appendChild(board.currentWire);

        document.addEventListener("pointermove", drawTemporaryWire);
        document.addEventListener("pointerup", finishConnection);
        document.addEventListener("pointercancel", removeTemporaryWire);
    }

    function drawTemporaryWire(event) {
        if (!board.currentWire || !board.startConnector || event.pointerId !== board.connectionPointerId) {
            return;
        }

        const layerRect = refs.svg.getBoundingClientRect();
        const pointerPoint = {
            x: event.clientX - layerRect.left,
            y: event.clientY - layerRect.top
        };
        const startPoint = {
            x: Number(board.currentWire.getAttribute("x1")),
            y: Number(board.currentWire.getAttribute("y1"))
        };
        const endPoint = getWireEndPointWithinLayer(
            startPoint,
            pointerPoint,
            refs.svg.clientWidth,
            refs.svg.clientHeight
        );

        board.currentWire.setAttribute("x2", endPoint.x);
        board.currentWire.setAttribute("y2", endPoint.y);
    }

    function finishConnection(event) {
        if (!board.startConnector || !board.currentWire || event.pointerId !== board.connectionPointerId) {
            return;
        }

        const endConnector = getConnectionTargetAtPoint(event.clientX, event.clientY);
        if (!endConnector) {
            removeTemporaryWire();
            return;
        }

        const startNodeId = board.startConnector.dataset.nodeId;
        const endNodeId = endConnector.dataset.nodeId;

        if (startNodeId === endNodeId || connectionExists(startNodeId, endNodeId)) {
            removeTemporaryWire();
            return;
        }

        const line = createSvgLine("var(--wire-solid)");
        line.classList.add("connection-hitbox");
        line.addEventListener("click", () => {
            clearSelectedNodes();
            removeConnectionByLine(line);
        });
        refs.svg.appendChild(line);

        board.connections.push({
            fromNodeId: startNodeId,
            fromPosition: board.startConnector.dataset.position,
            toNodeId: endNodeId,
            toPosition: endConnector.dataset.position,
            line
        });

        redrawConnections(board.connections, board.nodes, refs.svg);
        removeTemporaryWire();
        captureState();
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

    function removeTemporaryWire(event) {
        if (event && board.connectionPointerId !== null && event.pointerId !== board.connectionPointerId) {
            return;
        }

        if (board.currentWire) {
            board.currentWire.remove();
        }

        if (
            board.startConnector &&
            board.connectionPointerId !== null &&
            board.startConnector.hasPointerCapture(board.connectionPointerId)
        ) {
            board.startConnector.releasePointerCapture(board.connectionPointerId);
        }

        board.currentWire = null;
        board.startConnector = null;
        board.connectionPointerId = null;

        document.removeEventListener("pointermove", drawTemporaryWire);
        document.removeEventListener("pointerup", finishConnection);
        document.removeEventListener("pointercancel", removeTemporaryWire);
    }

    function connectionExists(startNodeId, endNodeId) {
        return board.connections.some(connection =>
            (connection.fromNodeId === startNodeId && connection.toNodeId === endNodeId) ||
            (connection.fromNodeId === endNodeId && connection.toNodeId === startNodeId)
        );
    }

    function clampNodePosition(x, y) {
        const nodeMetrics = getNodeMetrics(refs.mixZone);
        const maxX = Math.max(refs.mixZone.clientWidth - nodeMetrics.width, 0);
        const maxY = Math.max(refs.mixZone.clientHeight - nodeMetrics.height, 0);

        return {
            x: Math.min(Math.max(x, 0), maxX),
            y: Math.min(Math.max(y, 0), maxY)
        };
    }

    function syncNodeLayoutToCurrentMixZone() {
        board.nodes.forEach(node => {
            if (node === board.movingNode) {
                return;
            }

            const position = localToPixelPosition(getNodeLocalX(node), getNodeLocalY(node));
            node.style.left = `${position.x}px`;
            node.style.top = `${position.y}px`;
        });
    }

    function setNodePosition(node, x, y, options = {}) {
        const { clamp = true } = options;
        const renderedPosition = clamp ? clampNodePosition(x, y) : { x, y };
        const localAnchor = clampNodePosition(x, y);
        const localPosition = pixelToLocalPosition(localAnchor.x, localAnchor.y);

        node.style.left = `${renderedPosition.x}px`;
        node.style.top = `${renderedPosition.y}px`;
        node.dataset.localX = String(localPosition.localX);
        node.dataset.localY = String(localPosition.localY);
    }

    function pixelToLocalPosition(x, y) {
        const nodeMetrics = getNodeMetrics(refs.mixZone);
        const maxX = Math.max(refs.mixZone.clientWidth - nodeMetrics.width, 0);
        const maxY = Math.max(refs.mixZone.clientHeight - nodeMetrics.height, 0);

        return {
            localX: maxX > 0 ? x / maxX : 0,
            localY: maxY > 0 ? y / maxY : 0
        };
    }

    function localToPixelPosition(localX, localY) {
        const nodeMetrics = getNodeMetrics(refs.mixZone);
        const maxX = Math.max(refs.mixZone.clientWidth - nodeMetrics.width, 0);
        const maxY = Math.max(refs.mixZone.clientHeight - nodeMetrics.height, 0);

        return clampNodePosition(
            maxX * clampLocalCoordinate(localX),
            maxY * clampLocalCoordinate(localY)
        );
    }

    function removeConnectionByLine(line) {
        const index = board.connections.findIndex(connection => connection.line === line);
        if (index === -1) {
            return;
        }

        board.connections[index].line.remove();
        board.connections.splice(index, 1);
        captureState();
    }

    function removeNode(nodeId, options = {}) {
        const { notifySelection = true } = options;
        const node = board.nodes.get(nodeId);
        if (!node) {
            return;
        }

        let selectionChanged = false;
        if (board.selectedNodeIds.has(nodeId)) {
            board.selectedNodeIds.delete(nodeId);
            node.classList.remove("selected");
            board.selectedNodeId = getPrimarySelectedNodeId();
            selectionChanged = true;
        }

        node.remove();
        board.nodes.delete(nodeId);

        for (let index = board.connections.length - 1; index >= 0; index -= 1) {
            const connection = board.connections[index];
            if (connection.fromNodeId === nodeId || connection.toNodeId === nodeId) {
                connection.line.remove();
                board.connections.splice(index, 1);
            }
        }

        captureState();

        if (selectionChanged && notifySelection) {
            notifySelectionState();
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

        notifySelectionState();
        captureState();
    }

    function isNodeOutsideMixZone(x, y) {
        const nodeMetrics = getNodeMetrics(refs.mixZone);
        return (
            x < 0 ||
            y < 0 ||
            x + nodeMetrics.width > refs.mixZone.clientWidth ||
            y + nodeMetrics.height > refs.mixZone.clientHeight
        );
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

    function selectSingleNode(nodeId, options = {}) {
        const { notify = true } = options;
        const nextNodeId = nodeId ?? null;

        if (nextNodeId && board.selectedNodeIds.size === 1 && board.selectedNodeIds.has(nextNodeId)) {
            if (notify) {
                notifySelectionState();
            }
            return;
        }

        board.selectedNodeIds.forEach(selectedNodeId => {
            board.nodes.get(selectedNodeId)?.classList.remove("selected");
        });
        board.selectedNodeIds.clear();

        if (nextNodeId && board.nodes.has(nextNodeId)) {
            board.selectedNodeIds.add(nextNodeId);
            board.nodes.get(nextNodeId)?.classList.add("selected");
        }

        board.selectedNodeId = nextNodeId && board.nodes.has(nextNodeId) ? nextNodeId : null;

        if (notify) {
            notifySelectionState();
        }
    }

    function toggleNodeSelection(nodeId, options = {}) {
        const { notify = true } = options;
        if (!nodeId || !board.nodes.has(nodeId)) {
            return;
        }

        if (board.selectedNodeIds.has(nodeId)) {
            board.selectedNodeIds.delete(nodeId);
            board.nodes.get(nodeId)?.classList.remove("selected");
        } else {
            board.selectedNodeIds.add(nodeId);
            board.nodes.get(nodeId)?.classList.add("selected");
        }

        board.selectedNodeId = getPrimarySelectedNodeId();

        if (notify) {
            notifySelectionState();
        }
    }

    function clearSelectedNodes(options = {}) {
        const { notify = true } = options;

        board.selectedNodeIds.forEach(selectedNodeId => {
            board.nodes.get(selectedNodeId)?.classList.remove("selected");
        });
        board.selectedNodeIds.clear();
        board.selectedNodeId = null;

        if (notify) {
            notifySelectionState();
        }
    }

    function notifySelectionState() {
        const primarySelectedNodeId = getPrimarySelectedNodeId();
        board.selectedNodeId = primarySelectedNodeId;

        if (primarySelectedNodeId && board.nodes.has(primarySelectedNodeId)) {
            const selectedNode = board.nodes.get(primarySelectedNodeId);
            bus.publish(RUNTIME_EVENT_IDS.interactionContextChanged, {
                source: "mix-zone-selection",
                zone: "mix-zone",
                clearPaletteSelection: true,
                inspectedSymbol: selectedNode.dataset.symbol,
                persist: false
            });
            return;
        }

        bus.publish(RUNTIME_EVENT_IDS.interactionContextChanged, {
            source: "mix-zone-selection-cleared",
            zone: "mix-zone",
            clearPaletteSelection: true,
            inspectedSymbol: null,
            persist: false
        });
    }

    function getPrimarySelectedNodeId() {
        for (const nodeId of board.selectedNodeIds) {
            if (board.nodes.has(nodeId)) {
                return nodeId;
            }
        }

        return null;
    }

    function getSelectedNodeIds() {
        return [...board.selectedNodeIds].filter(nodeId => board.nodes.has(nodeId));
    }

    function getMovingGroup(anchorNode) {
        const anchorNodeId = anchorNode.dataset.id;
        const shouldMoveSelection =
            board.selectedNodeIds.has(anchorNodeId)
            && board.selectedNodeIds.size > 1;
        const movingNodeIds = shouldMoveSelection
            ? getSelectedNodeIds()
            : [anchorNodeId];
        const anchorLeft = getNodeLeft(anchorNode);
        const anchorTop = getNodeTop(anchorNode);

        return movingNodeIds
            .map(nodeId => board.nodes.get(nodeId))
            .filter(Boolean)
            .map(node => ({
                deltaX: getNodeLeft(node) - anchorLeft,
                deltaY: getNodeTop(node) - anchorTop,
                node
            }));
    }

    return {
        captureState,
        clearSelection: (options = {}) => clearSelectedNodes({ notify: !options.silent }),
        createHelpVisual,
        evaluate,
        validateValency,
        getSelectedNodeIds,
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

function getNodeLeft(node) {
    return Number.parseFloat(node.style.left || "0");
}

function getNodeTop(node) {
    return Number.parseFloat(node.style.top || "0");
}

function getNodeLocalX(node) {
    return clampLocalCoordinate(Number.parseFloat(node.dataset.localX || "0"));
}

function getNodeLocalY(node) {
    return clampLocalCoordinate(Number.parseFloat(node.dataset.localY || "0"));
}

function parseNodeIndex(nodeId) {
    const match = /^node-(\d+)$/.exec(nodeId ?? "");
    return match ? Number(match[1]) : 0;
}

function clampLocalCoordinate(value) {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.min(Math.max(value, 0), 1);
}

function isPointerOutsideViewport(clientX, clientY) {
    return (
        clientX < 0 ||
        clientY < 0 ||
        clientX > document.documentElement.clientWidth ||
        clientY > document.documentElement.clientHeight
    );
}

function clampSvgCoordinate(value, size) {
    return Math.min(Math.max(value, 0), Math.max(size, 0));
}

function getWireEndPointWithinLayer(startPoint, pointerPoint, width, height) {
    if (isPointInsideRect(pointerPoint.x, pointerPoint.y, width, height)) {
        return {
            x: pointerPoint.x,
            y: pointerPoint.y
        };
    }

    const deltaX = pointerPoint.x - startPoint.x;
    const deltaY = pointerPoint.y - startPoint.y;
    const intersections = [];

    if (deltaX !== 0) {
        const leftT = (0 - startPoint.x) / deltaX;
        const rightT = (width - startPoint.x) / deltaX;

        intersections.push({ t: leftT, x: 0, y: startPoint.y + (deltaY * leftT) });
        intersections.push({ t: rightT, x: width, y: startPoint.y + (deltaY * rightT) });
    }

    if (deltaY !== 0) {
        const topT = (0 - startPoint.y) / deltaY;
        const bottomT = (height - startPoint.y) / deltaY;

        intersections.push({ t: topT, x: startPoint.x + (deltaX * topT), y: 0 });
        intersections.push({ t: bottomT, x: startPoint.x + (deltaX * bottomT), y: height });
    }

    const validIntersection = intersections
        .filter(point =>
            point.t >= 0 &&
            point.t <= 1 &&
            point.x >= 0 &&
            point.x <= width &&
            point.y >= 0 &&
            point.y <= height
        )
        .sort((left, right) => left.t - right.t)[0];

    if (validIntersection) {
        return {
            x: validIntersection.x,
            y: validIntersection.y
        };
    }

    return {
        x: clampSvgCoordinate(pointerPoint.x, width),
        y: clampSvgCoordinate(pointerPoint.y, height)
    };
}

function isPointInsideRect(x, y, width, height) {
    return x >= 0 && x <= width && y >= 0 && y <= height;
}

function getSuggestedSpawnPositionForCount(count, width, height, nodeWidth, nodeHeight) {
    const centerX = (width / 2) - (nodeWidth / 2);
    const centerY = (height / 2) - (nodeHeight / 2);
    const offset = SPAWN_OFFSETS[count % SPAWN_OFFSETS.length];
    const ring = Math.floor(count / SPAWN_OFFSETS.length);

    return {
        x: centerX + offset.x + (ring * 14),
        y: centerY + offset.y + (ring * 12)
    };
}

function getNodeMetrics(mixZone) {
    if (!(mixZone instanceof Element)) {
        return {
            height: DEFAULT_NODE_HEIGHT,
            width: DEFAULT_NODE_WIDTH
        };
    }

    const styles = window.getComputedStyle(mixZone);
    const width = Number.parseFloat(styles.getPropertyValue("--mix-node-width"));
    const height = Number.parseFloat(styles.getPropertyValue("--mix-node-height"));

    return {
        height: Number.isFinite(height) ? height : DEFAULT_NODE_HEIGHT,
        width: Number.isFinite(width) ? width : DEFAULT_NODE_WIDTH
    };
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
