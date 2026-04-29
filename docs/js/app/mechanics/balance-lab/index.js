import { getCurrentLevel, getCompoundById } from "../../state.js";

export function createBalanceLabMechanic({ refs, state }) {
    let userAnswers = {};
    let selectedCoeff = null;
    let currentLevelId = null;
    let panelEl = null;

    // ── Helpers ──────────────────────────────────────────────────────────

    function getEquation() {
        return getCurrentLevel(state)?.equation ?? null;
    }

    function isMounted() {
        return Boolean(refs.mixZone);
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────

    function init() {
        if (!isMounted()) return;
        renderPanel();
    }

    function activate() {
        if (!isMounted()) return;
        renderPanel();
    }

    function deactivate() {
        removePanel();
    }

    function reset() {
        userAnswers = {};
        selectedCoeff = null;
        currentLevelId = null;
        if (isMounted()) renderPanel();
    }

    function sync() {
        if (!isMounted()) return;
        const levelId = getCurrentLevel(state)?.id ?? null;
        if (levelId !== currentLevelId) renderPanel();
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

        // Locked / already-balanced rounds (no blanks) pass immediately
        if (n === 0) {
            const compound = resolveCompound(level, eq);
            return { status: "balanced", compound };
        }

        const allFilled = Array.from({ length: n }, (_, i) => i)
            .every(i => userAnswers[i] !== undefined);

        if (!allFilled) return { status: "unknown" };

        const allCorrect = eq.answers.every((ans, i) => userAnswers[i] === ans);

        colourBlanks(eq);

        if (!allCorrect) {
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

        const pickerHTML = [1, 2, 3, 4, 5, 6, 7, 8]
            .map(n => `<button type="button" class="bl-pick${selectedCoeff === n ? " sel" : ""}" data-coeff="${n}">${n}</button>`)
            .join("");

        const isLocked = eq.answers.length === 0;

        return `
            <div class="bl-kicker">Balance the equation</div>
            <div class="bl-eq">${eqHTML}</div>
            ${isLocked
                ? `<div class="bl-hint bl-hint--info">${eq.explanation ?? "Already balanced — press Mix to continue."}</div>`
                : `<div class="bl-hint">Choose a coefficient, tap a blank, then press <strong>Mix</strong> to check</div>
                   <div class="bl-picker">${pickerHTML}</div>`
            }
        `;
    }

    function bindEvents(eq) {
        if (!panelEl) return;

        panelEl.querySelectorAll(".bl-pick").forEach(btn => {
            btn.addEventListener("click", () => {
                selectedCoeff = Number(btn.dataset.coeff);
                panelEl.querySelectorAll(".bl-pick")
                    .forEach(b => b.classList.toggle("sel", b === btn));
            });
        });

        panelEl.querySelectorAll(".bl-blank").forEach(blank => {
            blank.addEventListener("click", () => {
                if (selectedCoeff === null) return;
                const i = Number(blank.dataset.blank);
                userAnswers[i] = selectedCoeff;
                blank.textContent = selectedCoeff;
                blank.classList.add("has-val");
                blank.classList.remove("correct", "wrong");
            });
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
