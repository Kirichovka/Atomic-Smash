import { MenuSceneCamera, MenuSceneSpace } from "./entities.js?v=20260509-menu-render-cache";
import { getMenuStageOverflow } from "./methods.js?v=20260509-menu-render-cache";
import { layoutMenuSceneNodes, renderMenuSceneEdges } from "./renderers.js?v=20260509-menu-render-cache";

export function createMenuSceneLayoutRuntime({
    refs,
    viewport,
    scheduleSync
}) {
    const camera = new MenuSceneCamera();
    const space = new MenuSceneSpace();

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
        camera.setRange(space.getOverflowRatio());

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

    function panBy(deltaY, sheet) {
        if (!sheet || sheet.placeholder) {
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
        camera.setRange(space.getOverflowRatio());
        if (camera.maxOffsetRatio <= 0) {
            return;
        }

        camera.panBy((deltaY / mapRect.height) * 100);
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

            const overflowRatio = getMenuStageOverflow(refs.menuScreen);
            space.updateViewport({
                height: mapRect.height,
                overflowRatio,
                width: mapRect.width
            });
            space.updateLayout(sheet.nodes, sheet.edges);
            camera.setRange(space.getOverflowRatio());
            if (camera.maxOffsetRatio <= 0) {
                return;
            }

            event.preventDefault();
            panBy(event.deltaY, sheet);
        }, { passive: false });
    }

    function resetCamera() {
        camera.reset();
    }

    return {
        bindWheelPan,
        resetCamera,
        sync
    };
}
