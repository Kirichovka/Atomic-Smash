import {
    loadBoardRuntimeSchemaConfig,
    loadGameData,
    loadGameShellRuntimeSchemaConfig,
    loadHomeChromeSchemaConfig,
    loadHotkeysConfig,
    loadLevelBriefsConfig,
    loadMenuMapConfig,
    loadMenuSceneSchemaConfig,
    loadMixZoneContextRuntimeSchemaConfig,
    loadModalRuntimeSchemaConfig,
    loadNavigationRuntimeSchemaConfig,
    loadPaletteRuntimeSchemaConfig,
    loadProgressionRuntimeSchemaConfig,
    loadScreenRuntimeSchemaConfig
} from "./data.js?v=20260409-scene-schema";
import { createGameShellRuntimeContentBuilder } from "./app/game-shell-runtime/bootstrap.js";
import { createRuntimeContentBuilder } from "./app/runtime-content/factory.js";
import { RUNTIME_CONTENT_BUILDER_KIND } from "./app/runtime-content/contracts.js";
import { createEventBus } from "./app/event-bus.js";
import { createRefs } from "./app/refs.js";
import { createGameRuntime } from "./app/game-runtime/runtime.js";
import { loadStoredState } from "./app/storage.js";
import { createState, hydrateState } from "./app/state.js";

export async function initGame() {
    const [
        gameData,
        boardRuntimeSchemaConfig,
        hotkeysConfig,
        menuMapConfig,
        levelBriefsConfig,
        homeChromeSchemaConfig,
        gameShellRuntimeSchemaConfig,
        menuSceneSchemaConfig,
        mixZoneContextRuntimeSchemaConfig,
        modalRuntimeSchemaConfig,
        navigationRuntimeSchemaConfig,
        paletteRuntimeSchemaConfig,
        progressionRuntimeSchemaConfig,
        screenRuntimeSchemaConfig
    ] = await Promise.all([
        loadGameData(),
        loadBoardRuntimeSchemaConfig(),
        loadHotkeysConfig(),
        loadMenuMapConfig(),
        loadLevelBriefsConfig(),
        loadHomeChromeSchemaConfig(),
        loadGameShellRuntimeSchemaConfig(),
        loadMenuSceneSchemaConfig(),
        loadMixZoneContextRuntimeSchemaConfig(),
        loadModalRuntimeSchemaConfig(),
        loadNavigationRuntimeSchemaConfig(),
        loadPaletteRuntimeSchemaConfig(),
        loadProgressionRuntimeSchemaConfig(),
        loadScreenRuntimeSchemaConfig()
    ]);

    const currentPage = document.body.dataset.page ?? "menu";
    const gameShellContentBuilder = createRuntimeContentBuilder({
        kind: RUNTIME_CONTENT_BUILDER_KIND.gameShell,
        factory: createGameShellRuntimeContentBuilder
    });
    gameShellContentBuilder.renderGameShellBootstrap({
        schemaConfig: gameShellRuntimeSchemaConfig
    });
    const refs = createRefs();
    const state = createState(gameData);
    const bus = createEventBus();

    hydrateState(state, loadStoredState());
    state.ui.activeScreen = currentPage;

    const runtime = createGameRuntime({
        refs,
        state,
        bus,
        boardRuntimeSchemaConfig,
        currentPage,
        gameShellRuntimeSchemaConfig,
        homeChromeSchemaConfig,
        hotkeysConfig,
        levelBriefsConfig,
        menuMapConfig,
        menuSceneSchemaConfig,
        mixZoneContextRuntimeSchemaConfig,
        modalRuntimeSchemaConfig,
        navigationRuntimeSchemaConfig,
        paletteRuntimeSchemaConfig,
        progressionRuntimeSchemaConfig,
        screenRuntimeSchemaConfig
    });

    runtime.init();
}
