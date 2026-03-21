import { loadGameData, loadHotkeysConfig } from "./data.js";
import { createEventBus } from "./app/event-bus.js";
import { createHotkeysController } from "./app/hotkeys.js";
import { createModalController } from "./app/modals.js";
import { createNavigationController } from "./app/navigation.js";
import { createPaletteController } from "./app/palette.js";
import { createRefs } from "./app/refs.js";
import { createMechanicsRegistry } from "./app/mechanics/index.js";
import { loadStoredState, persistState } from "./app/storage.js";
import {
    createState,
    getActiveMechanicId,
    getAvailableElements,
    getCompoundById,
    getCompletedCountForTheme,
    getCurrentLevel,
    getCurrentTheme,
    getLevelsForTheme,
    hydrateState,
    isCurrentLevelTarget
} from "./app/state.js";

const MIX_ZONE_DOUBLE_TAP_MS = 320;
const MIX_ZONE_LONG_PRESS_MS = 420;
const MIX_ZONE_TOUCH_MOVE_THRESHOLD = 14;
const SIDEBAR_MIN_WIDTH = 287;
const SIDEBAR_MAX_WIDTH = 420;
const BASIC_TUTORIAL_THEME_ID = "basic";
const BASIC_TUTORIAL_FIRST_LEVEL_ID = "level-1";
const BASIC_TUTORIAL_BUBBLE_GAP = 16;
const MIX_ZONE_MENU_ACTIONS = {
    node: [
        { id: "delete", label: "Delete" }
    ],
    selection: [
        { id: "delete-selected", label: "Delete" }
    ],
    zone: [
        { id: "add", label: "Add Element" },
        { id: "refresh", label: "Refresh" },
        { id: "mix", label: "Mix" }
    ]
};

export async function initGame() {
    const [gameData, hotkeysConfig] = await Promise.all([
        loadGameData(),
        loadHotkeysConfig()
    ]);
    const refs = createRefs();
    const currentPage = document.body.dataset.page ?? "menu";
    const state = createState(gameData);
    const bus = createEventBus();

    hydrateState(state, loadStoredState());
    state.ui.activeScreen = currentPage;

    const mechanicsRegistry = createMechanicsRegistry({
        refs,
        state,
        bus
    });
    const getActiveMechanic = () => mechanicsRegistry.get(getActiveMechanicId(state));
    const mixZoneContext = {
        anchorX: 0,
        anchorY: 0,
        isOpen: false,
        isPickerOpen: false,
        menuIndex: 0,
        menuMode: "zone",
        pickerIndex: 0,
        restoreInspectedSymbol: null,
        targetNodeId: null,
        touchPointerId: null,
        touchStartX: 0,
        touchStartY: 0,
        touchMoved: false,
        touchLongPressTriggered: false,
        touchLongPressTimer: null,
        touchTargetNodeId: null,
        lastTapAt: 0,
        lastTapNodeId: null,
        lastTapX: 0,
        lastTapY: 0
    };
    const sidebarState = {
        resizePointerId: null
    };
    const pointerState = {
        clientX: null,
        clientY: null
    };
    const basicTutorial = {
        postLevelStage: null,
        syncFrame: null
    };

    let navigationController;

    const modalController = createModalController({
        refs,
        state,
        createHelpVisual: compound => getActiveMechanic().createHelpVisual(compound),
        onModalStateChanged: scheduleBasicTutorialSync,
        onThemeCompleteClosed: () => navigationController.showThemeScreen()
    });
    const paletteController = createPaletteController({
        refs,
        state,
        bus
    });

    navigationController = createNavigationController({
        refs,
        state,
        currentPage,
        onBeforeNavigate: persistCurrentState,
        onStartTheme: startTheme,
        onSelectElement: selectElement,
        onOpenCompoundModal: modalController.openCompoundModal,
        onOpenElementModal: modalController.openElementModal,
        onOpenMainMenu: openMainMenu,
        onOpenThemeSelection: openThemeSelection,
        onOpenJournalScreen: openJournalScreen,
        onResumeCurrentTheme: resumeCurrentTheme
    });
    const hotkeysController = createHotkeysController({
        config: hotkeysConfig,
        currentPage,
        onDeleteSelectedNode: handleDeleteSelectedNodeShortcut,
        onEscape: handleEscapeShortcut,
        onMixBoard: handleMixBoardShortcut,
        onOpenAddMenu: handleOpenAddMenuShortcut,
        onRefreshBoard: handleRefreshBoardShortcut
    });

    mechanicsRegistry.init();
    paletteController.bind();
    navigationController.bind();
    modalController.bind();
    hotkeysController.bind();
    bindGameplayControls();
    bindObservers();
    bindActiveZoneTracking();
    bindBasicTutorialObservers();

    refreshAllViews();
    applySidebarLayout();
    scheduleBasicTutorialSync();
    persistCurrentState();

    window.addEventListener("beforeunload", persistCurrentState);
    document.addEventListener("pointermove", trackPointerPosition, { passive: true });
    window.addEventListener("resize", () => {
        applySidebarLayout();

        if (mixZoneContext.isOpen) {
            positionMixZoneContextOverlays();
        }

        getActiveMechanic().sync();
        scheduleBasicTutorialSync();
    });

    function bindGameplayControls() {
        if (refs.addSelectedButton) {
            refs.addSelectedButton.addEventListener("click", addSelectedElementToBoard);
        }

        if (refs.mixButton) {
            refs.mixButton.addEventListener("click", handleMixAttempt);
        }

        if (refs.clearButton) {
            refs.clearButton.addEventListener("click", clearBoard);
        }

        bindSidebarControls();
        bindMixZoneContextMenu();
    }

    function bindObservers() {
        bus.subscribe("interaction:context-changed", applyInteractionContext);

        bus.subscribe("element:quick-add", ({ symbol }) => {
            addElementToBoard(symbol);
        });

        bus.subscribe("element:drop-at-point", ({ clientX, clientY, symbol }) => {
            addElementToBoardAtPoint(symbol, clientX, clientY);
        });
    }

    function bindBasicTutorialObservers() {
        document.addEventListener("click", scheduleBasicTutorialSync, true);
        document.addEventListener("pointerup", scheduleBasicTutorialSync, true);
        document.addEventListener("pointercancel", scheduleBasicTutorialSync, true);
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

            bus.publish("interaction:context-changed", {
                source: "zone-pointer",
                zone,
                clearBoardSelection: true,
                clearPaletteSelection: true,
                inspectedSymbol: null,
                persist: false
            });
        });
    }

    function trackPointerPosition(event) {
        pointerState.clientX = event.clientX;
        pointerState.clientY = event.clientY;
    }

    function isManagedInteractiveZone(target) {
        return target instanceof Element
            && (
                target.closest("#sidebar")
                || target.closest("#palette-toggle-btn")
                || target.closest("#mix-zone")
                || target.closest("#element-list")
                || target.closest("#mix-zone-context-root")
            );
    }

    function bindMixZoneContextMenu() {
        if (
            !refs.mixZone
            || !refs.mixZoneContextRoot
            || !refs.mixZoneContextBackdrop
            || !refs.mixZoneContextMenu
            || !refs.mixZonePicker
            || !refs.mixZonePickerList
        ) {
            return;
        }

        refs.mixZone.addEventListener("contextmenu", openMixZoneContextMenuAtPointer);
        refs.mixZone.addEventListener("pointerdown", handleMixZoneTouchPointerDown);
        refs.mixZone.addEventListener("pointermove", handleMixZoneTouchPointerMove);
        refs.mixZone.addEventListener("pointerup", handleMixZoneTouchPointerUp);
        refs.mixZone.addEventListener("pointercancel", resetMixZoneTouchGestureState);
        refs.mixZoneContextRoot.addEventListener("contextmenu", event => {
            event.preventDefault();
        });
        refs.mixZoneContextBackdrop.addEventListener("click", () => {
            closeMixZoneContextMenu();
        });
        refs.mixZoneContextMenu.addEventListener("click", handleMixZoneContextAction);
        refs.mixZoneContextMenu.addEventListener("mouseover", handleMixZoneMenuHover);
        refs.mixZonePickerList.addEventListener("click", handleMixZonePickerClick);
        refs.mixZonePickerList.addEventListener("mouseover", handleMixZonePickerHover);
        document.addEventListener("keydown", handleMixZoneContextKeydown);
    }

    function bindSidebarControls() {
        refs.paletteToggleButton?.addEventListener("click", toggleSidebarCollapsed);
        refs.sidebarCollapseButton?.addEventListener("click", toggleSidebarCollapsed);

        refs.sidebarResizeHandle?.addEventListener("pointerdown", event => {
            if (event.pointerType === "touch" || isCompactSidebarLayout()) {
                return;
            }

            event.preventDefault();
            sidebarState.resizePointerId = event.pointerId;
            refs.sidebarResizeHandle.setPointerCapture(event.pointerId);
            refs.sidebar?.classList.add("resizing");

            document.addEventListener("pointermove", handleSidebarResizeMove);
            document.addEventListener("pointerup", stopSidebarResize);
            document.addEventListener("pointercancel", stopSidebarResize);
        });
    }

    function handleSidebarResizeMove(event) {
        if (event.pointerId !== sidebarState.resizePointerId || !refs.gameScreen) {
            return;
        }

        const gameRect = refs.gameScreen.getBoundingClientRect();
        state.ui.sidebarWidth = clampSidebarWidth(event.clientX - gameRect.left);
        state.ui.sidebarCollapsed = false;
        applySidebarLayout();
        getActiveMechanic().sync();
    }

    function stopSidebarResize(event) {
        if (event.pointerId !== sidebarState.resizePointerId) {
            return;
        }

        refs.sidebarResizeHandle?.releasePointerCapture?.(event.pointerId);
        sidebarState.resizePointerId = null;
        refs.sidebar?.classList.remove("resizing");
        document.removeEventListener("pointermove", handleSidebarResizeMove);
        document.removeEventListener("pointerup", stopSidebarResize);
        document.removeEventListener("pointercancel", stopSidebarResize);
        persistCurrentState();
    }

    function toggleSidebarCollapsed() {
        state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed;
        applySidebarLayout();
        getActiveMechanic().sync();
        persistCurrentState();
    }

    function applySidebarLayout() {
        if (!refs.sidebar || !refs.paletteToggleButton) {
            return;
        }

        const isCompactLayout = isCompactSidebarLayout();
        const sidebarWidth = clampSidebarWidth(state.ui.sidebarWidth);
        const isCollapsed = Boolean(state.ui.sidebarCollapsed);

        state.ui.sidebarWidth = sidebarWidth;
        refs.sidebar.style.setProperty("--sidebar-width", `${sidebarWidth}px`);
        refs.sidebar.classList.toggle("collapsed", isCollapsed);

        const toggleLabel = isCollapsed ? "Show Palette" : "Hide Palette";
        refs.paletteToggleButton.textContent = toggleLabel;
        refs.paletteToggleButton.setAttribute("aria-expanded", String(!isCollapsed));

        if (refs.sidebarCollapseButton) {
            refs.sidebarCollapseButton.textContent = isCollapsed ? "Show" : "Hide";
            refs.sidebarCollapseButton.setAttribute("aria-expanded", String(!isCollapsed));
        }

        if (refs.sidebarResizeHandle) {
            refs.sidebarResizeHandle.disabled = isCollapsed || isCompactLayout;
        }
    }

    function isCompactSidebarLayout() {
        return window.matchMedia?.("(max-width: 820px)")?.matches ?? false;
    }

    function openMixZoneContextMenuAtPointer(event) {
        event.preventDefault();
        openMixZoneContextMenuAtPoint(
            event.clientX,
            event.clientY,
            resolveMixZoneContextTarget(event.target)
        );
    }

    function openMixZoneContextMenuAtPoint(clientX, clientY, contextTarget = {}) {
        if (!refs.workspace || !refs.mixZoneContextRoot || !refs.mixZoneContextMenu) {
            return;
        }

        const workspaceRect = refs.workspace.getBoundingClientRect();
        mixZoneContext.anchorX = clientX - workspaceRect.left;
        mixZoneContext.anchorY = clientY - workspaceRect.top;
        mixZoneContext.isOpen = true;
        mixZoneContext.isPickerOpen = false;
        mixZoneContext.menuIndex = 0;
        mixZoneContext.menuMode = contextTarget.type === "selection"
            ? "selection"
            : contextTarget.type === "node"
                ? "node"
                : "zone";
        mixZoneContext.restoreInspectedSymbol = null;
        mixZoneContext.targetNodeId = contextTarget.nodeId ?? null;

        refs.mixZoneContextRoot.classList.remove("hidden");
        refs.mixZoneContextRoot.setAttribute("aria-hidden", "false");
        refs.mixZoneContextRoot.classList.remove("picker-open");
        refs.mixZonePicker.classList.add("hidden");

        renderMixZoneContextMenu();
        renderMixZoneMenuSelection();
        positionMixZoneContextOverlays();
    }

    function handleMixZoneTouchPointerDown(event) {
        if (!isTouchContextGestureTarget(event)) {
            return;
        }

        resetMixZoneTouchGestureState();
        mixZoneContext.touchPointerId = event.pointerId;
        mixZoneContext.touchStartX = event.clientX;
        mixZoneContext.touchStartY = event.clientY;
        mixZoneContext.touchMoved = false;
        mixZoneContext.touchLongPressTriggered = false;
        mixZoneContext.touchTargetNodeId = resolveMixZoneContextTarget(event.target).nodeId ?? null;
        mixZoneContext.touchLongPressTimer = window.setTimeout(() => {
            if (mixZoneContext.touchPointerId !== event.pointerId || mixZoneContext.touchMoved) {
                return;
            }

            mixZoneContext.touchLongPressTriggered = true;
            mixZoneContext.lastTapAt = 0;
            openMixZoneContextMenuAtPoint(event.clientX, event.clientY, {
                nodeId: mixZoneContext.touchTargetNodeId,
                type: mixZoneContext.touchTargetNodeId ? "node" : "zone"
            });
        }, MIX_ZONE_LONG_PRESS_MS);
    }

    function handleMixZoneTouchPointerMove(event) {
        if (event.pointerId !== mixZoneContext.touchPointerId) {
            return;
        }

        if (
            getPointerTravelDistance(event.clientX, event.clientY, mixZoneContext.touchStartX, mixZoneContext.touchStartY)
            <= MIX_ZONE_TOUCH_MOVE_THRESHOLD
        ) {
            return;
        }

        mixZoneContext.touchMoved = true;
        clearMixZoneLongPressTimer();
    }

    function handleMixZoneTouchPointerUp(event) {
        if (event.pointerId !== mixZoneContext.touchPointerId) {
            return;
        }

        const wasLongPressTriggered = mixZoneContext.touchLongPressTriggered;
        const wasMoved = mixZoneContext.touchMoved;
        const lastTapAt = mixZoneContext.lastTapAt;
        const lastTapNodeId = mixZoneContext.lastTapNodeId;
        const lastTapX = mixZoneContext.lastTapX;
        const lastTapY = mixZoneContext.lastTapY;
        const currentTapNodeId = mixZoneContext.touchTargetNodeId;

        resetMixZoneTouchGestureState();

        if (wasLongPressTriggered || wasMoved) {
            return;
        }

        const now = Date.now();
        const isSecondTap =
            lastTapAt > 0
            && now - lastTapAt <= MIX_ZONE_DOUBLE_TAP_MS
            && lastTapNodeId === currentTapNodeId
            && (
                currentTapNodeId !== null
                || getPointerTravelDistance(
                    event.clientX,
                    event.clientY,
                    lastTapX,
                    lastTapY
                ) <= MIX_ZONE_TOUCH_MOVE_THRESHOLD
            );

        if (isSecondTap) {
            mixZoneContext.lastTapAt = 0;
            mixZoneContext.lastTapNodeId = null;
            openMixZoneContextMenuAtPoint(event.clientX, event.clientY, {
                nodeId: currentTapNodeId,
                type: currentTapNodeId ? "node" : "zone"
            });
            return;
        }

        mixZoneContext.lastTapAt = now;
        mixZoneContext.lastTapNodeId = currentTapNodeId;
        mixZoneContext.lastTapX = event.clientX;
        mixZoneContext.lastTapY = event.clientY;
    }

    function handleMixZoneContextAction(event) {
        const actionButton = event.target.closest("[data-mix-zone-action]");
        if (!actionButton) {
            return;
        }

        runMixZoneContextAction(actionButton.dataset.mixZoneAction);
    }

    function handleMixZoneMenuHover(event) {
        const actionButton = event.target.closest("[data-mix-zone-action]");
        if (!actionButton) {
            return;
        }

        const buttons = getMixZoneActionButtons();
        const hoveredIndex = buttons.indexOf(actionButton);
        if (hoveredIndex < 0 || hoveredIndex === mixZoneContext.menuIndex) {
            return;
        }

        mixZoneContext.menuIndex = hoveredIndex;
        renderMixZoneMenuSelection();
    }

    function runMixZoneContextAction(action) {
        if (action === "add") {
            openMixZoneElementPicker();
            return;
        }

        closeMixZoneContextMenu({ restorePreview: false });

        if (action === "delete") {
            removeBoardNode(mixZoneContext.targetNodeId);
            return;
        }

        if (action === "delete-selected") {
            removeSelectedBoardNodes();
            return;
        }

        if (action === "refresh") {
            clearBoard();
            return;
        }

        if (action === "mix") {
            handleMixAttempt();
        }
    }

    function openAddMenuAtCursor() {
        const anchorPoint = resolveMixZoneContextAnchorPoint();
        openMixZoneContextMenuAtPoint(anchorPoint.x, anchorPoint.y, { type: "zone" });
        openMixZoneElementPicker();
    }

    function openMixZoneElementPicker() {
        const availableElements = getAvailableElements(state);
        if (
            !refs.mixZonePicker
            || !refs.mixZoneContextRoot
            || mixZoneContext.menuMode !== "zone"
            || availableElements.length === 0
        ) {
            return;
        }

        const preferredSymbol = state.ui.inspectedElementSymbol ?? state.ui.paletteSelectedElementSymbol;
        const preferredIndex = availableElements.findIndex(element => element.symbol === preferredSymbol);

        mixZoneContext.isOpen = true;
        mixZoneContext.isPickerOpen = true;
        mixZoneContext.pickerIndex = preferredIndex >= 0 ? preferredIndex : 0;
        mixZoneContext.restoreInspectedSymbol = state.ui.inspectedElementSymbol;

        refs.mixZoneContextRoot.classList.add("picker-open");
        refs.mixZonePicker.classList.remove("hidden");

        renderMixZonePicker();
        previewMixZonePickerSelection();
        positionMixZoneContextOverlays();
    }

    function handleMixZonePickerClick(event) {
        const option = event.target.closest("[data-picker-index]");
        if (!option) {
            return;
        }

        mixZoneContext.pickerIndex = Number(option.dataset.pickerIndex);
        commitMixZonePickerSelection();
    }

    function handleMixZonePickerHover(event) {
        const option = event.target.closest("[data-picker-index]");
        if (!option) {
            return;
        }

        const nextIndex = Number(option.dataset.pickerIndex);
        if (!Number.isFinite(nextIndex) || nextIndex === mixZoneContext.pickerIndex) {
            return;
        }

        mixZoneContext.pickerIndex = nextIndex;
        renderMixZonePicker();
        previewMixZonePickerSelection();
    }

    function handleMixZoneContextKeydown(event) {
        if (!mixZoneContext.isOpen) {
            return;
        }

        if (!mixZoneContext.isPickerOpen) {
            if (event.key === "ArrowDown") {
                event.preventDefault();
                moveMixZoneMenuSelection(1);
                return;
            }

            if (event.key === "ArrowUp") {
                event.preventDefault();
                moveMixZoneMenuSelection(-1);
                return;
            }

            if (event.key === "Home") {
                event.preventDefault();
                setMixZoneMenuSelection(0);
                return;
            }

            if (event.key === "End") {
                event.preventDefault();
                setMixZoneMenuSelection(getMixZoneActionButtons().length - 1);
                return;
            }

            if (event.key === "ArrowRight") {
                event.preventDefault();
                if (getCurrentMixZoneAction() === "add") {
                    openMixZoneElementPicker();
                }
                return;
            }

            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                runMixZoneContextAction(getCurrentMixZoneAction());
            }

            return;
        }

        if (event.key === "ArrowLeft") {
            event.preventDefault();
            closeMixZoneElementPicker({ restorePreview: true });
            return;
        }

        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            commitMixZonePickerSelection();
            return;
        }

        if (event.key === "ArrowRight") {
            event.preventDefault();
            moveMixZonePickerSelection(1);
            return;
        }

        if (event.key === "ArrowLeft") {
            event.preventDefault();
            moveMixZonePickerSelection(-1);
            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();
            moveMixZonePickerSelection(1);
            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            moveMixZonePickerSelection(-1);
            return;
        }

        if (event.key === "Home") {
            event.preventDefault();
            setMixZonePickerSelection(0);
            return;
        }

        if (event.key === "End") {
            event.preventDefault();
            setMixZonePickerSelection(getAvailableElements(state).length - 1);
        }
    }

    function moveMixZonePickerSelection(delta) {
        const availableElements = getAvailableElements(state);
        if (availableElements.length === 0) {
            return;
        }

        const nextIndex = mixZoneContext.pickerIndex + delta;
        const wrappedIndex = ((nextIndex % availableElements.length) + availableElements.length) % availableElements.length;
        setMixZonePickerSelection(wrappedIndex);
    }

    function setMixZonePickerSelection(index) {
        const availableElements = getAvailableElements(state);
        if (availableElements.length === 0) {
            return;
        }

        mixZoneContext.pickerIndex = Math.min(Math.max(index, 0), availableElements.length - 1);
        renderMixZonePicker();
        previewMixZonePickerSelection();
    }

    function moveMixZoneMenuSelection(delta) {
        const actionButtons = getMixZoneActionButtons();
        if (actionButtons.length === 0) {
            return;
        }

        const nextIndex = mixZoneContext.menuIndex + delta;
        const wrappedIndex = ((nextIndex % actionButtons.length) + actionButtons.length) % actionButtons.length;
        setMixZoneMenuSelection(wrappedIndex);
    }

    function setMixZoneMenuSelection(index) {
        const actionButtons = getMixZoneActionButtons();
        if (actionButtons.length === 0) {
            return;
        }

        mixZoneContext.menuIndex = Math.min(Math.max(index, 0), actionButtons.length - 1);
        renderMixZoneMenuSelection();
    }

    function previewMixZonePickerSelection() {
        const selectedElement = getAvailableElements(state)[mixZoneContext.pickerIndex] ?? null;
        if (!selectedElement) {
            return;
        }

        applyInteractionContext({
            clearBoardSelection: true,
            clearPaletteSelection: true,
            inspectedSymbol: selectedElement.symbol,
            persist: false
        });
    }

    function commitMixZonePickerSelection() {
        const selectedElement = getAvailableElements(state)[mixZoneContext.pickerIndex] ?? null;
        if (!selectedElement) {
            return;
        }

        applyInteractionContext({
            clearBoardSelection: true,
            clearPaletteSelection: true,
            inspectedSymbol: selectedElement.symbol,
            persist: false
        });
        addElementToBoard(selectedElement.symbol);
        closeMixZoneContextMenu({ restorePreview: false });
    }

    function closeMixZoneElementPicker(options = {}) {
        const { restorePreview = true } = options;

        if (!mixZoneContext.isPickerOpen || !refs.mixZoneContextRoot || !refs.mixZonePicker) {
            return;
        }

        mixZoneContext.isPickerOpen = false;
        refs.mixZoneContextRoot.classList.remove("picker-open");
        refs.mixZonePicker.classList.add("hidden");

        if (restorePreview && mixZoneContext.restoreInspectedSymbol !== undefined) {
            applyInteractionContext({
                inspectedSymbol: mixZoneContext.restoreInspectedSymbol ?? null,
                persist: false
            });
        }

        renderMixZoneMenuSelection();
        positionMixZoneContextOverlays();
    }

    function closeMixZoneContextMenu(options = {}) {
        const { restorePreview = true } = options;

        if (!mixZoneContext.isOpen || !refs.mixZoneContextRoot || !refs.mixZonePicker) {
            return;
        }

        const restoreInspectedSymbol = mixZoneContext.restoreInspectedSymbol;
        const shouldRestorePreview = restorePreview && mixZoneContext.isPickerOpen;

        mixZoneContext.isOpen = false;
        mixZoneContext.isPickerOpen = false;
        mixZoneContext.restoreInspectedSymbol = null;

        refs.mixZoneContextRoot.classList.add("hidden");
        refs.mixZoneContextRoot.setAttribute("aria-hidden", "true");
        refs.mixZoneContextRoot.classList.remove("picker-open");
        refs.mixZonePicker.classList.add("hidden");

        if (shouldRestorePreview) {
            applyInteractionContext({
                inspectedSymbol: restoreInspectedSymbol ?? null,
                persist: false
            });
        }
    }

    function renderMixZonePicker() {
        if (!refs.mixZonePickerList) {
            return;
        }

        const availableElements = getAvailableElements(state);
        refs.mixZonePickerList.replaceChildren();

        availableElements.forEach((element, index) => {
            const option = document.createElement("button");
            const symbol = document.createElement("span");
            const name = document.createElement("span");

            option.type = "button";
            option.className = "mix-zone-picker-option";
            option.dataset.pickerIndex = String(index);
            option.dataset.symbol = element.symbol;
            option.title = element.name;
            option.setAttribute("role", "menuitem");
            option.classList.toggle("active", index === mixZoneContext.pickerIndex);

            symbol.className = "mix-zone-picker-symbol";
            symbol.textContent = element.symbol;

            name.className = "mix-zone-picker-name";
            name.textContent = element.name;

            option.append(symbol, name);
            refs.mixZonePickerList.appendChild(option);
        });

        const activeOption = refs.mixZonePickerList.querySelector(".mix-zone-picker-option.active");
        activeOption?.focus({ preventScroll: true });
        activeOption?.scrollIntoView({ block: "nearest" });
    }

    function renderMixZoneContextMenu() {
        if (!refs.mixZoneContextMenu) {
            return;
        }

        const actions = getMixZoneMenuActions();
        refs.mixZoneContextMenu.replaceChildren();
        refs.mixZoneContextMenu.setAttribute(
            "aria-label",
            mixZoneContext.menuMode === "selection"
                ? "Selected element actions"
                : mixZoneContext.menuMode === "node"
                    ? "Element actions"
                    : "Mix zone actions"
        );

        actions.forEach(action => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "mix-zone-context-action";
            button.dataset.mixZoneAction = action.id;
            button.setAttribute("role", "menuitem");
            button.textContent = action.label;
            refs.mixZoneContextMenu.appendChild(button);
        });
    }

    function renderMixZoneMenuSelection() {
        const actionButtons = getMixZoneActionButtons();
        actionButtons.forEach((button, index) => {
            const isActive = index === mixZoneContext.menuIndex;
            button.classList.toggle("active", isActive);
            if (isActive && !mixZoneContext.isPickerOpen) {
                button.focus({ preventScroll: true });
            }
        });
    }

    function getMixZoneActionButtons() {
        return refs.mixZoneContextMenu
            ? [...refs.mixZoneContextMenu.querySelectorAll("[data-mix-zone-action]")]
            : [];
    }

    function getCurrentMixZoneAction() {
        return getMixZoneActionButtons()[mixZoneContext.menuIndex]?.dataset.mixZoneAction ?? null;
    }

    function isTouchContextGestureTarget(event) {
        return event.pointerType === "touch"
            && event.isPrimary !== false
            && event.target instanceof Element
            && !event.target.closest(".connector");
    }

    function getMixZoneMenuActions() {
        return MIX_ZONE_MENU_ACTIONS[mixZoneContext.menuMode] ?? MIX_ZONE_MENU_ACTIONS.zone;
    }

    function resolveMixZoneContextTarget(target) {
        const selectedNodeIds = getActiveMechanic().getSelectedNodeIds?.() ?? [];
        if (selectedNodeIds.length > 0) {
            return {
                nodeId: selectedNodeIds[0] ?? null,
                type: "selection"
            };
        }

        if (!(target instanceof Element)) {
            return {
                nodeId: null,
                type: "zone"
            };
        }

        const node = target.closest(".node");
        if (node?.dataset.id) {
            return {
                nodeId: node.dataset.id,
                type: "node"
            };
        }

        return {
            nodeId: null,
            type: "zone"
        };
    }

    function resolveMixZoneContextAnchorPoint() {
        if (Number.isFinite(pointerState.clientX) && Number.isFinite(pointerState.clientY)) {
            return {
                x: pointerState.clientX,
                y: pointerState.clientY
            };
        }

        const mixZoneRect = refs.mixZone?.getBoundingClientRect();
        if (mixZoneRect) {
            return {
                x: mixZoneRect.left + (mixZoneRect.width / 2),
                y: mixZoneRect.top + (mixZoneRect.height / 2)
            };
        }

        const workspaceRect = refs.workspace?.getBoundingClientRect();
        return {
            x: workspaceRect ? workspaceRect.left + (workspaceRect.width / 2) : window.innerWidth / 2,
            y: workspaceRect ? workspaceRect.top + (workspaceRect.height / 2) : window.innerHeight / 2
        };
    }

    function clearMixZoneLongPressTimer() {
        if (mixZoneContext.touchLongPressTimer !== null) {
            window.clearTimeout(mixZoneContext.touchLongPressTimer);
            mixZoneContext.touchLongPressTimer = null;
        }
    }

    function resetMixZoneTouchGestureState() {
        clearMixZoneLongPressTimer();
        mixZoneContext.touchPointerId = null;
        mixZoneContext.touchMoved = false;
        mixZoneContext.touchLongPressTriggered = false;
        mixZoneContext.touchTargetNodeId = null;
    }

    function getPointerTravelDistance(x1, y1, x2, y2) {
        const deltaX = x1 - x2;
        const deltaY = y1 - y2;
        return Math.hypot(deltaX, deltaY);
    }

    function clampSidebarWidth(width) {
        return Math.min(Math.max(width, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);
    }

    function positionMixZoneContextOverlays() {
        if (!refs.workspace || !refs.mixZoneContextMenu || !refs.mixZoneContextRoot || !mixZoneContext.isOpen) {
            return;
        }

        const menuRect = clampWorkspaceOverlayPosition(
            mixZoneContext.anchorX,
            mixZoneContext.anchorY,
            refs.mixZoneContextMenu.offsetWidth,
            refs.mixZoneContextMenu.offsetHeight
        );

        refs.mixZoneContextMenu.style.left = `${menuRect.left}px`;
        refs.mixZoneContextMenu.style.top = `${menuRect.top}px`;

        if (!mixZoneContext.isPickerOpen || !refs.mixZonePicker) {
            return;
        }

        const gap = 12;
        const pickerWidth = refs.mixZonePicker.offsetWidth;
        const pickerHeight = refs.mixZonePicker.offsetHeight;
        const fitsRight = menuRect.left + refs.mixZoneContextMenu.offsetWidth + gap + pickerWidth <= refs.workspace.clientWidth - 12;
        const preferredLeft = fitsRight
            ? menuRect.left + refs.mixZoneContextMenu.offsetWidth + gap
            : menuRect.left - pickerWidth - gap;
        const pickerRect = clampWorkspaceOverlayPosition(
            preferredLeft,
            menuRect.top,
            pickerWidth,
            pickerHeight
        );

        refs.mixZonePicker.style.left = `${pickerRect.left}px`;
        refs.mixZonePicker.style.top = `${pickerRect.top}px`;
    }

    function clampWorkspaceOverlayPosition(left, top, width, height) {
        const padding = 12;
        const maxLeft = Math.max(refs.workspace.clientWidth - width - padding, padding);
        const maxTop = Math.max(refs.workspace.clientHeight - height - padding, padding);

        return {
            left: Math.min(Math.max(left, padding), maxLeft),
            top: Math.min(Math.max(top, padding), maxTop)
        };
    }

    function scheduleBasicTutorialSync() {
        if (basicTutorial.syncFrame !== null) {
            cancelAnimationFrame(basicTutorial.syncFrame);
        }

        basicTutorial.syncFrame = requestAnimationFrame(() => {
            basicTutorial.syncFrame = null;
            syncBasicTutorial();
        });
    }

    function syncBasicTutorial() {
        if (!refs.tutorialOverlay || !refs.tutorialBubble || !refs.tutorialBubbleText || !refs.tutorialHighlight) {
            return;
        }

        const stageId = getBasicTutorialStage();
        if (!stageId || isTutorialBlocked()) {
            hideBasicTutorial();
            return;
        }

        const stage = getBasicTutorialStageConfig(stageId);
        if (!stage?.targetRect) {
            hideBasicTutorial();
            return;
        }

        renderBasicTutorial(stage);
    }

    function getBasicTutorialStage() {
        if (currentPage !== "game" || state.progress.basicTutorialCompleted) {
            return null;
        }

        const currentTheme = getCurrentTheme(state);
        if (currentTheme?.id !== BASIC_TUTORIAL_THEME_ID) {
            return null;
        }

        if (state.progress.completedLevelIds.has(BASIC_TUTORIAL_FIRST_LEVEL_ID)) {
            return basicTutorial.postLevelStage ?? "after-mix";
        }

        const currentLevel = getCurrentLevel(state);
        if (!currentLevel || currentLevel.id !== BASIC_TUTORIAL_FIRST_LEVEL_ID) {
            return null;
        }

        const targetCompound = getCompoundById(state, currentLevel.targetCompoundId);
        const requiredNodeCount = targetCompound?.ingredients?.length ?? 0;
        const requiredConnectionCount = targetCompound?.structure?.edges?.length ?? Math.max(requiredNodeCount - 1, 0);
        const nodeCount = state.board.savedNodes.length;
        const connectionCount = state.board.savedConnections.length;

        if (state.board.dragElementType) {
            return "drop-on-board";
        }

        if (nodeCount < requiredNodeCount) {
            return "pick-next-element";
        }

        if (connectionCount < requiredConnectionCount) {
            return "connect-atoms";
        }

        return "mix-compound";
    }

    function getBasicTutorialStageConfig(stageId) {
        switch (stageId) {
            case "pick-next-element": {
                const target = getTutorialPaletteTarget();
                const nextSymbol = getTutorialNextRequiredSymbol();
                return target
                    ? {
                        actionLabel: null,
                        arrow: false,
                        onAction: null,
                        placement: "right",
                        targetRect: target.getBoundingClientRect(),
                        text: nextSymbol
                            ? `Drag ${nextSymbol} onto the board. Keep following the highlighted element until the full molecule is placed.`
                            : "Drag the highlighted element onto the board to continue building the molecule."
                    }
                    : null;
            }
            case "drop-on-board":
                return refs.mixZone
                    ? {
                        actionLabel: null,
                        arrow: true,
                        onAction: null,
                        placement: "top-left",
                        targetRect: refs.mixZone.getBoundingClientRect(),
                        text: "Drop the element inside the board area. For H2O, place two H atoms and one O atom first."
                    }
                    : null;
            case "connect-atoms": {
                const target = getTutorialConnectionTarget();
                return target
                    ? {
                        actionLabel: null,
                        arrow: false,
                        onAction: null,
                        placement: "top",
                        targetRect: target.getBoundingClientRect(),
                        text: "Now connect the atoms: drag from this connector to another atom to build the correct structure."
                    }
                    : null;
            }
            case "mix-compound":
                return refs.mixButton
                    ? {
                        actionLabel: null,
                        arrow: false,
                        onAction: null,
                        placement: "bottom-left",
                        targetRect: refs.mixButton.getBoundingClientRect(),
                        text: "Once the atoms and connections are ready, press Mix and the game will check your molecule."
                    }
                    : null;
            case "after-mix": {
                const target = getTutorialPostMixTarget();
                return target
                    ? {
                        actionLabel: "Next",
                        arrow: false,
                        onAction: () => {
                            basicTutorial.postLevelStage = "hotkeys";
                            scheduleBasicTutorialSync();
                        },
                        placement: "bottom-left",
                        targetRect: target.getBoundingClientRect(),
                        text: "After Mix, the game checks the ingredients and the links, then shows the result in the top panel."
                    }
                    : null;
            }
            case "hotkeys":
                return refs.controls
                    ? {
                        actionLabel: "Next",
                        arrow: false,
                        onAction: () => {
                            basicTutorial.postLevelStage = "journal-nav";
                            scheduleBasicTutorialSync();
                        },
                        placement: "bottom-left",
                        targetRect: refs.controls.getBoundingClientRect(),
                        text: "Hotkeys: Shift + A opens the add menu, Shift + M runs Mix, Shift + R clears the board, Delete removes the selection, and Esc closes overlays."
                    }
                    : null;
            case "journal-nav":
                return refs.journalButton
                    ? {
                        actionLabel: "Next",
                        arrow: false,
                        onAction: () => {
                            basicTutorial.postLevelStage = "menu-nav";
                            scheduleBasicTutorialSync();
                        },
                        placement: "bottom-left",
                        targetRect: refs.journalButton.getBoundingClientRect(),
                        text: "Use Journal to review discovered compounds and the elements you have already unlocked."
                    }
                    : null;
            case "menu-nav":
                return refs.menuButton
                    ? {
                        actionLabel: "Got it",
                        arrow: false,
                        onAction: () => {
                            basicTutorial.postLevelStage = null;
                            state.progress.basicTutorialCompleted = true;
                            persistCurrentState();
                            hideBasicTutorial();
                        },
                        placement: "bottom-left",
                        targetRect: refs.menuButton.getBoundingClientRect(),
                        text: "Use Menu whenever you want to leave the lab, return to navigation, and pick a different section."
                    }
                    : null;
            default:
                return null;
        }
    }

    function renderBasicTutorial(stage) {
        refs.tutorialOverlay.classList.remove("hidden");
        refs.tutorialOverlay.setAttribute("aria-hidden", "false");

        refs.tutorialBubbleText.textContent = stage.text;

        if (refs.tutorialBubbleAction) {
            refs.tutorialBubbleAction.onclick = null;
            if (stage.actionLabel && typeof stage.onAction === "function") {
                refs.tutorialBubbleAction.textContent = stage.actionLabel;
                refs.tutorialBubbleAction.classList.remove("hidden");
                refs.tutorialBubbleAction.onclick = stage.onAction;
            } else {
                refs.tutorialBubbleAction.classList.add("hidden");
                refs.tutorialBubbleAction.textContent = "";
            }
        }

        positionTutorialHighlight(stage.targetRect);

        refs.tutorialBubble.style.left = "-9999px";
        refs.tutorialBubble.style.top = "-9999px";
        refs.tutorialBubble.style.maxWidth = "300px";

        const bubbleRect = refs.tutorialBubble.getBoundingClientRect();
        const bubblePosition = getTutorialBubblePosition(stage.targetRect, bubbleRect, stage.placement);

        refs.tutorialBubble.style.left = `${bubblePosition.left}px`;
        refs.tutorialBubble.style.top = `${bubblePosition.top}px`;

        positionTutorialArrow(stage.targetRect, refs.tutorialBubble.getBoundingClientRect(), stage.arrow);
    }

    function hideBasicTutorial() {
        refs.tutorialOverlay?.classList.add("hidden");
        refs.tutorialOverlay?.setAttribute("aria-hidden", "true");
        refs.tutorialArrow?.classList.add("hidden");

        if (refs.tutorialBubbleAction) {
            refs.tutorialBubbleAction.onclick = null;
        }
    }

    function positionTutorialHighlight(targetRect) {
        if (!refs.tutorialHighlight) {
            return;
        }

        const padding = 10;
        refs.tutorialHighlight.style.left = `${Math.max(targetRect.left - padding, 8)}px`;
        refs.tutorialHighlight.style.top = `${Math.max(targetRect.top - padding, 8)}px`;
        refs.tutorialHighlight.style.width = `${Math.max(targetRect.width + (padding * 2), 24)}px`;
        refs.tutorialHighlight.style.height = `${Math.max(targetRect.height + (padding * 2), 24)}px`;
    }

    function positionTutorialArrow(targetRect, bubbleRect, shouldShowArrow) {
        if (!refs.tutorialArrow) {
            return;
        }

        if (!shouldShowArrow) {
            refs.tutorialArrow.classList.add("hidden");
            return;
        }

        const startX = bubbleRect.left + (bubbleRect.width / 2);
        const startY = bubbleRect.top + (bubbleRect.height / 2);
        const endX = targetRect.left + (targetRect.width / 2);
        const endY = targetRect.top + Math.min(targetRect.height * 0.35, 72);
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const length = Math.max(Math.hypot(deltaX, deltaY) - 22, 48);
        const angle = Math.atan2(deltaY, deltaX);

        refs.tutorialArrow.classList.remove("hidden");
        refs.tutorialArrow.style.left = `${startX}px`;
        refs.tutorialArrow.style.top = `${startY}px`;
        refs.tutorialArrow.style.width = `${length}px`;
        refs.tutorialArrow.style.transform = `rotate(${angle}rad)`;
    }

    function getTutorialBubblePosition(targetRect, bubbleRect, placement = "bottom-left") {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const maxLeft = Math.max(viewportWidth - bubbleRect.width - 12, 12);
        const maxTop = Math.max(viewportHeight - bubbleRect.height - 12, 12);

        const preferredPositions = {
            "bottom-left": {
                left: targetRect.left,
                top: targetRect.bottom + BASIC_TUTORIAL_BUBBLE_GAP
            },
            right: {
                left: targetRect.right + BASIC_TUTORIAL_BUBBLE_GAP,
                top: targetRect.top + ((targetRect.height - bubbleRect.height) / 2)
            },
            top: {
                left: targetRect.left + ((targetRect.width - bubbleRect.width) / 2),
                top: targetRect.top - bubbleRect.height - BASIC_TUTORIAL_BUBBLE_GAP
            },
            "top-left": {
                left: targetRect.left + 12,
                top: targetRect.top + 12
            }
        };

        const preferred = preferredPositions[placement] ?? preferredPositions["bottom-left"];

        return {
            left: Math.min(Math.max(preferred.left, 12), maxLeft),
            top: Math.min(Math.max(preferred.top, 12), maxTop)
        };
    }

    function getTutorialPaletteTarget() {
        if (!refs.elementList) {
            return null;
        }

        const preferredSymbol = getTutorialNextRequiredSymbol();
        const preferredTile = preferredSymbol
            ? refs.elementList.querySelector(`.element-template[data-element="${preferredSymbol}"]`)
            : null;

        return preferredTile ?? refs.elementList.querySelector(".element-template");
    }

    function getTutorialNextRequiredSymbol() {
        const currentLevel = getCurrentLevel(state);
        const targetCompound = currentLevel ? getCompoundById(state, currentLevel.targetCompoundId) : null;
        const requiredSymbols = targetCompound?.structure?.nodes ?? targetCompound?.ingredients ?? [];

        if (!Array.isArray(requiredSymbols) || requiredSymbols.length === 0) {
            return null;
        }

        const remainingCounts = new Map();
        requiredSymbols.forEach(symbol => {
            remainingCounts.set(symbol, (remainingCounts.get(symbol) ?? 0) + 1);
        });

        state.board.savedNodes.forEach(node => {
            const remainingCount = remainingCounts.get(node.symbol) ?? 0;
            if (remainingCount > 0) {
                remainingCounts.set(node.symbol, remainingCount - 1);
            }
        });

        return requiredSymbols.find(symbol => (remainingCounts.get(symbol) ?? 0) > 0) ?? null;
    }

    function getTutorialConnectionTarget() {
        const preferredSymbol = getPreferredConnectorSymbol();
        const preferredNode = preferredSymbol
            ? refs.mixZone?.querySelector(`.node[data-symbol="${preferredSymbol}"]`)
            : null;
        const fallbackNode = preferredNode ?? refs.mixZone?.querySelector(".node");

        return fallbackNode?.querySelector(".connector.right")
            ?? fallbackNode?.querySelector(".connector")
            ?? null;
    }

    function getPreferredConnectorSymbol() {
        const currentLevel = getCurrentLevel(state);
        const targetCompound = currentLevel ? getCompoundById(state, currentLevel.targetCompoundId) : null;
        const structureNodes = targetCompound?.structure?.nodes;
        const structureEdges = targetCompound?.structure?.edges;

        if (!Array.isArray(structureNodes) || !Array.isArray(structureEdges)) {
            return targetCompound?.ingredients?.[0] ?? null;
        }

        const degreeByIndex = new Map(structureNodes.map((_, index) => [index, 0]));
        structureEdges.forEach(([fromIndex, toIndex]) => {
            degreeByIndex.set(fromIndex, (degreeByIndex.get(fromIndex) ?? 0) + 1);
            degreeByIndex.set(toIndex, (degreeByIndex.get(toIndex) ?? 0) + 1);
        });

        const preferredIndex = [...degreeByIndex.entries()]
            .sort((left, right) => right[1] - left[1])[0]?.[0];

        return Number.isInteger(preferredIndex) ? structureNodes[preferredIndex] : targetCompound?.ingredients?.[0] ?? null;
    }

    function getTutorialPostMixTarget() {
        if (refs.result && refs.result.textContent?.trim()) {
            return refs.result;
        }

        return refs.mixButton ?? null;
    }

    function isTutorialBlocked() {
        return Boolean(
            mixZoneContext.isOpen
            || isModalVisible(refs.compoundModal)
            || isModalVisible(refs.elementModal)
            || isModalVisible(refs.helpModal)
            || isModalVisible(refs.themeCompleteModal)
            || isModalVisible(refs.valencyModal)
        );
    }

    function isModalVisible(modal) {
        return Boolean(modal && !modal.classList.contains("hidden"));
    }

    function persistCurrentState() {
        getActiveMechanic().captureState?.();
        persistState(state);
    }

    function addSelectedElementToBoard() {
        const selectedSymbol = state.ui.paletteSelectedElementSymbol;
        if (!selectedSymbol) {
            return;
        }

        addElementToBoard(selectedSymbol);
    }

    function addElementToBoard(symbol) {
        if (!symbol) {
            return;
        }

        getActiveMechanic().spawnElement?.(symbol);
        persistCurrentState();
        scheduleBasicTutorialSync();
    }

    function addElementToBoardAtPoint(symbol, clientX, clientY) {
        if (!symbol || !Number.isFinite(clientX) || !Number.isFinite(clientY)) {
            return;
        }

        const node = getActiveMechanic().spawnElementAtClientPoint?.(symbol, clientX, clientY);
        if (!node) {
            return;
        }

        persistCurrentState();
        scheduleBasicTutorialSync();
    }

    function handleMixAttempt() {
        const valencyValidation = getActiveMechanic().validateValency?.();
        if (valencyValidation && !valencyValidation.isValid) {
            registerFailedAttempt({ suppressAutoHelp: true });
            if (refs.result) {
                refs.result.textContent = "This structure breaks the current valency rules.";
            }
            modalController.openValencyModal(valencyValidation);
            persistCurrentState();
            scheduleBasicTutorialSync();
            return;
        }

        const evaluation = getActiveMechanic().evaluate();

        if (evaluation.status === "unknown") {
            registerFailedAttempt();
            if (refs.result) {
                refs.result.textContent = "Unknown compound.";
            }
            persistCurrentState();
            scheduleBasicTutorialSync();
            return;
        }

        if (evaluation.status === "structure-mismatch") {
            registerFailedAttempt();
            if (refs.result) {
                refs.result.textContent =
                    `The atoms are correct for ${evaluation.compound.formula}, ` +
                    "but the connection pattern is wrong.";
            }
            persistCurrentState();
            scheduleBasicTutorialSync();
            return;
        }

        const compound = evaluation.compound;
        addDiscoveredCompound(compound);

        if (isCurrentLevelTarget(state, compound)) {
            handleLevelComplete(compound);
            persistCurrentState();
            scheduleBasicTutorialSync();
            return;
        }

        const currentLevel = getCurrentLevel(state);
        if (currentLevel) {
            registerFailedAttempt();
            const targetCompound = getCompoundById(state, currentLevel.targetCompoundId);
            if (refs.result) {
                refs.result.textContent =
                    `You built ${compound.formula} (${compound.name}), ` +
                    `but the current target is ${targetCompound?.formula ?? currentLevel.hint}.`;
            }
            persistCurrentState();
            scheduleBasicTutorialSync();
            return;
        }

        if (refs.result) {
            refs.result.textContent = `You built ${compound.formula} (${compound.name}).`;
        }
        persistCurrentState();
        scheduleBasicTutorialSync();
    }

    function selectElement(symbol, options = {}) {
        const { persist = true } = options;

        applyInteractionContext({
            paletteSymbol: symbol,
            inspectedSymbol: symbol,
            persist
        });
    }

    function applyInteractionContext(context = {}) {
        const {
            clearBoardSelection = false,
            clearPaletteSelection = false,
            inspectedSymbol,
            paletteSymbol,
            persist = false
        } = context;

        if (clearBoardSelection) {
            clearBoardSelectionState();
        }

        if (clearPaletteSelection) {
            state.ui.paletteSelectedElementSymbol = null;
        }

        if ("paletteSymbol" in context) {
            state.ui.paletteSelectedElementSymbol = paletteSymbol ?? null;
        }

        if ("inspectedSymbol" in context) {
            state.ui.inspectedElementSymbol = inspectedSymbol ?? null;
        }

        paletteController.renderSelectionUi();
        scheduleBasicTutorialSync();

        if (persist) {
            persistCurrentState();
        }
    }

    function clearBoardSelectionState() {
        getActiveMechanic().clearSelection?.({ silent: true });
    }

    function refreshAllViews() {
        navigationController.renderMenu();
        navigationController.renderThemeList();
        navigationController.renderJournal();
        paletteController.render();
        renderCurrentLevel();
        renderDiscoveredCompounds();
        getActiveMechanic().sync();
        scheduleBasicTutorialSync();
    }

    function refreshMetaViews() {
        navigationController.renderMenu();
        navigationController.renderThemeList();
        navigationController.renderJournal();
    }

    function openThemeSelection() {
        navigationController.renderThemeList();
        navigationController.showThemeScreen();
    }

    function openJournalScreen() {
        navigationController.renderJournal();
        navigationController.showJournalScreen();
    }

    function openMainMenu() {
        navigationController.renderMenu();
        navigationController.showMenuScreen();
    }

    function resumeCurrentTheme() {
        if (!getCurrentTheme(state)) {
            openThemeSelection();
            return;
        }

        renderCurrentLevel();
        paletteController.render();
        renderDiscoveredCompounds();
        navigationController.showGameScreen();
        getActiveMechanic().sync();
        persistCurrentState();
        scheduleBasicTutorialSync();
    }

    function startTheme(themeId) {
        if (!state.catalog.themes.some(theme => theme.id === themeId)) {
            return;
        }

        state.progress.currentThemeId = themeId;
        resetFailedAttempts();
        mechanicsRegistry.resetAll();
        if (refs.result) {
            refs.result.textContent = "";
        }

        refreshMetaViews();
        paletteController.render();
        renderCurrentLevel();
        persistCurrentState();
        navigationController.showGameScreen();
        basicTutorial.postLevelStage = null;
        scheduleBasicTutorialSync();
    }

    function clearBoard() {
        closeMixZoneContextMenu({ restorePreview: false });
        resetFailedAttempts();
        mechanicsRegistry.resetAll();
        if (refs.result) {
            refs.result.textContent = "";
        }
        persistCurrentState();
        scheduleBasicTutorialSync();
    }

    function handleEscapeShortcut() {
        if (mixZoneContext.isOpen) {
            if (mixZoneContext.isPickerOpen) {
                closeMixZoneElementPicker();
                return;
            }

            closeMixZoneContextMenu();
            return;
        }

        if (modalController.closeActiveModal()) {
            persistCurrentState();
            scheduleBasicTutorialSync();
        }
    }

    function handleOpenAddMenuShortcut() {
        openAddMenuAtCursor();
    }

    function handleRefreshBoardShortcut() {
        clearBoard();
    }

    function handleMixBoardShortcut() {
        handleMixAttempt();
    }

    function handleDeleteSelectedNodeShortcut() {
        removeSelectedBoardNodes();
    }

    function registerFailedAttempt(options = {}) {
        const { suppressAutoHelp = false } = options;
        if (!getCurrentLevel(state)) {
            return;
        }

        state.progress.failedAttempts += 1;

        if (!suppressAutoHelp && state.progress.failedAttempts >= 3) {
            state.progress.failedAttempts = 0;
            modalController.openHelpModal();
        }
    }

    function resetFailedAttempts() {
        state.progress.failedAttempts = 0;
    }

    function removeBoardNode(nodeId) {
        if (!nodeId) {
            return;
        }

        getActiveMechanic().removeNodeById?.(nodeId);
        persistCurrentState();
        scheduleBasicTutorialSync();
    }

    function removeSelectedBoardNodes() {
        const selectedNodeIds = getActiveMechanic().getSelectedNodeIds?.() ?? [];
        if (selectedNodeIds.length === 0) {
            return;
        }

        getActiveMechanic().removeNodesByIds?.(selectedNodeIds);
        persistCurrentState();
        scheduleBasicTutorialSync();
    }

    function addDiscoveredCompound(compound) {
        const isNewDiscovery = !state.progress.discoveredCompounds.has(compound.id);
        state.progress.discoveredCompounds.add(compound.id);

        if (isNewDiscovery) {
            state.progress.discoveryHistory.push(compound.id);
        }

        navigationController.renderMenu();
        renderDiscoveredCompounds();
        navigationController.renderJournal();

        if (isNewDiscovery) {
            modalController.openCompoundModal(compound);
        }
    }

    function renderDiscoveredCompounds() {
        if (!refs.compoundList) {
            return;
        }

        refs.compoundList.replaceChildren();

        if (state.progress.discoveredCompounds.size === 0) {
            const emptyState = document.createElement("div");
            emptyState.className = "empty-state";
            emptyState.textContent = "No compounds discovered yet";
            refs.compoundList.appendChild(emptyState);
            return;
        }

        state.progress.discoveryHistory.forEach(compoundId => {
            const compound = getCompoundById(state, compoundId);
            if (!compound) {
                return;
            }

            const card = document.createElement("button");
            const formula = document.createElement("div");
            const name = document.createElement("div");

            card.type = "button";
            card.className = "compound-card clickable";
            formula.className = "compound-formula";
            name.className = "compound-name";

            formula.textContent = compound.formula;
            name.textContent = compound.name;
            card.addEventListener("click", () => {
                modalController.openCompoundModal(compound);
            });

            card.append(formula, name);
            refs.compoundList.appendChild(card);
        });
    }

    function renderCurrentLevel() {
        if (!refs.levelIndicator || !refs.task || !refs.hint) {
            return;
        }

        const theme = getCurrentTheme(state);

        if (!theme) {
            refs.levelIndicator.textContent = "Choose a theme";
            refs.task.textContent = "Select a theme to start its chemistry tasks.";
            refs.hint.textContent = "Each theme can point to its own mechanic or mini-game.";
            return;
        }

        const themeLevels = getLevelsForTheme(state, theme.id);
        const currentLevel = getCurrentLevel(state);

        if (!currentLevel) {
            refs.levelIndicator.textContent =
                `${theme.name} | ${getCompletedCountForTheme(state, theme.id)}/${themeLevels.length} complete`;
            refs.task.textContent = `${theme.name} theme complete`;
            refs.hint.textContent = "Open Themes to choose another theme or keep experimenting with the elements you have already unlocked.";
            return;
        }

        const currentIndex = themeLevels.findIndex(level => level.id === currentLevel.id);
        refs.levelIndicator.textContent = `${theme.name} | Task ${currentIndex + 1} of ${themeLevels.length}`;
        refs.task.textContent = currentLevel.objective;
        refs.hint.textContent = `Hint: ${currentLevel.hint}`;
    }

    function handleLevelComplete(compound) {
        const currentLevel = getCurrentLevel(state);
        const currentTheme = getCurrentTheme(state);

        if (!currentLevel || !currentTheme) {
            return;
        }

        const themeLevels = getLevelsForTheme(state, currentTheme.id);
        const completedLevelNumber = themeLevels.findIndex(level => level.id === currentLevel.id) + 1;
        const hadRemainingThemeLevels = themeLevels.some(level =>
            level.id !== currentLevel.id && !state.progress.completedLevelIds.has(level.id)
        );

        resetFailedAttempts();
        state.progress.completedLevelIds.add(currentLevel.id);
        mechanicsRegistry.resetAll();

        if (currentTheme.id === BASIC_TUTORIAL_THEME_ID && currentLevel.id === BASIC_TUTORIAL_FIRST_LEVEL_ID) {
            basicTutorial.postLevelStage = "after-mix";
        }

        if (hadRemainingThemeLevels) {
            refreshMetaViews();
            paletteController.render();
            renderCurrentLevel();
            if (refs.result) {
                refs.result.textContent =
                    `${currentTheme.name} task ${completedLevelNumber} complete! ` +
                    `You built ${compound.formula} (${compound.name}).`;
            }
            scheduleBasicTutorialSync();
            return;
        }

        state.progress.currentThemeId = null;
        refreshMetaViews();
        paletteController.render();
        renderCurrentLevel();
        if (refs.result) {
            refs.result.textContent = "";
        }
        modalController.closeCompoundModal();
        modalController.openThemeCompleteModal(currentTheme);
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
