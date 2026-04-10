import { createSceneUiFactory } from "../scene-ui/factory.js";
import { compileSceneSchema, resolveSceneSchema } from "../scene-ui/schema.js";
import { assertBoardNodeSchemaContract } from "./contracts.js";

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
    assertBoardNodeSchemaContract(schemaConfig);

    const nodeElement = sceneUiFactory.createElement(
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

    hydrateBoardNodeElement(nodeElement, {
        id,
        onConnectorPointerDown,
        onNodeDragStart,
        onNodePointerDown,
        symbol
    });

    return nodeElement;
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
    delete nodeSchema.on;
    delete nodeSchema.listeners;

    nodeSchema.children = [
        ...(Array.isArray(nodeSchema.children) ? nodeSchema.children : []),
        ...CONNECTOR_POSITIONS.map(position => {
            const connectorDefinition = structuredClone(connectorSchema);
            delete connectorDefinition.on;
            delete connectorDefinition.listeners;

            return {
                ...connectorDefinition,
                className: `connector ${position}`,
                data: {
                    ...(connectorSchema.data ?? {}),
                    position
                }
            };
        })
    ];

    return nodeSchema;
}

function hydrateBoardNodeElement(nodeElement, {
    id,
    onConnectorPointerDown,
    onNodeDragStart,
    onNodePointerDown,
    symbol
}) {
    nodeElement.dataset.id = id;
    nodeElement.dataset.symbol = symbol;
    nodeElement.draggable = false;

    if (typeof onNodePointerDown === "function") {
        nodeElement.addEventListener("pointerdown", onNodePointerDown);
    }

    if (typeof onNodeDragStart === "function") {
        nodeElement.addEventListener("dragstart", onNodeDragStart);
    }

    CONNECTOR_POSITIONS.forEach(position => {
        const connector = nodeElement.querySelector(`.connector.${position}`);
        if (!connector) {
            return;
        }

        connector.dataset.nodeId = id;
        connector.dataset.position = position;

        if (typeof onConnectorPointerDown === "function") {
            connector.addEventListener("pointerdown", onConnectorPointerDown);
        }
    });
}
