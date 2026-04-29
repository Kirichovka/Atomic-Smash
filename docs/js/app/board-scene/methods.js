function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function clampLocalCoordinate(value) {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return clamp(value, 0, 1);
}

export function clampBoardNodePosition(space, x, y) {
    const maxOffsets = space.getMaxOffsets();

    return {
        x: clamp(x, 0, maxOffsets.x),
        y: clamp(y, 0, maxOffsets.y)
    };
}

export function boardPixelToLocal(space, x, y) {
    const maxOffsets = space.getMaxOffsets();

    return {
        localX: maxOffsets.x > 0 ? x / maxOffsets.x : 0,
        localY: maxOffsets.y > 0 ? y / maxOffsets.y : 0
    };
}

export function boardLocalToPixel(space, localX, localY) {
    const maxOffsets = space.getMaxOffsets();

    return clampBoardNodePosition(
        space,
        maxOffsets.x * clampLocalCoordinate(localX),
        maxOffsets.y * clampLocalCoordinate(localY)
    );
}

export function isBoardNodeOutsideViewport(space, x, y) {
    const { height, width } = space.getBounds();
    const { height: nodeHeight, width: nodeWidth } = space.getNodeMetrics();

    return (
        x < 0 ||
        y < 0 ||
        x + nodeWidth > width ||
        y + nodeHeight > height
    );
}

export function createBoardSpawnPosition(space, index, offsets = []) {
    const { height, width } = space.getBounds();
    const { height: nodeHeight, width: nodeWidth } = space.getNodeMetrics();
    const centerX = (width / 2) - (nodeWidth / 2);
    const centerY = (height / 2) - (nodeHeight / 2);
    const offset = offsets[index % offsets.length] ?? { x: 0, y: 0 };
    const ring = Math.floor(index / Math.max(offsets.length, 1));

    return {
        x: centerX + offset.x + (ring * 14),
        y: centerY + offset.y + (ring * 12)
    };
}

export function getBoardNodeMetrics(mixZone, defaultMetrics) {
    if (!(mixZone instanceof Element)) {
        return defaultMetrics;
    }

    const styles = window.getComputedStyle(mixZone);
    const width = Number.parseFloat(styles.getPropertyValue("--mix-node-width"));
    const height = Number.parseFloat(styles.getPropertyValue("--mix-node-height"));

    return {
        height: Number.isFinite(height) ? height : defaultMetrics.height,
        width: Number.isFinite(width) ? width : defaultMetrics.width
    };
}

export function clampBoardLocalCoordinate(value) {
    return clampLocalCoordinate(value);
}
