import { getAvailableElements } from "../state.js";

const MIX_ZONE_DOUBLE_TAP_MS = 320;
const MIX_ZONE_LONG_PRESS_MS = 420;
const MIX_ZONE_TOUCH_MOVE_THRESHOLD = 14;
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

export function createMixZoneContextController({
    refs,
    state,
    getActiveMechanic,
    onAddElementToBoard,
    onApplyInteractionContext,
    onClearBoard,
    onMixAttempt,
    onOverlayStateChanged,
    onRemoveBoardNode,
    onRemoveSelectedBoardNodes
}) {
    const context = {
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
    const pointerState = {
        clientX: null,
        clientY: null
    };

    function bind() {
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

        refs.mixZone.addEventListener("contextmenu", openAtPointer);
        refs.mixZone.addEventListener("pointerdown", handleTouchPointerDown);
        refs.mixZone.addEventListener("pointermove", handleTouchPointerMove);
        refs.mixZone.addEventListener("pointerup", handleTouchPointerUp);
        refs.mixZone.addEventListener("pointercancel", resetTouchGestureState);
        refs.mixZoneContextRoot.addEventListener("contextmenu", event => {
            event.preventDefault();
        });
        refs.mixZoneContextBackdrop.addEventListener("click", () => {
            closeContextMenu();
        });
        refs.mixZoneContextMenu.addEventListener("click", handleContextAction);
        refs.mixZoneContextMenu.addEventListener("mouseover", handleMenuHover);
        refs.mixZonePickerList.addEventListener("click", handlePickerClick);
        refs.mixZonePickerList.addEventListener("mouseover", handlePickerHover);
        document.addEventListener("keydown", handleContextKeydown);
        document.addEventListener("pointermove", trackPointerPosition, { passive: true });
    }

    function trackPointerPosition(event) {
        pointerState.clientX = event.clientX;
        pointerState.clientY = event.clientY;
    }

    function openAtPointer(event) {
        event.preventDefault();
        openAtPoint(
            event.clientX,
            event.clientY,
            resolveContextTarget(event.target)
        );
    }

    function openAtPoint(clientX, clientY, contextTarget = {}) {
        if (!refs.workspace || !refs.mixZoneContextRoot || !refs.mixZoneContextMenu) {
            return;
        }

        const workspaceRect = refs.workspace.getBoundingClientRect();
        context.anchorX = clientX - workspaceRect.left;
        context.anchorY = clientY - workspaceRect.top;
        context.isOpen = true;
        context.isPickerOpen = false;
        context.menuIndex = 0;
        context.menuMode = contextTarget.type === "selection"
            ? "selection"
            : contextTarget.type === "node"
                ? "node"
                : "zone";
        context.restoreInspectedSymbol = null;
        context.targetNodeId = contextTarget.nodeId ?? null;

        refs.mixZoneContextRoot.classList.remove("hidden");
        refs.mixZoneContextRoot.setAttribute("aria-hidden", "false");
        refs.mixZoneContextRoot.classList.remove("picker-open");
        refs.mixZonePicker.classList.add("hidden");

        renderContextMenu();
        renderMenuSelection();
        positionOverlays();
        onOverlayStateChanged?.();
    }

    function handleTouchPointerDown(event) {
        if (!isTouchContextGestureTarget(event)) {
            return;
        }

        resetTouchGestureState();
        context.touchPointerId = event.pointerId;
        context.touchStartX = event.clientX;
        context.touchStartY = event.clientY;
        context.touchMoved = false;
        context.touchLongPressTriggered = false;
        context.touchTargetNodeId = resolveContextTarget(event.target).nodeId ?? null;
        context.touchLongPressTimer = window.setTimeout(() => {
            if (context.touchPointerId !== event.pointerId || context.touchMoved) {
                return;
            }

            context.touchLongPressTriggered = true;
            context.lastTapAt = 0;
            openAtPoint(event.clientX, event.clientY, {
                nodeId: context.touchTargetNodeId,
                type: context.touchTargetNodeId ? "node" : "zone"
            });
        }, MIX_ZONE_LONG_PRESS_MS);
    }

    function handleTouchPointerMove(event) {
        if (event.pointerId !== context.touchPointerId) {
            return;
        }

        if (
            getPointerTravelDistance(event.clientX, event.clientY, context.touchStartX, context.touchStartY)
            <= MIX_ZONE_TOUCH_MOVE_THRESHOLD
        ) {
            return;
        }

        context.touchMoved = true;
        clearLongPressTimer();
    }

    function handleTouchPointerUp(event) {
        if (event.pointerId !== context.touchPointerId) {
            return;
        }

        const wasLongPressTriggered = context.touchLongPressTriggered;
        const wasMoved = context.touchMoved;
        const lastTapAt = context.lastTapAt;
        const lastTapNodeId = context.lastTapNodeId;
        const lastTapX = context.lastTapX;
        const lastTapY = context.lastTapY;
        const currentTapNodeId = context.touchTargetNodeId;

        resetTouchGestureState();

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
                || getPointerTravelDistance(event.clientX, event.clientY, lastTapX, lastTapY)
                    <= MIX_ZONE_TOUCH_MOVE_THRESHOLD
            );

        if (isSecondTap) {
            context.lastTapAt = 0;
            context.lastTapNodeId = null;
            openAtPoint(event.clientX, event.clientY, {
                nodeId: currentTapNodeId,
                type: currentTapNodeId ? "node" : "zone"
            });
            return;
        }

        context.lastTapAt = now;
        context.lastTapNodeId = currentTapNodeId;
        context.lastTapX = event.clientX;
        context.lastTapY = event.clientY;
    }

    function handleContextAction(event) {
        const actionButton = event.target.closest("[data-mix-zone-action]");
        if (!actionButton) {
            return;
        }

        runAction(actionButton.dataset.mixZoneAction);
    }

    function handleMenuHover(event) {
        const actionButton = event.target.closest("[data-mix-zone-action]");
        if (!actionButton) {
            return;
        }

        const buttons = getActionButtons();
        const hoveredIndex = buttons.indexOf(actionButton);
        if (hoveredIndex < 0 || hoveredIndex === context.menuIndex) {
            return;
        }

        context.menuIndex = hoveredIndex;
        renderMenuSelection();
    }

    function runAction(action) {
        if (action === "add") {
            openElementPicker();
            return;
        }

        closeContextMenu({ restorePreview: false });

        if (action === "delete") {
            onRemoveBoardNode?.(context.targetNodeId);
            return;
        }

        if (action === "delete-selected") {
            onRemoveSelectedBoardNodes?.();
            return;
        }

        if (action === "refresh") {
            onClearBoard?.();
            return;
        }

        if (action === "mix") {
            onMixAttempt?.();
        }
    }

    function openAddMenuAtCursor() {
        const anchorPoint = resolveAnchorPoint();
        openAtPoint(anchorPoint.x, anchorPoint.y, { type: "zone" });
        openElementPicker();
    }

    function openElementPicker() {
        const availableElements = getAvailableElements(state);
        if (
            !refs.mixZonePicker
            || !refs.mixZoneContextRoot
            || context.menuMode !== "zone"
            || availableElements.length === 0
        ) {
            return;
        }

        const preferredSymbol = state.ui.inspectedElementSymbol ?? state.ui.paletteSelectedElementSymbol;
        const preferredIndex = availableElements.findIndex(element => element.symbol === preferredSymbol);

        context.isOpen = true;
        context.isPickerOpen = true;
        context.pickerIndex = preferredIndex >= 0 ? preferredIndex : 0;
        context.restoreInspectedSymbol = state.ui.inspectedElementSymbol;

        refs.mixZoneContextRoot.classList.add("picker-open");
        refs.mixZonePicker.classList.remove("hidden");

        renderPicker();
        previewPickerSelection();
        positionOverlays();
        onOverlayStateChanged?.();
    }

    function handlePickerClick(event) {
        const option = event.target.closest("[data-picker-index]");
        if (!option) {
            return;
        }

        context.pickerIndex = Number(option.dataset.pickerIndex);
        commitPickerSelection();
    }

    function handlePickerHover(event) {
        const option = event.target.closest("[data-picker-index]");
        if (!option) {
            return;
        }

        const nextIndex = Number(option.dataset.pickerIndex);
        if (!Number.isFinite(nextIndex) || nextIndex === context.pickerIndex) {
            return;
        }

        context.pickerIndex = nextIndex;
        renderPicker();
        previewPickerSelection();
    }

    function handleContextKeydown(event) {
        if (!context.isOpen) {
            return;
        }

        if (!context.isPickerOpen) {
            if (event.key === "ArrowDown") {
                event.preventDefault();
                moveMenuSelection(1);
                return;
            }

            if (event.key === "ArrowUp") {
                event.preventDefault();
                moveMenuSelection(-1);
                return;
            }

            if (event.key === "Home") {
                event.preventDefault();
                setMenuSelection(0);
                return;
            }

            if (event.key === "End") {
                event.preventDefault();
                setMenuSelection(getActionButtons().length - 1);
                return;
            }

            if (event.key === "ArrowRight") {
                event.preventDefault();
                if (getCurrentAction() === "add") {
                    openElementPicker();
                }
                return;
            }

            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                runAction(getCurrentAction());
            }

            return;
        }

        if (event.key === "ArrowLeft") {
            event.preventDefault();
            closeElementPicker({ restorePreview: true });
            return;
        }

        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            commitPickerSelection();
            return;
        }

        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            event.preventDefault();
            movePickerSelection(1);
            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            movePickerSelection(-1);
            return;
        }

        if (event.key === "Home") {
            event.preventDefault();
            setPickerSelection(0);
            return;
        }

        if (event.key === "End") {
            event.preventDefault();
            setPickerSelection(getAvailableElements(state).length - 1);
        }
    }

    function movePickerSelection(delta) {
        const availableElements = getAvailableElements(state);
        if (availableElements.length === 0) {
            return;
        }

        const nextIndex = context.pickerIndex + delta;
        const wrappedIndex = ((nextIndex % availableElements.length) + availableElements.length) % availableElements.length;
        setPickerSelection(wrappedIndex);
    }

    function setPickerSelection(index) {
        const availableElements = getAvailableElements(state);
        if (availableElements.length === 0) {
            return;
        }

        context.pickerIndex = Math.min(Math.max(index, 0), availableElements.length - 1);
        renderPicker();
        previewPickerSelection();
    }

    function moveMenuSelection(delta) {
        const actionButtons = getActionButtons();
        if (actionButtons.length === 0) {
            return;
        }

        const nextIndex = context.menuIndex + delta;
        const wrappedIndex = ((nextIndex % actionButtons.length) + actionButtons.length) % actionButtons.length;
        setMenuSelection(wrappedIndex);
    }

    function setMenuSelection(index) {
        const actionButtons = getActionButtons();
        if (actionButtons.length === 0) {
            return;
        }

        context.menuIndex = Math.min(Math.max(index, 0), actionButtons.length - 1);
        renderMenuSelection();
    }

    function previewPickerSelection() {
        const selectedElement = getAvailableElements(state)[context.pickerIndex] ?? null;
        if (!selectedElement) {
            return;
        }

        onApplyInteractionContext?.({
            clearBoardSelection: true,
            clearPaletteSelection: true,
            inspectedSymbol: selectedElement.symbol,
            persist: false
        });
    }

    function commitPickerSelection() {
        const selectedElement = getAvailableElements(state)[context.pickerIndex] ?? null;
        if (!selectedElement) {
            return;
        }

        onApplyInteractionContext?.({
            clearBoardSelection: true,
            clearPaletteSelection: true,
            inspectedSymbol: selectedElement.symbol,
            persist: false
        });
        onAddElementToBoard?.(selectedElement.symbol);
        closeContextMenu({ restorePreview: false });
    }

    function closeElementPicker(options = {}) {
        const { restorePreview = true } = options;

        if (!context.isPickerOpen || !refs.mixZoneContextRoot || !refs.mixZonePicker) {
            return;
        }

        context.isPickerOpen = false;
        refs.mixZoneContextRoot.classList.remove("picker-open");
        refs.mixZonePicker.classList.add("hidden");

        if (restorePreview && context.restoreInspectedSymbol !== undefined) {
            onApplyInteractionContext?.({
                inspectedSymbol: context.restoreInspectedSymbol ?? null,
                persist: false
            });
        }

        renderMenuSelection();
        positionOverlays();
        onOverlayStateChanged?.();
    }

    function closeContextMenu(options = {}) {
        const { restorePreview = true } = options;

        if (!context.isOpen || !refs.mixZoneContextRoot || !refs.mixZonePicker) {
            return;
        }

        const restoreInspectedSymbol = context.restoreInspectedSymbol;
        const shouldRestorePreview = restorePreview && context.isPickerOpen;

        context.isOpen = false;
        context.isPickerOpen = false;
        context.restoreInspectedSymbol = null;

        refs.mixZoneContextRoot.classList.add("hidden");
        refs.mixZoneContextRoot.setAttribute("aria-hidden", "true");
        refs.mixZoneContextRoot.classList.remove("picker-open");
        refs.mixZonePicker.classList.add("hidden");

        if (shouldRestorePreview) {
            onApplyInteractionContext?.({
                inspectedSymbol: restoreInspectedSymbol ?? null,
                persist: false
            });
        }

        onOverlayStateChanged?.();
    }

    function renderPicker() {
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
            option.classList.toggle("active", index === context.pickerIndex);

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

    function renderContextMenu() {
        if (!refs.mixZoneContextMenu) {
            return;
        }

        const actions = getMenuActions();
        refs.mixZoneContextMenu.replaceChildren();
        refs.mixZoneContextMenu.setAttribute(
            "aria-label",
            context.menuMode === "selection"
                ? "Selected element actions"
                : context.menuMode === "node"
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

    function renderMenuSelection() {
        const actionButtons = getActionButtons();
        actionButtons.forEach((button, index) => {
            const isActive = index === context.menuIndex;
            button.classList.toggle("active", isActive);
            if (isActive && !context.isPickerOpen) {
                button.focus({ preventScroll: true });
            }
        });
    }

    function getActionButtons() {
        return refs.mixZoneContextMenu
            ? [...refs.mixZoneContextMenu.querySelectorAll("[data-mix-zone-action]")]
            : [];
    }

    function getCurrentAction() {
        return getActionButtons()[context.menuIndex]?.dataset.mixZoneAction ?? null;
    }

    function isTouchContextGestureTarget(event) {
        return event.pointerType === "touch"
            && event.isPrimary !== false
            && event.target instanceof Element
            && !event.target.closest(".connector");
    }

    function getMenuActions() {
        return MIX_ZONE_MENU_ACTIONS[context.menuMode] ?? MIX_ZONE_MENU_ACTIONS.zone;
    }

    function resolveContextTarget(target) {
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

    function resolveAnchorPoint() {
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

    function clearLongPressTimer() {
        if (context.touchLongPressTimer !== null) {
            window.clearTimeout(context.touchLongPressTimer);
            context.touchLongPressTimer = null;
        }
    }

    function resetTouchGestureState() {
        clearLongPressTimer();
        context.touchPointerId = null;
        context.touchMoved = false;
        context.touchLongPressTriggered = false;
        context.touchTargetNodeId = null;
    }

    function positionOverlays() {
        if (!refs.workspace || !refs.mixZoneContextMenu || !refs.mixZoneContextRoot || !context.isOpen) {
            return;
        }

        const menuRect = clampWorkspaceOverlayPosition(
            context.anchorX,
            context.anchorY,
            refs.mixZoneContextMenu.offsetWidth,
            refs.mixZoneContextMenu.offsetHeight
        );

        refs.mixZoneContextMenu.style.left = `${menuRect.left}px`;
        refs.mixZoneContextMenu.style.top = `${menuRect.top}px`;

        if (!context.isPickerOpen || !refs.mixZonePicker) {
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

    function isOpen() {
        return context.isOpen;
    }

    function isPickerOpen() {
        return context.isPickerOpen;
    }

    return {
        bind,
        closeContextMenu,
        closeElementPicker,
        isOpen,
        isPickerOpen,
        openAddMenuAtCursor,
        positionOverlays
    };
}

function getPointerTravelDistance(x1, y1, x2, y2) {
    const deltaX = x1 - x2;
    const deltaY = y1 - y2;
    return Math.hypot(deltaX, deltaY);
}
