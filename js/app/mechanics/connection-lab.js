import {
    createSvgLine,
    getConnectorCenter,
    redrawConnections,
    syncConnectionsLayer
} from "../../svg.js";
import { createEdgeKey } from "../state.js";

const NODE_WIDTH = 110;
const NODE_HEIGHT = 64;
const CONNECTOR_POSITIONS = ["left", "right", "top", "bottom"];

export function createConnectionLabMechanic({ refs, state }) {
    const board = state.board;

    function init() {
        bindWorkspaceInteractions();
    }

    function bindWorkspaceInteractions() {
        refs.workspace.addEventListener("dragover", event => {
            event.preventDefault();
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
            createNode(
                board.dragElementType,
                event.clientX - zoneRect.left - (NODE_WIDTH / 2),
                event.clientY - zoneRect.top - (NODE_HEIGHT / 2)
            );
            board.dragElementType = null;
        });
    }

    function evaluate() {
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

    function reset() {
        [...board.nodes.values()].forEach(node => node.remove());
        board.nodes.clear();

        board.connections.forEach(connection => connection.line.remove());
        board.connections.length = 0;

        removeTemporaryWire();
        sync();
    }

    function sync() {
        syncConnectionsLayer(refs.svg, refs.mixZone);
        redrawConnections(board.connections, board.nodes, refs.svg);
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

    function createNode(symbol, x, y) {
        const node = document.createElement("div");
        const label = document.createElement("span");
        const id = `node-${++board.nodeIdCounter}`;
        const position = clampNodePosition(x, y);

        node.className = "node";
        node.dataset.id = id;
        node.dataset.symbol = symbol;
        node.style.left = `${position.x}px`;
        node.style.top = `${position.y}px`;

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

        refs.mixZone.appendChild(node);
        board.nodes.set(id, node);
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

        board.movingNode = event.currentTarget;
        board.movingPointerId = event.pointerId;
        board.movingNode.classList.add("dragging");
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

        const zoneRect = refs.mixZone.getBoundingClientRect();
        const position = {
            x: event.clientX - zoneRect.left - board.moveOffsetX,
            y: event.clientY - zoneRect.top - board.moveOffsetY
        };

        board.movingNode.style.left = `${position.x}px`;
        board.movingNode.style.top = `${position.y}px`;
        board.movingNode.classList.toggle("outside-zone", isNodeOutsideMixZone(position.x, position.y));

        redrawConnections(board.connections, board.nodes, refs.svg);
    }

    function stopMoveNode(event) {
        if (event && event.pointerId !== board.movingPointerId) {
            return;
        }

        const releasedNode = board.movingNode;

        if (board.movingNode) {
            board.movingNode.classList.remove("dragging");
            board.movingNode.classList.remove("outside-zone");

            if (board.movingPointerId !== null && board.movingNode.hasPointerCapture(board.movingPointerId)) {
                board.movingNode.releasePointerCapture(board.movingPointerId);
            }
        }

        board.movingNode = null;
        board.movingPointerId = null;

        document.removeEventListener("pointermove", moveNode);
        document.removeEventListener("pointerup", stopMoveNode);
        document.removeEventListener("pointercancel", stopMoveNode);

        if (releasedNode && isNodeOutsideMixZone(getNodeLeft(releasedNode), getNodeTop(releasedNode))) {
            removeNode(releasedNode.dataset.id);
        }
    }

    function startConnection(event) {
        if (event.pointerType === "mouse" && event.button !== 0) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        removeTemporaryWire();

        board.startConnector = event.currentTarget;
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
        const x = event.clientX - layerRect.left;
        const y = event.clientY - layerRect.top;

        board.currentWire.setAttribute("x2", x);
        board.currentWire.setAttribute("y2", y);
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
        line.addEventListener("click", () => removeConnectionByLine(line));
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
    }

    function getConnectionTargetAtPoint(clientX, clientY) {
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
                index,
                symbol,
                degree: patternAdjacency.get(index).size
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
        const maxX = Math.max(refs.mixZone.clientWidth - NODE_WIDTH, 0);
        const maxY = Math.max(refs.mixZone.clientHeight - NODE_HEIGHT, 0);

        return {
            x: Math.min(Math.max(x, 0), maxX),
            y: Math.min(Math.max(y, 0), maxY)
        };
    }

    function removeConnectionByLine(line) {
        const index = board.connections.findIndex(connection => connection.line === line);
        if (index === -1) {
            return;
        }

        board.connections[index].line.remove();
        board.connections.splice(index, 1);
    }

    function removeNode(nodeId) {
        const node = board.nodes.get(nodeId);
        if (!node) {
            return;
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
    }

    function isNodeOutsideMixZone(x, y) {
        return (
            x < 0 ||
            y < 0 ||
            x + NODE_WIDTH > refs.mixZone.clientWidth ||
            y + NODE_HEIGHT > refs.mixZone.clientHeight
        );
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

    return {
        createHelpVisual,
        evaluate,
        id: "connection-lab",
        init,
        reset,
        sync
    };
}

function getNodeLeft(node) {
    return Number.parseFloat(node.style.left || "0");
}

function getNodeTop(node) {
    return Number.parseFloat(node.style.top || "0");
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
