import { SceneObject, SCENE_OBJECT_ROLE } from "../scene-object.js";
import { BOARD_SCENE_ENTITY_KIND } from "./contracts.js";

export class BoardSceneEntity extends SceneObject {
    constructor({
        id,
        kind,
        metadata = {}
    }) {
        super({
            id,
            kind,
            metadata,
            role: SCENE_OBJECT_ROLE.entity
        });
    }
}

export class BoardSceneNode extends BoardSceneEntity {
    constructor({ id, localX = 0, localY = 0, symbol }) {
        super({
            id,
            kind: BOARD_SCENE_ENTITY_KIND.node,
            metadata: {
                localX,
                localY,
                symbol
            }
        });
    }
}

export class BoardSceneEdge extends BoardSceneEntity {
    constructor({ id, fromNodeId, fromPosition, toNodeId, toPosition }) {
        super({
            id,
            kind: BOARD_SCENE_ENTITY_KIND.edge,
            metadata: {
                fromNodeId,
                fromPosition,
                toNodeId,
                toPosition
            }
        });
    }
}

export class BoardSceneSpace extends BoardSceneEntity {
    constructor({
        defaultNodeHeight,
        defaultNodeWidth
    }) {
        super({
            id: "board-scene-space",
            kind: BOARD_SCENE_ENTITY_KIND.space,
            metadata: {
                defaultNodeHeight,
                defaultNodeWidth,
                nodeHeight: defaultNodeHeight,
                nodeWidth: defaultNodeWidth,
                viewportHeight: 0,
                viewportWidth: 0
            }
        });
    }

    updateViewport({ height, width }) {
        this.metadata.viewportHeight = Math.max(Number(height) || 0, 0);
        this.metadata.viewportWidth = Math.max(Number(width) || 0, 0);
    }

    updateNodeMetrics({ height, width }) {
        this.metadata.nodeHeight = Number.isFinite(height) ? height : this.metadata.defaultNodeHeight;
        this.metadata.nodeWidth = Number.isFinite(width) ? width : this.metadata.defaultNodeWidth;
    }

    getNodeMetrics() {
        return {
            height: this.metadata.nodeHeight,
            width: this.metadata.nodeWidth
        };
    }

    getBounds() {
        return {
            height: this.metadata.viewportHeight,
            width: this.metadata.viewportWidth
        };
    }

    getMaxOffsets() {
        return {
            x: Math.max(this.metadata.viewportWidth - this.metadata.nodeWidth, 0),
            y: Math.max(this.metadata.viewportHeight - this.metadata.nodeHeight, 0)
        };
    }
}

