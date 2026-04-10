const SIDEBAR_MIN_WIDTH = 287;
const SIDEBAR_MAX_WIDTH = 420;

export function createSidebarController({
    refs,
    state,
    getActiveMechanic,
    onPersist
}) {
    const sidebarState = {
        resizePointerId: null
    };

    function bind() {
        refs.paletteToggleButton?.addEventListener("click", toggleCollapsed);
        refs.sidebarCollapseButton?.addEventListener("click", toggleCollapsed);

        refs.sidebarResizeHandle?.addEventListener("pointerdown", event => {
            if (event.pointerType === "touch" || isCompactLayout()) {
                return;
            }

            event.preventDefault();
            sidebarState.resizePointerId = event.pointerId;
            refs.sidebarResizeHandle.setPointerCapture(event.pointerId);
            refs.sidebar?.classList.add("resizing");

            document.addEventListener("pointermove", handleResizeMove);
            document.addEventListener("pointerup", stopResize);
            document.addEventListener("pointercancel", stopResize);
        });
    }

    function handleResizeMove(event) {
        if (event.pointerId !== sidebarState.resizePointerId || !refs.gameScreen) {
            return;
        }

        const gameRect = refs.gameScreen.getBoundingClientRect();
        state.ui.sidebarWidth = clampSidebarWidth(event.clientX - gameRect.left);
        state.ui.sidebarCollapsed = false;
        applyLayout();
        getActiveMechanic().sync();
    }

    function stopResize(event) {
        if (event.pointerId !== sidebarState.resizePointerId) {
            return;
        }

        refs.sidebarResizeHandle?.releasePointerCapture?.(event.pointerId);
        sidebarState.resizePointerId = null;
        refs.sidebar?.classList.remove("resizing");
        document.removeEventListener("pointermove", handleResizeMove);
        document.removeEventListener("pointerup", stopResize);
        document.removeEventListener("pointercancel", stopResize);
        onPersist?.();
    }

    function toggleCollapsed() {
        state.ui.sidebarCollapsed = !state.ui.sidebarCollapsed;
        applyLayout();
        getActiveMechanic().sync();
        onPersist?.();
    }

    function applyLayout() {
        if (!refs.sidebar || !refs.paletteToggleButton) {
            return;
        }

        const compactLayout = isCompactLayout();
        const sidebarWidth = clampSidebarWidth(state.ui.sidebarWidth);
        const collapsed = Boolean(state.ui.sidebarCollapsed);

        state.ui.sidebarWidth = sidebarWidth;
        refs.sidebar.style.setProperty("--sidebar-width", `${sidebarWidth}px`);
        refs.sidebar.classList.toggle("collapsed", collapsed);

        const toggleLabel = collapsed ? "Show Palette" : "Hide Palette";
        refs.paletteToggleButton.textContent = toggleLabel;
        refs.paletteToggleButton.setAttribute("aria-expanded", String(!collapsed));

        if (refs.sidebarCollapseButton) {
            refs.sidebarCollapseButton.textContent = collapsed ? "Show" : "Hide";
            refs.sidebarCollapseButton.setAttribute("aria-expanded", String(!collapsed));
        }

        if (refs.sidebarResizeHandle) {
            refs.sidebarResizeHandle.disabled = collapsed || compactLayout;
        }
    }

    function isCompactLayout() {
        return window.matchMedia?.("(max-width: 820px)")?.matches ?? false;
    }

    return {
        applyLayout,
        bind,
        isCompactLayout
    };
}

function clampSidebarWidth(width) {
    return Math.min(Math.max(width, SIDEBAR_MIN_WIDTH), SIDEBAR_MAX_WIDTH);
}
