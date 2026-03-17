import { loadGameData } from "./data.js";
import {
    createSvgLine,
    getConnectorCenter,
    redrawConnections,
    syncConnectionsLayer
} from "./svg.js";

const refs = {
    menuScreen: document.getElementById("menu-screen"),
    menuThemesButton: document.getElementById("menu-themes-btn"),
    menuJournalButton: document.getElementById("menu-journal-btn"),
    menuContinueButton: document.getElementById("menu-continue-btn"),
    menuThemeProgress: document.getElementById("menu-theme-progress"),
    menuJournalProgress: document.getElementById("menu-journal-progress"),
    menuCurrentTheme: document.getElementById("menu-current-theme"),
    themeScreen: document.getElementById("theme-screen"),
    themeMenuButton: document.getElementById("theme-menu-btn"),
    themeJournalButton: document.getElementById("theme-journal-btn"),
    journalScreen: document.getElementById("journal-screen"),
    journalMenuButton: document.getElementById("journal-menu-btn"),
    journalThemesButton: document.getElementById("journal-themes-btn"),
    journalCompoundCount: document.getElementById("journal-compound-count"),
    journalCompoundList: document.getElementById("journal-compound-list"),
    journalElementCount: document.getElementById("journal-element-count"),
    journalElementList: document.getElementById("journal-element-list"),
    gameScreen: document.getElementById("game-screen"),
    themeList: document.getElementById("theme-list"),
    menuButton: document.getElementById("menu-btn"),
    journalButton: document.getElementById("journal-btn"),
    elementList: document.getElementById("element-list"),
    elementCard: document.getElementById("element-card"),
    elementModal: document.getElementById("element-modal"),
    elementModalClose: document.getElementById("element-modal-close"),
    elementModalContent: document.getElementById("element-modal-content"),
    compoundModal: document.getElementById("compound-modal"),
    compoundModalClose: document.getElementById("compound-modal-close"),
    compoundModalContent: document.getElementById("compound-modal-content"),
    helpModal: document.getElementById("help-modal"),
    helpModalClose: document.getElementById("help-modal-close"),
    helpModalContent: document.getElementById("help-modal-content"),
    themeCompleteModal: document.getElementById("theme-complete-modal"),
    themeCompleteClose: document.getElementById("theme-complete-close"),
    themeCompleteContent: document.getElementById("theme-complete-content"),
    workspace: document.getElementById("workspace"),
    mixZone: document.getElementById("mix-zone"),
    svg: document.getElementById("connections-layer"),
    compoundList: document.getElementById("compound-list"),
    levelIndicator: document.getElementById("level-indicator"),
    result: document.getElementById("result"),
    hint: document.getElementById("hint"),
    task: document.getElementById("task"),
    mixButton: document.getElementById("mix-btn"),
    clearButton: document.getElementById("clear-btn")
};

const state = {
    elements: [],
    themes: [],
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
    connectionPointerId: null,
    compoundsByIngredients: new Map(),
    compoundsById: new Map(),
    discoveredCompounds: new Set(),
    discoveryHistory: [],
    levels: [],
    completedLevelIds: new Set(),
    currentThemeId: null,
    selectedElementSymbol: null,
    failedAttempts: 0,
    bonusUnlockShown: false
};

export async function initGame() {
    const gameData = await loadGameData();
    const compounds = gameData.compounds ?? [];

    state.elements = gameData.elements ?? [];
    state.themes = gameData.themes ?? [];
    state.compoundsByIngredients = buildCompoundsByIngredients(compounds);
    state.compoundsById = new Map(compounds.map(compound => [compound.id, compound]));
    state.levels = gameData.levels ?? [];

    bindPaletteInteractions();
    bindWorkspaceInteractions();
    bindControls();
    bindModalInteractions();

    if (!state.selectedElementSymbol) {
        state.selectedElementSymbol = getAvailableElements()[0]?.symbol ?? null;
    }

    renderMenu();
    renderThemeList();
    renderJournal();
    renderAvailableElements();
    renderCurrentLevel();
    renderDiscoveredCompounds();
    syncLayerAndConnections();
    showMenuScreen();

    window.addEventListener("resize", syncLayerAndConnections);
}

function bindPaletteInteractions() {
    refs.elementList.addEventListener("dragstart", event => {
        const template = event.target.closest(".element-template");
        if (!template) {
            return;
        }

        state.dragElementType = template.dataset.element;
        event.dataTransfer?.setData("text/plain", state.dragElementType);
    });

    refs.elementList.addEventListener("dragend", () => {
        state.dragElementType = null;
    });

    refs.elementList.addEventListener("click", event => {
        const template = event.target.closest(".element-template");
        if (!template) {
            return;
        }

        const symbol = template.dataset.element;
        selectElement(symbol);
        openElementModal(getElementBySymbol(symbol));
    });
}

function bindWorkspaceInteractions() {
    refs.workspace.addEventListener("dragover", event => {
        event.preventDefault();
    });

    refs.workspace.addEventListener("drop", event => {
        event.preventDefault();
        if (!state.dragElementType) {
            return;
        }

        if (!isPointInsideMixZone(event.clientX, event.clientY)) {
            state.dragElementType = null;
            return;
        }

        const zoneRect = refs.mixZone.getBoundingClientRect();
        selectElement(state.dragElementType);
        createNode(
            state.dragElementType,
            event.clientX - zoneRect.left - 55,
            event.clientY - zoneRect.top - 32
        );
        state.dragElementType = null;
    });
}

function bindControls() {
    refs.menuThemesButton.addEventListener("click", openThemeSelection);
    refs.menuJournalButton.addEventListener("click", openJournalScreen);
    refs.menuContinueButton.addEventListener("click", resumeCurrentTheme);
    refs.themeMenuButton.addEventListener("click", openMainMenu);
    refs.themeJournalButton.addEventListener("click", openJournalScreen);
    refs.journalMenuButton.addEventListener("click", openMainMenu);
    refs.journalThemesButton.addEventListener("click", openThemeSelection);
    refs.menuButton.addEventListener("click", openMainMenu);
    refs.journalButton.addEventListener("click", openJournalScreen);

    refs.mixButton.addEventListener("click", () => {
        const evaluation = evaluateBoardCompound();

        if (evaluation.status === "unknown") {
            registerFailedAttempt();
            refs.result.textContent = "Unknown compound.";
            return;
        }

        if (evaluation.status === "structure-mismatch") {
            registerFailedAttempt();
            refs.result.textContent = `The atoms are correct for ${evaluation.compound.formula}, but the connection pattern is wrong.`;
            return;
        }

        const compound = evaluation.compound;
        addDiscoveredCompound(compound);

        if (isCurrentLevelTarget(compound)) {
            handleLevelComplete(compound);
            return;
        }

        const currentLevel = getCurrentLevel();
        if (currentLevel) {
            registerFailedAttempt();
            const targetCompound = state.compoundsById.get(currentLevel.targetCompoundId);
            refs.result.textContent = `You built ${compound.formula} (${compound.name}), but the current target is ${targetCompound?.formula ?? currentLevel.hint}.`;
            return;
        }

        refs.result.textContent = `You built ${compound.formula} (${compound.name}).`;
    });

    refs.clearButton.addEventListener("click", clearBoard);
}

function bindModalInteractions() {
    refs.elementModalClose.addEventListener("click", closeElementModal);
    refs.elementModal.addEventListener("click", event => {
        if (event.target.closest("[data-close-modal='true']")) {
            closeElementModal();
        }
    });

    refs.compoundModalClose.addEventListener("click", closeCompoundModal);
    refs.compoundModal.addEventListener("click", event => {
        if (event.target.closest("[data-close-compound-modal='true']")) {
            closeCompoundModal();
        }
    });

    refs.helpModalClose.addEventListener("click", closeHelpModal);
    refs.helpModal.addEventListener("click", event => {
        if (event.target.closest("[data-close-help-modal='true']")) {
            closeHelpModal();
        }
    });

    refs.themeCompleteClose.addEventListener("click", closeThemeCompleteModal);
    refs.themeCompleteModal.addEventListener("click", event => {
        if (event.target.closest("[data-close-theme-complete-modal='true']")) {
            closeThemeCompleteModal();
        }
    });
}

function renderMenu() {
    const completedThemes = state.themes.filter(theme => getCompletedCountForTheme(theme.id) >= getLevelsForTheme(theme.id).length).length;
    const availableElements = getAvailableElements();
    const currentTheme = getCurrentTheme();

    refs.menuThemeProgress.textContent = `${completedThemes}/${state.themes.length} themes complete`;
    refs.menuJournalProgress.textContent = `${state.discoveryHistory.length} discovered compounds | ${availableElements.length}/${state.elements.length} unlocked elements`;
    refs.menuCurrentTheme.textContent = currentTheme
        ? `${currentTheme.name} is active`
        : "No active theme yet";
    refs.menuContinueButton.disabled = !currentTheme;
}

function renderJournal() {
    renderJournalCompounds();
    renderJournalElements();
}

function renderJournalCompounds() {
    refs.journalCompoundList.replaceChildren();
    refs.journalCompoundCount.textContent = `${state.discoveryHistory.length} discovered`;

    if (state.discoveryHistory.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className = "empty-state";
        emptyState.textContent = "No compounds discovered yet";
        refs.journalCompoundList.appendChild(emptyState);
        return;
    }

    state.discoveryHistory.forEach((compoundId, index) => {
        const compound = state.compoundsById.get(compoundId);
        if (!compound) {
            return;
        }

        const card = document.createElement("button");
        const kicker = document.createElement("div");
        const title = document.createElement("div");
        const subtitle = document.createElement("div");
        const description = document.createElement("div");
        const order = document.createElement("div");

        card.type = "button";
        card.className = "journal-card";
        kicker.className = "journal-card-kicker";
        title.className = "journal-card-title";
        subtitle.className = "journal-card-subtitle";
        description.className = "journal-card-description";
        order.className = "journal-card-index";

        kicker.textContent = "Discovered compound";
        title.textContent = compound.formula;
        subtitle.textContent = compound.name;
        description.textContent = compound.description ?? `${compound.name} is stored in your journal.`;
        order.textContent = `Discovery #${index + 1}`;

        card.addEventListener("click", () => {
            openCompoundModal(compound);
        });

        card.append(kicker, title, subtitle, description, order);
        refs.journalCompoundList.appendChild(card);
    });
}

function renderJournalElements() {
    refs.journalElementList.replaceChildren();

    const unlockedElements = getAvailableElements();
    refs.journalElementCount.textContent = `${unlockedElements.length}/${state.elements.length} unlocked`;

    state.elements.forEach(element => {
        const isUnlocked = unlockedElements.some(item => item.symbol === element.symbol);
        const card = document.createElement("button");
        const kicker = document.createElement("div");
        const title = document.createElement("div");
        const subtitle = document.createElement("div");
        const description = document.createElement("div");
        const status = document.createElement("div");

        card.type = "button";
        card.className = "journal-card";
        if (!isUnlocked) {
            card.classList.add("locked");
            card.disabled = true;
        }

        kicker.className = "journal-card-kicker";
        title.className = "journal-card-title";
        subtitle.className = "journal-card-subtitle";
        description.className = "journal-card-description";
        status.className = "journal-card-index";

        kicker.textContent = isUnlocked ? "Unlocked element" : "Locked element";
        title.textContent = isUnlocked ? element.symbol : "?";
        subtitle.textContent = element.name;
        description.textContent = isUnlocked
            ? element.description
            : "Complete all themes to unlock this bonus element in the lab.";
        status.textContent = isUnlocked
            ? (element.category === "starter" ? "Starter element" : "Bonus element")
            : "Locked";

        if (isUnlocked) {
            card.addEventListener("click", () => {
                selectElement(element.symbol);
                openElementModal(element);
            });
        }

        card.append(kicker, title, subtitle, description, status);
        refs.journalElementList.appendChild(card);
    });
}

function renderThemeList() {
    refs.themeList.replaceChildren();

    if (state.themes.length === 0) {
        const emptyState = document.createElement("div");
        emptyState.className = "empty-state";
        emptyState.textContent = "No themes available yet.";
        refs.themeList.appendChild(emptyState);
        return;
    }

    state.themes.forEach(theme => {
        const levels = getLevelsForTheme(theme.id);
        const completedCount = getCompletedCountForTheme(theme.id);
        const card = document.createElement("article");
        const name = document.createElement("div");
        const description = document.createElement("div");
        const progress = document.createElement("div");
        const meta = document.createElement("div");
        const button = document.createElement("button");
        const metaParts = [`${levels.length} task${levels.length === 1 ? "" : "s"}`];

        card.className = "theme-card";
        if (theme.id === state.currentThemeId) {
            card.classList.add("active");
            metaParts.push("current theme");
        }

        name.className = "theme-card-name";
        description.className = "theme-card-description";
        progress.className = "theme-card-progress";
        meta.className = "theme-card-meta";

        name.textContent = theme.name;
        description.textContent = theme.description;
        progress.textContent = completedCount >= levels.length && levels.length > 0
            ? "Theme complete"
            : `${completedCount}/${levels.length} tasks complete`;
        meta.textContent = metaParts.join(" | ");
        button.textContent = getThemeActionLabel(theme.id, completedCount, levels.length);
        button.addEventListener("click", () => startTheme(theme.id));

        card.append(name, description, progress, meta, button);
        refs.themeList.appendChild(card);
    });
}

function getThemeActionLabel(themeId, completedCount, totalCount) {
    if (totalCount === 0) {
        return "Open Theme";
    }

    if (completedCount === 0) {
        return "Start Theme";
    }

    if (completedCount >= totalCount) {
        return "Review Theme";
    }

    if (themeId === state.currentThemeId) {
        return "Resume Theme";
    }

    return "Continue Theme";
}

function startTheme(themeId) {
    if (!state.themes.some(theme => theme.id === themeId)) {
        return;
    }

    state.currentThemeId = themeId;
    resetFailedAttempts();
    resetWorkspace();
    refs.result.textContent = "";

    renderMenu();
    renderThemeList();
    renderCurrentLevel();
    showGameScreen();
    syncLayerAndConnections();
}

function openThemeSelection() {
    renderMenu();
    renderThemeList();
    showThemeScreen();
}

function openJournalScreen() {
    renderMenu();
    renderJournal();
    showJournalScreen();
}

function openMainMenu() {
    renderMenu();
    showMenuScreen();
}

function resumeCurrentTheme() {
    if (!getCurrentTheme()) {
        openThemeSelection();
        return;
    }

    renderCurrentLevel();
    showGameScreen();
    syncLayerAndConnections();
}

function setActiveScreen(screen) {
    [refs.menuScreen, refs.themeScreen, refs.journalScreen, refs.gameScreen].forEach(item => {
        item.classList.toggle("hidden", item !== screen);
    });
}

function showMenuScreen() {
    setActiveScreen(refs.menuScreen);
}

function showThemeScreen() {
    setActiveScreen(refs.themeScreen);
}

function showJournalScreen() {
    setActiveScreen(refs.journalScreen);
}

function showGameScreen() {
    setActiveScreen(refs.gameScreen);
}

function renderAvailableElements() {
    const availableElements = getAvailableElements();
    refs.elementList.replaceChildren();

    if (!availableElements.some(element => element.symbol === state.selectedElementSymbol)) {
        state.selectedElementSymbol = availableElements[0]?.symbol ?? null;
    }

    availableElements.forEach(element => {
        const template = document.createElement("div");
        template.className = "element-template";
        template.draggable = true;
        template.dataset.element = element.symbol;
        template.title = element.name;
        template.textContent = element.symbol;

        if (element.symbol === state.selectedElementSymbol) {
            template.classList.add("selected");
        }

        refs.elementList.appendChild(template);
    });

    renderSelectedElementCard();
}

function renderSelectedElementCard() {
    refs.elementCard.replaceChildren();

    const element = getSelectedElement();
    if (!element) {
        const emptyState = document.createElement("div");
        emptyState.className = "empty-state";
        emptyState.textContent = "Select an element to see its description.";
        refs.elementCard.appendChild(emptyState);
        return;
    }

    const symbol = document.createElement("div");
    const name = document.createElement("div");
    const meta = document.createElement("div");
    const description = document.createElement("div");

    symbol.className = "element-card-symbol";
    name.className = "element-card-name";
    meta.className = "element-card-meta";
    description.className = "element-card-description";

    symbol.textContent = element.symbol;
    name.textContent = element.name;
    meta.textContent = element.category === "starter" ? "Starter Element" : "Bonus Element";
    description.textContent = element.description;

    refs.elementCard.append(symbol, name, meta, description);
}

function openElementModal(element) {
    if (!element) {
        return;
    }

    refs.elementModalContent.replaceChildren();

    const symbol = document.createElement("div");
    const name = document.createElement("div");
    const meta = document.createElement("div");
    const description = document.createElement("div");

    symbol.className = "element-modal-symbol";
    name.className = "element-modal-name";
    meta.className = "element-modal-meta";
    description.className = "element-modal-description";

    symbol.id = "element-modal-title";
    symbol.textContent = element.symbol;
    name.textContent = element.name;
    meta.textContent = `${element.category === "starter" ? "Starter element" : "Bonus element"} | Drag into the mix zone to use`;
    description.textContent = element.description;

    refs.elementModalContent.append(symbol, name, meta, description);
    refs.elementModal.classList.remove("hidden");
    refs.elementModal.setAttribute("aria-hidden", "false");
}

function closeElementModal() {
    refs.elementModal.classList.add("hidden");
    refs.elementModal.setAttribute("aria-hidden", "true");
}

function openCompoundModal(compound) {
    if (!compound) {
        return;
    }

    refs.compoundModalContent.replaceChildren();

    const kicker = document.createElement("div");
    const title = document.createElement("div");
    const formula = document.createElement("div");
    const description = document.createElement("div");

    kicker.className = "compound-modal-kicker";
    title.className = "compound-modal-title";
    formula.className = "compound-modal-formula";
    description.className = "compound-modal-description";

    kicker.textContent = "Congratulations, you discovered";
    title.id = "compound-modal-title";
    title.textContent = compound.name;
    formula.textContent = compound.formula;
    description.textContent = compound.description ?? `${compound.name} is now added to your discovered compounds list.`;

    refs.compoundModalContent.append(kicker, title, formula, description);
    refs.compoundModal.classList.remove("hidden");
    refs.compoundModal.setAttribute("aria-hidden", "false");
}

function closeCompoundModal() {
    refs.compoundModal.classList.add("hidden");
    refs.compoundModal.setAttribute("aria-hidden", "true");
}

function openHelpModal() {
    const currentLevel = getCurrentLevel();
    if (!currentLevel) {
        return;
    }

    const targetCompound = state.compoundsById.get(currentLevel.targetCompoundId);
    if (!targetCompound) {
        return;
    }

    refs.helpModalContent.replaceChildren();

    const kicker = document.createElement("div");
    const title = document.createElement("div");
    const description = document.createElement("div");
    const visual = document.createElement("div");

    kicker.className = "help-modal-kicker";
    title.className = "help-modal-title";
    description.className = "help-modal-description";
    visual.className = "help-visual";

    kicker.textContent = "Help is here";
    title.id = "help-modal-title";
    title.textContent = `Build ${targetCompound.formula} the right way`;
    description.textContent = "Follow the animated path: start from one highlighted atom and drag through the glowing connection order.";
    visual.appendChild(createHelpAnimation(targetCompound));

    refs.helpModalContent.append(kicker, title, description, visual);
    refs.helpModal.classList.remove("hidden");
    refs.helpModal.setAttribute("aria-hidden", "false");
}

function closeHelpModal() {
    refs.helpModal.classList.add("hidden");
    refs.helpModal.setAttribute("aria-hidden", "true");
}

function openThemeCompleteModal(theme, options = {}) {
    if (!theme) {
        return;
    }

    const themeLevels = getLevelsForTheme(theme.id);
    const themeCompounds = themeLevels
        .map(level => state.compoundsById.get(level.targetCompoundId))
        .filter(Boolean);
    const learnedLabels = themeCompounds.map(compound => `${compound.formula} - ${compound.name}`);
    const elementSymbols = [...new Set(themeCompounds.flatMap(compound => compound.ingredients))];
    const elementLabels = elementSymbols.map(symbol => {
        const element = getElementBySymbol(symbol);
        return element ? `${element.symbol} - ${element.name}` : symbol;
    });

    refs.themeCompleteContent.replaceChildren();

    const kicker = document.createElement("div");
    const title = document.createElement("div");
    const description = document.createElement("div");
    const learnedPanel = createThemeCompletePanel(
        "What You Learned",
        `You completed the ${theme.name} section and practiced the main compounds from this topic.`
    );
    const elementsPanel = createThemeCompletePanel(
        "Elements In This Section",
        "These are the elements you worked with while clearing this theme."
    );

    kicker.className = "theme-complete-kicker";
    title.className = "theme-complete-title";
    description.className = "theme-complete-description";

    kicker.textContent = "Section complete";
    title.id = "theme-complete-title";
    title.textContent = `Congratulations! You finished ${theme.name}`;
    description.textContent = `You cleared every task in the ${theme.name} section. Great work. Your next step is to choose another theme and keep building new compounds.`;

    learnedPanel.appendChild(createThemeCompletePillList(learnedLabels));
    elementsPanel.appendChild(createThemeCompletePillList(elementLabels));

    refs.themeCompleteContent.append(kicker, title, description, learnedPanel, elementsPanel);

    if (options.bonusUnlockMessage) {
        const note = document.createElement("div");
        note.className = "theme-complete-note";
        note.textContent = options.bonusUnlockMessage;
        refs.themeCompleteContent.appendChild(note);
    }

    refs.themeCompleteModal.classList.remove("hidden");
    refs.themeCompleteModal.setAttribute("aria-hidden", "false");
}

function closeThemeCompleteModal() {
    refs.themeCompleteModal.classList.add("hidden");
    refs.themeCompleteModal.setAttribute("aria-hidden", "true");
    showThemeScreen();
}

function createThemeCompletePanel(titleText, bodyText) {
    const panel = document.createElement("section");
    const title = document.createElement("div");
    const body = document.createElement("div");

    panel.className = "theme-complete-panel";
    title.className = "theme-complete-panel-title";
    body.className = "theme-complete-panel-text";

    title.textContent = titleText;
    body.textContent = bodyText;

    panel.append(title, body);
    return panel;
}

function createThemeCompletePillList(labels) {
    const list = document.createElement("div");

    list.className = "theme-complete-pill-list";

    labels.forEach(label => {
        const pill = document.createElement("div");
        pill.className = "theme-complete-pill";
        pill.textContent = label;
        list.appendChild(pill);
    });

    return list;
}

function selectElement(symbol) {
    state.selectedElementSymbol = symbol;
    renderAvailableElements();
}

function getAvailableElements() {
    return state.elements.filter(element =>
        element.category === "starter" || hasUnlockedBonusElements()
    );
}

function getSelectedElement() {
    return getAvailableElements().find(element => element.symbol === state.selectedElementSymbol) ?? null;
}

function getElementBySymbol(symbol) {
    return state.elements.find(element => element.symbol === symbol) ?? null;
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

function evaluateBoardCompound() {
    const nodeEntries = [...state.nodes.entries()].map(([id, node]) => ({
        id,
        symbol: node.dataset.symbol
    }));
    const ingredientKey = nodeEntries.map(node => node.symbol).sort().join(",");
    const candidates = state.compoundsByIngredients.get(ingredientKey) ?? [];

    if (candidates.length === 0) {
        return { status: "unknown" };
    }

    const boardGraph = createBoardGraph();

    for (const compound of candidates) {
        if (compoundMatchesBoard(compound, nodeEntries, boardGraph)) {
            return { status: "match", compound };
        }
    }

    const structuredCandidate = candidates.find(compound => compound.structure);
    if (structuredCandidate) {
        return { status: "structure-mismatch", compound: structuredCandidate };
    }

    return { status: "unknown" };
}

function registerFailedAttempt() {
    if (!getCurrentLevel()) {
        return;
    }

    state.failedAttempts += 1;

    if (state.failedAttempts >= 3) {
        state.failedAttempts = 0;
        openHelpModal();
    }
}

function resetFailedAttempts() {
    state.failedAttempts = 0;
}

function createBoardGraph() {
    const edgeSet = new Set();
    const adjacency = new Map();

    state.connections.forEach(connection => {
        const key = createEdgeKey(connection.fromNodeId, connection.toNodeId);
        edgeSet.add(key);

        const fromList = adjacency.get(connection.fromNodeId) ?? new Set();
        fromList.add(connection.toNodeId);
        adjacency.set(connection.fromNodeId, fromList);

        const toList = adjacency.get(connection.toNodeId) ?? new Set();
        toList.add(connection.fromNodeId);
        adjacency.set(connection.toNodeId, toList);
    });

    return { edgeSet, adjacency };
}

function createHelpAnimation(compound) {
    const structure = getHelpStructure(compound);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const width = 720;
    const height = 240;
    const positions = layoutHelpNodes(structure.nodes, structure.edges, width, height);

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("aria-hidden", "true");

    structure.edges.forEach(([fromIndex, toIndex], index) => {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.classList.add("help-line");
        line.setAttribute("x1", positions[fromIndex].x);
        line.setAttribute("y1", positions[fromIndex].y);
        line.setAttribute("x2", positions[toIndex].x);
        line.setAttribute("y2", positions[toIndex].y);
        line.style.animationDelay = `${index * 0.35}s`;
        svg.appendChild(line);
    });

    structure.nodes.forEach((symbol, index) => {
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");

        group.setAttribute("transform", `translate(${positions[index].x} ${positions[index].y})`);
        circle.classList.add("help-node-circle");
        circle.setAttribute("r", "34");
        circle.style.animationDelay = `${index * 0.2}s`;

        text.classList.add("help-node-label");
        text.textContent = symbol;

        group.append(circle, text);
        svg.appendChild(group);
    });

    return svg;
}

function getHelpStructure(compound) {
    if (compound.structure) {
        return compound.structure;
    }

    const nodes = compound.ingredients.slice();
    const edges = [];

    for (let index = 0; index < nodes.length - 1; index += 1) {
        edges.push([index, index + 1]);
    }

    return { nodes, edges };
}

function layoutHelpNodes(nodes, edges, width, height) {
    const degrees = new Map(nodes.map((_, index) => [index, 0]));
    edges.forEach(([fromIndex, toIndex]) => {
        degrees.set(fromIndex, degrees.get(fromIndex) + 1);
        degrees.set(toIndex, degrees.get(toIndex) + 1);
    });

    const maxDegree = Math.max(...degrees.values());

    if (maxDegree <= 2) {
        const gap = width / (nodes.length + 1);
        return nodes.map((_, index) => ({
            x: gap * (index + 1),
            y: height / 2
        }));
    }

    const centerIndex = [...degrees.entries()].sort((left, right) => right[1] - left[1])[0][0];
    const positions = nodes.map(() => ({ x: width / 2, y: height / 2 }));
    const outerIndexes = nodes.map((_, index) => index).filter(index => index !== centerIndex);
    const radius = 78;

    positions[centerIndex] = { x: width / 2, y: height / 2 };
    outerIndexes.forEach((index, outerPosition) => {
        const angle = (-Math.PI / 2) + (outerPosition * (2 * Math.PI / Math.max(outerIndexes.length, 1)));
        positions[index] = {
            x: width / 2 + Math.cos(angle) * radius,
            y: height / 2 + Math.sin(angle) * radius
        };
    });

    return positions;
}

function compoundMatchesBoard(compound, nodeEntries, boardGraph) {
    if (compound.ingredients.length !== nodeEntries.length) {
        return false;
    }

    if (!compound.structure) {
        return true;
    }

    return structureMatchesBoard(compound.structure, nodeEntries, boardGraph);
}

function createNode(symbol, x, y) {
    const node = document.createElement("div");
    const label = document.createElement("span");
    const id = `node-${++state.nodeIdCounter}`;
    const position = clampNodePosition(x, y);

    node.className = "node";
    node.dataset.id = id;
    node.dataset.symbol = symbol;
    node.style.left = `${position.x}px`;
    node.style.top = `${position.y}px`;

    label.className = "node-label";
    label.textContent = symbol;
    node.appendChild(label);

    ["left", "right", "top", "bottom"].forEach(connectorPosition => {
        const connector = document.createElement("div");
        connector.className = `connector ${connectorPosition}`;
        connector.dataset.nodeId = id;
        connector.dataset.position = connectorPosition;
        connector.addEventListener("pointerdown", startConnection);
        node.appendChild(connector);
    });

    node.addEventListener("pointerdown", startMoveNode);

    refs.mixZone.appendChild(node);
    state.nodes.set(id, node);
}

function startMoveNode(event) {
    if (state.currentWire || state.startConnector) {
        return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
        return;
    }

    if (event.target.closest(".connector")) {
        return;
    }

    event.preventDefault();

    state.movingNode = event.currentTarget;
    state.movingPointerId = event.pointerId;
    state.movingNode.classList.add("dragging");
    state.movingNode.setPointerCapture(event.pointerId);

    const rect = state.movingNode.getBoundingClientRect();
    state.moveOffsetX = event.clientX - rect.left;
    state.moveOffsetY = event.clientY - rect.top;

    document.addEventListener("pointermove", moveNode);
    document.addEventListener("pointerup", stopMoveNode);
    document.addEventListener("pointercancel", stopMoveNode);
}

function moveNode(event) {
    if (!state.movingNode || event.pointerId !== state.movingPointerId) {
        return;
    }

    const zoneRect = refs.mixZone.getBoundingClientRect();
    const position = {
        x: event.clientX - zoneRect.left - state.moveOffsetX,
        y: event.clientY - zoneRect.top - state.moveOffsetY
    };

    state.movingNode.style.left = `${position.x}px`;
    state.movingNode.style.top = `${position.y}px`;
    state.movingNode.classList.toggle("outside-zone", isNodeOutsideMixZone(position.x, position.y));

    redrawConnections(state.connections, state.nodes, refs.svg);
}

function stopMoveNode(event) {
    if (event && event.pointerId !== state.movingPointerId) {
        return;
    }

    const releasedNode = state.movingNode;

    if (state.movingNode) {
        state.movingNode.classList.remove("dragging");
        state.movingNode.classList.remove("outside-zone");

        if (state.movingPointerId !== null && state.movingNode.hasPointerCapture(state.movingPointerId)) {
            state.movingNode.releasePointerCapture(state.movingPointerId);
        }
    }

    state.movingNode = null;
    state.movingPointerId = null;

    document.removeEventListener("pointermove", moveNode);
    document.removeEventListener("pointerup", stopMoveNode);
    document.removeEventListener("pointercancel", stopMoveNode);

    if (releasedNode && isNodeOutsideMixZone(getNodeLeft(releasedNode), getNodeTop(releasedNode))) {
        removeNode(releasedNode.dataset.id);
    }
}

function startConnection(event) {
    if (event.pointerType === "mouse" && event.button !== 0) {
        return;
    }

    event.preventDefault();
    event.stopPropagation();

    removeTemporaryWire();

    state.startConnector = event.currentTarget;
    state.connectionPointerId = event.pointerId;
    state.startConnector.setPointerCapture(event.pointerId);

    syncLayerAndConnections();

    const startPoint = getConnectorCenter(state.startConnector, refs.svg);
    state.currentWire = createSvgLine("#1e293b", true);
    state.currentWire.setAttribute("x1", startPoint.x);
    state.currentWire.setAttribute("y1", startPoint.y);
    state.currentWire.setAttribute("x2", startPoint.x);
    state.currentWire.setAttribute("y2", startPoint.y);

    refs.svg.appendChild(state.currentWire);

    document.addEventListener("pointermove", drawTemporaryWire);
    document.addEventListener("pointerup", finishConnection);
    document.addEventListener("pointercancel", removeTemporaryWire);
}

function drawTemporaryWire(event) {
    if (!state.currentWire || !state.startConnector || event.pointerId !== state.connectionPointerId) {
        return;
    }

    const layerRect = refs.svg.getBoundingClientRect();
    const x = event.clientX - layerRect.left;
    const y = event.clientY - layerRect.top;

    state.currentWire.setAttribute("x2", x);
    state.currentWire.setAttribute("y2", y);
}

function finishConnection(event) {
    if (!state.startConnector || !state.currentWire || event.pointerId !== state.connectionPointerId) {
        return;
    }

    const endConnector = getConnectionTargetAtPoint(event.clientX, event.clientY);
    if (!endConnector) {
        removeTemporaryWire();
        return;
    }

    const startNodeId = state.startConnector.dataset.nodeId;
    const endNodeId = endConnector.dataset.nodeId;

    if (startNodeId === endNodeId || connectionExists(startNodeId, endNodeId)) {
        removeTemporaryWire();
        return;
    }

    const line = createSvgLine("#0f172a");
    line.classList.add("connection-hitbox");
    line.addEventListener("click", () => removeConnectionByLine(line));
    refs.svg.appendChild(line);

    state.connections.push({
        fromNodeId: startNodeId,
        fromPosition: state.startConnector.dataset.position,
        toNodeId: endNodeId,
        toPosition: endConnector.dataset.position,
        line
    });

    redrawConnections(state.connections, state.nodes, refs.svg);
    removeTemporaryWire();
}

function getConnectionTargetAtPoint(clientX, clientY) {
    const element = document.elementFromPoint(clientX, clientY);

    if (!element) {
        return null;
    }

    const connector = element.closest(".connector");
    if (connector) {
        return connector;
    }

    const node = element.closest(".node");
    if (!node) {
        return null;
    }

    return getClosestConnector(node, clientX, clientY);
}

function getClosestConnector(node, clientX, clientY) {
    const connectors = [...node.querySelectorAll(".connector")];
    let closestConnector = null;
    let closestDistance = Infinity;

    connectors.forEach(connector => {
        const rect = connector.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distance = Math.hypot(clientX - centerX, clientY - centerY);

        if (distance < closestDistance) {
            closestDistance = distance;
            closestConnector = connector;
        }
    });

    return closestConnector;
}

function structureMatchesBoard(structure, nodeEntries, boardGraph) {
    if (structure.nodes.length !== nodeEntries.length) {
        return false;
    }

    const patternAdjacency = createPatternAdjacency(structure);
    const boardDegrees = new Map(
        nodeEntries.map(node => [node.id, (boardGraph.adjacency.get(node.id) ?? new Set()).size])
    );
    const order = structure.nodes
        .map((symbol, index) => ({
            index,
            symbol,
            degree: patternAdjacency.get(index).size
        }))
        .sort((left, right) => right.degree - left.degree);

    return backtrackStructure(order, 0, new Map(), new Set(), patternAdjacency, nodeEntries, boardGraph.edgeSet, boardDegrees);
}

function createPatternAdjacency(structure) {
    const adjacency = new Map();

    structure.nodes.forEach((_, index) => {
        adjacency.set(index, new Set());
    });

    structure.edges.forEach(([fromIndex, toIndex]) => {
        adjacency.get(fromIndex).add(toIndex);
        adjacency.get(toIndex).add(fromIndex);
    });

    return adjacency;
}

function backtrackStructure(order, depth, mapping, usedBoardNodes, patternAdjacency, nodeEntries, boardEdgeSet, boardDegrees) {
    if (depth === order.length) {
        return true;
    }

    const target = order[depth];
    const candidates = nodeEntries.filter(node =>
        node.symbol === target.symbol &&
        !usedBoardNodes.has(node.id) &&
        boardDegrees.get(node.id) === target.degree
    );

    for (const candidate of candidates) {
        if (!isConsistentMapping(target.index, candidate.id, mapping, patternAdjacency, boardEdgeSet)) {
            continue;
        }

        mapping.set(target.index, candidate.id);
        usedBoardNodes.add(candidate.id);

        if (backtrackStructure(order, depth + 1, mapping, usedBoardNodes, patternAdjacency, nodeEntries, boardEdgeSet, boardDegrees)) {
            return true;
        }

        mapping.delete(target.index);
        usedBoardNodes.delete(candidate.id);
    }

    return false;
}

function isConsistentMapping(patternIndex, boardNodeId, mapping, patternAdjacency, boardEdgeSet) {
    for (const [mappedPatternIndex, mappedBoardNodeId] of mapping.entries()) {
        const patternHasEdge = patternAdjacency.get(patternIndex).has(mappedPatternIndex);
        const boardHasEdge = boardEdgeSet.has(createEdgeKey(boardNodeId, mappedBoardNodeId));

        if (patternHasEdge !== boardHasEdge) {
            return false;
        }
    }

    return true;
}

function removeTemporaryWire(event) {
    if (event && state.connectionPointerId !== null && event.pointerId !== state.connectionPointerId) {
        return;
    }

    if (state.currentWire) {
        state.currentWire.remove();
    }

    if (
        state.startConnector &&
        state.connectionPointerId !== null &&
        state.startConnector.hasPointerCapture(state.connectionPointerId)
    ) {
        state.startConnector.releasePointerCapture(state.connectionPointerId);
    }

    state.currentWire = null;
    state.startConnector = null;
    state.connectionPointerId = null;

    document.removeEventListener("pointermove", drawTemporaryWire);
    document.removeEventListener("pointerup", finishConnection);
    document.removeEventListener("pointercancel", removeTemporaryWire);
}

function syncLayerAndConnections() {
    syncConnectionsLayer(refs.svg, refs.mixZone);
    redrawConnections(state.connections, state.nodes, refs.svg);
}

function connectionExists(startNodeId, endNodeId) {
    return state.connections.some(connection =>
        (connection.fromNodeId === startNodeId && connection.toNodeId === endNodeId) ||
        (connection.fromNodeId === endNodeId && connection.toNodeId === startNodeId)
    );
}

function clampNodePosition(x, y) {
    const maxX = Math.max(refs.mixZone.clientWidth - 110, 0);
    const maxY = Math.max(refs.mixZone.clientHeight - 64, 0);

    return {
        x: Math.min(Math.max(x, 0), maxX),
        y: Math.min(Math.max(y, 0), maxY)
    };
}

function clearBoard() {
    resetFailedAttempts();
    resetWorkspace();
    refs.result.textContent = "";
}

function resetWorkspace() {
    [...state.nodes.values()].forEach(node => node.remove());
    state.nodes.clear();

    state.connections.forEach(connection => connection.line.remove());
    state.connections.length = 0;

    removeTemporaryWire();
    syncLayerAndConnections();
}

function removeConnectionByLine(line) {
    const index = state.connections.findIndex(connection => connection.line === line);
    if (index === -1) {
        return;
    }

    state.connections[index].line.remove();
    state.connections.splice(index, 1);
}

function removeNode(nodeId) {
    const node = state.nodes.get(nodeId);
    if (!node) {
        return;
    }

    node.remove();
    state.nodes.delete(nodeId);

    for (let index = state.connections.length - 1; index >= 0; index -= 1) {
        const connection = state.connections[index];
        if (connection.fromNodeId === nodeId || connection.toNodeId === nodeId) {
            connection.line.remove();
            state.connections.splice(index, 1);
        }
    }
}

function isNodeOutsideMixZone(clientX, clientY) {
    return (
        clientX < 0 ||
        clientY < 0 ||
        clientX + 110 > refs.mixZone.clientWidth ||
        clientY + 64 > refs.mixZone.clientHeight
    );
}

function isPointInsideMixZone(clientX, clientY) {
    const rect = refs.mixZone.getBoundingClientRect();

    return (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
    );
}

function getNodeLeft(node) {
    return Number.parseFloat(node.style.left || "0");
}

function getNodeTop(node) {
    return Number.parseFloat(node.style.top || "0");
}

function addDiscoveredCompound(compound) {
    const isNewDiscovery = !state.discoveredCompounds.has(compound.id);
    state.discoveredCompounds.add(compound.id);
    if (isNewDiscovery) {
        state.discoveryHistory.push(compound.id);
    }

    renderMenu();
    renderDiscoveredCompounds();
    renderJournal();

    if (isNewDiscovery) {
        openCompoundModal(compound);
    }
}

function renderDiscoveredCompounds() {
    refs.compoundList.replaceChildren();

    if (state.discoveredCompounds.size === 0) {
        const emptyState = document.createElement("div");
        emptyState.className = "empty-state";
        emptyState.textContent = "No compounds discovered yet";
        refs.compoundList.appendChild(emptyState);
        return;
    }

    state.discoveryHistory.forEach(compoundId => {
        const compound = state.compoundsById.get(compoundId);
        if (!compound) {
            return;
        }

        const card = document.createElement("button");
        const formula = document.createElement("div");
        const name = document.createElement("div");

        card.type = "button";
        card.className = "compound-card";
        card.classList.add("clickable");
        formula.className = "compound-formula";
        name.className = "compound-name";

        formula.textContent = compound.formula;
        name.textContent = compound.name;
        card.addEventListener("click", () => {
            openCompoundModal(compound);
        });

        card.append(formula, name);
        refs.compoundList.appendChild(card);
    });
}

function renderCurrentLevel() {
    const theme = getCurrentTheme();

    if (!theme) {
        refs.levelIndicator.textContent = "Choose a theme";
        refs.task.textContent = "Select a theme to start its chemistry tasks.";
        refs.hint.textContent = "Each theme contains its own task track.";
        return;
    }

    const themeLevels = getLevelsForTheme(theme.id);
    const currentLevel = getCurrentLevel();

    if (!currentLevel) {
        refs.levelIndicator.textContent = `${theme.name} | ${getCompletedCountForTheme(theme.id)}/${themeLevels.length} complete`;
        refs.task.textContent = `${theme.name} theme complete`;
        refs.hint.textContent = hasUnlockedBonusElements()
            ? "All themes cleared. Bonus elements are unlocked for free play."
            : "Open Themes to choose another theme or keep experimenting here.";
        return;
    }

    const currentIndex = themeLevels.findIndex(level => level.id === currentLevel.id);
    refs.levelIndicator.textContent = `${theme.name} | Task ${currentIndex + 1} of ${themeLevels.length}`;
    refs.task.textContent = currentLevel.objective;
    refs.hint.textContent = `Hint: ${currentLevel.hint}`;
}

function getCurrentTheme() {
    return state.themes.find(theme => theme.id === state.currentThemeId) ?? null;
}

function getLevelsForTheme(themeId = state.currentThemeId) {
    return state.levels.filter(level => level.themeId === themeId);
}

function getCompletedCountForTheme(themeId) {
    return getLevelsForTheme(themeId).filter(level => state.completedLevelIds.has(level.id)).length;
}

function getCurrentLevel() {
    if (!state.currentThemeId) {
        return null;
    }

    return getLevelsForTheme(state.currentThemeId).find(level => !state.completedLevelIds.has(level.id)) ?? null;
}

function isCurrentLevelTarget(compound) {
    const level = getCurrentLevel();
    return Boolean(level && compound.id === level.targetCompoundId);
}

function createEdgeKey(leftId, rightId) {
    return [leftId, rightId].sort().join("|");
}

function hasUnlockedBonusElements() {
    return state.levels.length > 0 && state.completedLevelIds.size >= state.levels.length;
}

function handleLevelComplete(compound) {
    const currentLevel = getCurrentLevel();
    const currentTheme = getCurrentTheme();

    if (!currentLevel || !currentTheme) {
        return;
    }

    const themeLevels = getLevelsForTheme(currentTheme.id);
    const completedLevelNumber = themeLevels.findIndex(level => level.id === currentLevel.id) + 1;
    const hadRemainingThemeLevels = themeLevels.some(level =>
        level.id !== currentLevel.id && !state.completedLevelIds.has(level.id)
    );

    resetFailedAttempts();
    state.completedLevelIds.add(currentLevel.id);
    resetWorkspace();

    if (hadRemainingThemeLevels) {
        renderMenu();
        renderThemeList();
        renderJournal();
        renderCurrentLevel();
        refs.result.textContent = `${currentTheme.name} task ${completedLevelNumber} complete! You built ${compound.formula} (${compound.name}).`;
        return;
    }

    let bonusUnlockMessage = "";

    if (!state.bonusUnlockShown && hasUnlockedBonusElements()) {
        state.bonusUnlockShown = true;
        unlockBonusElements({ openModal: false });
        const unlockedBonusNames = state.elements
            .filter(element => element.category === "bonus")
            .map(element => element.name)
            .join(", ");
        bonusUnlockMessage = `All themes are now complete. Bonus elements unlocked: ${unlockedBonusNames}.`;
    }

    state.currentThemeId = null;
    renderMenu();
    renderThemeList();
    renderJournal();
    renderCurrentLevel();
    refs.result.textContent = "";
    showThemeScreen();
    openThemeCompleteModal(currentTheme, { bonusUnlockMessage });
}

function unlockBonusElements(options = {}) {
    const { openModal = true } = options;
    const firstBonusElement = state.elements.find(element => element.category === "bonus");

    if (firstBonusElement) {
        state.selectedElementSymbol = firstBonusElement.symbol;
    }

    renderMenu();
    renderAvailableElements();
    renderJournal();

    if (openModal) {
        openElementModal(firstBonusElement);
    }
}
