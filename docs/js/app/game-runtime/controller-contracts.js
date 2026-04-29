export const RUNTIME_CONTROLLER_KIND = Object.freeze({
    gameplay: "gameplay",
    mixZoneContext: "mix-zone-context",
    modal: "modal",
    navigation: "navigation",
    palette: "palette",
    sidebar: "sidebar",
    tutorial: "tutorial"
});

const REQUIRED_METHODS_BY_KIND = Object.freeze({
    [RUNTIME_CONTROLLER_KIND.navigation]: [
        "bind",
        "renderJournal",
        "renderMenu",
        "renderThemeList",
        "showGameScreen",
        "showJournalScreen",
        "showMenuScreen",
        "showThemeScreen"
    ],
    [RUNTIME_CONTROLLER_KIND.modal]: [
        "bind",
        "closeActiveModal",
        "closeCompoundModal",
        "openCompoundModal",
        "openElementModal",
        "openHelpModal",
        "openLevelIntroModal",
        "openValencyModal",
        "openThemeCompleteModal"
    ],
    [RUNTIME_CONTROLLER_KIND.palette]: [
        "bind",
        "render",
        "renderSelectionUi"
    ],
    [RUNTIME_CONTROLLER_KIND.mixZoneContext]: [
        "bind",
        "closeContextMenu",
        "closeElementPicker",
        "isOpen",
        "isPickerOpen",
        "openAddMenuAtCursor",
        "positionOverlays"
    ],
    [RUNTIME_CONTROLLER_KIND.sidebar]: [
        "applyLayout",
        "bind",
        "isCompactLayout"
    ],
    [RUNTIME_CONTROLLER_KIND.tutorial]: [
        "bind",
        "hide",
        "resetProgress",
        "scheduleSync",
        "setPostLevelStage"
    ],
    [RUNTIME_CONTROLLER_KIND.gameplay]: [
        "addElementToBoard",
        "addElementToBoardAtPoint",
        "addSelectedElementToBoard",
        "applyInteractionContext",
        "clearBoard",
        "clearBoardSelectionState",
        "handleMixAttempt",
        "openJournalScreen",
        "openMainMenu",
        "openThemeSelection",
        "refreshAllViews",
        "refreshMetaViews",
        "removeBoardNode",
        "removeSelectedBoardNodes",
        "renderCurrentLevel",
        "resumeCurrentTheme",
        "selectElement",
        "startTheme"
    ]
});

export function assertRuntimeControllerContract(controller, kind) {
    if (!kind || !REQUIRED_METHODS_BY_KIND[kind]) {
        throw new Error(`Unknown runtime controller kind: "${kind}".`);
    }

    if (!controller || typeof controller !== "object") {
        throw new Error(`Invalid runtime controller "${kind}": factory must return an object.`);
    }

    REQUIRED_METHODS_BY_KIND[kind].forEach(methodName => {
        if (typeof controller[methodName] !== "function") {
            throw new Error(
                `Invalid runtime controller "${kind}": required method "${methodName}()" is missing.`
            );
        }
    });

    return controller;
}
