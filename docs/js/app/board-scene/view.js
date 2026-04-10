import { createSceneUiFactory } from "../scene-ui/factory.js";
import { compileSceneSchema, resolveSceneSchema } from "../scene-ui/schema.js";

const CONNECTOR_POSITIONS = ["left", "right", "top", "bottom"];
const sceneUiFactory = createSceneUiFactory();

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
    createSvgLine,
    stroke,
    onClick
}) {
    const line = createSvgLine(stroke);
    line.classList.add("connection-hitbox");
    line.addEventListener("click", onClick);
    return line;
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
