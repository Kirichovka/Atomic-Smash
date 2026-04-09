import { createSvgLine, getConnectorCenter } from "../../svg.js";

export function createBoardConnectionSessionController({
    board,
    boardRender,
    boardSelection,
    boardState,
    getConnectionTargetAtPoint,
    connectionExists,
    captureState,
    publishInteractionContext,
    removeConnectionByLine
}) {
    function startConnection(event) {
        if (event.pointerType === "mouse" && event.button !== 0) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        removeTemporaryWire();

        board.startConnector = event.currentTarget;
        const startNode = boardState.getNode(board.startConnector.dataset.nodeId) ?? null;
        boardSelection.selectSingleNode(board.startConnector.dataset.nodeId, { notify: false });
        publishInteractionContext({
            source: "mix-zone-connector",
            zone: "mix-zone",
            clearPaletteSelection: true,
            inspectedSymbol: startNode?.dataset.symbol ?? null,
            persist: false
        });
        board.connectionPointerId = event.pointerId;
        board.startConnector.setPointerCapture(event.pointerId);

        boardRender.sync(boardState.getNodes(), boardState.getConnections(), board.movingNode);

        const startPoint = getConnectorCenter(board.startConnector, boardRender.svgElement);
        board.currentWire = createSvgLine("var(--wire-temp)", true);
        board.currentWire.setAttribute("x1", startPoint.x);
        board.currentWire.setAttribute("y1", startPoint.y);
        board.currentWire.setAttribute("x2", startPoint.x);
        board.currentWire.setAttribute("y2", startPoint.y);

        boardRender.svgElement.appendChild(board.currentWire);

        document.addEventListener("pointermove", drawTemporaryWire);
        document.addEventListener("pointerup", finishConnection);
        document.addEventListener("pointercancel", removeTemporaryWire);
    }

    function drawTemporaryWire(event) {
        if (!board.currentWire || !board.startConnector || event.pointerId !== board.connectionPointerId) {
            return;
        }

        const layerRect = boardRender.svgElement.getBoundingClientRect();
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
            boardRender.svgElement.clientWidth,
            boardRender.svgElement.clientHeight
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

        const line = boardRender.createConnection({
            onClick: () => {
                boardSelection.clearSelectedNodes();
                removeConnectionByLine(line);
            },
            stroke: "var(--wire-solid)"
        });

        boardState.addConnection({
            fromNodeId: startNodeId,
            fromPosition: board.startConnector.dataset.position,
            toNodeId: endNodeId,
            toPosition: endConnector.dataset.position,
            line
        });

        boardRender.sync(boardState.getNodes(), boardState.getConnections(), board.movingNode);
        removeTemporaryWire();
        captureState();
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

    return {
        drawTemporaryWire,
        finishConnection,
        removeTemporaryWire,
        startConnection
    };
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
