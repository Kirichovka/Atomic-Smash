import { SceneObject, SCENE_OBJECT_ROLE } from "../scene-object.js";
import { MENU_SCENE_DEFAULTS, MENU_SCENE_ENTITY_KIND } from "./contracts.js?v=20260509-menu-render-cache";

export class MenuSceneEntity extends SceneObject {
    constructor({ id, kind }) {
        super({
            id,
            kind,
            role: SCENE_OBJECT_ROLE.entity
        });
    }
}

export class MenuSceneTaskNode extends MenuSceneEntity {
    constructor({
        id,
        level,
        levelId,
        options,
        size,
        status,
        subtitle,
        theme,
        title,
        x,
        y
    }) {
        super({
            id,
            kind: MENU_SCENE_ENTITY_KIND.node
        });

        this.level = level;
        this.levelId = levelId;
        this.options = options;
        this.size = size;
        this.status = status;
        this.subtitle = subtitle;
        this.theme = theme;
        this.title = title;
        this.x = x;
        this.y = y;
        this.isUnlocked = Boolean(options?.isUnlocked);
    }
}

export class MenuSceneEdge extends MenuSceneEntity {
    constructor({ id, fromLevelId, toLevelId }) {
        super({
            id,
            kind: MENU_SCENE_ENTITY_KIND.edge
        });

        this.fromLevelId = fromLevelId;
        this.toLevelId = toLevelId;
    }
}

export class MenuSceneSheet {
    constructor({ themeId, routeLabel, nodes = [], edges = [], placeholder = null }) {
        this.themeId = themeId;
        this.routeLabel = routeLabel;
        this.nodes = nodes;
        this.edges = edges;
        this.placeholder = placeholder;
    }

    getNodeByLevelId(levelId) {
        return this.nodes.find(node => node.levelId === levelId) ?? null;
    }
}

export class MenuSceneCamera {
    constructor() {
        this.offsetRatio = 0;
        this.maxOffsetRatio = 0;
    }

    reset() {
        this.offsetRatio = 0;
    }

    setRange(maxOffsetRatio) {
        this.maxOffsetRatio = Math.max(maxOffsetRatio, 0);
        this.offsetRatio = clamp(this.offsetRatio, 0, this.maxOffsetRatio);
    }

    panBy(deltaRatio) {
        this.offsetRatio = clamp(this.offsetRatio + deltaRatio, 0, this.maxOffsetRatio);
    }

    getOffsetPixels(viewportHeight) {
        return (this.offsetRatio / 100) * Math.max(viewportHeight, 0);
    }
}

export class MenuSceneSpace {
    constructor({
        overflowRatio = MENU_SCENE_DEFAULTS.overflowRatio
    } = {}) {
        this.height = 0;
        this.layout = createEmptyLayout();
        this.overflowRatio = overflowRatio;
        this.width = 0;
    }

    updateViewport({ height, overflowRatio = this.overflowRatio, width }) {
        this.width = Math.max(width, 0);
        this.height = Math.max(height, 0);
        this.overflowRatio = Math.max(overflowRatio, 0);
    }

    updateLayout(nodes = [], edges = []) {
        if (!this.width || !this.height || !nodes.length) {
            this.layout = createEmptyLayout();
            return;
        }

        const fallbackVirtualHeight = this.height * (1 + (this.overflowRatio / 100));
        const rawNodes = nodes.map(node => {
            const width = this.getBaseNodeWidthPx(node);
            return {
                node,
                radius: width / 2,
                width,
                x: (node.x / 100) * this.width,
                y: (node.y / 100) * fallbackVirtualHeight
            };
        });
        const spacedNodes = createSpacedNodeLayout(rawNodes);
        const rawBounds = createSceneBounds(spacedNodes, edges);
        const padding = Math.max(
            MENU_SCENE_DEFAULTS.fitPaddingPixels,
            rawBounds.maxRadius + 12
        );
        const availableWidth = Math.max(this.width - (padding * 2), 1);
        const contentWidth = Math.max(rawBounds.width, 1);
        const scale = clamp(
            Math.min(MENU_SCENE_DEFAULTS.maxNodeScale, availableWidth / contentWidth),
            MENU_SCENE_DEFAULTS.minNodeScale,
            MENU_SCENE_DEFAULTS.maxNodeScale
        );
        const scaledContentWidth = rawBounds.width * scale;
        const scaledContentHeight = rawBounds.height * scale;
        const virtualHeight = Math.max(
            this.height,
            scaledContentHeight + (padding * 2)
        );
        const offsetX = ((this.width - scaledContentWidth) / 2) - (rawBounds.minX * scale);
        const offsetY = padding - (rawBounds.minY * scale);

        this.layout = {
            offsetX,
            offsetY,
            positionsByLevelId: new Map(
                spacedNodes.map(rawNode => [
                    rawNode.node.levelId,
                    { x: rawNode.x, y: rawNode.y }
                ])
            ),
            scale,
            virtualHeight
        };
    }

    getOverflowRatio() {
        if (!this.height) {
            return 0;
        }

        return Math.max(((this.layout.virtualHeight - this.height) / this.height) * 100, 0);
    }

    project(node, camera) {
        const adjustedPosition = this.layout.positionsByLevelId?.get(node.levelId);
        const baseX = adjustedPosition?.x ?? (node.x / 100) * this.width;
        const baseY = adjustedPosition?.y ?? (node.y / 100) * this.height * (1 + (this.overflowRatio / 100));
        const cameraOffsetY = camera.getOffsetPixels(this.height);

        return {
            xPixels: (baseX * this.layout.scale) + this.layout.offsetX,
            yPixels: (baseY * this.layout.scale) + this.layout.offsetY - cameraOffsetY
        };
    }

    getNodeWidthPx(node) {
        return Math.round(this.getBaseNodeWidthPx(node) * this.layout.scale);
    }

    getBaseNodeWidthPx(node) {
        const sizeKey = node?.size ?? "sm";
        const baseSize =
            MENU_SCENE_DEFAULTS.nodeSizePixels[sizeKey]
            ?? MENU_SCENE_DEFAULTS.nodeSizePixels.sm;

        if (node?.isUnlocked) {
            return baseSize;
        }

        return Math.round(baseSize * MENU_SCENE_DEFAULTS.nodeLockedScale);
    }
}

function createEmptyLayout() {
    return {
        offsetX: 0,
        offsetY: 0,
        positionsByLevelId: new Map(),
        scale: 1,
        virtualHeight: 0
    };
}

function createSpacedNodeLayout(rawNodes) {
    const spacedNodes = rawNodes.map(rawNode => ({ ...rawNode }));
    const columnGroups = createNodeColumnGroups(spacedNodes);

    columnGroups.forEach(group => {
        enforceColumnNodeSpacing(group);
    });

    return spacedNodes;
}

function createNodeColumnGroups(rawNodes) {
    const groups = [];
    const sortedNodes = [...rawNodes].sort((firstNode, secondNode) => firstNode.x - secondNode.x);

    sortedNodes.forEach(rawNode => {
        const group = groups.find(candidate =>
            Math.abs(candidate.centerX - rawNode.x) <= MENU_SCENE_DEFAULTS.nodeColumnClusterPixels
        );

        if (!group) {
            groups.push({
                centerX: rawNode.x,
                nodes: [rawNode]
            });
            return;
        }

        group.nodes.push(rawNode);
        group.centerX = group.nodes.reduce((sum, node) => sum + node.x, 0) / group.nodes.length;
    });

    return groups.map(group => group.nodes);
}

function enforceColumnNodeSpacing(columnNodes) {
    const sortedNodes = columnNodes.sort((firstNode, secondNode) => firstNode.y - secondNode.y);

    for (let index = 1; index < sortedNodes.length; index += 1) {
        const previousNode = sortedNodes[index - 1];
        const currentNode = sortedNodes[index];
        const minimumDistance =
            previousNode.radius
            + currentNode.radius
            + MENU_SCENE_DEFAULTS.nodeVerticalGapPixels;
        const actualDistance = currentNode.y - previousNode.y;

        if (actualDistance >= minimumDistance) {
            continue;
        }

        currentNode.y += minimumDistance - actualDistance;
    }
}

function createSceneBounds(rawNodes, edges) {
    const nodeBounds = createNodeBounds(rawNodes);
    const edgeBounds = createEdgeBounds(rawNodes, edges);
    const bounds = mergeBounds(nodeBounds, edgeBounds);

    return {
        ...bounds,
        height: Math.max(bounds.maxY - bounds.minY, 0),
        width: Math.max(bounds.maxX - bounds.minX, 0)
    };
}

function createNodeBounds(rawNodes) {
    const bounds = rawNodes.reduce((nextBounds, rawNode) => {
        const minX = rawNode.x - rawNode.radius;
        const maxX = rawNode.x + rawNode.radius;
        const minY = rawNode.y - rawNode.radius;
        const maxY = rawNode.y + rawNode.radius;

        return {
            maxRadius: Math.max(nextBounds.maxRadius, rawNode.radius),
            maxX: Math.max(nextBounds.maxX, maxX),
            maxY: Math.max(nextBounds.maxY, maxY),
            minX: Math.min(nextBounds.minX, minX),
            minY: Math.min(nextBounds.minY, minY)
        };
    }, {
        maxRadius: 0,
        maxX: Number.NEGATIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
        minX: Number.POSITIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY
    });

    return bounds;
}

function createEdgeBounds(rawNodes, edges = []) {
    const nodesByLevelId = new Map(
        rawNodes.map(rawNode => [rawNode.node.levelId, rawNode])
    );
    const initialBounds = createEmptyBounds();

    return edges.reduce((bounds, edge) => {
        const fromNode = nodesByLevelId.get(edge.fromLevelId);
        const toNode = nodesByLevelId.get(edge.toLevelId);
        if (!fromNode || !toNode) {
            return bounds;
        }

        const edgePathBounds = createEdgePathBounds(fromNode, toNode);
        return mergeBounds(bounds, edgePathBounds);
    }, initialBounds);
}

function createEdgePathBounds(fromNode, toNode) {
    const deltaX = toNode.x - fromNode.x;
    const deltaY = toNode.y - fromNode.y;
    const distance = Math.max(Math.hypot(deltaX, deltaY), 1);
    const unitX = deltaX / distance;
    const unitY = deltaY / distance;
    const inset = Math.min(fromNode.radius, toNode.radius) * 0.18;
    const start = {
        x: fromNode.x + (unitX * (fromNode.radius - inset)),
        y: fromNode.y + (unitY * (fromNode.radius - inset))
    };
    const end = {
        x: toNode.x - (unitX * (toNode.radius - inset)),
        y: toNode.y - (unitY * (toNode.radius - inset))
    };
    const controlPoints = createEdgeControlPoints(start, end);
    const points = [start, end, ...controlPoints];
    const padding = MENU_SCENE_DEFAULTS.edgeFitPaddingPixels;

    return points.reduce((bounds, point) => ({
        maxRadius: bounds.maxRadius,
        maxX: Math.max(bounds.maxX, point.x + padding),
        maxY: Math.max(bounds.maxY, point.y + padding),
        minX: Math.min(bounds.minX, point.x - padding),
        minY: Math.min(bounds.minY, point.y - padding)
    }), createEmptyBounds());
}

function createEdgeControlPoints(start, end) {
    const verticalDistance = end.y - start.y;
    const horizontalDistance = end.x - start.x;
    const controlLift = Math.max(
        Math.abs(verticalDistance) * 0.36,
        Math.min(MENU_SCENE_DEFAULTS.nodeSizePixels.lg, Math.abs(horizontalDistance) || 1) * 0.24
    );
    const shallowCurveThreshold = Math.max(MENU_SCENE_DEFAULTS.nodeSizePixels.sm * 0.5, 1);
    const shallowCurveLift = Math.max(
        MENU_SCENE_DEFAULTS.nodeSizePixels.sm * 0.26,
        Math.abs(horizontalDistance) * 0.12
    );

    if (Math.abs(verticalDistance) < shallowCurveThreshold) {
        const controlX1 = start.x + (horizontalDistance * 0.3);
        const controlX2 = end.x - (horizontalDistance * 0.3);
        const controlY = end.y >= start.y
            ? Math.max(start.y, end.y) + shallowCurveLift
            : Math.min(start.y, end.y) - shallowCurveLift;
        return [
            { x: controlX1, y: controlY },
            { x: controlX2, y: controlY }
        ];
    }

    return [
        { x: start.x, y: start.y + controlLift },
        { x: end.x, y: end.y - controlLift }
    ];
}

function createEmptyBounds() {
    return {
        maxRadius: 0,
        maxX: Number.NEGATIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
        minX: Number.POSITIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY
    };
}

function mergeBounds(firstBounds, secondBounds) {
    if (!Number.isFinite(secondBounds.minX) || !Number.isFinite(secondBounds.maxX)) {
        return firstBounds;
    }

    if (!Number.isFinite(firstBounds.minX) || !Number.isFinite(firstBounds.maxX)) {
        return secondBounds;
    }

    return {
        maxRadius: Math.max(firstBounds.maxRadius, secondBounds.maxRadius),
        maxX: Math.max(firstBounds.maxX, secondBounds.maxX),
        maxY: Math.max(firstBounds.maxY, secondBounds.maxY),
        minX: Math.min(firstBounds.minX, secondBounds.minX),
        minY: Math.min(firstBounds.minY, secondBounds.minY)
    };
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
