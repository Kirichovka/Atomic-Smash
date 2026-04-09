import {
    getAvailableElements,
    getCompletedCountForTheme,
    getCurrentLevel,
    getCurrentTheme,
    getLevelsForTheme,
    getMechanicById
} from "./state.js";
import { createMenuSceneController } from "./menu-scene/controller.js";
import { createHomeChromeController } from "./menu-scene/chrome.js";
import {
    renderJournalCompoundCards,
    renderJournalElementCards,
    renderThemeCards
} from "./screen-runtime/content-builders.js";

const PAGE_ROUTES = {
    game: "game.html",
    journal: "journal.html",
    menu: "index.html",
    themes: "themes.html"
};
const MENU_SWIPE_THRESHOLD = 64;

export function createNavigationController({
    refs,
    state,
    homeChromeSchemaConfig,
    menuMapConfig,
    menuSceneSchemaConfig,
    levelBriefsConfig,
    actionRegistry,
    currentPage,
    onBeforeNavigate,
    onStartTheme,
    onPreviewLevelIntro,
    onSelectElement,
    onOpenCompoundModal,
    onOpenElementModal,
    onOpenMainMenu,
    onOpenThemeSelection,
    onOpenJournalScreen,
    onResumeCurrentTheme
}) {
    actionRegistry?.registerMany?.({
        nextThemeSheet: () => cycleMenuTheme(1),
        openJournalScreen: () => onOpenJournalScreen?.(),
        previousThemeSheet: () => cycleMenuTheme(-1),
        resumeViewedTheme: () => resumeViewedTheme()
    });
    const homeChromeController = createHomeChromeController({
        refs,
        schemaConfig: homeChromeSchemaConfig,
        actionRegistry
    });
    const menuSceneController = createMenuSceneController({
        refs,
        state,
        menuMapConfig,
        sceneSchemaConfig: menuSceneSchemaConfig,
        actionRegistry,
        levelBriefsConfig,
        onPreviewLevelIntro
    });
    let menuSwipeStartX = null;
    let menuSwipeStartY = null;
    let menuSwipePointerId = null;

    function bind() {
        homeChromeController.renderScaffold();
        refreshMenuChromeRefs();
        bindIfPresent(refs.themeMenuButton, "click", onOpenMainMenu);
        bindIfPresent(refs.themeJournalButton, "click", onOpenJournalScreen);
        bindIfPresent(refs.journalMenuButton, "click", onOpenMainMenu);
        bindIfPresent(refs.journalThemesButton, "click", onOpenThemeSelection);
        bindIfPresent(refs.menuButton, "click", onOpenMainMenu);
        bindIfPresent(refs.journalButton, "click", onOpenJournalScreen);
        bindMenuSheetGestures();
        menuSceneController.bind();
    }

    function renderMenu() {
        const completedThemes = state.catalog.themes.filter(theme =>
            getCompletedCountForTheme(state, theme.id) >= getLevelsForTheme(state, theme.id).length
        ).length;
        const availableElements = getAvailableElements(state);
        const viewedTheme = getMenuViewedTheme();
        const themeLevels = viewedTheme ? getLevelsForTheme(state, viewedTheme.id) : [];
        const isThemeReady = Boolean(viewedTheme && themeLevels.length > 0 && menuMapConfig?.themes?.[viewedTheme.id]);

        if (refs.menuThemeProgress) {
            refs.menuThemeProgress.textContent = `${completedThemes}/${state.catalog.themes.length} themes complete`;
        }

        if (refs.menuJournalProgress) {
            refs.menuJournalProgress.textContent =
                `${state.progress.discoveryHistory.length} discovered compounds | ` +
                `${availableElements.length}/${state.catalog.elements.length} unlocked elements`;
        }

        if (refs.menuCurrentTheme) {
            refs.menuCurrentTheme.textContent = viewedTheme
                ? `${viewedTheme.name} is active`
                : "No active theme yet";
        }

        if (refs.menuContinueButton) {
            refs.menuContinueButton.disabled = !isThemeReady;
            refs.menuContinueButton.textContent = isThemeReady ? "Continue" : "Coming Soon";
        }
        homeChromeController.renderHeaderState({
            routeName: viewedTheme?.name ?? "No route selected",
            routeProgress: viewedTheme
                ? `${getCompletedCountForTheme(state, viewedTheme.id)}/${themeLevels.length} complete`
                : "Choose a theme to begin"
        });

        renderMenuSheetDots(viewedTheme?.id ?? null);
        menuSceneController.render({
            currentLevel: viewedTheme?.id === state.progress.currentThemeId ? getCurrentLevel(state) : null,
            levels: themeLevels,
            theme: viewedTheme
        });
    }

    function renderJournal() {
        renderJournalCompounds();
        renderJournalElements();
    }

    function renderJournalCompounds() {
        if (!refs.journalCompoundList || !refs.journalCompoundCount) {
            return;
        }
        refs.journalCompoundCount.textContent = `${state.progress.discoveryHistory.length} discovered`;

        const compounds = state.progress.discoveryHistory
            .map((compoundId, index) => {
                const compound = state.catalog.compoundsById.get(compoundId);
                if (!compound) {
                    return null;
                }

                return {
                    description: compound.description ?? `${compound.name} is stored in your journal.`,
                    formula: compound.formula,
                    indexLabel: `Discovery #${index + 1}`,
                    name: compound.name,
                    raw: compound
                };
            })
            .filter(Boolean);

        renderJournalCompoundCards({
            compounds,
            container: refs.journalCompoundList,
            onOpenCompoundModal
        });
    }

    function renderJournalElements() {
        if (!refs.journalElementList || !refs.journalElementCount) {
            return;
        }

        const unlockedElements = getAvailableElements(state);
        const unlockedSymbols = new Set(unlockedElements.map(element => element.symbol));
        refs.journalElementCount.textContent = `${unlockedElements.length}/${state.catalog.elements.length} unlocked`;

        const elements = state.catalog.elements.map(element => {
            const isUnlocked = unlockedSymbols.has(element.symbol);

            return {
                description: isUnlocked
                    ? element.description
                    : "Complete more tasks to unlock this element in the lab.",
                kicker: isUnlocked ? "Unlocked element" : "Locked element",
                locked: !isUnlocked,
                name: element.name,
                raw: element,
                status: isUnlocked ? "Unlocked for your current progress" : "Locked",
                symbol: element.symbol,
                title: isUnlocked ? element.symbol : "?"
            };
        });

        renderJournalElementCards({
            container: refs.journalElementList,
            elements,
            onOpenElementModal,
            onSelectElement
        });
    }

    function renderThemeList() {
        if (!refs.themeList) {
            return;
        }

        const themeCards = state.catalog.themes.map(theme => {
            const levels = getLevelsForTheme(state, theme.id);
            const completedCount = getCompletedCountForTheme(state, theme.id);
            const mechanic = getMechanicById(state, theme.primaryMechanicId);
            const isReady = theme.sheetStatus !== "planned" && levels.length > 0;
            const metaParts = [
                theme.schoolTopic ?? "Chemistry topic",
                mechanic?.name ?? theme.primaryMechanicId ?? "Mechanic not assigned"
            ];

            const classNames = [];
            if (theme.id === state.progress.currentThemeId) {
                classNames.push("active");
                metaParts.push("current theme");
            }
            if (!isReady) {
                classNames.push("coming-soon");
                metaParts.push("sheet in design");
            }

            return {
                actionLabel: getThemeActionLabel(theme.id, completedCount, levels.length, state.progress.currentThemeId, isReady),
                classNames,
                description: theme.description,
                id: theme.id,
                isReady,
                kicker: theme.schoolTopic ?? "Chemistry route",
                meta: metaParts.join(" | "),
                name: theme.name,
                progress: isReady
                    ? (
                        completedCount >= levels.length && levels.length > 0
                            ? "Theme complete"
                            : `${completedCount}/${levels.length} lessons complete`
                    )
                    : "Theme sheet coming soon"
            };
        });

        renderThemeCards({
            container: refs.themeList,
            onStartTheme,
            themes: themeCards
        });
    }

    function renderMenuSheetDots(activeThemeId) {
        if (!refs.menuSheetDots) {
            return;
        }

        refs.menuSheetDots.replaceChildren();
        refs.menuStageFrame?.style.setProperty("--sheet-count", String(state.catalog.themes.length));

        state.catalog.themes.forEach((theme, index) => {
            const dot = document.createElement("button");
            dot.type = "button";
            dot.className = "home-sheet-dot";
            if (theme.id === activeThemeId) {
                dot.classList.add("active");
            }
            dot.setAttribute("aria-label", `Open ${theme.name} sheet`);
            dot.title = `${index + 1}. ${theme.name}`;
            dot.addEventListener("click", () => {
                setMenuViewedTheme(theme.id);
                menuSceneController.resetCamera();
                renderMenu();
            });
            refs.menuSheetDots.appendChild(dot);
        });
    }

    function bindMenuSheetGestures() {
        if (!refs.menuStageFrame) {
            return;
        }

        refs.menuStageFrame.addEventListener("pointerdown", event => {
            if (event.pointerType === "mouse" && event.button !== 0) {
                return;
            }

            if (event.target.closest("button, a")) {
                return;
            }

            menuSwipePointerId = event.pointerId;
            menuSwipeStartX = event.clientX;
            menuSwipeStartY = event.clientY;
        });

        refs.menuStageFrame.addEventListener("pointerup", event => {
            if (event.pointerId !== menuSwipePointerId) {
                return;
            }

            const deltaX = event.clientX - menuSwipeStartX;
            const deltaY = event.clientY - menuSwipeStartY;
            resetMenuSwipeState();

            if (Math.abs(deltaX) < MENU_SWIPE_THRESHOLD || Math.abs(deltaX) <= Math.abs(deltaY)) {
                return;
            }

            cycleMenuTheme(deltaX < 0 ? 1 : -1);
        });

        refs.menuStageFrame.addEventListener("pointercancel", resetMenuSwipeState);
    }

    function cycleMenuTheme(direction) {
        const themes = state.catalog.themes;
        if (themes.length <= 1) {
            return;
        }

        const currentTheme = getMenuViewedTheme();
        const currentIndex = Math.max(themes.findIndex(theme => theme.id === currentTheme?.id), 0);
        const nextIndex = (currentIndex + direction + themes.length) % themes.length;
        setMenuViewedTheme(themes[nextIndex].id);
        menuSceneController.resetCamera();
        renderMenu();
    }

    function resumeViewedTheme() {
        const viewedTheme = getMenuViewedTheme();
        const themeMap = viewedTheme ? menuMapConfig?.themes?.[viewedTheme.id] : null;
        const levels = viewedTheme ? getLevelsForTheme(state, viewedTheme.id) : [];

        if (!viewedTheme || !themeMap || levels.length === 0) {
            return;
        }

        onStartTheme(viewedTheme.id);
    }

    function getMenuViewedTheme() {
        const themes = state.catalog.themes;
        if (themes.length === 0) {
            return null;
        }

        const preferredThemeId =
            state.ui.menuViewedThemeId
            ?? state.progress.currentThemeId
            ?? themes[0].id;

        return themes.find(theme => theme.id === preferredThemeId) ?? themes[0];
    }

    function setMenuViewedTheme(themeId) {
        if (!state.catalog.themes.some(theme => theme.id === themeId)) {
            return;
        }

        state.ui.menuViewedThemeId = themeId;
    }

    function resetMenuSwipeState() {
        menuSwipePointerId = null;
        menuSwipeStartX = null;
        menuSwipeStartY = null;
    }

    function refreshMenuChromeRefs() {
        refs.menuJournalButton = document.getElementById("menu-journal-btn");
        refs.menuContinueButton = document.getElementById("menu-continue-btn");
        refs.menuPrevThemeButton = document.getElementById("menu-prev-theme-btn");
        refs.menuNextThemeButton = document.getElementById("menu-next-theme-btn");
        refs.menuSheetDots = document.getElementById("menu-sheet-dots");
        refs.menuRouteName = document.getElementById("menu-route-name");
        refs.menuRouteProgress = document.getElementById("menu-route-progress");
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

function getThemeActionLabel(themeId, completedCount, totalCount, currentThemeId, isReady = true) {
    if (!isReady || totalCount === 0) {
        return "Coming Soon";
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
