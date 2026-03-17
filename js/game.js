import { loadGameData } from "./data.js";
import { createModalController } from "./app/modals.js";
import { createNavigationController } from "./app/navigation.js";
import { createPaletteController } from "./app/palette.js";
import { createRefs } from "./app/refs.js";
import { createMechanicsRegistry } from "./app/mechanics/index.js";
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
    isCurrentLevelTarget
} from "./app/state.js";

export async function initGame() {
    const gameData = await loadGameData();
    const refs = createRefs();
    const state = createState(gameData);
    const mechanicsRegistry = createMechanicsRegistry({ refs, state });
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
        onOpenElementModal: modalController.openElementModal,
        onSelectElement: selectElement
    });

    navigationController = createNavigationController({
        refs,
        state,
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
    navigationController.showMenuScreen();

    window.addEventListener("resize", () => {
        getActiveMechanic().sync();
    });

    function bindGameplayControls() {
        refs.mixButton.addEventListener("click", handleMixAttempt);
        refs.clearButton.addEventListener("click", clearBoard);
    }

    function handleMixAttempt() {
        const evaluation = getActiveMechanic().evaluate();

        if (evaluation.status === "unknown") {
            registerFailedAttempt();
            refs.result.textContent = "Unknown compound.";
            return;
        }

        if (evaluation.status === "structure-mismatch") {
            registerFailedAttempt();
            refs.result.textContent =
                `The atoms are correct for ${evaluation.compound.formula}, ` +
                "but the connection pattern is wrong.";
            return;
        }

        const compound = evaluation.compound;
        addDiscoveredCompound(compound);

        if (isCurrentLevelTarget(state, compound)) {
            handleLevelComplete(compound);
            return;
        }

        const currentLevel = getCurrentLevel(state);
        if (currentLevel) {
            registerFailedAttempt();
            const targetCompound = getCompoundById(state, currentLevel.targetCompoundId);
            refs.result.textContent =
                `You built ${compound.formula} (${compound.name}), ` +
                `but the current target is ${targetCompound?.formula ?? currentLevel.hint}.`;
            return;
        }

        refs.result.textContent = `You built ${compound.formula} (${compound.name}).`;
    }

    function selectElement(symbol) {
        state.ui.selectedElementSymbol = symbol;
        paletteController.render();
    }

    function refreshAllViews() {
        navigationController.renderMenu();
        navigationController.renderThemeList();
        navigationController.renderJournal();
        paletteController.render();
        renderCurrentLevel();
        renderDiscoveredCompounds();
    }

    function refreshMetaViews() {
        navigationController.renderMenu();
        navigationController.renderThemeList();
        navigationController.renderJournal();
    }

    function openThemeSelection() {
        navigationController.renderMenu();
        navigationController.renderThemeList();
        navigationController.showThemeScreen();
    }

    function openJournalScreen() {
        navigationController.renderMenu();
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
        navigationController.showGameScreen();
        getActiveMechanic().sync();
    }

    function startTheme(themeId) {
        if (!state.catalog.themes.some(theme => theme.id === themeId)) {
            return;
        }

        state.progress.currentThemeId = themeId;
        resetFailedAttempts();
        mechanicsRegistry.resetAll();
        refs.result.textContent = "";

        refreshMetaViews();
        paletteController.render();
        renderCurrentLevel();
        navigationController.showGameScreen();
        getActiveMechanic().sync();
    }

    function clearBoard() {
        resetFailedAttempts();
        mechanicsRegistry.resetAll();
        refs.result.textContent = "";
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
            refs.result.textContent =
                `${currentTheme.name} task ${completedLevelNumber} complete! ` +
                `You built ${compound.formula} (${compound.name}).`;
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
        refs.result.textContent = "";
        modalController.closeCompoundModal();
        navigationController.showThemeScreen();
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
