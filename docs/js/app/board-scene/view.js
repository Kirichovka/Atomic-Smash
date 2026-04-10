import { createSceneUiFactory } from "../scene-ui/factory.js";
import { compileSceneSchema, resolveSceneSchema } from "../scene-ui/schema.js";

const CONNECTOR_POSITIONS = ["left", "right", "top", "bottom"];
const sceneUiFactory = createSceneUiFactory();

export class BoardSceneViewport {
    constructor({ viewportElement, edgeLayerElement, nodeLayerElement }) {
        this.viewportElement = viewportElement;
        this.edgeLayerElement = edgeLayerElement;
        this.nodeLayerElement = nodeLayerElement;
    }

    clear() {
        this.nodeLayerElement?.replaceChildren();
        this.edgeLayerElement?.replaceChildren();
    }

    getRect() {
        return this.viewportElement?.getBoundingClientRect() ?? null;
    }

    observeResize(callback) {
        if (!this.viewportElement || typeof ResizeObserver !== "function") {
            return null;
        }

        const observer = new ResizeObserver(callback);
        observer.observe(this.viewportElement);
        return observer;
    }

    renderEdge(edgeElement) {
        this.edgeLayerElement?.appendChild(edgeElement);
    }

    renderNode(nodeElement) {
        this.nodeLayerElement?.appendChild(nodeElement);
    }

    setEdgeViewBox(width, height) {
        this.edgeLayerElement?.setAttribute("viewBox", `0 0 ${width} ${height}`);
    }
}

export function createBoardSceneViewport(context) {
    return new BoardSceneViewport(context);
}

export function createBoardNodeView({
    schemaConfig,
    id,
    symbol,
    onConnectorPointerDown,
    onNodePointerDown,
    onNodeDragStart
}) {
    return sceneUiFactory.createElement(
        compileSceneSchema(
            resolveSceneSchema(
                createBoardNodeSchema(schemaConfig),
                {
                    handlers: {
                        connectorPointerDown: onConnectorPointerDown,
                        nodeDragStart: onNodeDragStart,
                        nodePointerDown: onNodePointerDown
                    },
                    node: {
                        id,
                        symbol
                    }
                }
            )
        )
    );
}

export function createBoardConnectionView({
    boardVisualContentBuilder,
    stroke,
    onClick
}) {
    return boardVisualContentBuilder.createConnectionVisual({
        onClick,
        stroke
    });
}

function createBoardNodeSchema(schemaConfig = {}) {
    const nodeSchema = structuredClone(schemaConfig.boardNode ?? {});
    const connectorSchema = schemaConfig.boardConnector ?? {};

    nodeSchema.children = [
        ...(Array.isArray(nodeSchema.children) ? nodeSchema.children : []),
        ...CONNECTOR_POSITIONS.map(position =>
            resolveSceneSchema(connectorSchema, {
                connector: {
                    className: `connector ${position}`,
                    position
                }
            })
        )
    ];

    return nodeSchema;
}
