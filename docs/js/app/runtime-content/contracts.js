export const RUNTIME_CONTENT_BUILDER_KIND = Object.freeze({
    gameShell: "game-shell",
    mixZoneContext: "mix-zone-context",
    modal: "modal",
    navigation: "navigation",
    palette: "palette",
    progression: "progression",
    screen: "screen"
});

const REQUIRED_METHODS_BY_KIND = Object.freeze({
    [RUNTIME_CONTENT_BUILDER_KIND.screen]: [
        "renderJournalCompoundCards",
        "renderJournalElementCards",
        "renderThemeCards"
    ],
    [RUNTIME_CONTENT_BUILDER_KIND.palette]: [
        "renderPaletteElementCard",
        "renderPaletteTiles"
    ],
    [RUNTIME_CONTENT_BUILDER_KIND.mixZoneContext]: [
        "renderMixZoneContextActions",
        "renderMixZonePickerOptions"
    ],
    [RUNTIME_CONTENT_BUILDER_KIND.progression]: [
        "renderDiscoveredCompoundCards"
    ],
    [RUNTIME_CONTENT_BUILDER_KIND.navigation]: [
        "renderMenuSheetDots"
    ],
    [RUNTIME_CONTENT_BUILDER_KIND.gameShell]: [
        "renderGameShellBootstrap"
    ],
    [RUNTIME_CONTENT_BUILDER_KIND.modal]: [
        "renderCompoundModalContent",
        "renderElementModalContent",
        "renderHelpModalContent",
        "renderLevelIntroContent",
        "renderThemeCompleteContent",
        "renderValencyModalContent"
    ]
});

export function assertRuntimeContentBuilderContract(builder, kind) {
    if (!kind || !REQUIRED_METHODS_BY_KIND[kind]) {
        throw new Error(`Unknown runtime content builder kind: "${kind}".`);
    }

    if (!builder || typeof builder !== "object") {
        throw new Error(`Invalid runtime content builder "${kind}": factory must return an object.`);
    }

    REQUIRED_METHODS_BY_KIND[kind].forEach(methodName => {
        if (typeof builder[methodName] !== "function") {
            throw new Error(
                `Invalid runtime content builder "${kind}": required method "${methodName}()" is missing.`
            );
        }
    });

    return builder;
}
