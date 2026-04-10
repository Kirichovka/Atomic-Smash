import { getCompoundById, getCurrentLevel, isCurrentLevelTarget } from "../state.js";

export function createBoardActionsController({
    refs,
    state,
    getActiveMechanic,
    modalController,
    onAddDiscoveredCompound,
    onApplyInteractionContext,
    onClearBoardRuntime,
    onLevelTargetComplete,
    onPersistState,
    onTutorialSync
}) {
    function addSelectedElementToBoard() {
        const selectedSymbol = state.ui.paletteSelectedElementSymbol;
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
        onPersistState?.();
        onTutorialSync?.();
    }

    function addElementToBoardAtPoint(symbol, clientX, clientY) {
        if (!symbol || !Number.isFinite(clientX) || !Number.isFinite(clientY)) {
            return;
        }

        const node = getActiveMechanic().spawnElementAtClientPoint?.(symbol, clientX, clientY);
        if (!node) {
            return;
        }

        onPersistState?.();
        onTutorialSync?.();
    }

    function handleMixAttempt() {
        const valencyValidation = getActiveMechanic().validateValency?.();
        if (valencyValidation && !valencyValidation.isValid) {
            registerFailedAttempt({ suppressAutoHelp: true });
            if (refs.result) {
                refs.result.textContent = "This structure breaks the current valency rules.";
            }
            modalController.openValencyModal(valencyValidation);
            onPersistState?.();
            onTutorialSync?.();
            return;
        }

        const evaluation = getActiveMechanic().evaluate();

        if (evaluation.status === "unknown") {
            registerFailedAttempt();
            if (refs.result) {
                refs.result.textContent = "Unknown compound.";
            }
            onPersistState?.();
            onTutorialSync?.();
            return;
        }

        if (evaluation.status === "structure-mismatch") {
            registerFailedAttempt();
            if (refs.result) {
                refs.result.textContent =
                    `The atoms are correct for ${evaluation.compound.formula}, ` +
                    "but the connection pattern is wrong.";
            }
            onPersistState?.();
            onTutorialSync?.();
            return;
        }

        const compound = evaluation.compound;
        onAddDiscoveredCompound?.(compound);

        if (isCurrentLevelTarget(state, compound)) {
            onLevelTargetComplete?.(compound);
            onPersistState?.();
            onTutorialSync?.();
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
            onPersistState?.();
            onTutorialSync?.();
            return;
        }

        if (refs.result) {
            refs.result.textContent = `You built ${compound.formula} (${compound.name}).`;
        }
        onPersistState?.();
        onTutorialSync?.();
    }

    function selectElement(symbol, options = {}) {
        const { persist = true } = options;

        onApplyInteractionContext?.({
            paletteSymbol: symbol,
            inspectedSymbol: symbol,
            persist
        });
    }

    function clearBoardSelectionState() {
        getActiveMechanic().clearSelection?.({ silent: true });
    }

    function clearBoard() {
        onClearBoardRuntime?.();
        resetFailedAttempts();
        if (refs.result) {
            refs.result.textContent = "";
        }
        onPersistState?.();
        onTutorialSync?.();
    }

    function removeBoardNode(nodeId) {
        if (!nodeId) {
            return;
        }

        getActiveMechanic().removeNodeById?.(nodeId);
        onPersistState?.();
        onTutorialSync?.();
    }

    function removeSelectedBoardNodes() {
        const selectedNodeIds = getActiveMechanic().getSelectedNodeIds?.() ?? [];
        if (selectedNodeIds.length === 0) {
            return;
        }

        getActiveMechanic().removeNodesByIds?.(selectedNodeIds);
        onPersistState?.();
        onTutorialSync?.();
    }

    function registerFailedAttempt(options = {}) {
        const { suppressAutoHelp = false } = options;
        if (!getCurrentLevel(state)) {
            return;
        }

        state.progress.failedAttempts += 1;

        if (!suppressAutoHelp && state.progress.failedAttempts >= 3) {
            state.progress.failedAttempts = 0;
            modalController.openHelpModal();
        }
    }

    function resetFailedAttempts() {
        state.progress.failedAttempts = 0;
    }

    return {
        addElementToBoard,
        addElementToBoardAtPoint,
        addSelectedElementToBoard,
        clearBoard,
        clearBoardSelectionState,
        handleMixAttempt,
        registerFailedAttempt,
        removeBoardNode,
        removeSelectedBoardNodes,
        resetFailedAttempts,
        selectElement
    };
}
