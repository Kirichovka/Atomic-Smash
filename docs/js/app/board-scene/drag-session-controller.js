export function createBoardDragSessionController({
    board,
    boardRender,
    boardSelection,
    boardState,
    publishInteractionContext,
    isNodeOutsideMixZone,
    isPointerOutsideViewport,
    removeNodes,
    captureState
}) {
    let movingGroup = [];
    let hasMovedDuringDrag = false;
    let dragStartClientX = 0;
    let dragStartClientY = 0;

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
            boardSelection.toggleNodeSelection(draggedNodeId);
            return;
        }

        const shouldPreserveMultiSelection =
            board.selectedNodeIds.has(draggedNodeId)
            && board.selectedNodeIds.size > 1;

        if (!shouldPreserveMultiSelection) {
            boardSelection.selectSingleNode(draggedNodeId, { notify: false });
        } else {
            boardState.replaceSelectedNodeId(draggedNodeId);
        }

        publishInteractionContext({
            source: "mix-zone-node",
            zone: "mix-zone",
            clearPaletteSelection: true,
            inspectedSymbol: event.currentTarget.dataset.symbol,
            persist: false
        });

        board.movingNode = event.currentTarget;
        board.movingPointerId = event.pointerId;
        dragStartClientX = event.clientX;
        dragStartClientY = event.clientY;
        hasMovedDuringDrag = false;
        movingGroup = boardSelection.getMovingGroup(
            board.movingNode,
            boardRender.getNodeLeft,
            boardRender.getNodeTop
        );
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

        const travelDistance = Math.hypot(
            event.clientX - dragStartClientX,
            event.clientY - dragStartClientY
        );
        if (travelDistance > 1) {
            hasMovedDuringDrag = true;
        }

        if (hasMovedDuringDrag && isPointerOutsideViewport(event.clientX, event.clientY)) {
            const removedNodeIds = movingGroup.map(item => item.node.dataset.id);
            cleanupMovingNode();
            removeNodes(removedNodeIds);
            return;
        }

        const zoneRect = boardRender.mixZoneElement.getBoundingClientRect();
        const anchorPosition = {
            x: event.clientX - zoneRect.left - board.moveOffsetX,
            y: event.clientY - zoneRect.top - board.moveOffsetY
        };

        movingGroup.forEach(item => {
            const position = {
                x: anchorPosition.x + item.deltaX,
                y: anchorPosition.y + item.deltaY
            };

            boardRender.setNodePosition(item.node, position.x, position.y, { clamp: false });
            item.node.classList.toggle(
                "outside-zone",
                isNodeOutsideMixZone(boardRender.getNodeLeft(item.node), boardRender.getNodeTop(item.node))
            );
        });

        boardRender.sync(boardState.getNodes(), boardState.getConnections(), board.movingNode);
    }

    function stopMoveNode(event) {
        if (event && event.pointerId !== board.movingPointerId) {
            return;
        }

        if (!hasMovedDuringDrag) {
            cleanupMovingNode();
            return;
        }

        const releasedNodeIds = movingGroup
            .filter(item => isNodeOutsideMixZone(boardRender.getNodeLeft(item.node), boardRender.getNodeTop(item.node)))
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
        hasMovedDuringDrag = false;
        dragStartClientX = 0;
        dragStartClientY = 0;
        document.body.classList.remove("dragging-element");

        document.removeEventListener("pointermove", moveNode);
        document.removeEventListener("pointerup", stopMoveNode);
        document.removeEventListener("pointercancel", stopMoveNode);
    }

    return {
        cleanupMovingNode,
        moveNode,
        startMoveNode,
        stopMoveNode
    };
}
