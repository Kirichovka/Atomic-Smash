import {
    getAvailableElements,
    getCompletedCountForTheme,
    getCurrentTheme,
    getLevelsForTheme
} from "./state.js";

export function createNavigationController({
    refs,
    state,
    onStartTheme,
    onSelectElement,
    onOpenCompoundModal,
    onOpenElementModal,
    onOpenMainMenu,
    onOpenThemeSelection,
    onOpenJournalScreen,
    onResumeCurrentTheme
}) {
    const screens = [
        refs.menuScreen,
        refs.themeScreen,
        refs.journalScreen,
        refs.gameScreen
    ];

    function bind() {
        refs.menuThemesButton.addEventListener("click", onOpenThemeSelection);
        refs.menuJournalButton.addEventListener("click", onOpenJournalScreen);
        refs.menuContinueButton.addEventListener("click", onResumeCurrentTheme);
        refs.themeMenuButton.addEventListener("click", onOpenMainMenu);
        refs.themeJournalButton.addEventListener("click", onOpenJournalScreen);
        refs.journalMenuButton.addEventListener("click", onOpenMainMenu);
        refs.journalThemesButton.addEventListener("click", onOpenThemeSelection);
        refs.menuButton.addEventListener("click", onOpenMainMenu);
        refs.journalButton.addEventListener("click", onOpenJournalScreen);
    }

    function renderMenu() {
        const completedThemes = state.catalog.themes.filter(theme =>
            getCompletedCountForTheme(state, theme.id) >= getLevelsForTheme(state, theme.id).length
        ).length;
        const availableElements = getAvailableElements(state);
        const currentTheme = getCurrentTheme(state);

        refs.menuThemeProgress.textContent = `${completedThemes}/${state.catalog.themes.length} themes complete`;
        refs.menuJournalProgress.textContent =
            `${state.progress.discoveryHistory.length} discovered compounds | ` +
            `${availableElements.length}/${state.catalog.elements.length} unlocked elements`;
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
        refs.journalCompoundCount.textContent = `${state.progress.discoveryHistory.length} discovered`;

        if (state.progress.discoveryHistory.length === 0) {
            const emptyState = document.createElement("div");
            emptyState.className = "empty-state";
            emptyState.textContent = "No compounds discovered yet";
            refs.journalCompoundList.appendChild(emptyState);
            return;
        }

        state.progress.discoveryHistory.forEach((compoundId, index) => {
            const compound = state.catalog.compoundsById.get(compoundId);
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
                onOpenCompoundModal(compound);
            });

            card.append(kicker, title, subtitle, description, order);
            refs.journalCompoundList.appendChild(card);
        });
    }

    function renderJournalElements() {
        refs.journalElementList.replaceChildren();

        const unlockedElements = getAvailableElements(state);
        const unlockedSymbols = new Set(unlockedElements.map(element => element.symbol));
        refs.journalElementCount.textContent = `${unlockedElements.length}/${state.catalog.elements.length} unlocked`;

        state.catalog.elements.forEach(element => {
            const isUnlocked = unlockedSymbols.has(element.symbol);
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
                    onSelectElement(element.symbol);
                    onOpenElementModal(element);
                });
            }

            card.append(kicker, title, subtitle, description, status);
            refs.journalElementList.appendChild(card);
        });
    }

    function renderThemeList() {
        refs.themeList.replaceChildren();

        if (state.catalog.themes.length === 0) {
            const emptyState = document.createElement("div");
            emptyState.className = "empty-state";
            emptyState.textContent = "No themes available yet.";
            refs.themeList.appendChild(emptyState);
            return;
        }

        state.catalog.themes.forEach(theme => {
            const levels = getLevelsForTheme(state, theme.id);
            const completedCount = getCompletedCountForTheme(state, theme.id);
            const card = document.createElement("article");
            const name = document.createElement("div");
            const description = document.createElement("div");
            const progress = document.createElement("div");
            const meta = document.createElement("div");
            const button = document.createElement("button");
            const metaParts = [`${levels.length} task${levels.length === 1 ? "" : "s"}`];

            card.className = "theme-card";
            if (theme.id === state.progress.currentThemeId) {
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
            button.textContent = getThemeActionLabel(theme.id, completedCount, levels.length, state.progress.currentThemeId);
            button.addEventListener("click", () => onStartTheme(theme.id));

            card.append(name, description, progress, meta, button);
            refs.themeList.appendChild(card);
        });
    }

    function showMenuScreen() {
        setActiveScreen("menu", refs.menuScreen);
    }

    function showThemeScreen() {
        setActiveScreen("themes", refs.themeScreen);
    }

    function showJournalScreen() {
        setActiveScreen("journal", refs.journalScreen);
    }

    function showGameScreen() {
        setActiveScreen("game", refs.gameScreen);
    }

    function setActiveScreen(screenName, activeScreen) {
        state.ui.activeScreen = screenName;

        screens.forEach(screen => {
            screen.classList.toggle("hidden", screen !== activeScreen);
        });
    }

    return {
        bind,
        renderJournal,
        renderMenu,
        renderThemeList,
        showGameScreen,
        showJournalScreen,
        showMenuScreen,
        showThemeScreen
    };
}

function getThemeActionLabel(themeId, completedCount, totalCount, currentThemeId) {
    if (totalCount === 0) {
        return "Open Theme";
    }

    if (completedCount === 0) {
        return "Start Theme";
    }

    if (completedCount >= totalCount) {
        return "Review Theme";
    }

    if (themeId === currentThemeId) {
        return "Resume Theme";
    }

    return "Continue Theme";
}
