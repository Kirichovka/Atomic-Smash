import { RUNTIME_EVENT_IDS } from "../contracts/event-contracts.js";

export function createBoardSelectionController({
    board,
    boardState,
    bus
}) {
    function selectSingleNode(nodeId, options = {}) {
        const { notify = true } = options;
        const nextNodeId = nodeId ?? null;

        if (nextNodeId && board.selectedNodeIds.size === 1 && boardState.hasSelectedNode(nextNodeId)) {
            if (notify) {
                notifySelectionState();
            }
            return;
        }

        boardState.clearSelection();

        if (nextNodeId && boardState.hasNode(nextNodeId)) {
            boardState.addSelectedNode(nextNodeId);
        }

        boardState.replaceSelectedNodeId(nextNodeId && boardState.hasNode(nextNodeId) ? nextNodeId : null);

        if (notify) {
            notifySelectionState();
        }
    }

    function toggleNodeSelection(nodeId, options = {}) {
        const { notify = true } = options;
        if (!nodeId || !boardState.hasNode(nodeId)) {
            return;
        }

        if (boardState.hasSelectedNode(nodeId)) {
            boardState.deleteSelectedNode(nodeId);
        } else {
            boardState.addSelectedNode(nodeId);
        }

        boardState.syncPrimarySelectedNodeId();

        if (notify) {
            notifySelectionState();
        }
    }

    function clearSelectedNodes(options = {}) {
        const { notify = true } = options;
        boardState.clearSelection();

        if (notify) {
            notifySelectionState();
        }
    }

    function notifySelectionState() {
        const primarySelectedNodeId = boardState.getPrimarySelectedNodeId();
        boardState.replaceSelectedNodeId(primarySelectedNodeId);

        if (primarySelectedNodeId && boardState.hasNode(primarySelectedNodeId)) {
            bus.publish(RUNTIME_EVENT_IDS.interactionContextChanged, {
                source: "mix-zone-selection",
                zone: "mix-zone",
                clearPaletteSelection: true,
                inspectedSymbol: boardState.getNodeSymbol(primarySelectedNodeId),
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

    function getSelectedNodeIds() {
        return boardState.getSelectedNodeIds();
    }

    function getMovingGroup(anchorNode, getNodeLeft, getNodeTop) {
        const anchorNodeId = boardState.getNodeIdFromElement(anchorNode);
        const shouldMoveSelection =
            board.selectedNodeIds.has(anchorNodeId)
            && board.selectedNodeIds.size > 1;
        const movingNodeIds = shouldMoveSelection
            ? getSelectedNodeIds()
            : [anchorNodeId];
        const anchorLeft = getNodeLeft(anchorNode);
        const anchorTop = getNodeTop(anchorNode);

        return movingNodeIds
            .map(nodeId => boardState.getNode(nodeId))
            .filter(Boolean)
            .map(node => ({
                deltaX: getNodeLeft(node) - anchorLeft,
                deltaY: getNodeTop(node) - anchorTop,
                node
            }));
    }

    return {
        clearSelectedNodes,
        getMovingGroup,
        getSelectedNodeIds,
        notifySelectionState,
        selectSingleNode,
        toggleNodeSelection
    };
}
