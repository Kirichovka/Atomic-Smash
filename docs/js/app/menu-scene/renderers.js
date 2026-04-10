import { projectNodeToViewport } from "./methods.js";

export function layoutMenuSceneNodes({ camera, nodeLayerElement, nodes, space }) {
    nodes.forEach(node => {
        const element = nodeLayerElement?.querySelector(`[data-level-id="${node.levelId}"]`);
        if (!element) {
            return;
        }

        const projected = projectNodeToViewport(space, camera, node);
        const nodeWidthPx = space.getNodeWidthPx(node);
        element.style.left = `${projected.xPercent}%`;
        element.style.top = `${projected.yPercent}%`;
        element.style.width = `${nodeWidthPx}px`;
    });
}

export function renderMenuSceneEdges({ edgeLayerElement, edges, mapRect, nodeLayerElement, viewport }) {
    edgeLayerElement.replaceChildren();
    viewport.setEdgeViewBox(mapRect.width, mapRect.height);

    edges.forEach(edge => {
        const fromNodeElement = nodeLayerElement.querySelector(`[data-level-id="${edge.fromLevelId}"]`);
        const toNodeElement = nodeLayerElement.querySelector(`[data-level-id="${edge.toLevelId}"]`);
        if (!fromNodeElement || !toNodeElement) {
            return;
        }

        const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
        line.setAttribute("d", createMenuSceneEdgePath(fromNodeElement, toNodeElement, mapRect));
        edgeLayerElement.appendChild(line);
    });
}

function createMenuSceneEdgePath(fromNodeElement, toNodeElement, mapRect) {
    const fromRect = fromNodeElement.getBoundingClientRect();
    const toRect = toNodeElement.getBoundingClientRect();
    const fromCenter = {
        x: (fromRect.left - mapRect.left) + (fromRect.width / 2),
        y: (fromRect.top - mapRect.top) + (fromRect.height / 2)
    };
    const toCenter = {
        x: (toRect.left - mapRect.left) + (toRect.width / 2),
        y: (toRect.top - mapRect.top) + (toRect.height / 2)
    };
    const deltaX = toCenter.x - fromCenter.x;
    const deltaY = toCenter.y - fromCenter.y;
    const distance = Math.max(Math.hypot(deltaX, deltaY), 1);
    const unitX = deltaX / distance;
    const unitY = deltaY / distance;
    const fromRadius = Math.min(fromRect.width, fromRect.height) / 2;
    const toRadius = Math.min(toRect.width, toRect.height) / 2;
    const inset = Math.min(fromRadius, toRadius) * 0.18;
    const start = {
        x: fromCenter.x + (unitX * (fromRadius - inset)),
        y: fromCenter.y + (unitY * (fromRadius - inset))
    };
    const end = {
        x: toCenter.x - (unitX * (toRadius - inset)),
        y: toCenter.y - (unitY * (toRadius - inset))
    };
    const verticalDistance = end.y - start.y;
    const horizontalDistance = end.x - start.x;
    const controlLift = Math.max(
        Math.abs(verticalDistance) * 0.36,
        Math.min(mapRect.width, mapRect.height) * 0.038
    );
    const shallowCurveThreshold = mapRect.height * 0.08;
    const shallowCurveLift = Math.min(mapRect.width, mapRect.height) * 0.03;

    if (Math.abs(verticalDistance) < shallowCurveThreshold) {
        const controlX1 = start.x + (horizontalDistance * 0.3);
        const controlX2 = end.x - (horizontalDistance * 0.3);
        const controlY = start.y - shallowCurveLift;
        return `M ${start.x} ${start.y} C ${controlX1} ${controlY}, ${controlX2} ${controlY}, ${end.x} ${end.y}`;
    }

    return `M ${start.x} ${start.y} C ${start.x} ${start.y + controlLift}, ${end.x} ${end.y - controlLift}, ${end.x} ${end.y}`;
}
