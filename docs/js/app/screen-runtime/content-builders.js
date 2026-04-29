import { createSceneUiFactory } from "../scene-ui/factory.js";
import { compileSceneSchema, resolveSceneSchema } from "../scene-ui/schema.js";

export function createScreenRuntimeContentBuilder() {
    return {
        renderJournalCompoundCards,
        renderJournalElementCards,
        renderThemeCards
    };
}

function renderJournalCompoundCards({
    compounds,
    container,
    onOpenCompoundModal,
    schemaConfig
}) {
    if (!container) {
        return;
    }

    container.replaceChildren();

    if (!compounds.length) {
        container.appendChild(
            createSchemaElement(schemaConfig?.emptyState, {
                message: "No compounds discovered yet."
            })
        );
        return;
    }

    const fragment = document.createDocumentFragment();
    compounds.forEach(compound => {
        fragment.appendChild(
            createSchemaElement(schemaConfig?.journalCompoundCard, {
                compound,
                handlers: {
                    open: () => onOpenCompoundModal?.(compound.raw)
                }
            })
        );
    });

    container.appendChild(fragment);
}

function renderJournalElementCards({
    container,
    elements,
    onOpenElementModal,
    onSelectElement,
    schemaConfig
}) {
    if (!container) {
        return;
    }

    container.replaceChildren();

    if (!elements.length) {
        container.appendChild(
            createSchemaElement(schemaConfig?.emptyState, {
                message: "No element reference available yet."
            })
        );
        return;
    }

    const previewElement = elements.find(element => !element.locked) ?? elements[0];
    const shell = document.createElement("div");
    shell.className = "periodic-library";

    const meta = document.createElement("div");
    meta.className = "periodic-library-meta";

    const intro = document.createElement("div");
    intro.className = "periodic-library-intro";
    intro.innerHTML = `
        <div class="periodic-library-kicker">Periodic Table View</div>
        <h3 class="periodic-library-title">Explore the element library on the table itself</h3>
        <p class="periodic-library-copy">Colored tiles are unlocked for gameplay. Gray tiles stay in the reference view until you earn them. Hover to preview, click to open the full element card.</p>
    `;

    const previewCard = document.createElement("button");
    previewCard.type = "button";
    previewCard.className = "periodic-preview-card";
    previewCard.setAttribute("aria-live", "polite");
    previewCard.addEventListener("click", () => {
        const currentElement = previewCard._previewElement;
        if (!currentElement) {
            return;
        }
        onSelectElement?.(currentElement.symbol);
        onOpenElementModal?.(currentElement.raw);
    });

    meta.append(intro, previewCard);

    const boardWrap = document.createElement("div");
    boardWrap.className = "periodic-table-wrap";
    const board = document.createElement("div");
    board.className = "periodic-table-board";
    board.append(
        createPeriodicRowLabel("Lanthanides", 8),
        createPeriodicRowLabel("Actinides", 9)
    );
    boardWrap.appendChild(board);

    const fragment = document.createDocumentFragment();
    elements
        .map(element => ({
            element,
            placement: getPeriodicPlacement(element.symbol)
        }))
        .sort((a, b) => {
            const rowDelta = a.placement.row - b.placement.row;
            return rowDelta !== 0 ? rowDelta : a.placement.column - b.placement.column;
        })
        .forEach(({ element, placement }) => {
            const tile = document.createElement("button");
            const tone = getElementTone(element.category);
            tile.type = "button";
            tile.className = buildPeriodicTileClassName(element, tone);
            if (element.symbol.length > 1) {
                tile.classList.add("symbol-double");
            }
            tile.style.setProperty("--periodic-column", String(placement.column));
            tile.style.setProperty("--periodic-row", String(placement.row));
            tile.dataset.symbol = element.symbol;
            tile.setAttribute("aria-label", `${element.fullName}. ${element.previewStatus}. ${element.description}`);

            tile.innerHTML = `
                <span class="periodic-tile-number">${Number.isFinite(element.atomicNumber) ? element.atomicNumber : ""}</span>
                <span class="periodic-tile-symbol">${element.symbol}</span>
                <span class="periodic-tile-name">${element.fullName}</span>
            `;

            const showPreview = () => renderPeriodicPreview(previewCard, element, tone);
            tile.addEventListener("pointerenter", showPreview);
            tile.addEventListener("focus", showPreview);
            tile.addEventListener("click", () => {
                onSelectElement?.(element.symbol);
                onOpenElementModal?.(element.raw);
            });

            fragment.appendChild(tile);
        });

    board.appendChild(fragment);
    shell.append(meta, boardWrap);
    container.appendChild(shell);
    renderPeriodicPreview(previewCard, previewElement, getElementTone(previewElement.category));
}

function renderPeriodicPreview(container, element, tone) {
    container._previewElement = element;
    container.className = `periodic-preview-card tone-${tone} ${element.locked ? "locked" : "unlocked"}`;
    container.innerHTML = `
        <div class="periodic-preview-head">
            <div class="periodic-preview-badge">${element.locked ? "Reference only" : "Gameplay unlocked"}</div>
            <div class="periodic-preview-chip">${Number.isFinite(element.atomicNumber) ? `#${element.atomicNumber}` : "Element"}</div>
        </div>
        <div class="periodic-preview-main">
            <div class="periodic-preview-symbol">${element.symbol}</div>
            <div class="periodic-preview-copy">
                <div class="periodic-preview-name">${element.fullName}</div>
                <div class="periodic-preview-category">${formatCategoryLabel(element.category)}</div>
            </div>
        </div>
        <p class="periodic-preview-description">${element.description}</p>
        <div class="periodic-preview-footer">${element.status}</div>
    `;
}

function getPeriodicPlacement(symbol) {
    const placement = PERIODIC_TABLE_LAYOUT[symbol];

    if (placement) {
        return placement;
    }

    return {
        column: 18,
        row: 9
    };
}

function getElementTone(category = "") {
    const normalized = String(category).toLowerCase();

    if (normalized.includes("alkali metal")) {
        return "alkali";
    }
    if (normalized.includes("alkaline earth")) {
        return "earth";
    }
    if (normalized.includes("transition metal")) {
        return "transition";
    }
    if (normalized.includes("post-transition")) {
        return "post";
    }
    if (normalized.includes("metalloid")) {
        return "metalloid";
    }
    if (normalized.includes("halogen")) {
        return "halogen";
    }
    if (normalized.includes("noble gas")) {
        return "noble";
    }
    if (normalized.includes("lanthanide")) {
        return "lanthanide";
    }
    if (normalized.includes("actinide")) {
        return "actinide";
    }
    if (normalized.includes("nonmetal")) {
        return "nonmetal";
    }

    return "reference";
}

function buildPeriodicTileClassName(element, tone) {
    return [
        "periodic-tile",
        `tone-${tone}`,
        element.locked ? "locked" : "unlocked"
    ].join(" ");
}

function formatCategoryLabel(category = "") {
    const normalized = String(category).trim();
    if (!normalized) {
        return "Reference element";
    }

    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function createPeriodicRowLabel(text, row) {
    const label = document.createElement("div");
    label.className = "periodic-row-label";
    label.style.setProperty("--periodic-row", String(row));
    label.textContent = text;
    return label;
}

const PERIODIC_TABLE_LAYOUT = {
    H: { column: 1, row: 1 },
    He: { column: 18, row: 1 },
    Li: { column: 1, row: 2 },
    Be: { column: 2, row: 2 },
    B: { column: 13, row: 2 },
    C: { column: 14, row: 2 },
    N: { column: 15, row: 2 },
    O: { column: 16, row: 2 },
    F: { column: 17, row: 2 },
    Ne: { column: 18, row: 2 },
    Na: { column: 1, row: 3 },
    Mg: { column: 2, row: 3 },
    Al: { column: 13, row: 3 },
    Si: { column: 14, row: 3 },
    P: { column: 15, row: 3 },
    S: { column: 16, row: 3 },
    Cl: { column: 17, row: 3 },
    Ar: { column: 18, row: 3 },
    K: { column: 1, row: 4 },
    Ca: { column: 2, row: 4 },
    Sc: { column: 3, row: 4 },
    Ti: { column: 4, row: 4 },
    V: { column: 5, row: 4 },
    Cr: { column: 6, row: 4 },
    Mn: { column: 7, row: 4 },
    Fe: { column: 8, row: 4 },
    Co: { column: 9, row: 4 },
    Ni: { column: 10, row: 4 },
    Cu: { column: 11, row: 4 },
    Zn: { column: 12, row: 4 },
    Ga: { column: 13, row: 4 },
    Ge: { column: 14, row: 4 },
    As: { column: 15, row: 4 },
    Se: { column: 16, row: 4 },
    Br: { column: 17, row: 4 },
    Kr: { column: 18, row: 4 },
    Rb: { column: 1, row: 5 },
    Sr: { column: 2, row: 5 },
    Y: { column: 3, row: 5 },
    Zr: { column: 4, row: 5 },
    Nb: { column: 5, row: 5 },
    Mo: { column: 6, row: 5 },
    Tc: { column: 7, row: 5 },
    Ru: { column: 8, row: 5 },
    Rh: { column: 9, row: 5 },
    Pd: { column: 10, row: 5 },
    Ag: { column: 11, row: 5 },
    Cd: { column: 12, row: 5 },
    In: { column: 13, row: 5 },
    Sn: { column: 14, row: 5 },
    Sb: { column: 15, row: 5 },
    Te: { column: 16, row: 5 },
    I: { column: 17, row: 5 },
    Xe: { column: 18, row: 5 },
    Cs: { column: 1, row: 6 },
    Ba: { column: 2, row: 6 },
    La: { column: 3, row: 6 },
    Hf: { column: 4, row: 6 },
    Ta: { column: 5, row: 6 },
    W: { column: 6, row: 6 },
    Re: { column: 7, row: 6 },
    Os: { column: 8, row: 6 },
    Ir: { column: 9, row: 6 },
    Pt: { column: 10, row: 6 },
    Au: { column: 11, row: 6 },
    Hg: { column: 12, row: 6 },
    Tl: { column: 13, row: 6 },
    Pb: { column: 14, row: 6 },
    Bi: { column: 15, row: 6 },
    Po: { column: 16, row: 6 },
    At: { column: 17, row: 6 },
    Rn: { column: 18, row: 6 },
    Fr: { column: 1, row: 7 },
    Ra: { column: 2, row: 7 },
    Ac: { column: 3, row: 7 },
    Rf: { column: 4, row: 7 },
    Db: { column: 5, row: 7 },
    Sg: { column: 6, row: 7 },
    Bh: { column: 7, row: 7 },
    Hs: { column: 8, row: 7 },
    Mt: { column: 9, row: 7 },
    Ds: { column: 10, row: 7 },
    Rg: { column: 11, row: 7 },
    Cn: { column: 12, row: 7 },
    Nh: { column: 13, row: 7 },
    Fl: { column: 14, row: 7 },
    Mc: { column: 15, row: 7 },
    Lv: { column: 16, row: 7 },
    Ts: { column: 17, row: 7 },
    Og: { column: 18, row: 7 },
    Ce: { column: 4, row: 8 },
    Pr: { column: 5, row: 8 },
    Nd: { column: 6, row: 8 },
    Pm: { column: 7, row: 8 },
    Sm: { column: 8, row: 8 },
    Eu: { column: 9, row: 8 },
    Gd: { column: 10, row: 8 },
    Tb: { column: 11, row: 8 },
    Dy: { column: 12, row: 8 },
    Ho: { column: 13, row: 8 },
    Er: { column: 14, row: 8 },
    Tm: { column: 15, row: 8 },
    Yb: { column: 16, row: 8 },
    Lu: { column: 17, row: 8 },
    Th: { column: 4, row: 9 },
    Pa: { column: 5, row: 9 },
    U: { column: 6, row: 9 },
    Np: { column: 7, row: 9 },
    Pu: { column: 8, row: 9 },
    Am: { column: 9, row: 9 },
    Cm: { column: 10, row: 9 },
    Bk: { column: 11, row: 9 },
    Cf: { column: 12, row: 9 },
    Es: { column: 13, row: 9 },
    Fm: { column: 14, row: 9 },
    Md: { column: 15, row: 9 },
    No: { column: 16, row: 9 },
    Lr: { column: 17, row: 9 }
};

function renderThemeCards({
    container,
    onStartTheme,
    themes,
    schemaConfig
}) {
    if (!container) {
        return;
    }

    container.replaceChildren();

    if (!themes.length) {
        container.appendChild(
            createSchemaElement(schemaConfig?.emptyState, {
                message: "No themes available yet."
            })
        );
        return;
    }

    const fragment = document.createDocumentFragment();
    themes.forEach(theme => {
        fragment.appendChild(
            createSchemaElement(schemaConfig?.themeCard, {
                theme: {
                    ...theme,
                    className: buildClassName("theme-card", theme.classNames),
                    disabled: !theme.isReady
                },
                handlers: {
                    start: theme.isReady ? () => onStartTheme?.(theme.id) : null
                }
            })
        );
    });

    container.appendChild(fragment);
}

function createSchemaElement(definition, bindings = {}) {
    if (!definition) {
        throw new Error("Screen runtime schema definition is missing.");
    }

    const factory = createSceneUiFactory();
    return factory.createElement(
        compileSceneSchema(
            resolveSceneSchema(definition, bindings)
        )
    );
}

function buildClassName(baseClass, classNames = []) {
    return [baseClass, ...(classNames ?? [])].filter(Boolean).join(" ");
}
