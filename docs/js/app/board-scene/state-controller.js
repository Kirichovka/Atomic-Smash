export function createBoardStateController(board) {
    function getNode(nodeId) {
        return board.nodes.get(nodeId) ?? null;
    }

    function hasNode(nodeId) {
        return board.nodes.has(nodeId);
    }

    function addNode(nodeId, nodeElement) {
        board.nodes.set(nodeId, nodeElement);
    }

    function deleteNode(nodeId) {
        board.nodes.delete(nodeId);
    }

    function clearNodes() {
        board.nodes.clear();
    }

    function getNodes() {
        return board.nodes;
    }

    function getNodeEntries() {
        return [...board.nodes.entries()];
    }

    function getNodeValues() {
        return [...board.nodes.values()];
    }

    function addConnection(connection) {
        board.connections.push(connection);
    }

    function getConnections() {
        return board.connections;
    }

    function clearConnections() {
        board.connections.length = 0;
    }

    function removeConnectionAt(index) {
        board.connections.splice(index, 1);
    }

    function replaceSelectedNodeId(nodeId) {
        board.selectedNodeId = nodeId ?? null;
    }

    function clearSelectionClasses() {
        board.selectedNodeIds.forEach(selectedNodeId => {
            getNode(selectedNodeId)?.classList.remove("selected");
        });
    }

    function clearSelection() {
        clearSelectionClasses();
        board.selectedNodeIds.clear();
        board.selectedNodeId = null;
    }

    function hasSelectedNode(nodeId) {
        return board.selectedNodeIds.has(nodeId);
    }

    function addSelectedNode(nodeId) {
        board.selectedNodeIds.add(nodeId);
        getNode(nodeId)?.classList.add("selected");
    }

    function deleteSelectedNode(nodeId) {
        board.selectedNodeIds.delete(nodeId);
        getNode(nodeId)?.classList.remove("selected");
    }

    function getSelectedNodeIds() {
        return [...board.selectedNodeIds].filter(nodeId => hasNode(nodeId));
    }

    function getPrimarySelectedNodeId() {
        for (const nodeId of board.selectedNodeIds) {
            if (hasNode(nodeId)) {
                return nodeId;
            }
        }

        return null;
    }

    function syncPrimarySelectedNodeId() {
        board.selectedNodeId = getPrimarySelectedNodeId();
        return board.selectedNodeId;
    }

    return {
        addConnection,
        addNode,
        clearConnections,
        clearNodes,
        clearSelection,
        clearSelectionClasses,
        deleteNode,
        deleteSelectedNode,
        getConnections,
        getNode,
        getNodeEntries,
        getNodes,
        getNodeValues,
        getPrimarySelectedNodeId,
        getSelectedNodeIds,
        hasNode,
        hasSelectedNode,
        removeConnectionAt,
        replaceSelectedNodeId,
        addSelectedNode,
        syncPrimarySelectedNodeId
    };
}
