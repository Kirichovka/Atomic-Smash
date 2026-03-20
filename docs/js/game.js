import { loadGameData } from "./data.js";
import { createModalController } from "./app/modals.js";
import { createNavigationController } from "./app/navigation.js";
import { createPaletteController } from "./app/palette.js";
import { createRefs } from "./app/refs.js";
import { createMechanicsRegistry } from "./app/mechanics/index.js";
import { loadStoredState, persistState } from "./app/storage.js";
import {
    createState,
    getActiveMechanicId,
    getAvailableElements,
    getCompoundById,
    getCompletedCountForTheme,
    getCurrentLevel,
    getCurrentTheme,
    getLevelsForTheme,
    hasUnlockedBonusElements,
    hydrateState,
    isCurrentLevelTarget
} from "./app/state.js";

export async function initGame() {
    const gameData = await loadGameData();
    const refs = createRefs();
    const currentPage = document.body.dataset.page ?? "menu";
    const state = createState(gameData);

    hydrateState(state, loadStoredState());
    state.ui.activeScreen = currentPage;

    const mechanicsRegistry = createMechanicsRegistry({
        refs,
        state,
        onSelectBoardElement: selectElement
    });
    const getActiveMechanic = () => mechanicsRegistry.get(getActiveMechanicId(state));

    let navigationController;

    const modalController = createModalController({
        refs,
        state,
        createHelpVisual: compound => getActiveMechanic().createHelpVisual(compound),
        onThemeCompleteClosed: () => navigationController.showThemeScreen()
    });
    const paletteController = createPaletteController({
        refs,
        state,
        onQuickAddElement: addElementToBoard,
        onSelectElement: selectElement
    });

    navigationController = createNavigationController({
        refs,
        state,
        currentPage,
        onBeforeNavigate: persistCurrentState,
        onStartTheme: startTheme,
        onSelectElement: selectElement,
        onOpenCompoundModal: modalController.openCompoundModal,
        onOpenElementModal: modalController.openElementModal,
        onOpenMainMenu: openMainMenu,
        onOpenThemeSelection: openThemeSelection,
        onOpenJournalScreen: openJournalScreen,
        onResumeCurrentTheme: resumeCurrentTheme
    });

    mechanicsRegistry.init();
    paletteController.bind();
    navigationController.bind();
    modalController.bind();
    bindGameplayControls();

    if (!state.ui.selectedElementSymbol) {
        state.ui.selectedElementSymbol = getAvailableElements(state)[0]?.symbol ?? null;
    }

    refreshAllViews();
    persistCurrentState();

    window.addEventListener("beforeunload", persistCurrentState);
    window.addEventListener("resize", () => {
        getActiveMechanic().sync();
    });

    function bindGameplayControls() {
        if (refs.addSelectedButton) {
            refs.addSelectedButton.addEventListener("click", addSelectedElementToBoard);
        }

        if (refs.mixButton) {
            refs.mixButton.addEventListener("click", handleMixAttempt);
        }

        if (refs.clearButton) {
            refs.clearButton.addEventListener("click", clearBoard);
        }
    }

    function persistCurrentState() {
        getActiveMechanic().captureState?.();
        persistState(state);
    }

    function addSelectedElementToBoard() {
        const selectedSymbol = state.ui.selectedElementSymbol;
        if (!selectedSymbol) {
            return;
        }

        addElementToBoard(selectedSymbol);
    }

    function addElementToBoard(symbol) {
        if (!symbol) {
            return;
        }

        getActiveMechanic().spawnElement?.(symbol);
        persistCurrentState();
    }

    function handleMixAttempt() {
        const evaluation = getActiveMechanic().evaluate();

        if (evaluation.status === "unknown") {
            registerFailedAttempt();
            if (refs.result) {
                refs.result.textContent = "Unknown compound.";
            }
            persistCurrentState();
            return;
        }

        if (evaluation.status === "structure-mismatch") {
            registerFailedAttempt();
            if (refs.result) {
                refs.result.textContent =
                    `The atoms are correct for ${evaluation.compound.formula}, ` +
                    "but the connection pattern is wrong.";
            }
            persistCurrentState();
            return;
        }

        const compound = evaluation.compound;
        addDiscoveredCompound(compound);

        if (isCurrentLevelTarget(state, compound)) {
            handleLevelComplete(compound);
            persistCurrentState();
            return;
        }

        const currentLevel = getCurrentLevel(state);
        if (currentLevel) {
            registerFailedAttempt();
            const targetCompound = getCompoundById(state, currentLevel.targetCompoundId);
            if (refs.result) {
                refs.result.textContent =
                    `You built ${compound.formula} (${compound.name}), ` +
                    `but the current target is ${targetCompound?.formula ?? currentLevel.hint}.`;
            }
            persistCurrentState();
            return;
        }

        if (refs.result) {
            refs.result.textContent = `You built ${compound.formula} (${compound.name}).`;
        }
        persistCurrentState();
    }

    function selectElement(symbol) {
        state.ui.selectedElementSymbol = symbol;
        paletteController.render();
        persistCurrentState();
    }

    function refreshAllViews() {
        navigationController.renderMenu();
        navigationController.renderThemeList();
        navigationController.renderJournal();
        paletteController.render();
        renderCurrentLevel();
        renderDiscoveredCompounds();
        getActiveMechanic().sync();
    }

    function refreshMetaViews() {
        navigationController.renderMenu();
        navigationController.renderThemeList();
        navigationController.renderJournal();
    }

    function openThemeSelection() {
        navigationController.renderThemeList();
        navigationController.showThemeScreen();
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
            openThemeSelection();
            return;
        }

        renderCurrentLevel();
        paletteController.render();
        renderDiscoveredCompounds();
        navigationController.showGameScreen();
        getActiveMechanic().sync();
        persistCurrentState();
    }

    function startTheme(themeId) {
        if (!state.catalog.themes.some(theme => theme.id === themeId)) {
            return;
        }

        state.progress.currentThemeId = themeId;
        resetFailedAttempts();
        mechanicsRegistry.resetAll();
        if (refs.result) {
            refs.result.textContent = "";
        }

        refreshMetaViews();
        paletteController.render();
        renderCurrentLevel();
        persistCurrentState();
        navigationController.showGameScreen();
    }

    function clearBoard() {
        resetFailedAttempts();
        mechanicsRegistry.resetAll();
        if (refs.result) {
            refs.result.textContent = "";
        }
        persistCurrentState();
    }

    function registerFailedAttempt() {
        if (!getCurrentLevel(state)) {
            return;
        }

        state.progress.failedAttempts += 1;

        if (state.progress.failedAttempts >= 3) {
            state.progress.failedAttempts = 0;
            modalController.openHelpModal();
        }
    }

    function resetFailedAttempts() {
        state.progress.failedAttempts = 0;
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
            refs.hint.textContent = hasUnlockedBonusElements(state)
                ? "All themes cleared. Bonus elements are unlocked for free play."
                : "Open Themes to choose another theme or keep experimenting here.";
            return;
        }

        const currentIndex = themeLevels.findIndex(level => level.id === currentLevel.id);
        refs.levelIndicator.textContent = `${theme.name} | Task ${currentIndex + 1} of ${themeLevels.length}`;
        refs.task.textContent = currentLevel.objective;
        refs.hint.textContent = `Hint: ${currentLevel.hint}`;
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

        resetFailedAttempts();
        state.progress.completedLevelIds.add(currentLevel.id);
        mechanicsRegistry.resetAll();

        if (hadRemainingThemeLevels) {
            refreshMetaViews();
            renderCurrentLevel();
            if (refs.result) {
                refs.result.textContent =
                    `${currentTheme.name} task ${completedLevelNumber} complete! ` +
                    `You built ${compound.formula} (${compound.name}).`;
            }
            return;
        }

        let bonusUnlockMessage = "";

        if (!state.progress.bonusUnlockShown && hasUnlockedBonusElements(state)) {
            state.progress.bonusUnlockShown = true;
            unlockBonusElements({ openModal: false });

            const unlockedBonusNames = state.catalog.elements
                .filter(element => element.category === "bonus")
                .map(element => element.name)
                .join(", ");

            bonusUnlockMessage = `All themes are now complete. Bonus elements unlocked: ${unlockedBonusNames}.`;
        }

        state.progress.currentThemeId = null;
        refreshMetaViews();
        renderCurrentLevel();
        if (refs.result) {
            refs.result.textContent = "";
        }
        modalController.closeCompoundModal();
        modalController.openThemeCompleteModal(currentTheme, { bonusUnlockMessage });
    }

    function unlockBonusElements(options = {}) {
        const { openModal = true } = options;
        const firstBonusElement = state.catalog.elements.find(element => element.category === "bonus") ?? null;

        if (firstBonusElement) {
            state.ui.selectedElementSymbol = firstBonusElement.symbol;
        }

        navigationController.renderMenu();
        paletteController.render();
        navigationController.renderJournal();

        if (openModal && firstBonusElement) {
            modalController.openElementModal(firstBonusElement);
        }
    }
}
