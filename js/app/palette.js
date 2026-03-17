import { getAvailableElements, getSelectedElement } from "./state.js";

export function createPaletteController({ refs, state, onOpenElementModal, onSelectElement }) {
    function bind() {
        refs.elementList.addEventListener("dragstart", event => {
            const template = event.target.closest(".element-template");
            if (!template) {
                return;
            }

            state.board.dragElementType = template.dataset.element;
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

            const symbol = template.dataset.element;
            onSelectElement(symbol);

            const element = getAvailableElements(state).find(item => item.symbol === symbol) ?? null;
            onOpenElementModal(element);
        });
    }

    function render() {
        renderAvailableElements();
        renderSelectedElementCard();
    }

    function renderAvailableElements() {
        const availableElements = getAvailableElements(state);
        refs.elementList.replaceChildren();

        if (!availableElements.some(element => element.symbol === state.ui.selectedElementSymbol)) {
            state.ui.selectedElementSymbol = availableElements[0]?.symbol ?? null;
        }

        availableElements.forEach(element => {
            const template = document.createElement("div");
            template.className = "element-template";
            template.draggable = true;
            template.dataset.element = element.symbol;
            template.title = element.name;
            template.textContent = element.symbol;

            if (element.symbol === state.ui.selectedElementSymbol) {
                template.classList.add("selected");
            }

            refs.elementList.appendChild(template);
        });
    }

    function renderSelectedElementCard() {
        refs.elementCard.replaceChildren();

        const element = getSelectedElement(state);
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

    return {
        bind,
        render
    };
}
