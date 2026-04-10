import { createSceneUiFactory } from "../scene-ui/factory.js";
import { compileSceneSchema, resolveSceneSchema } from "../scene-ui/schema.js";

export function createModalRuntimeContentBuilder() {
    return {
        renderCompoundModalContent,
        renderElementModalContent,
        renderHelpModalContent,
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
        [
            {
                body: themeOverview ?? "This theme groups related beginner chemistry lessons into one route.",
                title: "Theme Context"
            },
            {
                body: compound
                    ? `${level.learningFocus ?? level.displayTitle ?? level.objective}. Target compound: ${compound.formula} (${compound.name}).`
                    : `${level.learningFocus ?? level.displayTitle ?? level.objective}.`,
                title: "Level Goal"
            },
            {
                body: briefing?.theory
                    ?? theme.description
                    ?? "This lesson introduces a new chemistry concept for the current route.",
                title: "Lesson Theory"
            },
            {
                body: briefing?.mechanicSummary
                    ?? mechanic?.description
                    ?? "This lesson currently uses the Connection Lab mechanic.",
                title: "Mechanic"
            }
        ].forEach(panel => {
            panelsSlot.appendChild(
                createSchemaElement(schemaConfig?.levelIntroPanel, {
                    panel
                })
            );
        });
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

    container.replaceChildren(
        createSchemaElement(schemaConfig?.elementModal, {
            element: {
                description: element.description,
                meta: "Available element | Drag into the mix zone to use",
                name: element.name,
                symbol: element.symbol
            }
        })
    );
}

function renderCompoundModalContent({
    compound,
    container,
    schemaConfig
}) {
    if (!container || !compound) {
        return;
    }

    container.replaceChildren(
        createSchemaElement(schemaConfig?.compoundModal, {
            compound: {
                description: compound.description ?? `${compound.name} is now added to your discovered compounds list.`,
                formula: compound.formula,
                kicker: "Congratulations, you discovered",
                name: compound.name
            }
        })
    );
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
            description:
                "The atoms can stay on the board, but this mix cannot be evaluated until each element follows its allowed number of single connections.",
            kicker: "Valency check failed",
            title: "This structure breaks valency rules"
        }
    });

    const panelsSlot = root.querySelector("[data-valency-panels-slot='true']");
    if (panelsSlot) {
        appendValencyPanel({
            body: "These atoms currently have more single connections than the simplified lab rules allow.",
            container: panelsSlot,
            items: validation.issues ?? [],
            listClassName: "valency-issue-list",
            mode: "issue",
            schemaConfig,
            title: "What is wrong"
        });
        appendValencyPanel({
            body: "In this lab each line counts as one bond. Compare the current number of links with the allowed valency for each element below.",
            container: panelsSlot,
            items: validation.elements ?? [],
            listClassName: "valency-theory-list",
            mode: "theory",
            schemaConfig,
            title: "Valency theory"
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
                        body: `Node ${issue.nodeId} exceeds the allowed valency by ${issue.actualBonds - issue.allowedBonds}. Remove or rearrange some links before mixing.`,
                        symbol: issue.symbol,
                        title: `${issue.elementName} has ${issue.actualBonds} connections, but only ${issue.allowedBonds} are allowed`
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
