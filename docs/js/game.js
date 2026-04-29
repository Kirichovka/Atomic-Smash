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
} from "./data.js?v=20260411-connection-revert";
import { createEventBus } from "./app/event-bus.js";
import { createGameShellRuntimeContentBuilder } from "./app/game-shell-runtime/bootstrap.js";
import { createGameRuntime } from "./app/game-runtime/runtime.js";
import { RUNTIME_CONTENT_BUILDER_KIND } from "./app/runtime-content/contracts.js";
import { createRuntimeContentBuilder } from "./app/runtime-content/factory.js";
import { createRefs } from "./app/refs.js";
import { clearStoredState, loadStoredState } from "./app/storage.js";
import { createState, getLevelsForTheme, hydrateState } from "./app/state.js";

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
    exposeDevConsoleApi({ runtime, state });
}

function exposeDevConsoleApi({ runtime, state }) {
    const gameplayController = runtime.gameplayController;

    function openTask(taskReference) {
        const level = resolveLevelReference(state, taskReference);
        if (!level) {
            console.warn("Atomic Smash: task not found.", taskReference);
            return null;
        }

        const themeLevels = getLevelsForTheme(state, level.themeId);
        const targetIndex = themeLevels.findIndex(themeLevel => themeLevel.id === level.id);
        if (targetIndex < 0) {
            return null;
        }

        state.progress.currentThemeId = level.themeId;
        state.ui.menuViewedThemeId = level.themeId;
        themeLevels.forEach((themeLevel, index) => {
            if (index < targetIndex) {
                state.progress.completedLevelIds.add(themeLevel.id);
                return;
            }

            state.progress.completedLevelIds.delete(themeLevel.id);
        });

        gameplayController.startTheme(level.themeId);
        return level.id;
    }

    function restartApp() {
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.set("reload", Date.now().toString());
        window.location.replace(nextUrl.toString());
    }

    function clearAppStateAndRestart() {
        clearStoredState();
        restartApp();
    }

    const api = {
        help() {
            return {
                clearAppStateAndRestart: "Clears saved local progress and reloads the current page.",
                openTask: "Open a task by id or number. Examples: openTask('level-1'), openTask(1), openTask('task1').",
                openTheme: "Open a theme by id. Example: openTheme('basic').",
                restartApp: "Reload the current page with a cache-busting query.",
                state
            };
        },
        openTask,
        openTheme: gameplayController.startTheme,
        restartApp,
        clearAppStateAndRestart,
        state
    };

    window.atomicSmash = api;
    window.openTask = openTask;
    window.openTheme = gameplayController.startTheme;
    window.restartApp = restartApp;
    window.clearAppStateAndRestart = clearAppStateAndRestart;
    window.cleanCacheAndRestart = clearAppStateAndRestart;
}

function resolveLevelReference(state, taskReference) {
    if (typeof taskReference === "number" && Number.isFinite(taskReference)) {
        return state.catalog.levels.find(level => level.levelNumber === taskReference)
            ?? state.catalog.levels.find(level => level.id === `level-${taskReference}`)
            ?? null;
    }

    if (typeof taskReference !== "string") {
        return null;
    }

    const trimmed = taskReference.trim().toLowerCase();
    if (!trimmed) {
        return null;
    }

    const directMatch = state.catalog.levels.find(level => level.id.toLowerCase() === trimmed);
    if (directMatch) {
        return directMatch;
    }

    const taskMatch = /^task[-\s]?(\d+)$/.exec(trimmed) ?? /^level[-\s]?(\d+)$/.exec(trimmed);
    if (!taskMatch) {
        return null;
    }

    const levelNumber = Number(taskMatch[1]);
    if (!Number.isFinite(levelNumber)) {
        return null;
    }

    return state.catalog.levels.find(level => level.levelNumber === levelNumber)
        ?? state.catalog.levels.find(level => level.id === `level-${levelNumber}`)
        ?? null;
}
