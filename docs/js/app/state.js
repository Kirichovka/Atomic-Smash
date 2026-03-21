export const DEFAULT_MECHANIC_ID = "connection-lab";
const CONNECTOR_POSITIONS = new Set(["left", "right", "top", "bottom"]);

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
            inspectedElementSymbol: null,
            paletteSelectedElementSymbol: null,
            sidebarCollapsed: false,
            sidebarWidth: 260
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
            savedNodes: [],
            savedConnections: [],
            nodes: new Map(),
            connections: [],
            selectedNodeId: null,
            selectedNodeIds: new Set(),
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

export function hydrateState(state, snapshot) {
    if (!snapshot || typeof snapshot !== "object") {
        return;
    }

    const validThemeIds = new Set(state.catalog.themes.map(theme => theme.id));
    const validCompoundIds = new Set(state.catalog.compoundsById.keys());
    const validLevelIds = new Set(state.catalog.levels.map(level => level.id));
    const validElementSymbols = new Set(state.catalog.elements.map(element => element.symbol));

    const paletteSelectedElementSymbol = validElementSymbols.has(snapshot.ui?.paletteSelectedElementSymbol)
        ? snapshot.ui.paletteSelectedElementSymbol
        : validElementSymbols.has(snapshot.ui?.selectedElementSymbol)
            ? snapshot.ui.selectedElementSymbol
            : null;
    const inspectedElementSymbol = validElementSymbols.has(snapshot.ui?.inspectedElementSymbol)
        ? snapshot.ui.inspectedElementSymbol
        : paletteSelectedElementSymbol;

    state.ui.paletteSelectedElementSymbol = paletteSelectedElementSymbol;
    state.ui.inspectedElementSymbol = inspectedElementSymbol;
    state.ui.sidebarCollapsed = Boolean(snapshot.ui?.sidebarCollapsed);
    state.ui.sidebarWidth = Number.isFinite(snapshot.ui?.sidebarWidth)
        ? clampSidebarWidth(Number(snapshot.ui.sidebarWidth))
        : 260;

    const discoveredIds = Array.isArray(snapshot.progress?.discoveryHistory)
        ? snapshot.progress.discoveryHistory.filter(compoundId => validCompoundIds.has(compoundId))
        : [];

    state.progress.discoveryHistory = [...new Set(discoveredIds)];
    state.progress.discoveredCompounds = new Set(state.progress.discoveryHistory);
    state.progress.completedLevelIds = new Set(
        Array.isArray(snapshot.progress?.completedLevelIds)
            ? snapshot.progress.completedLevelIds.filter(levelId => validLevelIds.has(levelId))
            : []
    );
    state.progress.currentThemeId = validThemeIds.has(snapshot.progress?.currentThemeId)
        ? snapshot.progress.currentThemeId
        : null;
    state.progress.failedAttempts = Number.isFinite(snapshot.progress?.failedAttempts)
        ? Math.max(0, Number(snapshot.progress.failedAttempts))
        : 0;
    state.progress.bonusUnlockShown = Boolean(snapshot.progress?.bonusUnlockShown);

    const savedNodes = Array.isArray(snapshot.board?.savedNodes)
        ? snapshot.board.savedNodes.filter(node =>
            typeof node?.id === "string" &&
            validElementSymbols.has(node.symbol) &&
            (
                (Number.isFinite(node.localX) && Number.isFinite(node.localY))
                || (Number.isFinite(node.x) && Number.isFinite(node.y))
            )
        ).map(node => ({
            id: node.id,
            localX: Number.isFinite(node.localX) ? Number(node.localX) : null,
            localY: Number.isFinite(node.localY) ? Number(node.localY) : null,
            symbol: node.symbol,
            x: Number.isFinite(node.x) ? Number(node.x) : null,
            y: Number.isFinite(node.y) ? Number(node.y) : null
        }))
        : [];
    const nodeIds = new Set(savedNodes.map(node => node.id));
    const savedConnections = Array.isArray(snapshot.board?.savedConnections)
        ? snapshot.board.savedConnections.filter(connection =>
            typeof connection?.fromNodeId === "string" &&
            typeof connection?.toNodeId === "string" &&
            nodeIds.has(connection.fromNodeId) &&
            nodeIds.has(connection.toNodeId) &&
            CONNECTOR_POSITIONS.has(connection.fromPosition) &&
            CONNECTOR_POSITIONS.has(connection.toPosition)
        ).map(connection => ({
            fromNodeId: connection.fromNodeId,
            fromPosition: connection.fromPosition,
            toNodeId: connection.toNodeId,
            toPosition: connection.toPosition
        }))
        : [];

    state.board.savedNodes = savedNodes;
    state.board.savedConnections = savedConnections;
    state.board.nodeIdCounter = Number.isFinite(snapshot.board?.nodeIdCounter)
        ? Math.max(Number(snapshot.board.nodeIdCounter), getMaxNodeId(savedNodes))
        : getMaxNodeId(savedNodes);
}

export function createPersistedStateSnapshot(state) {
    return {
        ui: {
            inspectedElementSymbol: state.ui.inspectedElementSymbol,
            paletteSelectedElementSymbol: state.ui.paletteSelectedElementSymbol,
            sidebarCollapsed: state.ui.sidebarCollapsed,
            sidebarWidth: clampSidebarWidth(state.ui.sidebarWidth)
        },
        progress: {
            discoveryHistory: [...state.progress.discoveryHistory],
            completedLevelIds: [...state.progress.completedLevelIds],
            currentThemeId: state.progress.currentThemeId,
            failedAttempts: state.progress.failedAttempts,
            bonusUnlockShown: state.progress.bonusUnlockShown
        },
        board: {
            nodeIdCounter: state.board.nodeIdCounter,
            savedNodes: state.board.savedNodes.map(node => ({
                id: node.id,
                localX: Number.isFinite(node.localX) ? node.localX : null,
                localY: Number.isFinite(node.localY) ? node.localY : null,
                symbol: node.symbol,
                x: Number.isFinite(node.x) ? node.x : null,
                y: Number.isFinite(node.y) ? node.y : null
            })),
            savedConnections: state.board.savedConnections.map(connection => ({
                fromNodeId: connection.fromNodeId,
                fromPosition: connection.fromPosition,
                toNodeId: connection.toNodeId,
                toPosition: connection.toPosition
            }))
        }
    };
}

export function getAvailableElements(state) {
    const availableSymbols = getAvailableElementSymbols(state);
    return state.catalog.elements.filter(element => availableSymbols.has(element.symbol));
}

export function getPaletteSelectedElement(state) {
    return getAvailableElements(state).find(element => element.symbol === state.ui.paletteSelectedElementSymbol) ?? null;
}

export function getInspectedElement(state) {
    return state.catalog.elements.find(element => element.symbol === state.ui.inspectedElementSymbol) ?? null;
}

export function getSelectedElement(state) {
    return getPaletteSelectedElement(state);
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
    return getAvailableElements(state).length >= state.catalog.elements.length;
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

function getMaxNodeId(nodes) {
    return nodes.reduce((maxId, node) => {
        const match = /^node-(\d+)$/.exec(node.id);
        if (!match) {
            return maxId;
        }

        return Math.max(maxId, Number(match[1]));
    }, 0);
}

function clampSidebarWidth(width) {
    return Math.min(Math.max(width, 240), 420);
}

function getAvailableElementSymbols(state) {
    const validSymbols = new Set(state.catalog.elements.map(element => element.symbol));
    const availableSymbols = new Set();
    const currentLevel = getCurrentLevel(state);

    const addSymbols = symbols => {
        if (!Array.isArray(symbols)) {
            return;
        }

        symbols.forEach(symbol => {
            if (validSymbols.has(symbol)) {
                availableSymbols.add(symbol);
            }
        });
    };

    state.catalog.levels.forEach(level => {
        if (state.progress.completedLevelIds.has(level.id)) {
            addSymbols(level.availableElementSymbols);
        }
    });

    addSymbols(currentLevel?.availableElementSymbols);

    if (availableSymbols.size === 0) {
        addSymbols(state.catalog.levels[0]?.availableElementSymbols);
    }

    if (availableSymbols.size === 0) {
        state.catalog.elements
            .filter(element => element.category === "starter")
            .forEach(element => availableSymbols.add(element.symbol));
    }

    return availableSymbols;
}
