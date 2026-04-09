import { MENU_SCENE_DEFAULTS, MENU_SCENE_ENTITY_KIND } from "./contracts.js";

export class MenuSceneEntity {
    constructor({ id, kind }) {
        this.id = id;
        this.kind = kind;
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
}

export class MenuSceneSpace {
    constructor({
        overflowRatio = MENU_SCENE_DEFAULTS.overflowRatio
    } = {}) {
        this.height = 0;
        this.overflowRatio = overflowRatio;
        this.width = 0;
    }

    updateViewport({ height, overflowRatio = this.overflowRatio, width }) {
        this.width = Math.max(width, 0);
        this.height = Math.max(height, 0);
        this.overflowRatio = Math.max(overflowRatio, 0);
    }

    getVirtualHeightRatio() {
        return 100 + this.overflowRatio;
    }

    project(node, camera) {
        return {
            xPercent: node.x,
            yPercent: ((node.y / 100) * this.getVirtualHeightRatio()) - camera.offsetRatio
        };
    }

    getNodeWidthPercent(sizeKey) {
        const sizeRatio = MENU_SCENE_DEFAULTS.nodeSizeRatios[sizeKey] ?? MENU_SCENE_DEFAULTS.nodeSizeRatios.sm;
        const minSide = Math.max(Math.min(this.width, this.height), 1);
        return (minSide * (sizeRatio / 100) / Math.max(this.width, 1)) * 100;
    }
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
