import { getCurrentLevel, getCompoundById } from "../../state.js";

export function createBalanceLabMechanic({ refs, state }) {
    let userAnswers = {};
    let selectedCoeff = null;
    let currentLevelId = null;
    let panelEl = null;
    let ctxMenuEl = null;
    let ctxTargetBlank = null;
    let savedSidebarCollapsed = false;
    let wrongAttempts = 0;

    // ── Helpers ───────────────────────────────────────────────────────────

    function getEquation() {
        return getCurrentLevel(state)?.equation ?? null;
    }

    function isMounted() {
        return Boolean(refs.mixZone);
    }

    // ── Sidebar / topbar visibility ───────────────────────────────────────

    function setSidebarCollapsed(collapsed) {
        state.ui.sidebarCollapsed = collapsed;
        refs.sidebar?.classList.toggle("collapsed", collapsed);
        if (refs.paletteToggleButton) {
            refs.paletteToggleButton.textContent = collapsed ? "Show Palette" : "Hide Palette";
            refs.paletteToggleButton.setAttribute("aria-expanded", String(!collapsed));
        }
        if (refs.sidebarCollapseButton) {
            refs.sidebarCollapseButton.textContent = collapsed ? "Show" : "Hide";
            refs.sidebarCollapseButton.setAttribute("aria-expanded", String(!collapsed));
        }
        if (refs.sidebarResizeHandle) {
            refs.sidebarResizeHandle.disabled = collapsed;
        }
    }

    function hideGameControls() {
        if (refs.paletteToggleButton) refs.paletteToggleButton.style.display = "none";
        if (refs.mixButton)           refs.mixButton.style.display = "none";
        if (refs.clearButton)         refs.clearButton.style.display = "none";
    }

    function restoreGameControls() {
        if (refs.paletteToggleButton) refs.paletteToggleButton.style.display = "";
        if (refs.mixButton)           refs.mixButton.style.display = "";
        if (refs.clearButton)         refs.clearButton.style.display = "";
    }

    // ── Intercept game context menu (capture phase) ───────────────────────

    function interceptContextMenu(e) {
        e.preventDefault();
        e.stopPropagation();

        const blank = e.target.closest?.(".bl-blank");
        showCtxMenu(e.clientX + 4, e.clientY + 4, blank ?? null);
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────

    function init() {
        if (!isMounted()) return;
        renderPanel();
    }

    function activate() {
        savedSidebarCollapsed = state.ui.sidebarCollapsed;
        setSidebarCollapsed(true);
        hideGameControls();
        // Block the game's context menu (it binds at bubble phase; we capture first)
        refs.mixZone?.addEventListener("contextmenu", interceptContextMenu, true);
        if (!isMounted()) return;
        renderPanel();
    }

    function deactivate() {
        setSidebarCollapsed(savedSidebarCollapsed);
        restoreGameControls();
        refs.mixZone?.removeEventListener("contextmenu", interceptContextMenu, true);
        removePanel();
        removeCtxMenu();
    }

    function reset() {
        userAnswers = {};
        selectedCoeff = null;
        currentLevelId = null;
        wrongAttempts = 0;
        if (isMounted()) renderPanel();
    }

    function sync() {
        if (!isMounted()) return;
        const levelId = getCurrentLevel(state)?.id ?? null;
        if (levelId !== currentLevelId) {
            wrongAttempts = 0;
            renderPanel();
        }
    }

    function captureState() {
        return null;
    }

    // ── Evaluation ────────────────────────────────────────────────────────

    function evaluate() {
        const level = getCurrentLevel(state);
        const eq = getEquation();

        if (!eq || !level) return { status: "unknown" };

        const n = eq.answers.length;

        if (n === 0) {
            return { status: "balanced", compound: resolveCompound(level, eq) };
        }

        const allFilled = Array.from({ length: n }, (_, i) => i)
            .every(i => userAnswers[i] !== undefined);

        if (!allFilled) return { status: "unknown" };

        const allCorrect = eq.answers.every((ans, i) => userAnswers[i] === ans);
        colourBlanks(eq);

        if (!allCorrect) {
            wrongAttempts++;
            if (wrongAttempts >= 2) showHintBanner(level, eq);
            return {
                status: "structure-mismatch",
                compound: {
                    id: "__unbalanced",
                    formula: eq.label ?? "the equation",
                    name: "Unbalanced equation",
                    ingredients: []
                }
            };
        }

        wrongAttempts = 0;
        return { status: "balanced", compound: resolveCompound(level, eq) };
    }

    function resolveCompound(level, eq) {
        return getCompoundById(state, level.targetCompoundId) ?? {
            id: level.targetCompoundId,
            formula: eq.label ?? level.displayTitle,
            name: level.displayTitle ?? level.targetCompoundId,
            ingredients: []
        };
    }

    // ── Hint banner (shown after 2 wrong attempts) ─────────────────────────

    function showHintBanner(level, eq) {
        if (!panelEl) return;
        const existing = panelEl.querySelector(".bl-hint-banner");
        if (existing) return; // already shown

        const hintText = level.hint ?? eq.label ?? level.learningFocus ?? null;
        if (!hintText) return;

        const banner = document.createElement("div");
        banner.className = "bl-hint-banner";
        banner.innerHTML = `
            <span class="bl-hint-banner-icon">💡</span>
            <span class="bl-hint-banner-text"><strong>Hint:</strong> ${hintText}</span>
            <button type="button" class="bl-hint-banner-close" aria-label="Dismiss hint">✕</button>
        `;
        banner.querySelector(".bl-hint-banner-close").addEventListener("click", () => banner.remove());

        // Insert before the actions row
        const actions = panelEl.querySelector(".bl-actions");
        actions ? panelEl.insertBefore(banner, actions) : panelEl.appendChild(banner);
    }

    // ── Rendering ─────────────────────────────────────────────────────────

    function renderPanel() {
        removePanel();

        const level = getCurrentLevel(state);
        const eq = getEquation();
        currentLevelId = level?.id ?? null;

        if (!eq) return;

        if (refs.svg) refs.svg.style.display = "none";

        panelEl = document.createElement("div");
        panelEl.className = "bl-panel";
        panelEl.innerHTML = buildHTML(eq);
        refs.mixZone.appendChild(panelEl);
        bindEvents(eq);
    }

    function removePanel() {
        panelEl?.remove();
        panelEl = null;
        if (refs.svg) refs.svg.style.display = "";
    }

    function buildHTML(eq) {
        let eqHTML = "";
        let bi = 0;

        eq.parts.forEach(part => {
            if (part === null) {
                const i = bi++;
                const val = userAnswers[i];
                eqHTML += `<div class="bl-blank${val !== undefined ? " has-val" : ""}" data-blank="${i}">${val !== undefined ? val : "?"}</div>`;
            } else {
                const t = part.trim();
                const cls = (t === "+" || t === "→" || t === "⇌") ? "bl-op" : "bl-sym";
                eqHTML += `<span class="${cls}">${part}</span>`;
            }
        });

        const isLocked = eq.answers.length === 0;

        const pickerHTML = [1, 2, 3, 4, 5, 6, 7, 8]
            .map(n => `<button type="button" class="bl-pick${selectedCoeff === n ? " sel" : ""}" data-coeff="${n}" draggable="true">${n}</button>`)
            .join("");

        return `
            <div class="bl-kicker">Balance the equation</div>
            <div class="bl-eq">${eqHTML}</div>
            ${isLocked
                ? `<div class="bl-hint bl-hint--info">${eq.explanation ?? "Already balanced — press Check to continue."}</div>`
                : `<div class="bl-hint">Click a number, then tap a blank — or <strong>drag</strong> a number straight onto a blank</div>
                   <div class="bl-picker">${pickerHTML}</div>`
            }
            <div class="bl-actions">
                <button type="button" class="bl-btn-reset" title="Clear all blanks">↺ Reset</button>
                <button type="button" class="bl-btn-check">✓ Check Answer</button>
            </div>
        `;
    }

    // ── Context menu ──────────────────────────────────────────────────────

    function removeCtxMenu() {
        ctxMenuEl?.remove();
        ctxMenuEl = null;
        ctxTargetBlank = null;
    }

    function showCtxMenu(x, y, blank) {
        removeCtxMenu();
        ctxTargetBlank = blank;

        const isOnBlank = blank !== null;

        ctxMenuEl = document.createElement("div");
        ctxMenuEl.className = "bl-ctx-menu";

        const blankItems = isOnBlank ? `
            <button class="bl-ctx-item" data-action="clear-one">Clear this blank</button>
            <button class="bl-ctx-item" data-action="clear-all">Clear all blanks</button>
            <div class="bl-ctx-divider"></div>
            <button class="bl-ctx-item" data-action="fill-1">Set to 1</button>
            <button class="bl-ctx-item" data-action="fill-2">Set to 2</button>
            <button class="bl-ctx-item" data-action="fill-3">Set to 3</button>
            <div class="bl-ctx-divider"></div>
        ` : `
            <button class="bl-ctx-item" data-action="clear-all">Reset all blanks</button>
            <div class="bl-ctx-divider"></div>
        `;

        ctxMenuEl.innerHTML = blankItems + `
            <button class="bl-ctx-item bl-ctx-item--check" data-action="check">✓ Check Answer</button>
        `;

        document.body.appendChild(ctxMenuEl);

        const mw = 190;
        const mh = ctxMenuEl.scrollHeight || 200;
        const safeX = Math.min(x, window.innerWidth  - mw - 8);
        const safeY = Math.min(y, window.innerHeight - mh - 8);
        ctxMenuEl.style.left = `${Math.max(safeX, 8)}px`;
        ctxMenuEl.style.top  = `${Math.max(safeY, 8)}px`;

        ctxMenuEl.querySelectorAll(".bl-ctx-item").forEach(btn => {
            btn.addEventListener("click", e => {
                e.stopPropagation();
                handleCtxAction(btn.dataset.action, ctxTargetBlank);
                removeCtxMenu();
            });
        });

        setTimeout(() => {
            document.addEventListener("click", removeCtxMenu, { once: true });
        }, 0);
    }

    function handleCtxAction(action, blank) {
        if (action === "check") {
            refs.mixButton?.click();
            return;
        }

        if (action === "clear-all") {
            userAnswers = {};
            if (panelEl) {
                panelEl.querySelectorAll(".bl-blank").forEach(b => {
                    b.textContent = "?";
                    b.classList.remove("has-val", "correct", "wrong");
                });
            }
            return;
        }

        if (!blank) return;
        const i = Number(blank.dataset.blank);

        if (action === "clear-one") {
            delete userAnswers[i];
            blank.textContent = "?";
            blank.classList.remove("has-val", "correct", "wrong");
        } else if (action.startsWith("fill-")) {
            const val = Number(action.split("-")[1]);
            userAnswers[i] = val;
            blank.textContent = val;
            blank.classList.add("has-val");
            blank.classList.remove("correct", "wrong");
        }
    }

    // ── Events ────────────────────────────────────────────────────────────

    function fillBlank(blank, val) {
        const i = Number(blank.dataset.blank);
        userAnswers[i] = val;
        blank.textContent = val;
        blank.classList.add("has-val");
        blank.classList.remove("correct", "wrong", "drag-over");
    }

    function bindEvents(eq) {
        if (!panelEl) return;

        // ── Coefficient picker: click to select + drag source ──
        panelEl.querySelectorAll(".bl-pick").forEach(btn => {
            const coeff = Number(btn.dataset.coeff);

            // Click: select coefficient (existing behaviour)
            btn.addEventListener("click", () => {
                selectedCoeff = coeff;
                panelEl.querySelectorAll(".bl-pick")
                    .forEach(b => b.classList.toggle("sel", b === btn));
            });

            // Drag start: store value in dataTransfer
            btn.addEventListener("dragstart", e => {
                e.dataTransfer.effectAllowed = "copy";
                e.dataTransfer.setData("text/plain", String(coeff));
                btn.classList.add("bl-pick--dragging");
            });

            btn.addEventListener("dragend", () => {
                btn.classList.remove("bl-pick--dragging");
            });
        });

        // ── Blanks: click to fill + drop target ──
        panelEl.querySelectorAll(".bl-blank").forEach(blank => {
            // Click to fill with currently selected coefficient
            blank.addEventListener("click", () => {
                if (selectedCoeff === null) return;
                fillBlank(blank, selectedCoeff);
            });

            // Drag over: show drop highlight
            blank.addEventListener("dragover", e => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
                blank.classList.add("drag-over");
            });

            blank.addEventListener("dragleave", () => {
                blank.classList.remove("drag-over");
            });

            // Drop: fill blank with dragged value
            blank.addEventListener("drop", e => {
                e.preventDefault();
                const val = Number(e.dataTransfer.getData("text/plain"));
                if (!val) return;
                fillBlank(blank, val);
            });
        });

        // Check Answer button
        panelEl.querySelector(".bl-btn-check")?.addEventListener("click", () => {
            refs.mixButton?.click();
        });

        // Reset button
        panelEl.querySelector(".bl-btn-reset")?.addEventListener("click", () => {
            userAnswers = {};
            selectedCoeff = null;
            wrongAttempts = 0;
            renderPanel();
        });
    }

    function colourBlanks(eq) {
        if (!panelEl) return;
        panelEl.querySelectorAll(".bl-blank").forEach(blank => {
            const i = Number(blank.dataset.blank);
            const correct = userAnswers[i] === eq.answers[i];
            blank.classList.toggle("correct", correct);
            blank.classList.toggle("wrong", !correct);
            if (!correct) blank.textContent = eq.answers[i];
        });
    }

    // ── Public API ────────────────────────────────────────────────────────

    return {
        activate,
        captureState,
        deactivate,
        evaluate,
        id: "balance-lab",
        init,
        reset,
        sync
    };
}
