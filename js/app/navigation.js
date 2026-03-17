import {
    getAvailableElements,
    getCompletedCountForTheme,
    getCurrentTheme,
    getLevelsForTheme
} from "./state.js";

const PAGE_ROUTES = {
    game: "game.html",
    journal: "journal.html",
    menu: "index.html",
    themes: "themes.html"
};

export function createNavigationController({
    refs,
    state,
    currentPage,
    onBeforeNavigate,
    onStartTheme,
    onSelectElement,
    onOpenCompoundModal,
    onOpenElementModal,
    onOpenMainMenu,
    onOpenThemeSelection,
    onOpenJournalScreen,
    onResumeCurrentTheme
}) {
    function bind() {
        bindIfPresent(refs.menuThemesButton, "click", onOpenThemeSelection);
        bindIfPresent(refs.menuJournalButton, "click", onOpenJournalScreen);
        bindIfPresent(refs.menuContinueButton, "click", onResumeCurrentTheme);
        bindIfPresent(refs.themeMenuButton, "click", onOpenMainMenu);
        bindIfPresent(refs.themeJournalButton, "click", onOpenJournalScreen);
        bindIfPresent(refs.journalMenuButton, "click", onOpenMainMenu);
        bindIfPresent(refs.journalThemesButton, "click", onOpenThemeSelection);
        bindIfPresent(refs.menuButton, "click", onOpenMainMenu);
        bindIfPresent(refs.journalButton, "click", onOpenJournalScreen);
    }

    function renderMenu() {
        if (!refs.menuThemeProgress || !refs.menuJournalProgress || !refs.menuCurrentTheme || !refs.menuContinueButton) {
            return;
        }

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
        if (!refs.journalCompoundList || !refs.journalCompoundCount) {
            return;
        }

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
        if (!refs.journalElementList || !refs.journalElementCount) {
            return;
        }

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
        if (!refs.themeList) {
            return;
        }

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
        navigateTo("menu");
    }

    function showThemeScreen() {
        navigateTo("themes");
    }

    function showJournalScreen() {
        navigateTo("journal");
    }

    function showGameScreen() {
        navigateTo("game");
    }

    function navigateTo(pageName) {
        state.ui.activeScreen = pageName;

        if (currentPage === pageName) {
            return;
        }

        onBeforeNavigate?.();
        window.location.assign(PAGE_ROUTES[pageName]);
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

function bindIfPresent(element, eventName, handler) {
    if (element) {
        element.addEventListener(eventName, handler);
    }
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
