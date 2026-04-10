import { BoardSceneEdge, BoardSceneNode } from "./entities.js";

class BoardSceneNodeBuilder {
    constructor() {
        this.config = {
            element: null,
            id: null,
            localX: 0,
            localY: 0,
            pixelX: 0,
            pixelY: 0,
            symbol: null
        };
    }

    id(value) {
        this.config.id = value;
        return this;
    }

    symbol(value) {
        this.config.symbol = value;
        return this;
    }

    localPosition(x, y) {
        this.config.localX = x;
        this.config.localY = y;
        return this;
    }

    pixelPosition(x, y) {
        this.config.pixelX = x;
        this.config.pixelY = y;
        return this;
    }

    element(value) {
        this.config.element = value;
        return this;
    }

    build() {
        return new BoardSceneNode(this.config);
    }
}

class BoardSceneEdgeBuilder {
    constructor() {
        this.config = {
            fromNodeId: null,
            fromPosition: null,
            id: null,
            line: null,
            toNodeId: null,
            toPosition: null
        };
    }

    id(value) {
        this.config.id = value;
        return this;
    }

    from(nodeId, position) {
        this.config.fromNodeId = nodeId;
        this.config.fromPosition = position;
        return this;
    }

    to(nodeId, position) {
        this.config.toNodeId = nodeId;
        this.config.toPosition = position;
        return this;
    }

    line(value) {
        this.config.line = value;
        return this;
    }

    build() {
        return new BoardSceneEdge(this.config);
    }
}

export function createBoardNodeEntityBuilder() {
    return new BoardSceneNodeBuilder();
}

export function createBoardEdgeEntityBuilder() {
    return new BoardSceneEdgeBuilder();
}
