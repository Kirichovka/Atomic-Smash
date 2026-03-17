export function syncConnectionsLayer(svg, mixZone) {
    const width = mixZone.clientWidth;
    const height = mixZone.clientHeight;

    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
}

export function createSvgLine(stroke, dashed = false) {
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("stroke", stroke);
    line.style.stroke = stroke;
    line.setAttribute("stroke-width", "3");
    line.setAttribute("stroke-linecap", "round");

    if (dashed) {
        line.setAttribute("stroke-dasharray", "6 4");
    }

    return line;
}

export function getConnectorElement(node, position) {
    return node.querySelector(`.connector.${position}`);
}

export function getConnectorCenter(connector, layer) {
    const layerRect = layer.getBoundingClientRect();
    const rect = connector.getBoundingClientRect();

    return {
        x: rect.left - layerRect.left + rect.width / 2,
        y: rect.top - layerRect.top + rect.height / 2
    };
}

export function redrawConnections(connections, nodes, layer) {
    connections.forEach(connection => {
        const fromNode = nodes.get(connection.fromNodeId);
        const toNode = nodes.get(connection.toNodeId);

        if (!fromNode || !toNode) {
            return;
        }

        const fromConnector = getConnectorElement(fromNode, connection.fromPosition);
        const toConnector = getConnectorElement(toNode, connection.toPosition);

        if (!fromConnector || !toConnector) {
            return;
        }

        const fromPoint = getConnectorCenter(fromConnector, layer);
        const toPoint = getConnectorCenter(toConnector, layer);

        connection.line.setAttribute("x1", fromPoint.x);
        connection.line.setAttribute("y1", fromPoint.y);
        connection.line.setAttribute("x2", toPoint.x);
        connection.line.setAttribute("y2", toPoint.y);
    });
}
