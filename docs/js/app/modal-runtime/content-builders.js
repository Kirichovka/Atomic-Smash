import { createSceneUiFactory } from "../scene-ui/factory.js";
import { compileSceneSchema, resolveSceneSchema } from "../scene-ui/schema.js";

const COMPOUND_ATOM_COLORS = {
    C: "#1f2937",
    Ca: "#d97706",
    Cl: "#22c55e",
    Fe: "#b45309",
    H: "#7dd3fc",
    K: "#8b5cf6",
    Mg: "#14b8a6",
    N: "#4f46e5",
    Na: "#f59e0b",
    O: "#fb7185",
    P: "#f97316",
    S: "#facc15"
};

export function createModalRuntimeContentBuilder() {
    return {
        renderCompoundModalContent,
        renderElementModalContent,
        renderHelpModalContent,
        renderLevelCompleteContent,
        renderLevelIntroContent,
        renderThemeCompleteContent,
        renderValencyModalContent
    };
}

function renderLevelIntroContent({
    actionId,
    actionLabel,
    actionRegistry,
    compound,
    container,
    briefing,
    level,
    mechanic,
    theme,
    themeOverview,
    schemaConfig
}) {
    if (!container) {
        return;
    }

    const root = createSchemaElement(schemaConfig?.levelIntro, {
        handlers: {
            start: {
                action: actionId
            }
        },
        intro: {
            actionLabel,
            disabled: actionLabel === "Locked",
            kicker: `${theme.name} | ${briefing?.mechanicName ?? mechanic?.name ?? "Mechanic briefing"}`,
            summary: compound
                ? `Target outcome: ${compound.formula} (${compound.name}).`
                : "This lesson opens a new concept in the current route.",
            title: briefing?.introTitle ?? level.displayTitle ?? level.objective
        }
    }, actionRegistry);

    const panelsSlot = root.querySelector("[data-level-intro-panels-slot='true']");
    if (panelsSlot) {
        panelsSlot.appendChild(
            createSchemaElement(schemaConfig?.levelIntroPanel, {
                panel: {
                    body: briefing?.mechanicSummary
                        ?? level.learningFocus
                        ?? mechanic?.description
                        ?? "Open the level and complete the current chemistry challenge.",
                    title: "Goal"
                }
            })
        );
    }

    container.replaceChildren(root);
}

function renderElementModalContent({
    container,
    element,
    schemaConfig
}) {
    if (!container || !element) {
        return;
    }

    const root = createSchemaElement(schemaConfig?.elementModal, {
        element: {
            description: element.detailDescription ?? element.description,
            kicker: "Element reference",
            meta: buildElementMeta(element),
            name: element.name,
            symbol: element.symbol
        }
    });

    const factsSlot = root.querySelector("[data-element-modal-facts-slot='true']");
    if (factsSlot) {
        factsSlot.appendChild(
            createElementModalPanel({
                items: [
                    {
                        label: "Atomic number",
                        value: Number.isFinite(element.atomicNumber) ? String(element.atomicNumber) : "Unknown"
                    },
                    {
                        label: "Category",
                        value: formatCategoryLabel(element.chemicalCategory)
                    },
                    {
                        label: "Phase",
                        value: element.phase ?? "Unknown"
                    },
                    {
                        label: "Melting point",
                        value: element.meltingPoint ?? "No standard value"
                    },
                    {
                        label: "Freezing point",
                        value: element.freezingPoint ?? "No standard value"
                    },
                    {
                        label: "Boiling point",
                        value: element.boilingPoint ?? "No standard value"
                    }
                ],
                title: "Quick Facts"
            })
        );
    }

    const propertiesSlot = root.querySelector("[data-element-modal-properties-slot='true']");
    if (propertiesSlot) {
        propertiesSlot.appendChild(
            createElementModalPanel({
                items: [
                    {
                        label: "Radioactive",
                        value: element.radioactivityLabel ?? (element.radioactive ? "Yes" : "No")
                    },
                    {
                        label: "Conductivity",
                        value: element.electricalConductivity ?? "Unknown"
                    },
                    {
                        label: "Behavior in air",
                        value: element.airBehavior ?? "Unknown"
                    },
                    {
                        label: "Appearance",
                        value: element.appearance ?? "Unknown"
                    },
                    {
                        label: "Electron configuration",
                        value: element.electronConfiguration ?? "Unknown"
                    },
                    {
                        label: "Density",
                        value: element.density ?? "Unknown"
                    }
                ],
                title: "Properties"
            })
        );
    }

    const storySlot = root.querySelector("[data-element-modal-story-slot='true']");
    if (storySlot) {
        storySlot.appendChild(
            createElementModalPanel({
                items: [
                    {
                        label: "Interesting note",
                        value: element.funFact ?? `${element.name} is part of the full chemistry reference.`
                    }
                ],
                title: "Interesting"
            })
        );
    }

    container.replaceChildren(root);
}

function renderCompoundModalContent({
    compound,
    container,
    schemaConfig
}) {
    if (!container || !compound) {
        return;
    }

    const presentation = buildCompoundPresentation(compound);
    const root = createSchemaElement(schemaConfig?.compoundModal, {
        compound: {
            description: presentation.description,
            formula: compound.formula,
            journalNote: "Saved to your journal. Open the archive any time to revisit the full entry.",
            kicker: "Discovery complete",
            name: compound.name,
            subtitle: presentation.subtitle
        }
    });

    applyCompoundTheme(root, presentation.theme);

    const pillsSlot = root.querySelector("[data-compound-pills-slot='true']");
    presentation.pills.forEach(pill => {
        pillsSlot?.appendChild(createCompoundModalPill(pill));
    });

    const visualSlot = root.querySelector("[data-compound-visual-slot='true']");
    if (visualSlot) {
        visualSlot.appendChild(createCompoundVisual(compound, presentation));
    }

    const panelsSlot = root.querySelector("[data-compound-panels-slot='true']");
    if (panelsSlot) {
        [
            {
                body: presentation.context,
                title: "Real-World Snapshot"
            },
            {
                body: presentation.note,
                title: "Chemistry Note"
            },
            {
                body: presentation.ingredientBreakdown,
                title: "Built From"
            }
        ].forEach(panel => {
            panelsSlot.appendChild(createCompoundModalPanel(panel));
        });
    }

    container.replaceChildren(root);
}

function renderLevelCompleteContent({
    completedLevelNumber,
    compound,
    container,
    nextCompound,
    nextLevel,
    theme
}) {
    if (!container || !compound || !nextLevel || !theme) {
        return;
    }

    const shell = document.createElement("section");
    shell.className = "level-complete-shell";

    const kicker = document.createElement("div");
    kicker.className = "level-complete-kicker";
    kicker.textContent = `${theme.name} | Level complete`;

    const title = document.createElement("h2");
    title.id = "level-complete-title";
    title.className = "level-complete-heading";
    title.textContent = `Level ${completedLevelNumber} cleared`;

    const description = document.createElement("p");
    description.className = "level-complete-description";
    description.textContent =
        `You built ${compound.formula} (${compound.name}). ` +
        "Do you want to continue straight into the next level or stay here and keep experimenting?";

    const nextPanel = document.createElement("section");
    nextPanel.className = "level-complete-next-panel";

    const nextLabel = document.createElement("div");
    nextLabel.className = "level-complete-next-label";
    nextLabel.textContent = "Next level";

    const nextTitle = document.createElement("div");
    nextTitle.className = "level-complete-next-title";
    nextTitle.textContent = nextLevel.displayTitle ?? nextLevel.objective;

    const nextMeta = document.createElement("div");
    nextMeta.className = "level-complete-next-meta";
    nextMeta.textContent = nextCompound
        ? `Target: ${nextCompound.formula} (${nextCompound.name})`
        : "A new chemistry target is ready.";

    nextPanel.append(nextLabel, nextTitle, nextMeta);

    const actions = document.createElement("div");
    actions.className = "level-complete-actions";

    const stayButton = document.createElement("button");
    stayButton.type = "button";
    stayButton.className = "level-complete-stay";
    stayButton.dataset.levelCompleteAction = "stay";
    stayButton.textContent = "Stay Here";

    const nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.className = "level-complete-next";
    nextButton.dataset.levelCompleteAction = "next";
    nextButton.textContent = "Next Level";

    actions.append(stayButton, nextButton);
    shell.append(kicker, title, description, nextPanel, actions);
    container.replaceChildren(shell);
}

function renderThemeCompleteContent({
    bonusUnlockMessage,
    container,
    learnedLabels,
    theme,
    elementLabels,
    schemaConfig
}) {
    if (!container || !theme) {
        return;
    }

    const root = createSchemaElement(schemaConfig?.themeComplete, {
        note: bonusUnlockMessage ?? "",
        theme: {
            description:
                `You cleared every task in the ${theme.name} section. ` +
                "Your next step is to choose another theme and keep building new compounds.",
            kicker: "Section complete",
            title: `Congratulations! You finished ${theme.name}`
        }
    });

    const panelsSlot = root.querySelector("[data-theme-complete-panels-slot='true']");
    if (panelsSlot) {
        appendThemeCompletePanel({
            body: `You completed the ${theme.name} section and practiced the main compounds from this topic.`,
            container: panelsSlot,
            labels: learnedLabels,
            schemaConfig,
            title: "What You Learned"
        });
        appendThemeCompletePanel({
            body: "These are the elements you worked with while clearing this theme.",
            container: panelsSlot,
            labels: elementLabels,
            schemaConfig,
            title: "Elements In This Section"
        });
    }

    container.replaceChildren(root);
}

function renderHelpModalContent({
    compound,
    container,
    helpVisual,
    schemaConfig
}) {
    if (!container || !compound) {
        return;
    }

    const root = createSchemaElement(schemaConfig?.helpModal, {
        help: {
            description:
                "Follow the animated path: start from one highlighted atom and drag through the glowing connection order.",
            kicker: "Help is here",
            title: `Build ${compound.formula} the right way`
        }
    });

    const visualContainer = root.querySelector("[data-help-visual-slot='true']");
    if (visualContainer && helpVisual) {
        visualContainer.appendChild(helpVisual);
    }

    container.replaceChildren(root);
}

function renderValencyModalContent({
    container,
    validation,
    schemaConfig
}) {
    if (!container || !validation) {
        return;
    }

    const root = createSchemaElement(schemaConfig?.valencyModal, {
        valency: {
            description: "Fix the highlighted atom before mixing.",
            kicker: "Valency check failed",
            title: "Too many bonds"
        }
    });

    const panelsSlot = root.querySelector("[data-valency-panels-slot='true']");
    if (panelsSlot) {
        appendValencyPanel({
            body: "Remove or rearrange one connection, then try again.",
            container: panelsSlot,
            items: validation.issues ?? [],
            listClassName: "valency-issue-list",
            mode: "issue",
            schemaConfig,
            title: "Check this atom"
        });
    }

    container.replaceChildren(root);
}

function appendThemeCompletePanel({
    body,
    container,
    labels,
    schemaConfig,
    title
}) {
    const panel = createSchemaElement(schemaConfig?.themeCompletePanel, {
        panel: {
            body,
            title
        }
    });
    const pillsSlot = panel.querySelector("[data-theme-complete-pills-slot='true']");
    labels.forEach(label => {
        pillsSlot?.appendChild(
            createSchemaElement(schemaConfig?.themeCompletePill, {
                pill: {
                    label
                }
            })
        );
    });
    container.appendChild(panel);
}

function appendValencyPanel({
    body,
    container,
    items,
    listClassName,
    mode,
    schemaConfig,
    title
}) {
    const panel = createSchemaElement(schemaConfig?.valencyPanel, {
        panel: {
            body,
            listClassName,
            title
        }
    });
    const itemsSlot = panel.querySelector("[data-valency-panel-items-slot='true']");

    if (mode === "issue") {
        items.forEach(issue => {
            itemsSlot?.appendChild(
                createSchemaElement(schemaConfig?.valencyIssueItem, {
                    issue: {
                        body: `Allowed: ${issue.allowedBonds}. Current: ${issue.actualBonds}.`,
                        symbol: issue.symbol,
                        title: `${issue.elementName} has too many bonds`
                    }
                })
            );
        });
    } else {
        items.forEach(element => {
            itemsSlot?.appendChild(
                createSchemaElement(schemaConfig?.valencyTheoryCard, {
                    element: {
                        body: element.valencyTheory ?? `${element.name} is limited to ${element.valency} single connections in this lab.`,
                        header: `${element.symbol} | valency ${element.valency}`,
                        title: element.name
                    }
                })
            );
        });
    }

    container.appendChild(panel);
}

function buildElementMeta(element) {
    const parts = [];

    if (Number.isFinite(element.atomicNumber)) {
        parts.push(`Atomic #${element.atomicNumber}`);
    }

    if (element.phase) {
        parts.push(`${element.phase} at room temperature`);
    }

    if (element.chemicalCategory) {
        parts.push(formatCategoryLabel(element.chemicalCategory));
    }

    return parts.join(" | ");
}

function createElementModalPanel({ items, title }) {
    const section = document.createElement("section");
    section.className = "element-modal-panel";

    const heading = document.createElement("div");
    heading.className = "element-modal-panel-title";
    heading.textContent = title;
    section.appendChild(heading);

    const list = document.createElement("div");
    list.className = "element-modal-stat-list";

    items.forEach(item => {
        list.appendChild(createElementModalStat(item));
    });

    section.appendChild(list);
    return section;
}

function createElementModalStat({ label, value }) {
    const article = document.createElement("article");
    article.className = "element-modal-stat";

    const labelNode = document.createElement("div");
    labelNode.className = "element-modal-stat-label";
    labelNode.textContent = label;

    const valueNode = document.createElement("div");
    valueNode.className = "element-modal-stat-value";
    valueNode.textContent = value;

    article.append(labelNode, valueNode);
    return article;
}

function createCompoundModalPanel({ body, title }) {
    const section = document.createElement("section");
    section.className = "compound-modal-panel";

    const heading = document.createElement("div");
    heading.className = "compound-modal-panel-title";
    heading.textContent = title;

    const text = document.createElement("div");
    text.className = "compound-modal-panel-body";
    text.textContent = body;

    section.append(heading, text);
    return section;
}

function createCompoundModalPill(text) {
    const pill = document.createElement("div");
    pill.className = "compound-modal-pill";
    pill.textContent = text;
    return pill;
}

function createCompoundVisual(compound, presentation) {
    const card = document.createElement("section");
    card.className = "compound-modal-visual-card";

    const badge = document.createElement("div");
    badge.className = "compound-modal-visual-badge";
    badge.textContent = "Molecule Preview";

    const svg = createCompoundVisualSvg(compound);
    svg.classList.add("compound-modal-visual-svg");

    const caption = document.createElement("div");
    caption.className = "compound-modal-visual-caption";
    caption.textContent = `${compound.atomCount ?? compound.ingredients.length} atoms | ${presentation.structureLabel}`;

    card.append(badge, svg, caption);
    return card;
}

function createCompoundVisualSvg(compound) {
    const structure = getCompoundPreviewStructure(compound);
    const width = 360;
    const height = 260;
    const positions = layoutCompoundPreviewNodes(structure, width, height);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("aria-hidden", "true");

    structure.edges.forEach(([fromIndex, toIndex], index) => {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.classList.add("compound-visual-bond");
        line.setAttribute("x1", positions[fromIndex].x);
        line.setAttribute("y1", positions[fromIndex].y);
        line.setAttribute("x2", positions[toIndex].x);
        line.setAttribute("y2", positions[toIndex].y);
        line.style.animationDelay = `${index * 0.12}s`;
        svg.appendChild(line);
    });

    structure.nodes.forEach((symbol, index) => {
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const halo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        const core = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        const color = getAtomVisualColor(symbol);

        group.classList.add("compound-visual-atom");
        group.setAttribute("transform", `translate(${positions[index].x} ${positions[index].y})`);
        group.style.animationDelay = `${index * 0.08}s`;

        halo.classList.add("compound-visual-atom-halo");
        halo.setAttribute("r", "34");
        halo.setAttribute("fill", hexToRgba(color, 0.18));
        halo.style.animationDelay = `${index * 0.08}s`;

        core.classList.add("compound-visual-atom-core");
        core.setAttribute("r", "26");
        core.setAttribute("fill", color);
        core.style.animationDelay = `${index * 0.08}s`;

        text.classList.add("compound-visual-atom-label");
        text.textContent = symbol;

        group.append(halo, core, text);
        svg.appendChild(group);
    });

    return svg;
}

function buildCompoundPresentation(compound) {
    const ingredientBreakdown = compound.ingredientBreakdown
        ?? compound.ingredients.join(", ");

    return {
        context: compound.discoveryContext
            ?? `${compound.name} gives you another strong comparison point in the compound journal.`,
        description: compound.discoveryDescription
            ?? compound.description
            ?? `${compound.name} is now added to your discovered compounds list.`,
        ingredientBreakdown,
        note: compound.discoveryNote
            ?? "Keep comparing formulas and structures to see how a tiny change in atoms can create a very different substance.",
        pills: [
            `${compound.atomCount ?? compound.ingredients.length} atoms`,
            ...buildCompoundPillLabels(compound),
            compound.structure ? "Shape checked" : "Formula matched"
        ],
        structureLabel: compound.structure
            ? "structured molecule"
            : "formula match",
        subtitle: compound.discoveryHeadline
            ?? "A new compound has been added to your chemistry collection.",
        theme: buildCompoundTheme(compound)
    };
}

function buildCompoundPillLabels(compound) {
    if (Array.isArray(compound.ingredientCounts) && compound.ingredientCounts.length > 0) {
        return compound.ingredientCounts.map(item => `${item.count}${item.symbol}`);
    }

    const counts = new Map();
    compound.ingredients.forEach(symbol => {
        counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
    });

    return [...counts.entries()].map(([symbol, count]) => `${count}${symbol}`);
}

function buildCompoundTheme(compound) {
    const uniqueSymbols = [...new Set(compound.ingredients)];
    const first = getAtomVisualColor(uniqueSymbols[0] ?? "");
    const second = getAtomVisualColor(uniqueSymbols[1] ?? uniqueSymbols[0] ?? "");

    return {
        accent: first,
        accentSoft: mixHexColors(first, "#ffffff", 0.72),
        glow: hexToRgba(first, 0.22),
        secondary: second
    };
}

function applyCompoundTheme(root, theme) {
    root.style.setProperty("--compound-accent", theme.accent);
    root.style.setProperty("--compound-accent-soft", theme.accentSoft);
    root.style.setProperty("--compound-secondary", theme.secondary);
    root.style.setProperty("--compound-glow", theme.glow);
}

function getCompoundPreviewStructure(compound) {
    if (compound.structure?.nodes?.length) {
        return {
            ...compound.structure,
            layoutHint: "structured"
        };
    }

    const nodes = compound.ingredients.slice();
    if (nodes.length <= 2) {
        const edges = [];
        for (let index = 0; index < nodes.length - 1; index += 1) {
            edges.push([index, index + 1]);
        }

        return {
            edges,
            layoutHint: "line",
            nodes
        };
    }

    const centerIndex = chooseCompoundPreviewCenterIndex(nodes);
    const edges = nodes
        .map((_, index) => index)
        .filter(index => index !== centerIndex)
        .map(index => [centerIndex, index]);

    const layoutHint = edges.length === 2 ? "bent" : "radial";
    return {
        centerIndex,
        edges,
        layoutHint,
        nodes
    };
}

function layoutCompoundPreviewNodes(structure, width, height) {
    const { centerIndex = 0, edges = [], layoutHint = "line", nodes = [] } = structure;
    const degrees = new Map(nodes.map((_, index) => [index, 0]));
    edges.forEach(([fromIndex, toIndex]) => {
        degrees.set(fromIndex, degrees.get(fromIndex) + 1);
        degrees.set(toIndex, degrees.get(toIndex) + 1);
    });

    const maxDegree = Math.max(...degrees.values(), 0);
    const centerX = width / 2;
    const centerY = height / 2 + 12;

    if (layoutHint === "line" || nodes.length <= 2) {
        return nodes.map((_, index) => ({
            x: width * (index === 0 ? 0.32 : 0.68),
            y: centerY
        }));
    }

    if (layoutHint === "bent" && nodes.length === 3) {
        const outerIndexes = nodes.map((_, index) => index).filter(index => index !== centerIndex);
        const angles = [-0.65, 0.65];
        const radius = 96;
        const positions = nodes.map(() => ({ x: centerX, y: centerY }));

        positions[centerIndex] = { x: centerX, y: centerY + 10 };
        outerIndexes.forEach((index, outerPosition) => {
            const angle = angles[outerPosition] ?? 0;
            positions[index] = {
                x: centerX + Math.sin(angle) * radius,
                y: centerY - Math.cos(angle) * radius + 8
            };
        });

        return positions;
    }

    if (layoutHint === "radial" || maxDegree > 2) {
        const positions = nodes.map(() => ({ x: centerX, y: centerY }));
        const outerIndexes = nodes.map((_, index) => index).filter(index => index !== centerIndex);
        const radius = nodes.length <= 4 ? 94 : 104;

        positions[centerIndex] = { x: centerX, y: centerY + 4 };
        outerIndexes.forEach((index, outerPosition) => {
            const angle = (-Math.PI / 2) + (outerPosition * ((2 * Math.PI) / Math.max(outerIndexes.length, 1)));
            positions[index] = {
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius
            };
        });

        return positions;
    }

    const gap = width / (nodes.length + 1);
    return nodes.map((_, index) => ({
        x: gap * (index + 1),
        y: centerY
    }));
}

function getAtomVisualColor(symbol) {
    return COMPOUND_ATOM_COLORS[symbol] ?? "#0f766e";
}

function chooseCompoundPreviewCenterIndex(nodes) {
    const preferredIndex = nodes.findIndex(symbol => symbol !== "H");
    if (preferredIndex >= 0) {
        return preferredIndex;
    }

    return Math.floor(nodes.length / 2);
}

function mixHexColors(primary, secondary, ratio = 0.5) {
    const left = hexToRgb(primary);
    const right = hexToRgb(secondary);
    const blend = {
        b: Math.round((left.b * (1 - ratio)) + (right.b * ratio)),
        g: Math.round((left.g * (1 - ratio)) + (right.g * ratio)),
        r: Math.round((left.r * (1 - ratio)) + (right.r * ratio))
    };

    return `#${[blend.r, blend.g, blend.b].map(channel => channel.toString(16).padStart(2, "0")).join("")}`;
}

function hexToRgb(value) {
    const normalized = String(value).replace("#", "");
    const expanded = normalized.length === 3
        ? normalized.split("").map(part => part + part).join("")
        : normalized;

    return {
        b: Number.parseInt(expanded.slice(4, 6), 16),
        g: Number.parseInt(expanded.slice(2, 4), 16),
        r: Number.parseInt(expanded.slice(0, 2), 16)
    };
}

function hexToRgba(value, alpha) {
    const color = hexToRgb(value);
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

function formatCategoryLabel(category) {
    if (typeof category !== "string" || !category.trim()) {
        return "Unknown";
    }

    return category
        .split(" ")
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function createSchemaElement(definition, bindings = {}, actionRegistry = {}) {
    if (!definition) {
        throw new Error("Modal runtime schema definition is missing.");
    }

    const factory = createSceneUiFactory();
    return factory.createElement(
        compileSceneSchema(
            resolveSceneSchema(definition, bindings, actionRegistry)
        )
    );
}
