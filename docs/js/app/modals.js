import { getCompoundById, getCurrentLevel, getElementBySymbol, getLevelsForTheme, getMechanicById } from "./state.js";
import { createStartLevelIntroActionId } from "./contracts/action-ids.js";
import { createModalRuntimeContentBuilder } from "./modal-runtime/content-builders.js";
import { createRuntimeContentBuilder } from "./runtime-content/factory.js";
import { RUNTIME_CONTENT_BUILDER_KIND } from "./runtime-content/contracts.js";

export function createModalController({
    refs,
    state,
    levelBriefsConfig,
    schemaConfig,
    actionRegistry,
    registerLevelIntroAction,
    createHelpVisual,
    onModalStateChanged,
    onThemeCompleteClosed,
    onStartLevelIntro
}) {
    const modalContentBuilder = createRuntimeContentBuilder({
        kind: RUNTIME_CONTENT_BUILDER_KIND.modal,
        factory: createModalRuntimeContentBuilder
    });
    function bind() {
        bindIfPresent(refs.levelIntroClose, "click", closeLevelIntroModal);
        bindIfPresent(refs.levelIntroModal, "click", event => {
            if (event.target.closest("[data-close-level-intro-modal='true']")) {
                closeLevelIntroModal();
            }
        });

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

    function openLevelIntroModal(theme, level, options = {}) {
        if (!theme || !level || !refs.levelIntroModal || !refs.levelIntroContent) {
            return;
        }

        const briefing = getLevelBriefing(levelBriefsConfig, theme.id, level.id);
        const compound = getCompoundById(state, level.targetCompoundId);
        const mechanic = getMechanicById(state, level.mechanicId);
        const themeOverview = levelBriefsConfig?.themes?.[theme.id]?.overview ?? theme.description;
        const {
            isCompleted = false,
            isCurrent = false,
            isUnlocked = false
        } = options;
        const actionId = createStartLevelIntroActionId(theme.id, level.id);

        registerLevelIntroAction?.({
            actionId,
            handler: () => {
                if (!isUnlocked) {
                    return;
                }

                closeLevelIntroModal();
                onStartLevelIntro?.(theme, level, options);
            }
        });

        modalContentBuilder.renderLevelIntroContent({
            actionId,
            actionLabel: getLevelIntroActionLabel({ isCompleted, isCurrent, isUnlocked }),
            actionRegistry,
            briefing,
            compound,
            container: refs.levelIntroContent,
            level,
            mechanic,
            schemaConfig,
            theme,
            themeOverview
        });

        openModal(refs.levelIntroModal);
        onModalStateChanged?.();
    }

    function closeLevelIntroModal() {
        closeModal(refs.levelIntroModal);
        onModalStateChanged?.();
    }

    function openElementModal(element) {
        if (!element || !refs.elementModalContent || !refs.elementModal) {
            return;
        }

        modalContentBuilder.renderElementModalContent({
            container: refs.elementModalContent,
            element,
            schemaConfig
        });
        openModal(refs.elementModal);
        onModalStateChanged?.();
    }

    function closeElementModal() {
        closeModal(refs.elementModal);
        onModalStateChanged?.();
    }

    function openCompoundModal(compound) {
        if (!compound || !refs.compoundModalContent || !refs.compoundModal) {
            return;
        }

        modalContentBuilder.renderCompoundModalContent({
            compound,
            container: refs.compoundModalContent,
            schemaConfig
        });
        openModal(refs.compoundModal);
        onModalStateChanged?.();
    }

    function closeCompoundModal() {
        closeModal(refs.compoundModal);
        onModalStateChanged?.();
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

        modalContentBuilder.renderHelpModalContent({
            compound: targetCompound,
            container: refs.helpModalContent,
            helpVisual: createHelpVisual(targetCompound),
            schemaConfig
        });
        openModal(refs.helpModal);
        onModalStateChanged?.();
    }

    function closeHelpModal() {
        closeModal(refs.helpModal);
        onModalStateChanged?.();
    }

    function openValencyModal(validation) {
        if (!validation || !refs.valencyModalContent || !refs.valencyModal) {
            return;
        }

        modalContentBuilder.renderValencyModalContent({
            container: refs.valencyModalContent,
            validation,
            schemaConfig
        });
        openModal(refs.valencyModal);
        onModalStateChanged?.();
    }

    function closeValencyModal() {
        closeModal(refs.valencyModal);
        onModalStateChanged?.();
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

        modalContentBuilder.renderThemeCompleteContent({
            bonusUnlockMessage: options.bonusUnlockMessage,
            container: refs.themeCompleteContent,
            elementLabels,
            learnedLabels,
            theme,
            schemaConfig
        });

        openModal(refs.themeCompleteModal);
        onModalStateChanged?.();
    }

    function closeThemeCompleteModal() {
        closeModal(refs.themeCompleteModal);
        onThemeCompleteClosed?.();
        onModalStateChanged?.();
    }

    function closeActiveModal() {
        if (isModalOpen(refs.levelIntroModal)) {
            closeLevelIntroModal();
            return true;
        }

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
        openLevelIntroModal,
        openValencyModal,
        openThemeCompleteModal
    };
}

function getLevelIntroActionLabel({ isCompleted, isCurrent, isUnlocked }) {
    if (!isUnlocked) {
        return "Locked";
    }

    if (isCurrent) {
        return "Start Current Level";
    }

    if (isCompleted) {
        return "Continue Theme";
    }

    return "Open Level";
}

function getLevelBriefing(levelBriefsConfig, themeId, levelId) {
    return levelBriefsConfig?.themes?.[themeId]?.levels?.find(level => level.levelId === levelId) ?? null;
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
