import {
    loadGameData,
    loadHomeChromeSchemaConfig,
    loadHotkeysConfig,
    loadLevelBriefsConfig,
    loadMenuMapConfig,
    loadMenuSceneSchemaConfig
} from "./data.js?v=20260409-scene-schema";
import { createEventBus } from "./app/event-bus.js";
import { createRefs } from "./app/refs.js";
import { createGameRuntime } from "./app/game-runtime/runtime.js";
import { loadStoredState } from "./app/storage.js";
import { createState, hydrateState } from "./app/state.js";

export async function initGame() {
    const [
        gameData,
        hotkeysConfig,
        menuMapConfig,
        levelBriefsConfig,
        homeChromeSchemaConfig,
        menuSceneSchemaConfig
    ] = await Promise.all([
        loadGameData(),
        loadHotkeysConfig(),
        loadMenuMapConfig(),
        loadLevelBriefsConfig(),
        loadHomeChromeSchemaConfig(),
        loadMenuSceneSchemaConfig()
    ]);

    const refs = createRefs();
    const currentPage = document.body.dataset.page ?? "menu";
    const state = createState(gameData);
    const bus = createEventBus();

    hydrateState(state, loadStoredState());
    state.ui.activeScreen = currentPage;

    const runtime = createGameRuntime({
        refs,
        state,
        bus,
        currentPage,
        homeChromeSchemaConfig,
        hotkeysConfig,
        levelBriefsConfig,
        menuMapConfig,
        menuSceneSchemaConfig
    });

    runtime.init();
}
