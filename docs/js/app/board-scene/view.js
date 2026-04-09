import { createSceneUiFactory } from "../scene-ui/factory.js";
import { compileSceneSchema, resolveSceneSchema, sceneContainer, sceneText } from "../scene-ui/schema.js";

const CONNECTOR_POSITIONS = ["left", "right", "top", "bottom"];
const sceneUiFactory = createSceneUiFactory();

export function createBoardNodeView({
    id,
    symbol,
    onConnectorPointerDown,
    onNodePointerDown,
    onNodeDragStart
}) {
    return sceneUiFactory.createElement(
        compileSceneSchema(
            resolveSceneSchema(
                createBoardNodeSchema(),
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

function createBoardNodeSchema() {
    return sceneContainer({
        className: "node",
        attrs: {
            draggable: "false"
        },
        data: {
            id: { bind: "node.id" },
            symbol: { bind: "node.symbol" }
        },
        on: {
            dragstart: { bind: "handlers.nodeDragStart" },
            pointerdown: { bind: "handlers.nodePointerDown" }
        },
        children: [
            sceneText({
                className: "node-label",
                tagName: "span",
                text: { bind: "node.symbol" }
            }),
            ...CONNECTOR_POSITIONS.map(position =>
                sceneContainer({
                    className: `connector ${position}`,
                    data: {
                        nodeId: { bind: "node.id" },
                        position
                    },
                    on: {
                        pointerdown: { bind: "handlers.connectorPointerDown" }
                    }
                })
            )
        ]
    });
}
