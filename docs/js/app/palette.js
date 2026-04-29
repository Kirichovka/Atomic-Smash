import { getAvailableElements, getInspectedElement, getPaletteSelectedElement } from "./state.js";
import { RUNTIME_EVENT_IDS } from "./contracts/event-contracts.js";
import { createPaletteRuntimeContentBuilder } from "./palette-runtime/content-builders.js";
import { createRuntimeContentBuilder } from "./runtime-content/factory.js";
import { RUNTIME_CONTENT_BUILDER_KIND } from "./runtime-content/contracts.js";

const PALETTE_DRAG_THRESHOLD = 6;

export function createPaletteController({
    refs,
    state,
    bus,
    schemaConfig
}) {
    const paletteContentBuilder = createRuntimeContentBuilder({
        kind: RUNTIME_CONTENT_BUILDER_KIND.palette,
        factory: createPaletteRuntimeContentBuilder
    });
    const prefersCoarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
    const dragState = {
        ghost: null,
        ignoreClick: false,
        isDragging: false,
        lastClientX: 0,
        lastClientY: 0,
        pointerId: null,
        sourceElement: null,
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
            bus.publish(RUNTIME_EVENT_IDS.interactionContextChanged, {
                source: "palette-click",
                zone: "palette",
                clearBoardSelection: true,
                inspectedSymbol: symbol,
                paletteSymbol: symbol,
                persist: true
            });

            if (prefersCoarsePointer && symbol) {
                bus.publish(RUNTIME_EVENT_IDS.elementQuickAdd, {
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

        event.preventDefault();

        dragState.pointerId = event.pointerId;
        dragState.sourceElement = template;
        dragState.startX = event.clientX;
        dragState.startY = event.clientY;
        dragState.lastClientX = event.clientX;
        dragState.lastClientY = event.clientY;
        dragState.symbol = symbol;
        dragState.isDragging = false;

        if (typeof template.setPointerCapture === "function") {
            try {
                template.setPointerCapture(event.pointerId);
            } catch {
                // Ignore pointer capture failures and keep the custom drag flow alive.
            }
        }

        window.addEventListener("pointermove", handlePalettePointerMove);
        window.addEventListener("pointerup", handlePalettePointerUp);
        window.addEventListener("pointercancel", handlePalettePointerCancel);
    }

    function handlePalettePointerMove(event) {
        if (event.pointerId !== dragState.pointerId || !dragState.symbol) {
            return;
        }

        dragState.lastClientX = event.clientX;
        dragState.lastClientY = event.clientY;

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

        updatePaletteDragGhost(dragState.lastClientX, dragState.lastClientY);
    }

    function handlePalettePointerUp(event) {
        if (event.pointerId !== dragState.pointerId) {
            return;
        }

        if (dragState.isDragging && dragState.symbol) {
            bus.publish(RUNTIME_EVENT_IDS.elementDropAtPoint, {
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
        dragState.sourceElement?.classList.add("drag-origin");
        document.body.classList.add("dragging-element");

        bus.publish(RUNTIME_EVENT_IDS.interactionContextChanged, {
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
        if (
            dragState.sourceElement &&
            typeof dragState.sourceElement.releasePointerCapture === "function" &&
            dragState.pointerId !== null &&
            dragState.sourceElement.hasPointerCapture?.(dragState.pointerId)
        ) {
            try {
                dragState.sourceElement.releasePointerCapture(dragState.pointerId);
            } catch {
                // Ignore release failures during cleanup.
            }
        }
        dragState.sourceElement?.classList.remove("drag-origin");
        dragState.pointerId = null;
        dragState.sourceElement = null;
        dragState.startX = 0;
        dragState.startY = 0;
        dragState.symbol = null;
        state.board.dragElementType = null;
        document.body.classList.remove("dragging-element");

        dragState.lastClientX = 0;
        dragState.lastClientY = 0;

        window.removeEventListener("pointermove", handlePalettePointerMove);
        window.removeEventListener("pointerup", handlePalettePointerUp);
        window.removeEventListener("pointercancel", handlePalettePointerCancel);
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

        if (!availableElements.some(element => element.symbol === state.ui.paletteSelectedElementSymbol)) {
            state.ui.paletteSelectedElementSymbol = null;
        }

        paletteContentBuilder.renderPaletteTiles({
            container: refs.elementList,
            elements: availableElements,
            schemaConfig,
            selectedSymbol: state.ui.paletteSelectedElementSymbol
        });
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
        const element = getInspectedElement(state);
        paletteContentBuilder.renderPaletteElementCard({
            container: refs.elementCard,
            element,
            schemaConfig
        });
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
