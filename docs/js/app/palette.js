import { getAvailableElements, getInspectedElement, getPaletteSelectedElement } from "./state.js";

const PALETTE_DRAG_THRESHOLD = 6;

export function createPaletteController({
    refs,
    state,
    bus
}) {
    const prefersCoarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
    const dragState = {
        ghost: null,
        ignoreClick: false,
        isDragging: false,
        pointerId: null,
        startX: 0,
        startY: 0,
        symbol: null
    };

    function bind() {
        if (!refs.elementList) {
            return;
        }

        refs.elementList.addEventListener("pointerdown", handlePalettePointerDown);
        refs.elementList.addEventListener("dragstart", event => {
            event.preventDefault();
        });

        refs.elementList.addEventListener("click", event => {
            if (dragState.ignoreClick) {
                dragState.ignoreClick = false;
                return;
            }

            const template = event.target.closest(".element-template");
            if (!template) {
                return;
            }

            const symbol = template.dataset.element || null;
            bus.publish("interaction:context-changed", {
                source: "palette-click",
                zone: "palette",
                clearBoardSelection: true,
                inspectedSymbol: symbol,
                paletteSymbol: symbol,
                persist: true
            });

            if (prefersCoarsePointer && symbol) {
                bus.publish("element:quick-add", {
                    source: "palette-click",
                    symbol
                });
                return;
            }
        });
    }

    function handlePalettePointerDown(event) {
        if (prefersCoarsePointer || event.pointerType !== "mouse" || event.button !== 0) {
            return;
        }

        const template = event.target.closest(".element-template");
        if (!template) {
            return;
        }

        const symbol = template.dataset.element || null;
        if (!symbol) {
            return;
        }

        dragState.pointerId = event.pointerId;
        dragState.startX = event.clientX;
        dragState.startY = event.clientY;
        dragState.symbol = symbol;
        dragState.isDragging = false;

        document.addEventListener("pointermove", handlePalettePointerMove);
        document.addEventListener("pointerup", handlePalettePointerUp);
        document.addEventListener("pointercancel", handlePalettePointerCancel);
    }

    function handlePalettePointerMove(event) {
        if (event.pointerId !== dragState.pointerId || !dragState.symbol) {
            return;
        }

        if (isPointerOutsideViewport(event.clientX, event.clientY)) {
            cleanupPaletteDragSession();
            return;
        }

        if (!dragState.isDragging) {
            const travelDistance = Math.hypot(
                event.clientX - dragState.startX,
                event.clientY - dragState.startY
            );
            if (travelDistance < PALETTE_DRAG_THRESHOLD) {
                return;
            }

            startPaletteCustomDrag(dragState.symbol, event.clientX, event.clientY);
        }

        updatePaletteDragGhost(event.clientX, event.clientY);
    }

    function handlePalettePointerUp(event) {
        if (event.pointerId !== dragState.pointerId) {
            return;
        }

        if (dragState.isDragging && dragState.symbol) {
            bus.publish("element:drop-at-point", {
                clientX: event.clientX,
                clientY: event.clientY,
                symbol: dragState.symbol
            });
            dragState.ignoreClick = true;
        }

        cleanupPaletteDragSession();
    }

    function handlePalettePointerCancel(event) {
        if (event.pointerId !== dragState.pointerId) {
            return;
        }

        cleanupPaletteDragSession();
    }

    function startPaletteCustomDrag(symbol, clientX, clientY) {
        dragState.isDragging = true;
        state.board.dragElementType = symbol;
        document.body.classList.add("dragging-element");

        bus.publish("interaction:context-changed", {
            source: "palette-drag",
            zone: "palette",
            clearBoardSelection: true,
            inspectedSymbol: symbol,
            paletteSymbol: symbol,
            persist: false
        });

        dragState.ghost = createPaletteDragGhost(symbol);
        document.body.appendChild(dragState.ghost);
        updatePaletteDragGhost(clientX, clientY);
    }

    function createPaletteDragGhost(symbol) {
        const ghost = document.createElement("div");
        ghost.className = "palette-drag-ghost";
        ghost.textContent = symbol;
        return ghost;
    }

    function updatePaletteDragGhost(clientX, clientY) {
        if (!dragState.ghost) {
            return;
        }

        dragState.ghost.style.left = `${clientX}px`;
        dragState.ghost.style.top = `${clientY}px`;
    }

    function cleanupPaletteDragSession() {
        dragState.ghost?.remove();
        dragState.ghost = null;
        dragState.isDragging = false;
        dragState.pointerId = null;
        dragState.startX = 0;
        dragState.startY = 0;
        dragState.symbol = null;
        state.board.dragElementType = null;
        document.body.classList.remove("dragging-element");

        document.removeEventListener("pointermove", handlePalettePointerMove);
        document.removeEventListener("pointerup", handlePalettePointerUp);
        document.removeEventListener("pointercancel", handlePalettePointerCancel);
    }

    function isPointerOutsideViewport(clientX, clientY) {
        return (
            clientX < 0 ||
            clientY < 0 ||
            clientX > document.documentElement.clientWidth ||
            clientY > document.documentElement.clientHeight
        );
    }

    function render() {
        renderAvailableElements();
        renderSelectionUi();
    }

    function renderSelectionUi() {
        syncSelectedElementHighlight();
        renderAddButton();
        renderSelectedElementCard();
    }

    function renderAvailableElements() {
        if (!refs.elementList) {
            return;
        }

        const availableElements = getAvailableElements(state);
        refs.elementList.replaceChildren();

        if (!availableElements.some(element => element.symbol === state.ui.paletteSelectedElementSymbol)) {
            state.ui.paletteSelectedElementSymbol = null;
        }

        availableElements.forEach(element => {
            const template = document.createElement("div");
            template.className = "element-template";
            template.draggable = false;
            template.dataset.element = element.symbol;
            template.title = element.name;
            template.textContent = element.symbol;

            refs.elementList.appendChild(template);
        });

        syncSelectedElementHighlight();
    }

    function syncSelectedElementHighlight() {
        if (!refs.elementList) {
            return;
        }

        [...refs.elementList.querySelectorAll(".element-template")].forEach(template => {
            const templateSymbol = template.dataset.element || null;
            template.classList.toggle("selected", templateSymbol === state.ui.paletteSelectedElementSymbol);
        });
    }

    function renderSelectedElementCard() {
        if (!refs.elementCard) {
            return;
        }

        refs.elementCard.replaceChildren();

        const element = getInspectedElement(state);
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
        meta.textContent = "Available element in the current task progression";
        description.textContent = element.description;

        refs.elementCard.append(symbol, name, meta, description);
    }

    function renderAddButton() {
        if (!refs.addSelectedButton) {
            return;
        }

        const element = getPaletteSelectedElement(state);

        refs.addSelectedButton.disabled = !element;
        refs.addSelectedButton.textContent = element
            ? `Add ${element.symbol} To Board`
            : "Add Selected To Board";
    }

    return {
        bind,
        render,
        renderSelectionUi
    };
}
