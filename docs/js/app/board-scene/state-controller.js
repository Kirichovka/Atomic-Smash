export function createBoardStateController(board) {
    function getNodeIdFromElement(nodeElement) {
        return nodeElement?.dataset?.id ?? null;
    }

    function getNodeEntity(nodeId) {
        return board.nodeEntities.get(nodeId) ?? null;
    }

    function getNodeEntityByElement(nodeElement) {
        return getNodeEntity(getNodeIdFromElement(nodeElement));
    }

    function getNodeSymbol(nodeId) {
        return getNodeEntity(nodeId)?.metadata.symbol ?? null;
    }

    function getNode(nodeId) {
        return board.nodes.get(nodeId) ?? null;
    }

    function hasNode(nodeId) {
        return board.nodes.has(nodeId);
    }

    function addNode(nodeId, nodeElement) {
        board.nodes.set(nodeId, nodeElement);
    }

    function addNodeEntity(nodeEntity) {
        if (!nodeEntity?.id) {
            return;
        }

        board.nodeEntities.set(nodeEntity.id, nodeEntity);
    }

    function deleteNode(nodeId) {
        board.nodes.delete(nodeId);
    }

    function deleteNodeEntity(nodeId) {
        board.nodeEntities.delete(nodeId);
    }

    function clearNodes() {
        board.nodes.clear();
    }

    function clearNodeEntities() {
        board.nodeEntities.clear();
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

    function getNodeEntityValues() {
        return [...board.nodeEntities.values()];
    }

    function addConnection(connection) {
        board.connections.push(connection);
    }

    function addEdgeEntity(edgeEntity) {
        if (!edgeEntity?.id) {
            return;
        }

        board.edgeEntities.set(edgeEntity.id, edgeEntity);
    }

    function getConnections() {
        return board.connections;
    }

    function getEdgeEntity(edgeId) {
        return board.edgeEntities.get(edgeId) ?? null;
    }

    function getEdgeEntityValues() {
        return [...board.edgeEntities.values()];
    }

    function clearConnections() {
        board.connections.length = 0;
    }

    function clearEdgeEntities() {
        board.edgeEntities.clear();
    }

    function removeConnectionAt(index) {
        board.connections.splice(index, 1);
    }

    function deleteEdgeEntity(edgeId) {
        board.edgeEntities.delete(edgeId);
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
        addEdgeEntity,
        addNode,
        addNodeEntity,
        clearConnections,
        clearEdgeEntities,
        clearNodes,
        clearNodeEntities,
        clearSelection,
        clearSelectionClasses,
        deleteNode,
        deleteEdgeEntity,
        deleteNodeEntity,
        deleteSelectedNode,
        getEdgeEntity,
        getEdgeEntityValues,
        getConnections,
        getNode,
        getNodeEntries,
        getNodeIdFromElement,
        getNodeEntity,
        getNodeEntityByElement,
        getNodeEntityValues,
        getNodeSymbol,
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
