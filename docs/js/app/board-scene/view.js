const CONNECTOR_POSITIONS = ["left", "right", "top", "bottom"];

export function createBoardNodeView({
    id,
    symbol,
    onConnectorPointerDown,
    onNodePointerDown,
    onNodeDragStart
}) {
    const node = document.createElement("div");
    const label = document.createElement("span");

    node.className = "node";
    node.dataset.id = id;
    node.dataset.symbol = symbol;
    node.draggable = false;

    label.className = "node-label";
    label.textContent = symbol;
    node.appendChild(label);

    CONNECTOR_POSITIONS.forEach(position => {
        const connector = document.createElement("div");
        connector.className = `connector ${position}`;
        connector.dataset.nodeId = id;
        connector.dataset.position = position;
        connector.addEventListener("pointerdown", onConnectorPointerDown);
        node.appendChild(connector);
    });

    node.addEventListener("pointerdown", onNodePointerDown);
    node.addEventListener("dragstart", onNodeDragStart);

    return node;
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
