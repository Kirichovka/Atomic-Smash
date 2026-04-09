import { MenuSceneCamera, MenuSceneSpace } from "./entities.js";
import { MenuSceneSheetBuilder } from "./builders.js";
import { getMenuStageOverflow, projectNodeToViewport, createSceneEdgePath } from "./methods.js";
import { MenuSceneViewport } from "./view.js";
import { createSceneUiFactory } from "../scene-ui/factory.js";
import { compileSceneSchema, resolveSceneSchema, sceneButton, sceneContainer, sceneText } from "../scene-ui/schema.js";

export function createMenuSceneController({
    refs,
    state,
    menuMapConfig,
    sceneSchemaConfig,
    actionRegistry,
    levelBriefsConfig,
    onPreviewLevelIntro
}) {
    const builder = new MenuSceneSheetBuilder({
        levelBriefsConfig,
        state
    });
    const camera = new MenuSceneCamera();
    const factory = createSceneUiFactory();
    const space = new MenuSceneSpace();
    const viewport = new MenuSceneViewport({
        edgeLayerElement: refs.menuLevelLines,
        nodeLayerElement: refs.menuLevelMap,
        viewportElement: refs.menuSceneViewport
    });
    let resizeObserver = null;
    let syncFrame = null;
    let currentSheet = null;

    function bind() {
        bindWheelPan();
        bindResizeObserver();
    }

    function render({ currentLevel, levels, theme }) {
        if (!refs.menuLevelMap || !refs.menuLevelLines || !refs.menuSceneViewport) {
            return;
        }

        const themeMap = theme ? menuMapConfig?.themes?.[theme.id] : null;
        currentSheet = builder.build({
            currentLevel,
            levels,
            theme,
            themeMap
        });

        viewport.clear();

        if (!theme) {
            return;
        }

        if (currentSheet.placeholder) {
            renderPlaceholder(currentSheet.placeholder);
            return;
        }

        currentSheet.nodes.forEach(node => {
            viewport.renderNode(createNodeElement(node));
        });

        scheduleSync();
    }

    function scheduleSync() {
        if (syncFrame !== null) {
            cancelAnimationFrame(syncFrame);
        }

        syncFrame = requestAnimationFrame(() => {
            syncFrame = null;
            sync();
        });
    }

    function sync() {
        if (!refs.menuLevelMap || !refs.menuLevelLines || !refs.menuSceneViewport || !currentSheet || currentSheet.placeholder) {
            return;
        }

        const mapRect = viewport.getRect();
        if (!mapRect.width || !mapRect.height) {
            return;
        }

        const overflowRatio = getMenuStageOverflow(refs.menuScreen);
        space.updateViewport({
            height: mapRect.height,
            overflowRatio,
            width: mapRect.width
        });
        camera.setRange(overflowRatio);

        layoutNodes();
        drawEdges(mapRect);
    }

    function panBy(deltaY) {
        if (!currentSheet || currentSheet.placeholder) {
            return;
        }

        const overflowRatio = getMenuStageOverflow(refs.menuScreen);
        const mapRect = viewport.getRect();
        if (overflowRatio <= 0 || !mapRect?.height) {
            return;
        }

        camera.setRange(overflowRatio);
        camera.panBy((deltaY / mapRect.height) * 100);
        scheduleSync();
    }

    function resetCamera() {
        camera.reset();
    }

    function bindWheelPan() {
        if (!refs.menuStageFrame) {
            return;
        }

        refs.menuStageFrame.addEventListener("wheel", event => {
            if (!currentSheet || currentSheet.placeholder) {
                return;
            }

            const overflowRatio = getMenuStageOverflow(refs.menuScreen);
            if (overflowRatio <= 0) {
                return;
            }

            event.preventDefault();
            panBy(event.deltaY);
        }, { passive: false });
    }

    function bindResizeObserver() {
        if (resizeObserver) {
            return;
        }

        resizeObserver = viewport.observeResize(() => {
            scheduleSync();
        });
    }

    function layoutNodes() {
        currentSheet.nodes.forEach(node => {
            const element = refs.menuLevelMap.querySelector(`[data-level-id="${node.levelId}"]`);
            if (!element) {
                return;
            }

            const projected = projectNodeToViewport(space, camera, node);
            const nodeWidthPercent = space.getNodeWidthPercent(node.size);
            element.style.left = `${projected.xPercent}%`;
            element.style.top = `${projected.yPercent}%`;
            element.style.width = `${nodeWidthPercent}%`;
        });
    }

    function drawEdges(mapRect) {
        refs.menuLevelLines.replaceChildren();
        viewport.setEdgeViewBox(mapRect.width, mapRect.height);

        currentSheet.edges.forEach(edge => {
            const fromNodeElement = refs.menuLevelMap.querySelector(`[data-level-id="${edge.fromLevelId}"]`);
            const toNodeElement = refs.menuLevelMap.querySelector(`[data-level-id="${edge.toLevelId}"]`);
            if (!fromNodeElement || !toNodeElement) {
                return;
            }

            const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
            line.setAttribute("d", createSceneEdgePath(fromNodeElement, toNodeElement, mapRect));
            refs.menuLevelLines.appendChild(line);
        });
    }

    function createNodeElement(node) {
        const definition = sceneSchemaConfig?.node
            ? resolveSceneSchema(sceneSchemaConfig.node, createNodeBindings(node), createNodeActionRegistry(node))
            : createNodeSchema(node);

        return factory.createElement(
            compileSceneSchema(definition)
        );
    }

    function createNodeActionRegistry(node) {
        if (actionRegistry?.register && typeof actionRegistry.register === "function") {
            const actionId = `previewLevelIntro:${node.levelId}`;
            if (!actionRegistry.has?.(actionId)) {
                actionRegistry.register(actionId, () => {
                    onPreviewLevelIntro?.(node.theme, node.level, node.options);
                });
            }

            return {
                resolve(requestedActionId, args) {
                    if (requestedActionId === "previewLevelIntro") {
                        return actionRegistry.resolve(actionId, args);
                    }

                    return actionRegistry.resolve(requestedActionId, args);
                }
            };
        }

        return {
            previewLevelIntro: () => {
                onPreviewLevelIntro?.(node.theme, node.level, node.options);
            }
        };
    }

    function renderPlaceholder(placeholder) {
        const definition = sceneSchemaConfig?.placeholder
            ? resolveSceneSchema(sceneSchemaConfig.placeholder, {
                body: placeholder.body,
                kicker: placeholder.kicker,
                meta: placeholder.meta,
                title: placeholder.title
            })
            : createPlaceholderSchema(placeholder);
        viewport.renderNode(
            factory.createElement(
                compileSceneSchema(definition)
            )
        );
    }

    return {
        bind,
        render,
        resetCamera,
        sync
    };
}

function resolveLevelNumber(levelId) {
    const match = /^level-(\d+)$/.exec(levelId);
    return match ? match[1] : levelId;
}

function createNodeSchema(node) {
    return sceneButton({
        classNames: [
            "home-level-node",
            `level-size-${node.size}`,
            `level-status-${node.status}`
        ],
        data: {
            levelId: node.levelId
        },
        attrs: {
            disabled: !node.isUnlocked
        },
        on: {
            click: {
                action: "previewLevelIntro"
            }
        },
        children: [
            sceneText({
                className: "home-level-index",
                text: `Level ${node.level.levelNumber ?? resolveLevelNumber(node.levelId)}`
            }),
            sceneText({
                className: "home-level-formula",
                text: node.title
            }),
            sceneText({
                className: "home-level-objective",
                text: node.subtitle
            })
        ]
    });
}

function createNodeBindings(node) {
    return {
        disabled: !node.isUnlocked,
        isUnlocked: node.isUnlocked,
        level: {
            id: node.levelId,
            index: `Level ${node.level.levelNumber ?? resolveLevelNumber(node.levelId)}`
        },
        node: {
            sizeClass: `level-size-${node.size}`,
            statusClass: `level-status-${node.status}`,
            title: node.title,
            subtitle: node.subtitle
        }
    };
}

function createPlaceholderSchema(placeholder) {
    return sceneContainer({
        className: "home-sheet-placeholder",
        children: [
            sceneText({
                className: "home-sheet-placeholder-kicker",
                tagName: "div",
                text: placeholder.kicker
            }),
            sceneText({
                className: "home-sheet-placeholder-title",
                tagName: "div",
                text: placeholder.title
            }),
            sceneText({
                className: "home-sheet-placeholder-body",
                tagName: "div",
                text: placeholder.body
            }),
            sceneText({
                className: "home-sheet-placeholder-meta",
                tagName: "div",
                text: placeholder.meta
            })
        ]
    });
}
