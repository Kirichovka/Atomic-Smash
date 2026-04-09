import {
    createSvgLine,
    redrawConnections,
    syncConnectionsLayer
} from "../../svg.js";
import { clampBoardLocalCoordinate } from "./methods.js";
import { createBoardConnectionView, createBoardNodeView } from "./view.js";

export function createBoardRenderController({
    boardScene,
    mixZoneElement,
    svgElement
}) {
    function createNode({
        id,
        onConnectorPointerDown,
        onNodeDragStart,
        onNodePointerDown,
        position,
        symbol
    }) {
        const node = createBoardNodeView({
            id,
            onConnectorPointerDown,
            onNodeDragStart,
            onNodePointerDown,
            symbol
        });
        setNodePosition(node, position.x, position.y);
        mixZoneElement.appendChild(node);
        return node;
    }

    function createConnection({ onClick, stroke = "var(--wire-solid)" }) {
        const line = createBoardConnectionView({
            createSvgLine,
            onClick,
            stroke
        });
        svgElement.appendChild(line);
        return line;
    }

    function sync(nodes, connections, movingNode = null) {
        boardScene.sync();
        syncNodeLayout(nodes, movingNode);
        syncConnectionsLayer(svgElement, mixZoneElement);
        redrawConnections(connections, nodes, svgElement);
    }

    function syncNodeLayout(nodes, movingNode = null) {
        boardScene.sync();
        nodes.forEach(node => {
            if (node === movingNode) {
                return;
            }

            const position = localToPixelPosition(getNodeLocalX(node), getNodeLocalY(node));
            node.style.left = `${position.x}px`;
            node.style.top = `${position.y}px`;
        });
    }

    function setNodePosition(node, x, y, options = {}) {
        const { clamp = true } = options;
        const renderedPosition = clamp ? boardScene.clampPosition(x, y) : { x, y };
        const localAnchor = boardScene.clampPosition(x, y);
        const localPosition = pixelToLocalPosition(localAnchor.x, localAnchor.y);

        node.style.left = `${renderedPosition.x}px`;
        node.style.top = `${renderedPosition.y}px`;
        node.dataset.localX = String(localPosition.localX);
        node.dataset.localY = String(localPosition.localY);
    }

    function pixelToLocalPosition(x, y) {
        return boardScene.toLocal(x, y);
    }

    function localToPixelPosition(localX, localY) {
        return boardScene.toPixel(localX, localY);
    }

    function getNodeLeft(node) {
        return Number.parseFloat(node.style.left || "0");
    }

    function getNodeTop(node) {
        return Number.parseFloat(node.style.top || "0");
    }

    function getNodeLocalX(node) {
        return clampBoardLocalCoordinate(Number.parseFloat(node.dataset.localX || "0"));
    }

    function getNodeLocalY(node) {
        return clampBoardLocalCoordinate(Number.parseFloat(node.dataset.localY || "0"));
    }

    return {
        createConnection,
        createNode,
        getNodeLeft,
        getNodeLocalX,
        getNodeLocalY,
        getNodeTop,
        localToPixelPosition,
        mixZoneElement,
        pixelToLocalPosition,
        setNodePosition,
        sync,
        svgElement,
        syncNodeLayout
    };
}
