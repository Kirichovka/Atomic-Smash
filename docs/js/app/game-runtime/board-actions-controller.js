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
    let resultToastTimeout = null;

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
            showResultToast("This structure breaks the current valency rules.");
            modalController.openValencyModal(valencyValidation);
            onPersistState?.();
            onTutorialSync?.();
            return;
        }

        const evaluation = getActiveMechanic().evaluate();

        if (evaluation.status === "unknown") {
            registerFailedAttempt();
            showResultToast("Unknown compound.");
            onPersistState?.();
            onTutorialSync?.();
            return;
        }

        if (evaluation.status === "structure-mismatch") {
            registerFailedAttempt();
            showResultToast(
                `The atoms are correct for ${evaluation.compound.formula}, ` +
                "but the connection pattern is wrong."
            );
            onPersistState?.();
            onTutorialSync?.();
            return;
        }

        const compound = evaluation.compound;
        if (isCurrentLevelTarget(state, compound)) {
            const isNewDiscovery = onAddDiscoveredCompound?.(compound, {
                openModal: false
            }) === true;
            onLevelTargetComplete?.(compound, {
                isNewDiscovery
            });
            return;
        }

        const isNewDiscovery = onAddDiscoveredCompound?.(compound) === true;

        const currentLevel = getCurrentLevel(state);
        if (currentLevel) {
            registerFailedAttempt();
            const targetCompound = getCompoundById(state, currentLevel.targetCompoundId);
            showResultToast(
                `You built ${compound.formula} (${compound.name}), ` +
                `but the current target is ${targetCompound?.formula ?? currentLevel.hint}.`
            );
            onPersistState?.();
            onTutorialSync?.();
            return;
        }

        showResultToast(`You built ${compound.formula} (${compound.name}).`);
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
        clearResultToast();
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

    function showResultToast(message) {
        if (!refs.result) {
            return;
        }

        clearResultToast({ keepText: false });
        refs.result.textContent = message;
        void refs.result.offsetWidth;
        refs.result.classList.add("is-visible");

        resultToastTimeout = window.setTimeout(() => {
            clearResultToast();
            onTutorialSync?.();
        }, 2600);
    }

    function clearResultToast(options = {}) {
        const { keepText = false } = options;

        if (resultToastTimeout) {
            window.clearTimeout(resultToastTimeout);
            resultToastTimeout = null;
        }

        if (!refs.result) {
            return;
        }

        refs.result.classList.remove("is-visible");
        if (!keepText) {
            refs.result.textContent = "";
        }
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
