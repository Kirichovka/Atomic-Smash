import { createBoardActionsController } from "./board-actions-controller.js";
import { createProgressionController } from "./progression-controller.js";

export function createGameplayController({
    refs,
    state,
    getActiveMechanic,
    mechanicsRegistry,
    navigationController,
    paletteController,
    modalController,
    onBeforeBoardReset,
    onPersistState,
    onTutorialLevelCompleted,
    onTutorialReset,
    onTutorialSync
}) {
    const progressionController = createProgressionController({
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
    });

    const boardActionsController = createBoardActionsController({
        refs,
        state,
        getActiveMechanic,
        modalController,
        onAddDiscoveredCompound: compound => progressionController.addDiscoveredCompound(compound),
        onApplyInteractionContext: context => applyInteractionContext(context),
        onClearBoardRuntime: () => {
            onBeforeBoardReset?.();
            mechanicsRegistry.resetAll();
        },
        onLevelTargetComplete: compound => progressionController.handleLevelComplete(compound),
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
            clearBoardSelectionState();
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
