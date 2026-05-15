import { createBoardActionsController } from "./board-actions-controller.js?v=20260515-balance-flow";
import { createProgressionController } from "./progression-controller.js?v=20260515-connection-palette-open";

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
    onShowPaletteForConnectionLab,
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
        onShowPaletteForConnectionLab,
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
            getActiveMechanic().reset?.();
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
