import { getCompoundById, getCurrentLevel, getElementBySymbol, getLevelsForTheme } from "./state.js";

export function createModalController({
    refs,
    state,
    createHelpVisual,
    onThemeCompleteClosed
}) {
    function bind() {
        bindIfPresent(refs.elementModalClose, "click", closeElementModal);
        bindIfPresent(refs.elementModal, "click", event => {
            if (event.target.closest("[data-close-modal='true']")) {
                closeElementModal();
            }
        });

        bindIfPresent(refs.compoundModalClose, "click", closeCompoundModal);
        bindIfPresent(refs.compoundModal, "click", event => {
            if (event.target.closest("[data-close-compound-modal='true']")) {
                closeCompoundModal();
            }
        });

        bindIfPresent(refs.helpModalClose, "click", closeHelpModal);
        bindIfPresent(refs.helpModal, "click", event => {
            if (event.target.closest("[data-close-help-modal='true']")) {
                closeHelpModal();
            }
        });

        bindIfPresent(refs.valencyModalClose, "click", closeValencyModal);
        bindIfPresent(refs.valencyModal, "click", event => {
            if (event.target.closest("[data-close-valency-modal='true']")) {
                closeValencyModal();
            }
        });

        bindIfPresent(refs.themeCompleteClose, "click", closeThemeCompleteModal);
        bindIfPresent(refs.themeCompleteModal, "click", event => {
            if (event.target.closest("[data-close-theme-complete-modal='true']")) {
                closeThemeCompleteModal();
            }
        });
    }

    function openElementModal(element) {
        if (!element || !refs.elementModalContent || !refs.elementModal) {
            return;
        }

        refs.elementModalContent.replaceChildren();

        const symbol = document.createElement("div");
        const name = document.createElement("div");
        const meta = document.createElement("div");
        const description = document.createElement("div");

        symbol.className = "element-modal-symbol";
        name.className = "element-modal-name";
        meta.className = "element-modal-meta";
        description.className = "element-modal-description";

        symbol.id = "element-modal-title";
        symbol.textContent = element.symbol;
        name.textContent = element.name;
        meta.textContent = "Available element | Drag into the mix zone to use";
        description.textContent = element.description;

        refs.elementModalContent.append(symbol, name, meta, description);
        openModal(refs.elementModal);
    }

    function closeElementModal() {
        closeModal(refs.elementModal);
    }

    function openCompoundModal(compound) {
        if (!compound || !refs.compoundModalContent || !refs.compoundModal) {
            return;
        }

        refs.compoundModalContent.replaceChildren();

        const kicker = document.createElement("div");
        const title = document.createElement("div");
        const formula = document.createElement("div");
        const description = document.createElement("div");

        kicker.className = "compound-modal-kicker";
        title.className = "compound-modal-title";
        formula.className = "compound-modal-formula";
        description.className = "compound-modal-description";

        kicker.textContent = "Congratulations, you discovered";
        title.id = "compound-modal-title";
        title.textContent = compound.name;
        formula.textContent = compound.formula;
        description.textContent = compound.description ?? `${compound.name} is now added to your discovered compounds list.`;

        refs.compoundModalContent.append(kicker, title, formula, description);
        openModal(refs.compoundModal);
    }

    function closeCompoundModal() {
        closeModal(refs.compoundModal);
    }

    function openHelpModal() {
        const currentLevel = getCurrentLevel(state);
        if (!currentLevel || !refs.helpModalContent || !refs.helpModal) {
            return;
        }

        const targetCompound = getCompoundById(state, currentLevel.targetCompoundId);
        if (!targetCompound) {
            return;
        }

        refs.helpModalContent.replaceChildren();

        const kicker = document.createElement("div");
        const title = document.createElement("div");
        const description = document.createElement("div");
        const visual = document.createElement("div");

        kicker.className = "help-modal-kicker";
        title.className = "help-modal-title";
        description.className = "help-modal-description";
        visual.className = "help-visual";

        kicker.textContent = "Help is here";
        title.id = "help-modal-title";
        title.textContent = `Build ${targetCompound.formula} the right way`;
        description.textContent =
            "Follow the animated path: start from one highlighted atom and drag through the glowing connection order.";
        visual.appendChild(createHelpVisual(targetCompound));

        refs.helpModalContent.append(kicker, title, description, visual);
        openModal(refs.helpModal);
    }

    function closeHelpModal() {
        closeModal(refs.helpModal);
    }

    function openValencyModal(validation) {
        if (!validation || !refs.valencyModalContent || !refs.valencyModal) {
            return;
        }

        refs.valencyModalContent.replaceChildren();

        const kicker = document.createElement("div");
        const title = document.createElement("div");
        const description = document.createElement("div");
        const issuePanel = createValencyPanel(
            "What is wrong",
            "These atoms currently have more single connections than the simplified lab rules allow."
        );
        const theoryPanel = createValencyPanel(
            "Valency theory",
            "In this lab each line counts as one bond. Compare the current number of links with the allowed valency for each element below."
        );

        kicker.className = "valency-modal-kicker";
        title.className = "valency-modal-title";
        description.className = "valency-modal-description";

        kicker.textContent = "Valency check failed";
        title.id = "valency-modal-title";
        title.textContent = "This structure breaks valency rules";
        description.textContent =
            "The atoms can stay on the board, but this mix cannot be evaluated until each element follows its allowed number of single connections.";

        issuePanel.appendChild(createValencyIssueList(validation.issues));
        theoryPanel.appendChild(createValencyTheoryList(validation.elements));

        refs.valencyModalContent.append(kicker, title, description, issuePanel, theoryPanel);
        openModal(refs.valencyModal);
    }

    function closeValencyModal() {
        closeModal(refs.valencyModal);
    }

    function openThemeCompleteModal(theme, options = {}) {
        if (!theme || !refs.themeCompleteContent || !refs.themeCompleteModal) {
            return;
        }

        const themeLevels = getLevelsForTheme(state, theme.id);
        const themeCompounds = themeLevels
            .map(level => getCompoundById(state, level.targetCompoundId))
            .filter(Boolean);
        const learnedLabels = themeCompounds.map(compound => `${compound.formula} - ${compound.name}`);
        const elementSymbols = [...new Set(themeCompounds.flatMap(compound => compound.ingredients))];
        const elementLabels = elementSymbols.map(symbol => {
            const element = getElementBySymbol(state, symbol);
            return element ? `${element.symbol} - ${element.name}` : symbol;
        });

        refs.themeCompleteContent.replaceChildren();

        const kicker = document.createElement("div");
        const title = document.createElement("div");
        const description = document.createElement("div");
        const learnedPanel = createThemeCompletePanel(
            "What You Learned",
            `You completed the ${theme.name} section and practiced the main compounds from this topic.`
        );
        const elementsPanel = createThemeCompletePanel(
            "Elements In This Section",
            "These are the elements you worked with while clearing this theme."
        );

        kicker.className = "theme-complete-kicker";
        title.className = "theme-complete-title";
        description.className = "theme-complete-description";

        kicker.textContent = "Section complete";
        title.id = "theme-complete-title";
        title.textContent = `Congratulations! You finished ${theme.name}`;
        description.textContent =
            `You cleared every task in the ${theme.name} section. ` +
            "Your next step is to choose another theme and keep building new compounds.";

        learnedPanel.appendChild(createThemeCompletePillList(learnedLabels));
        elementsPanel.appendChild(createThemeCompletePillList(elementLabels));

        refs.themeCompleteContent.append(kicker, title, description, learnedPanel, elementsPanel);

        if (options.bonusUnlockMessage) {
            const note = document.createElement("div");
            note.className = "theme-complete-note";
            note.textContent = options.bonusUnlockMessage;
            refs.themeCompleteContent.appendChild(note);
        }

        openModal(refs.themeCompleteModal);
    }

    function closeThemeCompleteModal() {
        closeModal(refs.themeCompleteModal);
        onThemeCompleteClosed?.();
    }

    function closeActiveModal() {
        if (isModalOpen(refs.themeCompleteModal)) {
            closeThemeCompleteModal();
            return true;
        }

        if (isModalOpen(refs.helpModal)) {
            closeHelpModal();
            return true;
        }

        if (isModalOpen(refs.valencyModal)) {
            closeValencyModal();
            return true;
        }

        if (isModalOpen(refs.compoundModal)) {
            closeCompoundModal();
            return true;
        }

        if (isModalOpen(refs.elementModal)) {
            closeElementModal();
            return true;
        }

        return false;
    }

    return {
        bind,
        closeActiveModal,
        closeCompoundModal,
        openCompoundModal,
        openElementModal,
        openHelpModal,
        openValencyModal,
        openThemeCompleteModal
    };
}

function createValencyPanel(titleText, bodyText) {
    const panel = document.createElement("section");
    const title = document.createElement("div");
    const body = document.createElement("div");

    panel.className = "valency-panel";
    title.className = "valency-panel-title";
    body.className = "valency-panel-text";

    title.textContent = titleText;
    body.textContent = bodyText;

    panel.append(title, body);
    return panel;
}

function createValencyIssueList(issues) {
    const list = document.createElement("div");
    list.className = "valency-issue-list";

    issues.forEach(issue => {
        const item = document.createElement("div");
        const symbol = document.createElement("div");
        const title = document.createElement("div");
        const body = document.createElement("div");

        item.className = "valency-issue-item";
        symbol.className = "valency-issue-symbol";
        title.className = "valency-issue-title";
        body.className = "valency-issue-body";

        symbol.textContent = issue.symbol;
        title.textContent = `${issue.elementName} has ${issue.actualBonds} connections, but only ${issue.allowedBonds} are allowed`;
        body.textContent = `Node ${issue.nodeId} exceeds the allowed valency by ${issue.actualBonds - issue.allowedBonds}. Remove or rearrange some links before mixing.`;

        item.append(symbol, title, body);
        list.appendChild(item);
    });

    return list;
}

function createValencyTheoryList(elements) {
    const list = document.createElement("div");
    list.className = "valency-theory-list";

    elements.forEach(element => {
        const card = document.createElement("article");
        const header = document.createElement("div");
        const title = document.createElement("div");
        const body = document.createElement("div");

        card.className = "valency-theory-card";
        header.className = "valency-theory-header";
        title.className = "valency-theory-title";
        body.className = "valency-theory-body";

        header.textContent = `${element.symbol} | valency ${element.valency}`;
        title.textContent = element.name;
        body.textContent = element.valencyTheory ?? `${element.name} is limited to ${element.valency} single connections in this lab.`;

        card.append(header, title, body);
        list.appendChild(card);
    });

    return list;
}

function createThemeCompletePanel(titleText, bodyText) {
    const panel = document.createElement("section");
    const title = document.createElement("div");
    const body = document.createElement("div");

    panel.className = "theme-complete-panel";
    title.className = "theme-complete-panel-title";
    body.className = "theme-complete-panel-text";

    title.textContent = titleText;
    body.textContent = bodyText;

    panel.append(title, body);
    return panel;
}

function createThemeCompletePillList(labels) {
    const list = document.createElement("div");

    list.className = "theme-complete-pill-list";

    labels.forEach(label => {
        const pill = document.createElement("div");
        pill.className = "theme-complete-pill";
        pill.textContent = label;
        list.appendChild(pill);
    });

    return list;
}

function openModal(modal) {
    if (!modal) {
        return;
    }

    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden", "false");
}

function closeModal(modal) {
    if (!modal) {
        return;
    }

    modal.classList.add("hidden");
    modal.setAttribute("aria-hidden", "true");
}

function isModalOpen(modal) {
    return Boolean(modal && !modal.classList.contains("hidden"));
}

function bindIfPresent(element, eventName, handler) {
    if (element) {
        element.addEventListener(eventName, handler);
    }
}
