import { createHotkeysController } from "../hotkeys.js";
import { createModalController } from "../modals.js";
import { createNavigationController } from "../navigation.js";
import { createPaletteController } from "../palette.js";
import { RUNTIME_EVENT_IDS } from "../contracts/event-contracts.js";
import { createMechanicsRegistry } from "../mechanics/index.js";
import { persistState } from "../storage.js";
import { getActiveMechanicId } from "../state.js";
import { createBasicTutorialController } from "./basic-tutorial-controller.js";
import { createGameplayController } from "./gameplay-controller.js";
import { createMixZoneContextController } from "./mix-zone-context-controller.js";
import { createRuntimeActionRegistry } from "./runtime-actions.js";
import { createSidebarController } from "./sidebar-controller.js";

export function createGameRuntime({
    refs,
    state,
    bus,
    currentPage,
    homeChromeSchemaConfig,
    hotkeysConfig,
    levelBriefsConfig,
    menuMapConfig,
    menuSceneSchemaConfig
}) {
    const mechanicsRegistry = createMechanicsRegistry({
        refs,
        state,
        bus
    });
    const runtimeActions = createRuntimeActionRegistry();
    const getActiveMechanic = () => mechanicsRegistry.get(getActiveMechanicId(state));

    let gameplayController;
    let tutorialController;
    let mixZoneContextController;

    const persistCurrentState = () => {
        getActiveMechanic().captureState?.();
        persistState(state);
    };
    const scheduleBasicTutorialSync = () => {
        tutorialController?.scheduleSync();
    };

    const modalController = createModalController({
        refs,
        state,
        levelBriefsConfig,
        actionRegistry: runtimeActions.registry,
        registerLevelIntroAction: runtimeActions.registerLevelIntroAction,
        createHelpVisual: compound => getActiveMechanic().createHelpVisual(compound),
        onModalStateChanged: scheduleBasicTutorialSync,
        onThemeCompleteClosed: () => gameplayController?.openMainMenu(),
        onStartLevelIntro: theme => gameplayController?.startTheme(theme.id)
    });
    const paletteController = createPaletteController({
        refs,
        state,
        bus
    });

    const navigationController = createNavigationController({
        refs,
        state,
        homeChromeSchemaConfig,
        menuMapConfig,
        menuSceneSchemaConfig,
        levelBriefsConfig,
        actionRegistry: runtimeActions.registry,
        currentPage,
        onBeforeNavigate: persistCurrentState,
        onStartTheme: themeId => gameplayController?.startTheme(themeId),
        onPreviewLevelIntro: (theme, level, options) => modalController.openLevelIntroModal(theme, level, options),
        onSelectElement: (symbol, options) => gameplayController?.selectElement(symbol, options),
        onOpenCompoundModal: modalController.openCompoundModal,
        onOpenElementModal: modalController.openElementModal,
        onOpenMainMenu: () => gameplayController?.openMainMenu(),
        onOpenThemeSelection: () => gameplayController?.openThemeSelection(),
        onOpenJournalScreen: () => gameplayController?.openJournalScreen(),
        onResumeCurrentTheme: () => gameplayController?.resumeCurrentTheme()
    });

    tutorialController = createBasicTutorialController({
        refs,
        state,
        currentPage,
        isOverlayBlocked: () =>
            mixZoneContextController?.isOpen()
            || isModalVisible(refs.compoundModal)
            || isModalVisible(refs.elementModal)
            || isModalVisible(refs.helpModal)
            || isModalVisible(refs.themeCompleteModal)
            || isModalVisible(refs.valencyModal),
        onPersist: persistCurrentState
    });

    gameplayController = createGameplayController({
        refs,
        state,
        getActiveMechanic,
        mechanicsRegistry,
        navigationController,
        paletteController,
        modalController,
        onBeforeBoardReset: () => mixZoneContextController?.closeContextMenu({ restorePreview: false }),
        onPersistState: persistCurrentState,
        onTutorialLevelCompleted: stageId => tutorialController?.setPostLevelStage(stageId),
        onTutorialReset: () => tutorialController?.resetProgress(),
        onTutorialSync: scheduleBasicTutorialSync
    });

    mixZoneContextController = createMixZoneContextController({
        refs,
        state,
        getActiveMechanic,
        onAddElementToBoard: symbol => gameplayController.addElementToBoard(symbol),
        onApplyInteractionContext: context => gameplayController.applyInteractionContext(context),
        onClearBoard: () => gameplayController.clearBoard(),
        onMixAttempt: () => gameplayController.handleMixAttempt(),
        onOverlayStateChanged: scheduleBasicTutorialSync,
        onRemoveBoardNode: nodeId => gameplayController.removeBoardNode(nodeId),
        onRemoveSelectedBoardNodes: () => gameplayController.removeSelectedBoardNodes()
    });

    const sidebarController = createSidebarController({
        refs,
        state,
        getActiveMechanic,
        onPersist: persistCurrentState
    });

    const hotkeysController = createHotkeysController({
        config: hotkeysConfig,
        currentPage,
        onDeleteSelectedNode: () => gameplayController.removeSelectedBoardNodes(),
        onEscape: () => handleEscapeShortcut(mixZoneContextController, modalController, persistCurrentState, scheduleBasicTutorialSync),
        onMixBoard: () => gameplayController.handleMixAttempt(),
        onOpenAddMenu: () => mixZoneContextController.openAddMenuAtCursor(),
        onRefreshBoard: () => gameplayController.clearBoard()
    });

    function init() {
        mechanicsRegistry.init();
        paletteController.bind();
        navigationController.bind();
        modalController.bind();
        hotkeysController.bind();
        mixZoneContextController.bind();
        sidebarController.bind();
        tutorialController.bind();
        bindGameplayControls();
        bindObservers();
        bindActiveZoneTracking();

        gameplayController.refreshAllViews();
        sidebarController.applyLayout();
        scheduleBasicTutorialSync();
        persistCurrentState();

        window.addEventListener("beforeunload", persistCurrentState);
        window.addEventListener("resize", handleWindowResize);
    }

    function handleWindowResize() {
        sidebarController.applyLayout();

        if (mixZoneContextController.isOpen()) {
            mixZoneContextController.positionOverlays();
        }

        getActiveMechanic().sync();
        scheduleBasicTutorialSync();
    }

    function bindGameplayControls() {
        refs.addSelectedButton?.addEventListener("click", gameplayController.addSelectedElementToBoard);
        refs.mixButton?.addEventListener("click", gameplayController.handleMixAttempt);
        refs.clearButton?.addEventListener("click", gameplayController.clearBoard);
    }

    function bindObservers() {
        bus.subscribe(RUNTIME_EVENT_IDS.interactionContextChanged, context => {
            gameplayController.applyInteractionContext(context);
        });

        bus.subscribe(RUNTIME_EVENT_IDS.elementQuickAdd, ({ symbol }) => {
            gameplayController.addElementToBoard(symbol);
        });

        bus.subscribe(RUNTIME_EVENT_IDS.elementDropAtPoint, ({ clientX, clientY, symbol }) => {
            gameplayController.addElementToBoardAtPoint(symbol, clientX, clientY);
        });
    }

    function bindActiveZoneTracking() {
        document.addEventListener("pointerdown", event => {
            if (isManagedInteractiveZone(event.target)) {
                return;
            }

            const zone = resolveActiveZone(event.target);
            if (!zone) {
                return;
            }

            bus.publish(RUNTIME_EVENT_IDS.interactionContextChanged, {
                source: "zone-pointer",
                zone,
                clearBoardSelection: true,
                clearPaletteSelection: true,
                inspectedSymbol: null,
                persist: false
            });
        });
    }

    function isManagedInteractiveZone(target) {
        return target instanceof Element
            && (
                target.closest("#sidebar")
                || target.closest("#palette-toggle-btn")
                || target.closest("#mix-zone")
                || target.closest("#element-list")
                || target.closest("#mix-zone-context-root")
                || target.closest("#menu-header-root")
                || target.closest("#menu-toolbar-root")
                || target.closest("#menu-scene-viewport")
                || target === refs.menuScreen
            );
    }

    return {
        gameplayController,
        init
    };
}

function handleEscapeShortcut(mixZoneContextController, modalController, persistCurrentState, scheduleBasicTutorialSync) {
    if (mixZoneContextController.isOpen()) {
        if (mixZoneContextController.isPickerOpen()) {
            mixZoneContextController.closeElementPicker();
            return;
        }

        mixZoneContextController.closeContextMenu();
        return;
    }

    if (modalController.closeActiveModal()) {
        persistCurrentState();
        scheduleBasicTutorialSync();
    }
}

function resolveActiveZone(target) {
    if (!(target instanceof Element)) {
        return null;
    }

    if (target.closest("#compound-zone")) {
        return "compound-zone";
    }

    if (target.closest("#topbar")) {
        return "topbar";
    }

    if (target.closest("#workspace")) {
        return "workspace";
    }

    if (target.closest("#game-screen")) {
        return "game-screen";
    }

    return null;
}

function isModalVisible(modal) {
    return Boolean(modal && !modal.classList.contains("hidden"));
}
