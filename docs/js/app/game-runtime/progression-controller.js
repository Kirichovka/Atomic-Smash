import {
    getCompoundById,
    getActiveMechanicId,
    getCompletedCountForTheme,
    getCurrentLevel,
    getCurrentTheme,
    getLevelsForTheme,
    getMechanicById
} from "../state.js";
import { createProgressionRuntimeContentBuilder } from "../progression-runtime/content-builders.js";
import { createRuntimeContentBuilder } from "../runtime-content/factory.js";
import { RUNTIME_CONTENT_BUILDER_KIND } from "../runtime-content/contracts.js";

const BASIC_TUTORIAL_THEME_ID = "basic";
const BASIC_TUTORIAL_FIRST_LEVEL_ID = "level-1";

export function createProgressionController({
    refs,
    state,
    mechanicsRegistry,
    navigationController,
    paletteController,
    modalController,
    schemaConfig,
    getActiveMechanic,
    onPersistState,
    onTutorialLevelCompleted,
    onTutorialReset,
    onTutorialSync
}) {
    const progressionContentBuilder = createRuntimeContentBuilder({
        kind: RUNTIME_CONTENT_BUILDER_KIND.progression,
        factory: createProgressionRuntimeContentBuilder
    });
    function refreshAllViews() {
        mechanicsRegistry.syncActiveMechanic(getActiveMechanicId(state), {
            reason: "refresh-all-views"
        });
        navigationController.renderMenu();
        navigationController.renderThemeList();
        navigationController.renderJournal();
        paletteController.render();
        renderCurrentLevel();
        renderDiscoveredCompounds();
        getActiveMechanic().sync();
        onTutorialSync?.();
    }

    function refreshMetaViews() {
        navigationController.renderMenu();
        navigationController.renderThemeList();
        navigationController.renderJournal();
    }

    function openThemeSelection() {
        openMainMenu();
    }

    function openJournalScreen() {
        mechanicsRegistry.deactivateActiveMechanic({
            reason: "open-journal-screen"
        });
        navigationController.renderJournal();
        navigationController.showJournalScreen();
    }

    function openMainMenu() {
        mechanicsRegistry.deactivateActiveMechanic({
            reason: "open-main-menu"
        });
        navigationController.renderMenu();
        navigationController.showMenuScreen();
    }

    function resumeCurrentTheme() {
        if (!getCurrentTheme(state)) {
            openMainMenu();
            return;
        }

        mechanicsRegistry.syncActiveMechanic(getActiveMechanicId(state), {
            reason: "resume-current-theme"
        });
        renderCurrentLevel();
        paletteController.render();
        renderDiscoveredCompounds();
        navigationController.showGameScreen();
        getActiveMechanic().sync();
        onPersistState?.();
        onTutorialSync?.();
    }

    function startTheme(themeId) {
        if (!state.catalog.themes.some(theme => theme.id === themeId)) {
            return;
        }

        state.progress.currentThemeId = themeId;
        state.ui.menuViewedThemeId = themeId;
        mechanicsRegistry.resetAll();
        state.progress.failedAttempts = 0;
        if (refs.result) {
            refs.result.textContent = "";
        }

        refreshMetaViews();
        paletteController.render();
        renderCurrentLevel();
        onPersistState?.();
        mechanicsRegistry.syncActiveMechanic(getActiveMechanicId(state), {
            reason: "start-theme",
            themeId
        });
        navigationController.showGameScreen();
        onTutorialReset?.();
        onTutorialSync?.();
    }

    function addDiscoveredCompound(compound) {
        const isNewDiscovery = !state.progress.discoveredCompounds.has(compound.id);
        state.progress.discoveredCompounds.add(compound.id);

        if (isNewDiscovery) {
            state.progress.discoveryHistory.push(compound.id);
        }

        navigationController.renderMenu();
        renderDiscoveredCompounds();
        navigationController.renderJournal();

        if (isNewDiscovery) {
            modalController.openCompoundModal(compound);
        }
    }

    function renderDiscoveredCompounds() {
        const compounds = state.progress.discoveryHistory
            .map(compoundId => getCompoundById(state, compoundId))
            .filter(Boolean);

        progressionContentBuilder.renderDiscoveredCompoundCards({
            compounds,
            container: refs.compoundList,
            onOpenCompoundModal: compound => modalController.openCompoundModal(compound),
            schemaConfig
        });
    }

    function renderCurrentLevel() {
        if (!refs.levelIndicator || !refs.task || !refs.hint) {
            return;
        }

        const theme = getCurrentTheme(state);

        if (!theme) {
            refs.levelIndicator.textContent = "Choose a theme";
            refs.task.textContent = "Select a theme to start its chemistry tasks.";
            refs.hint.textContent = "Each theme can point to its own mechanic or mini-game.";
            return;
        }

        const themeLevels = getLevelsForTheme(state, theme.id);
        const currentLevel = getCurrentLevel(state);

        if (!currentLevel) {
            refs.levelIndicator.textContent =
                `${theme.name} | ${getCompletedCountForTheme(state, theme.id)}/${themeLevels.length} complete`;
            refs.task.textContent = `${theme.name} theme complete`;
            refs.hint.textContent = "Open Themes to choose another theme or keep experimenting with the elements you have already unlocked.";
            return;
        }

        const currentIndex = themeLevels.findIndex(level => level.id === currentLevel.id);
        const targetCompound = getCompoundById(state, currentLevel.targetCompoundId);
        const mechanic = getMechanicById(state, currentLevel.mechanicId);
        refs.levelIndicator.textContent = `${theme.name} | Task ${currentIndex + 1} of ${themeLevels.length}`;
        refs.task.textContent = currentLevel.displayTitle ?? currentLevel.objective;
        refs.hint.textContent =
            `${mechanic?.name ?? "Mechanic"} | ` +
            `${currentLevel.learningFocus ?? targetCompound?.formula ?? currentLevel.hint ?? "No target formula"}`;
    }

    function handleLevelComplete(compound) {
        const currentLevel = getCurrentLevel(state);
        const currentTheme = getCurrentTheme(state);

        if (!currentLevel || !currentTheme) {
            return;
        }

        const themeLevels = getLevelsForTheme(state, currentTheme.id);
        const completedLevelNumber = themeLevels.findIndex(level => level.id === currentLevel.id) + 1;
        const hadRemainingThemeLevels = themeLevels.some(level =>
            level.id !== currentLevel.id && !state.progress.completedLevelIds.has(level.id)
        );

        state.progress.failedAttempts = 0;
        state.progress.completedLevelIds.add(currentLevel.id);
        mechanicsRegistry.resetAll();

        if (currentTheme.id === BASIC_TUTORIAL_THEME_ID && currentLevel.id === BASIC_TUTORIAL_FIRST_LEVEL_ID) {
            onTutorialLevelCompleted?.("after-mix");
        }

        if (hadRemainingThemeLevels) {
            mechanicsRegistry.syncActiveMechanic(getActiveMechanicId(state), {
                reason: "advance-level",
                themeId: currentTheme.id
            });
            refreshMetaViews();
            paletteController.render();
            renderCurrentLevel();
            if (refs.result) {
                refs.result.textContent =
                    `${currentTheme.name} task ${completedLevelNumber} complete! ` +
                    `You built ${compound.formula} (${compound.name}).`;
            }
            onTutorialSync?.();
            return;
        }

        state.progress.currentThemeId = null;
        mechanicsRegistry.syncActiveMechanic(getActiveMechanicId(state), {
            reason: "theme-complete",
            themeId: currentTheme.id
        });
        refreshMetaViews();
        paletteController.render();
        renderCurrentLevel();
        if (refs.result) {
            refs.result.textContent = "";
        }
        modalController.closeCompoundModal();
        modalController.openThemeCompleteModal(currentTheme);
        onTutorialSync?.();
    }

    return {
        addDiscoveredCompound,
        handleLevelComplete,
        openJournalScreen,
        openMainMenu,
        openThemeSelection,
        refreshAllViews,
        refreshMetaViews,
        renderCurrentLevel,
        resumeCurrentTheme,
        startTheme
    };
}
