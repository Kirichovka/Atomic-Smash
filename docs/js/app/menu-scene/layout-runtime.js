import { MenuSceneCamera, MenuSceneSpace } from "./entities.js?v=20260512-menu-pan-zoom-spacing";
import { getMenuStageOverflow } from "./methods.js?v=20260509-menu-render-cache";
import { layoutMenuSceneNodes, renderMenuSceneEdges } from "./renderers.js?v=20260512-menu-pan-zoom-spacing";

export function createMenuSceneLayoutRuntime({
    refs,
    viewport,
    scheduleSync
}) {
    const camera = new MenuSceneCamera();
    const space = new MenuSceneSpace();
    const pointers = new Map();
    let dragState = null;
    let suppressNextClick = false;

    function sync(sheet) {
        if (!refs.menuLevelMap || !refs.menuLevelLines || !refs.menuSceneViewport || !sheet || sheet.placeholder) {
            return;
        }

        const mapRect = viewport.getRect();
        if (!mapRect?.width || !mapRect?.height) {
            return;
        }

        const overflowRatio = getMenuStageOverflow(refs.menuScreen);
        space.updateViewport({
            height: mapRect.height,
            overflowRatio,
            width: mapRect.width
        });
        space.updateLayout(sheet.nodes, sheet.edges);
        camera.setRange(space.getCameraRange());

        layoutMenuSceneNodes({
            camera,
            nodeLayerElement: refs.menuLevelMap,
            nodes: sheet.nodes,
            space
        });

        renderMenuSceneEdges({
            edgeLayerElement: refs.menuLevelLines,
            edges: sheet.edges,
            mapRect,
            nodeLayerElement: refs.menuLevelMap,
            viewport
        });
    }

    function panBy(deltaX, deltaY, sheet) {
        if (!sheet || sheet.placeholder) {
            return;
        }

        refreshCameraRange(sheet);
        camera.panBy(deltaX, deltaY);
        scheduleSync();
    }

    function zoomBy(deltaZoom, anchor, sheet) {
        if (!sheet || sheet.placeholder) {
            return;
        }

        refreshCameraRange(sheet);
        camera.zoomBy(deltaZoom, anchor);
        scheduleSync();
    }

    function bindWheelPan(getSheet) {
        if (!refs.menuStageFrame) {
            return;
        }

        refs.menuStageFrame.addEventListener("wheel", event => {
            const sheet = getSheet?.();
            if (!sheet || sheet.placeholder) {
                return;
            }

            const mapRect = viewport.getRect();
            if (!mapRect?.width || !mapRect?.height) {
                return;
            }

            event.preventDefault();
            if (event.ctrlKey || event.metaKey) {
                const anchor = {
                    x: event.clientX - mapRect.left,
                    y: event.clientY - mapRect.top
                };
                zoomBy(-event.deltaY * 0.004, anchor, sheet);
                return;
            }

            panBy(event.deltaX, event.deltaY, sheet);
        }, { passive: false });

        refs.menuStageFrame.addEventListener("pointerdown", event => {
            const sheet = getSheet?.();
            if (!sheet || sheet.placeholder || event.button !== 0) {
                return;
            }

            pointers.set(event.pointerId, createPointerSnapshot(event));
            if (pointers.size === 1) {
                dragState = {
                    lastX: event.clientX,
                    lastY: event.clientY,
                    moved: false,
                    pointerId: event.pointerId,
                    startX: event.clientX,
                    startY: event.clientY
                };
            }

            refs.menuStageFrame.setPointerCapture?.(event.pointerId);
        });

        refs.menuStageFrame.addEventListener("pointermove", event => {
            const sheet = getSheet?.();
            if (!sheet || sheet.placeholder || !pointers.has(event.pointerId)) {
                return;
            }

            const previousPointers = new Map(pointers);
            pointers.set(event.pointerId, createPointerSnapshot(event));

            if (pointers.size >= 2) {
                event.preventDefault();
                handlePinch(previousPointers, sheet);
                suppressNextClick = true;
                return;
            }

            if (!dragState || dragState.pointerId !== event.pointerId) {
                return;
            }

            const deltaX = dragState.lastX - event.clientX;
            const deltaY = dragState.lastY - event.clientY;
            const movedDistance = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY);
            dragState.lastX = event.clientX;
            dragState.lastY = event.clientY;

            if (movedDistance > 6) {
                dragState.moved = true;
                suppressNextClick = true;
            }

            if (dragState.moved) {
                event.preventDefault();
                panBy(deltaX, deltaY, sheet);
            }
        }, { passive: false });

        refs.menuStageFrame.addEventListener("pointerup", event => {
            pointers.delete(event.pointerId);
            if (dragState?.pointerId === event.pointerId) {
                dragState = null;
            }
            refs.menuStageFrame.releasePointerCapture?.(event.pointerId);
        });

        refs.menuStageFrame.addEventListener("pointercancel", event => {
            pointers.delete(event.pointerId);
            if (dragState?.pointerId === event.pointerId) {
                dragState = null;
            }
        });

        refs.menuStageFrame.addEventListener("click", event => {
            if (!suppressNextClick) {
                return;
            }

            suppressNextClick = false;
            event.preventDefault();
            event.stopPropagation();
        }, true);
    }

    function resetCamera() {
        camera.reset();
    }

    function refreshCameraRange(sheet) {
        const mapRect = viewport.getRect();
        if (!mapRect?.width || !mapRect?.height) {
            return;
        }

        const overflowRatio = getMenuStageOverflow(refs.menuScreen);
        space.updateViewport({
            height: mapRect.height,
            overflowRatio,
            width: mapRect.width
        });
        space.updateLayout(sheet.nodes, sheet.edges);
        camera.setRange(space.getCameraRange());
    }

    function handlePinch(previousPointers, sheet) {
        const previousPair = getPointerPair(previousPointers);
        const nextPair = getPointerPair(pointers);
        if (!previousPair || !nextPair) {
            return;
        }

        const mapRect = viewport.getRect();
        if (!mapRect?.width || !mapRect?.height) {
            return;
        }

        const previousDistance = getPointerDistance(previousPair);
        const nextDistance = getPointerDistance(nextPair);
        if (previousDistance <= 0) {
            return;
        }

        const previousCenter = getPointerCenter(previousPair);
        const nextCenter = getPointerCenter(nextPair);
        panBy(previousCenter.x - nextCenter.x, previousCenter.y - nextCenter.y, sheet);
        zoomBy((nextDistance / previousDistance - 1) * camera.getZoom(), {
            x: nextCenter.x - mapRect.left,
            y: nextCenter.y - mapRect.top
        }, sheet);
    }

    return {
        bindWheelPan,
        resetCamera,
        sync
    };
}

function createPointerSnapshot(event) {
    return {
        clientX: event.clientX,
        clientY: event.clientY,
        pointerId: event.pointerId
    };
}

function getPointerPair(pointerMap) {
    const values = [...pointerMap.values()];
    if (values.length < 2) {
        return null;
    }

    return [values[0], values[1]];
}

function getPointerDistance([firstPointer, secondPointer]) {
    return Math.hypot(
        secondPointer.clientX - firstPointer.clientX,
        secondPointer.clientY - firstPointer.clientY
    );
}

function getPointerCenter([firstPointer, secondPointer]) {
    return {
        x: (firstPointer.clientX + secondPointer.clientX) / 2,
        y: (firstPointer.clientY + secondPointer.clientY) / 2
    };
}
