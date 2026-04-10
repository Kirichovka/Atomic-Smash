import { createBoardEdgeEntity, createBoardEdgeEntityId, createBoardNodeEntity } from "./entity-factory.js";

export function createBoardMutationController({
    board,
    boardConnectionSession,
    boardRender,
    boardScene,
    boardSelection,
    boardState,
    getMaxNodeId,
    isMounted,
    parseNodeIndex,
    sync
}) {
    function clearRuntimeBoard() {
        boardSelection.clearSelectedNodes();
        boardState.getNodeValues().forEach(node => node.remove());
        boardState.clearNodes();
        boardState.clearNodeEntities();

        boardState.getConnections().forEach(connection => connection.line.remove());
        boardState.clearConnections();
        boardState.clearEdgeEntities();

        boardConnectionSession.removeTemporaryWire();
        sync();
    }

    function captureState() {
        if (!isMounted()) {
            return {
                nodeIdCounter: board.nodeIdCounter,
                savedConnections: board.savedConnections,
                savedNodes: board.savedNodes
            };
        }

        board.savedNodes = boardState.getNodeEntityValues().map(nodeEntity => ({
            id: nodeEntity.id,
            localX: nodeEntity.metadata.localX,
            localY: nodeEntity.metadata.localY,
            symbol: nodeEntity.metadata.symbol,
            x: nodeEntity.metadata.pixelX,
            y: nodeEntity.metadata.pixelY
        }));
        board.savedConnections = boardState.getEdgeEntityValues().map(edgeEntity => ({
            fromNodeId: edgeEntity.metadata.fromNodeId,
            fromPosition: edgeEntity.metadata.fromPosition,
            toNodeId: edgeEntity.metadata.toNodeId,
            toPosition: edgeEntity.metadata.toPosition
        }));

        return {
            nodeIdCounter: board.nodeIdCounter,
            savedConnections: board.savedConnections,
            savedNodes: board.savedNodes
        };
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
        const localPosition = options.positionSpace === "local"
            ? { localX: x, localY: y }
            : boardRender.pixelToLocalPosition(position.x, position.y);

        board.nodeIdCounter = Math.max(board.nodeIdCounter + (options.id ? 0 : 1), parseNodeIndex(id));
        const nodeEntity = createBoardNodeEntity({
            id,
            localX: localPosition.localX,
            localY: localPosition.localY,
            pixelX: position.x,
            pixelY: position.y,
            symbol
        });

        const node = boardRender.createNode({
            entity: nodeEntity,
            id,
            onConnectorPointerDown: boardConnectionSession.startConnection,
            onNodeDragStart: preventNativeDrag,
            onNodePointerDown: options.onNodePointerDown,
            position,
            symbol
        });
        boardState.addNodeEntity(nodeEntity);
        boardState.addNode(id, node);

        if (options.persist !== false) {
            captureState();
        }

        return node;
    }

    function restoreConnection(connection, onConnectionClick) {
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

        const edgeEntity = createBoardEdgeEntity({
            ...connection,
            line: null
        });
        const line = boardRender.createConnection({
            edgeEntity,
            onClick: () => onConnectionClick(line),
            stroke: "var(--wire-solid)"
        });

        boardState.addConnection({
            edgeEntity,
            fromNodeId: connection.fromNodeId,
            fromPosition: connection.fromPosition,
            toNodeId: connection.toNodeId,
            toPosition: connection.toPosition,
            line
        });
        boardState.addEdgeEntity(edgeEntity);
    }

    function removeConnectionByLine(line) {
        const index = boardState.getConnections().findIndex(connection => connection.line === line);
        if (index === -1) {
            return;
        }

        const edgeId = boardState.getConnections()[index].edgeEntity?.id
            ?? createBoardEdgeEntityId(boardState.getConnections()[index]);
        boardState.getConnections()[index].line.remove();
        boardState.removeConnectionAt(index);
        boardState.deleteEdgeEntity(edgeId);
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
        boardState.deleteNodeEntity(nodeId);

        for (let index = boardState.getConnections().length - 1; index >= 0; index -= 1) {
            const connection = boardState.getConnections()[index];
            if (connection.fromNodeId === nodeId || connection.toNodeId === nodeId) {
                const edgeId = connection.edgeEntity?.id ?? createBoardEdgeEntityId(connection);
                connection.line.remove();
                boardState.removeConnectionAt(index);
                boardState.deleteEdgeEntity(edgeId);
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

    function restore(snapshot, createNodeForRestore, restoreConnectionForRestore) {
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
            createNodeForRestore(
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
            restoreConnectionForRestore(connection);
        });

        captureState();
        sync();
    }

    return {
        captureState,
        clearRuntimeBoard,
        createNode,
        removeConnectionByLine,
        removeNode,
        removeNodes,
        restore,
        restoreConnection
    };
}

function preventNativeDrag(event) {
    event.preventDefault();
}
