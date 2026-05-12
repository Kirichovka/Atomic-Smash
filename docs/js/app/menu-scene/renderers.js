import { projectNodeToViewport } from "./methods.js?v=20260512-level-entry-cache";

export function layoutMenuSceneNodes({ camera, nodeLayerElement, nodes, space }) {
    nodes.forEach(node => {
        const element = nodeLayerElement?.querySelector(`[data-level-id="${node.levelId}"]`);
        if (!element) {
            return;
        }

        const projected = projectNodeToViewport(space, camera, node);
        const nodeWidthPx = space.getNodeWidthPx(node, camera);
        element.style.left = `${projected.xPixels}px`;
        element.style.top = `${projected.yPixels}px`;
        element.style.width = `${nodeWidthPx}px`;
        applyNodeTextScale(element, node, nodeWidthPx);
    });
}

function applyNodeTextScale(element, node, nodeWidthPx) {
    const titleLength = getTextMeasureLength(node.title);
    const titleLongestWordLength = getLongestWordLength(node.title);
    const subtitleLength = getTextMeasureLength(node.subtitle);
    const subtitleLongestWordLength = getLongestWordLength(node.subtitle);
    const compactness = nodeWidthPx < 92 ? 0.9 : 1;
    const textWidthPx = nodeWidthPx * 0.84;
    const titleFontSize = clamp(
        Math.min(
            (nodeWidthPx * 1.42) / Math.max(titleLength, 6),
            (textWidthPx * 1.72) / Math.max(titleLongestWordLength, 4)
        ),
        nodeWidthPx * 0.082,
        nodeWidthPx * 0.18
    ) * compactness;
    const subtitleFontSize = clamp(
        Math.min(
            (nodeWidthPx * 0.92) / Math.max(subtitleLength, 10),
            (textWidthPx * 1.62) / Math.max(subtitleLongestWordLength, 4)
        ),
        nodeWidthPx * 0.054,
        nodeWidthPx * 0.096
    ) * compactness;
    const indexFontSize = clamp(nodeWidthPx * 0.065, 8, 13) * compactness;
    const gap = clamp(nodeWidthPx * 0.025, 2, 5);

    element.style.setProperty("--level-title-font-size", `${titleFontSize.toFixed(2)}px`);
    element.style.setProperty("--level-subtitle-font-size", `${subtitleFontSize.toFixed(2)}px`);
    element.style.setProperty("--level-index-font-size", `${indexFontSize.toFixed(2)}px`);
    element.style.setProperty("--level-node-gap", `${gap.toFixed(2)}px`);
    element.style.setProperty("--level-title-line-height", titleLength > 14 ? "0.96" : "1.04");
    element.style.setProperty("--level-subtitle-line-height", subtitleLength > 14 ? "1.02" : "1.12");
    fitTextElement({
        cssProperty: "--level-title-font-size",
        element,
        maxHeight: nodeWidthPx * 0.34,
        minFontSize: Math.max(nodeWidthPx * 0.052, 4.8),
        selector: ".home-level-formula"
    });
    fitTextElement({
        cssProperty: "--level-subtitle-font-size",
        element,
        maxHeight: nodeWidthPx * 0.24,
        minFontSize: Math.max(nodeWidthPx * 0.045, 4.4),
        selector: ".home-level-objective"
    });
}

function getTextMeasureLength(value) {
    return String(value ?? "")
        .replace(/\s+/g, "")
        .length;
}

function getLongestWordLength(value) {
    return String(value ?? "")
        .split(/\s+/)
        .reduce((length, word) => Math.max(length, word.length), 0);
}

function fitTextElement({ cssProperty, element, maxHeight, minFontSize, selector }) {
    const textElement = element.querySelector(selector);
    if (!textElement) {
        return;
    }

    let fontSize = Number.parseFloat(getComputedStyle(textElement).fontSize);
    if (!Number.isFinite(fontSize)) {
        return;
    }

    for (let attempt = 0; attempt < 8; attempt += 1) {
        const overflowsWidth = textElement.scrollWidth > textElement.clientWidth + 1;
        const overflowsHeight = textElement.scrollHeight > Math.max(maxHeight, textElement.clientHeight) + 1;
        if (!overflowsWidth && !overflowsHeight) {
            return;
        }

        fontSize = Math.max(fontSize * 0.88, minFontSize);
        element.style.setProperty(cssProperty, `${fontSize.toFixed(2)}px`);

        if (fontSize <= minFontSize) {
            return;
        }
    }
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
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
    const shallowCurveLift = Math.max(
        Math.min(mapRect.width, mapRect.height) * 0.04,
        Math.abs(horizontalDistance) * 0.12
    );

    if (Math.abs(verticalDistance) < shallowCurveThreshold) {
        const controlX1 = start.x + (horizontalDistance * 0.3);
        const controlX2 = end.x - (horizontalDistance * 0.3);
        const controlY = end.y >= start.y
            ? Math.max(start.y, end.y) + shallowCurveLift
            : Math.min(start.y, end.y) - shallowCurveLift;
        return `M ${start.x} ${start.y} C ${controlX1} ${controlY}, ${controlX2} ${controlY}, ${end.x} ${end.y}`;
    }

    return `M ${start.x} ${start.y} C ${start.x} ${start.y + controlLift}, ${end.x} ${end.y - controlLift}, ${end.x} ${end.y}`;
}
