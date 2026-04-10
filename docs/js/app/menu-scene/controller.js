import { MenuSceneSheetBuilder } from "./builders.js";
import { createMenuSceneLayoutRuntime } from "./layout-runtime.js";
import {
    createMenuSceneNodeBindings,
    createMenuSceneNodeSchema,
    createMenuScenePlaceholderSchema
} from "./node-schema.js";
import { createMenuSceneViewport } from "./view.js";
import { createSceneUiFactory } from "../scene-ui/factory.js";
import { compileSceneSchema, resolveSceneSchema } from "../scene-ui/schema.js";
import { SCENE_ACTION_IDS, createPreviewLevelIntroActionId } from "../contracts/action-ids.js";
import { createSceneRuntimePart } from "../scene-runtime/factory.js";
import { SCENE_RUNTIME_PART_KIND } from "../scene-runtime/contracts.js";

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
    const factory = createSceneUiFactory();
    const viewport = createSceneRuntimePart({
        kind: SCENE_RUNTIME_PART_KIND.viewport,
        context: {
            edgeLayerElement: refs.menuLevelLines,
            nodeLayerElement: refs.menuLevelMap,
            viewportElement: refs.menuSceneViewport
        },
        factory: createMenuSceneViewport
    });
    let resizeObserver = null;
    let syncFrame = null;
    let currentSheet = null;
    const layoutRuntime = createMenuSceneLayoutRuntime({
        refs,
        scheduleSync,
        viewport
    });

    function bind() {
        layoutRuntime.bindWheelPan(() => currentSheet);
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
        layoutRuntime.sync(currentSheet);
    }

    function resetCamera() {
        layoutRuntime.resetCamera();
    }

    function bindResizeObserver() {
        if (resizeObserver) {
            return;
        }

        resizeObserver = viewport.observeResize(() => {
            scheduleSync();
        });
    }

    function createNodeElement(node) {
        const definition = sceneSchemaConfig?.node
            ? resolveSceneSchema(sceneSchemaConfig.node, createMenuSceneNodeBindings(node), createNodeActionRegistry(node))
            : createMenuSceneNodeSchema(node);

        return factory.createElement(
            compileSceneSchema(definition)
        );
    }

    function createNodeActionRegistry(node) {
        if (actionRegistry?.register && typeof actionRegistry.register === "function") {
            const actionId = createPreviewLevelIntroActionId(node.levelId);
            if (!actionRegistry.has?.(actionId)) {
                actionRegistry.register(actionId, () => {
                    onPreviewLevelIntro?.(node.theme, node.level, node.options);
                });
            }

            return {
                resolve(requestedActionId, args) {
                    if (requestedActionId === SCENE_ACTION_IDS.previewLevelIntro) {
                        return actionRegistry.resolve(actionId, args);
                    }

                    return actionRegistry.resolve(requestedActionId, args);
                }
            };
        }

        return {
            [SCENE_ACTION_IDS.previewLevelIntro]: () => {
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
            : createMenuScenePlaceholderSchema(placeholder);
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
