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

        boardState.getConnections().forEach(connection => connection.line.remove());
        boardState.clearConnections();

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
            onNodePointerDown: options.onNodePointerDown,
            position,
            symbol
        });
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

        const line = boardRender.createConnection({
            onClick: () => onConnectionClick(line),
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
