import { createBoardActionsController } from "./board-actions-controller.js?v=20260507-game-level-intro";
import { createProgressionController } from "./progression-controller.js?v=20260509-menu-render-cache";

export function createGameplayController({
    refs,
    state,
    currentPage,
    getActiveMechanic,
    mechanicsRegistry,
    navigationController,
    paletteController,
    modalController,
    progressionSchemaConfig,
    onBeforeBoardReset,
    onPersistState,
    onRunAfterTutorialHints,
    onTutorialLevelCompleted,
    onTutorialReset,
    onTutorialSync
}) {
    const progressionController = createProgressionController({
        refs,
        state,
        currentPage,
        mechanicsRegistry,
        navigationController,
        paletteController,
        modalController,
        schemaConfig: progressionSchemaConfig,
        getActiveMechanic,
        onPersistState,
        onRunAfterTutorialHints,
        onTutorialLevelCompleted,
        onTutorialReset,
        onTutorialSync
    });

    const boardActionsController = createBoardActionsController({
        refs,
        state,
        getActiveMechanic,
        modalController,
        onAddDiscoveredCompound: (compound, options) => progressionController.addDiscoveredCompound(compound, options),
        onApplyInteractionContext: context => applyInteractionContext(context),
        onClearBoardRuntime: () => {
            onBeforeBoardReset?.();
            mechanicsRegistry.resetAll();
        },
        onLevelTargetComplete: (compound, options) => progressionController.handleLevelComplete(compound, options),
        onPersistState,
        onTutorialSync
    });

    function selectElement(symbol, options = {}) {
        const { persist = true } = options;

        applyInteractionContext({
            paletteSymbol: symbol,
            inspectedSymbol: symbol,
            persist
        });
    }

    function applyInteractionContext(context = {}) {
        const {
            clearBoardSelection = false,
            clearPaletteSelection = false,
            inspectedSymbol,
            paletteSymbol,
            persist = false
        } = context;

        if (clearBoardSelection) {
            boardActionsController.clearBoardSelectionState();
        }

        if (clearPaletteSelection) {
            state.ui.paletteSelectedElementSymbol = null;
        }

        if ("paletteSymbol" in context) {
            state.ui.paletteSelectedElementSymbol = paletteSymbol ?? null;
        }

        if ("inspectedSymbol" in context) {
            state.ui.inspectedElementSymbol = inspectedSymbol ?? null;
        }

        paletteController.renderSelectionUi();
        onTutorialSync?.();

        if (persist) {
            onPersistState?.();
        }
    }

    return {
        applyInteractionContext,
        ...boardActionsController,
        ...progressionController
    };
}
