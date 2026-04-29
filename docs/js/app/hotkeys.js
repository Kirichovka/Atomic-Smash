import { HOTKEY_ACTION_IDS } from "./contracts/action-ids.js";

const EDITABLE_SELECTORS = "input, textarea, select, [contenteditable='true']";

export function createHotkeysController({
    config,
    currentPage,
    onDeleteSelectedNode,
    onEscape,
    onMixBoard,
    onOpenAddMenu,
    onRefreshBoard
}) {
    const bindings = normalizeBindings(config?.bindings ?? []);
    const actionHandlers = {
        [HOTKEY_ACTION_IDS.deleteSelectedNode]: onDeleteSelectedNode,
        [HOTKEY_ACTION_IDS.escape]: onEscape,
        [HOTKEY_ACTION_IDS.mixBoard]: onMixBoard,
        [HOTKEY_ACTION_IDS.openAddMenu]: onOpenAddMenu,
        [HOTKEY_ACTION_IDS.refreshBoard]: onRefreshBoard
    };

    function bind() {
        if (bindings.length === 0) {
            return;
        }

        document.addEventListener("keydown", handleKeydown);
    }

    function handleKeydown(event) {
        if (isEditableTarget(event.target)) {
            return;
        }

        const binding = bindings.find(item => matchesBinding(item, event, currentPage));
        if (!binding) {
            return;
        }

        const handler = actionHandlers[binding.action];
        if (!handler) {
            return;
        }

        if (binding.preventDefault) {
            event.preventDefault();
        }

        handler({ binding, event });
    }

    return {
        bind
    };
}

function normalizeBindings(bindings) {
    return bindings
        .filter(binding => typeof binding?.key === "string" && typeof binding?.action === "string")
        .map(binding => ({
            action: binding.action,
            altKey: Boolean(binding.altKey),
            ctrlKey: Boolean(binding.ctrlKey),
            id: binding.id ?? `${binding.action}:${binding.key}`,
            key: binding.key,
            metaKey: Boolean(binding.metaKey),
            pages: Array.isArray(binding.pages) ? binding.pages : [],
            preventDefault: binding.preventDefault !== false,
            shiftKey: Boolean(binding.shiftKey)
        }));
}

function matchesBinding(binding, event, currentPage) {
    if (binding.key !== event.key) {
        return false;
    }

    if (binding.pages.length > 0 && !binding.pages.includes(currentPage)) {
        return false;
    }

    return (
        binding.altKey === event.altKey &&
        binding.ctrlKey === event.ctrlKey &&
        binding.metaKey === event.metaKey &&
        binding.shiftKey === event.shiftKey
    );
}

function isEditableTarget(target) {
    return target instanceof Element && Boolean(target.closest(EDITABLE_SELECTORS));
}
