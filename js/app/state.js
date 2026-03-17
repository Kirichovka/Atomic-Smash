export const DEFAULT_MECHANIC_ID = "connection-lab";

export function createState(gameData) {
    const compounds = gameData.compounds ?? [];

    return {
        catalog: {
            elements: gameData.elements ?? [],
            themes: gameData.themes ?? [],
            levels: gameData.levels ?? [],
            compoundsByIngredients: buildCompoundsByIngredients(compounds),
            compoundsById: new Map(compounds.map(compound => [compound.id, compound]))
        },
        ui: {
            activeScreen: "menu",
            selectedElementSymbol: null
        },
        progress: {
            discoveredCompounds: new Set(),
            discoveryHistory: [],
            completedLevelIds: new Set(),
            currentThemeId: null,
            failedAttempts: 0,
            bonusUnlockShown: false
        },
        board: {
            nodeIdCounter: 0,
            nodes: new Map(),
            connections: [],
            dragElementType: null,
            movingNode: null,
            movingPointerId: null,
            moveOffsetX: 0,
            moveOffsetY: 0,
            currentWire: null,
            startConnector: null,
            connectionPointerId: null
        }
    };
}

export function getAvailableElements(state) {
    return state.catalog.elements.filter(element =>
        element.category === "starter" || hasUnlockedBonusElements(state)
    );
}

export function getSelectedElement(state) {
    return getAvailableElements(state).find(element => element.symbol === state.ui.selectedElementSymbol) ?? null;
}

export function getElementBySymbol(state, symbol) {
    return state.catalog.elements.find(element => element.symbol === symbol) ?? null;
}

export function getCompoundById(state, compoundId) {
    return state.catalog.compoundsById.get(compoundId) ?? null;
}

export function getCurrentTheme(state) {
    return state.catalog.themes.find(theme => theme.id === state.progress.currentThemeId) ?? null;
}

export function getLevelsForTheme(state, themeId = state.progress.currentThemeId) {
    return state.catalog.levels.filter(level => level.themeId === themeId);
}

export function getCompletedCountForTheme(state, themeId) {
    return getLevelsForTheme(state, themeId).filter(level => state.progress.completedLevelIds.has(level.id)).length;
}

export function getCurrentLevel(state) {
    if (!state.progress.currentThemeId) {
        return null;
    }

    return getLevelsForTheme(state, state.progress.currentThemeId)
        .find(level => !state.progress.completedLevelIds.has(level.id)) ?? null;
}

export function getActiveMechanicId(state) {
    return getCurrentLevel(state)?.mechanicId ?? DEFAULT_MECHANIC_ID;
}

export function isCurrentLevelTarget(state, compound) {
    const level = getCurrentLevel(state);
    return Boolean(level && compound.id === level.targetCompoundId);
}

export function hasUnlockedBonusElements(state) {
    return state.catalog.levels.length > 0 && state.progress.completedLevelIds.size >= state.catalog.levels.length;
}

export function createEdgeKey(leftId, rightId) {
    return [leftId, rightId].sort().join("|");
}

function buildCompoundsByIngredients(compounds) {
    const map = new Map();

    compounds.forEach(compound => {
        const key = compound.ingredients.slice().sort().join(",");
        const list = map.get(key) ?? [];
        list.push(compound);
        map.set(key, list);
    });

    return map;
}
