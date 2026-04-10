import {
    redrawConnections,
    syncConnectionsLayer
} from "../../svg.js";
import { clampBoardLocalCoordinate } from "./methods.js";
import { createBoardConnectionView, createBoardNodeView } from "./view.js";

export function createBoardRenderController({
    boardVisualContentBuilder,
    boardRuntimeSchemaConfig,
    boardScene,
    boardState,
    viewport
}) {
    function createNode({
        entity = null,
        id,
        onConnectorPointerDown,
        onNodeDragStart,
        onNodePointerDown,
        position,
        symbol
    }) {
        const node = createBoardNodeView({
            id: entity?.id ?? id,
            onConnectorPointerDown,
            onNodeDragStart,
            onNodePointerDown,
            schemaConfig: boardRuntimeSchemaConfig,
            symbol: entity?.metadata.symbol ?? symbol
        });
        setNodePosition(node, position.x, position.y);
        entity?.attachElement(node);
        viewport.renderNode(node);
        return node;
    }

    function createConnection({ edgeEntity = null, onClick, stroke = "var(--wire-solid)" }) {
        const line = createBoardConnectionView({
            boardVisualContentBuilder,
            onClick,
            stroke
        });
        edgeEntity?.attachLine(line);
        viewport.renderEdge(line);
        return line;
    }

    function sync(nodes, connections, movingNode = null) {
        boardScene.sync();
        syncNodeLayout(nodes, movingNode);
        syncConnectionsLayer(viewport.edgeLayerElement, viewport.nodeLayerElement);
        redrawConnections(connections, nodes, viewport.edgeLayerElement);
    }

    function syncNodeLayout(nodes, movingNode = null) {
        boardScene.sync();
        nodes.forEach(node => {
            if (node === movingNode) {
                return;
            }

            const entity = boardState.getNodeEntityByElement(node);
            const position = localToPixelPosition(
                entity?.metadata.localX ?? getNodeLocalX(node),
                entity?.metadata.localY ?? getNodeLocalY(node)
            );
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

        const entity = boardState.getNodeEntityByElement(node);
        if (entity) {
            entity.updateLocalPosition(localPosition.localX, localPosition.localY);
            entity.updatePixelPosition(renderedPosition.x, renderedPosition.y);
        }
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
        mixZoneElement: viewport.nodeLayerElement,
        pixelToLocalPosition,
        setNodePosition,
        sync,
        svgElement: viewport.edgeLayerElement,
        syncNodeLayout
    };
}
