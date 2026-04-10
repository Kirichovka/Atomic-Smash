import { BoardSceneSpace } from "./entities.js";
import {
    boardLocalToPixel,
    boardPixelToLocal,
    clampBoardNodePosition,
    createBoardSpawnPosition,
    getBoardNodeMetrics,
    isBoardNodeOutsideViewport
} from "./methods.js";

export function createBoardSceneController({
    defaultNodeHeight,
    defaultNodeWidth,
    offsets = [],
    viewportElement
}) {
    const space = new BoardSceneSpace({
        defaultNodeHeight,
        defaultNodeWidth
    });

    function sync() {
        const nodeMetrics = getBoardNodeMetrics(viewportElement, {
            height: defaultNodeHeight,
            width: defaultNodeWidth
        });
        space.updateViewport({
            height: viewportElement?.clientHeight ?? 0,
            width: viewportElement?.clientWidth ?? 0
        });
        space.updateNodeMetrics(nodeMetrics);
        return space;
    }

    function getNodeMetrics() {
        sync();
        return space.getNodeMetrics();
    }

    function clampPosition(x, y) {
        sync();
        return clampBoardNodePosition(space, x, y);
    }

    function toLocal(x, y) {
        sync();
        return boardPixelToLocal(space, x, y);
    }

    function toPixel(localX, localY) {
        sync();
        return boardLocalToPixel(space, localX, localY);
    }

    function isNodeOutside(x, y) {
        sync();
        return isBoardNodeOutsideViewport(space, x, y);
    }

    function createSpawnPosition(index) {
        sync();
        return createBoardSpawnPosition(space, index, offsets);
    }

    return {
        clampPosition,
        createSpawnPosition,
        getNodeMetrics,
        isNodeOutside,
        space,
        sync,
        toLocal,
        toPixel
    };
}
