import { getAvailableElements, getInspectedElement, getPaletteSelectedElement } from "./state.js";

export function createPaletteController({
    refs,
    state,
    bus
}) {
    const prefersCoarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;

    function bind() {
        if (!refs.elementList) {
            return;
        }

        refs.elementList.addEventListener("dragstart", event => {
            const template = event.target.closest(".element-template");
            if (!template) {
                return;
            }

            state.board.dragElementType = template.dataset.element;
            if (!state.board.dragElementType) {
                return;
            }

            bus.publish("interaction:context-changed", {
                source: "palette-drag",
                zone: "palette",
                clearBoardSelection: true,
                inspectedSymbol: state.board.dragElementType,
                paletteSymbol: state.board.dragElementType,
                persist: false
            });
            event.dataTransfer?.setData("text/plain", state.board.dragElementType);
        });

        refs.elementList.addEventListener("dragend", () => {
            state.board.dragElementType = null;
        });

        refs.elementList.addEventListener("click", event => {
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
            template.draggable = true;
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
