import {
    getCompoundById,
    getCompletedCountForTheme,
    getCurrentLevel,
    getCurrentTheme,
    getLevelsForTheme,
    getMechanicById
} from "../state.js";

const BASIC_TUTORIAL_THEME_ID = "basic";
const BASIC_TUTORIAL_FIRST_LEVEL_ID = "level-1";

export function createProgressionController({
    refs,
    state,
    mechanicsRegistry,
    navigationController,
    paletteController,
    modalController,
    getActiveMechanic,
    onPersistState,
    onTutorialLevelCompleted,
    onTutorialReset,
    onTutorialSync
}) {
    function refreshAllViews() {
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
        navigationController.renderJournal();
        navigationController.showJournalScreen();
    }

    function openMainMenu() {
        navigationController.renderMenu();
        navigationController.showMenuScreen();
    }

    function resumeCurrentTheme() {
        if (!getCurrentTheme(state)) {
            openMainMenu();
            return;
        }

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
        if (!refs.compoundList) {
            return;
        }

        refs.compoundList.replaceChildren();

        if (state.progress.discoveredCompounds.size === 0) {
            const emptyState = document.createElement("div");
            emptyState.className = "empty-state";
            emptyState.textContent = "No compounds discovered yet";
            refs.compoundList.appendChild(emptyState);
            return;
        }

        state.progress.discoveryHistory.forEach(compoundId => {
            const compound = getCompoundById(state, compoundId);
            if (!compound) {
                return;
            }

            const card = document.createElement("button");
            const formula = document.createElement("div");
            const name = document.createElement("div");

            card.type = "button";
            card.className = "compound-card clickable";
            formula.className = "compound-formula";
            name.className = "compound-name";

            formula.textContent = compound.formula;
            name.textContent = compound.name;
            card.addEventListener("click", () => {
                modalController.openCompoundModal(compound);
            });

            card.append(formula, name);
            refs.compoundList.appendChild(card);
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
