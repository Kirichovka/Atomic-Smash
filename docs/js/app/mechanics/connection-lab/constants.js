import { getBoardNodeMetrics } from "../../board-scene/methods.js";

export const DEFAULT_NODE_WIDTH = 110;
export const DEFAULT_NODE_HEIGHT = 64;
export const SPAWN_OFFSETS = [
    { x: 0, y: 0 },
    { x: 24, y: 18 },
    { x: -24, y: 18 },
    { x: 24, y: -18 },
    { x: -24, y: -18 },
    { x: 0, y: 36 },
    { x: 36, y: 0 },
    { x: -36, y: 0 }
];

export function parseNodeIndex(nodeId) {
    const match = /^node-(\d+)$/.exec(nodeId ?? "");
    return match ? Number(match[1]) : 0;
}

export function isPointerOutsideViewport(clientX, clientY) {
    return (
        clientX < 0 ||
        clientY < 0 ||
        clientX > document.documentElement.clientWidth ||
        clientY > document.documentElement.clientHeight
    );
}

export function getNodeMetrics(mixZone) {
    return getBoardNodeMetrics(mixZone, {
        height: DEFAULT_NODE_HEIGHT,
        width: DEFAULT_NODE_WIDTH
    });
}

export function getMaxNodeId(nodes) {
    return (nodes ?? []).reduce((maxValue, node) => Math.max(maxValue, parseNodeIndex(node.id)), 0);
}
