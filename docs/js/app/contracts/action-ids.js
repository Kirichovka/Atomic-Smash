export const SCENE_ACTION_IDS = Object.freeze({
    nextThemeSheet: "nextThemeSheet",
    openJournalScreen: "openJournalScreen",
    previousThemeSheet: "previousThemeSheet",
    previewLevelIntro: "previewLevelIntro",
    resumeViewedTheme: "resumeViewedTheme"
});

export const SCENE_ACTION_PREFIXES = Object.freeze({
    previewLevelIntro: "previewLevelIntro:",
    startLevelIntro: "start-level-intro:"
});

export const HOTKEY_ACTION_IDS = Object.freeze({
    deleteSelectedNode: "delete-selected-node",
    escape: "escape",
    mixBoard: "mix-board",
    openAddMenu: "open-add-menu",
    refreshBoard: "refresh-board"
});

const EXACT_ACTION_IDS = new Set([
    ...Object.values(SCENE_ACTION_IDS),
    ...Object.values(HOTKEY_ACTION_IDS)
]);

const ACTION_PREFIXES = new Set(Object.values(SCENE_ACTION_PREFIXES));

export function createPreviewLevelIntroActionId(levelId) {
    return `${SCENE_ACTION_PREFIXES.previewLevelIntro}${levelId}`;
}

export function createStartLevelIntroActionId(themeId, levelId) {
    return `${SCENE_ACTION_PREFIXES.startLevelIntro}${themeId}:${levelId}`;
}

export function isKnownActionId(actionId) {
    if (typeof actionId !== "string" || !actionId.trim()) {
        return false;
    }

    if (EXACT_ACTION_IDS.has(actionId)) {
        return true;
    }

    return [...ACTION_PREFIXES].some(prefix => actionId.startsWith(prefix));
}

export function assertKnownActionId(actionId, context = "action") {
    if (!isKnownActionId(actionId)) {
        throw new Error(`Unknown ${context} id: ${String(actionId)}`);
    }

    return actionId;
}

