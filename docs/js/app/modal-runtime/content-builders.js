import { createSceneUiFactory } from "../scene-ui/factory.js";
import { compileSceneSchema, resolveSceneSchema, sceneButton, sceneContainer, sceneText } from "../scene-ui/schema.js";

export function renderLevelIntroContent({
    actionId,
    actionLabel,
    actionRegistry,
    compound,
    container,
    briefing,
    level,
    mechanic,
    theme,
    themeOverview
}) {
    if (!container) {
        return;
    }

    const factory = createSceneUiFactory();
    const definition = resolveSceneSchema(
        createLevelIntroSchema(actionId),
        {
            intro: {
                actionLabel,
                disabled: actionLabel === "Locked",
                kicker: `${theme.name} | ${briefing?.mechanicName ?? mechanic?.name ?? "Mechanic briefing"}`,
                summary: compound
                    ? `Target outcome: ${compound.formula} (${compound.name}).`
                    : "This lesson opens a new concept in the current route.",
                title: briefing?.introTitle ?? level.displayTitle ?? level.objective
            },
            panels: {
                detailsBody: compound
                    ? `${level.learningFocus ?? level.displayTitle ?? level.objective}. Target compound: ${compound.formula} (${compound.name}).`
                    : `${level.learningFocus ?? level.displayTitle ?? level.objective}.`,
                mechanicBody: briefing?.mechanicSummary
                    ?? mechanic?.description
                    ?? "This lesson currently uses the Connection Lab mechanic.",
                overviewBody: themeOverview ?? "This theme groups related beginner chemistry lessons into one route.",
                theoryBody: briefing?.theory
                    ?? theme.description
                    ?? "This lesson introduces a new chemistry concept for the current route."
            }
        },
        actionRegistry
    );

    container.replaceChildren(
        factory.createElement(
            compileSceneSchema(definition)
        )
    );
}

export function renderElementModalContent({
    container,
    element
}) {
    if (!container || !element) {
        return;
    }

    const factory = createSceneUiFactory();
    const definition = resolveSceneSchema(
        createElementModalSchema(),
        {
            element: {
                description: element.description,
                meta: "Available element | Drag into the mix zone to use",
                name: element.name,
                symbol: element.symbol
            }
        }
    );

    container.replaceChildren(
        factory.createElement(
            compileSceneSchema(definition)
        )
    );
}

export function renderCompoundModalContent({
    compound,
    container
}) {
    if (!container || !compound) {
        return;
    }

    const factory = createSceneUiFactory();
    const definition = resolveSceneSchema(
        createCompoundModalSchema(),
        {
            compound: {
                description: compound.description ?? `${compound.name} is now added to your discovered compounds list.`,
                formula: compound.formula,
                kicker: "Congratulations, you discovered",
                name: compound.name
            }
        }
    );

    container.replaceChildren(
        factory.createElement(
            compileSceneSchema(definition)
        )
    );
}

export function renderThemeCompleteContent({
    bonusUnlockMessage,
    container,
    learnedLabels,
    theme,
    elementLabels
}) {
    if (!container || !theme) {
        return;
    }

    const factory = createSceneUiFactory();
    const definition = resolveSceneSchema(
        createThemeCompleteSchema({
            hasNote: Boolean(bonusUnlockMessage),
            elementLabels,
            learnedLabels
        }),
        {
            note: bonusUnlockMessage ?? null,
            theme: {
                description:
                    `You cleared every task in the ${theme.name} section. ` +
                    "Your next step is to choose another theme and keep building new compounds.",
                elementsBody: "These are the elements you worked with while clearing this theme.",
                learnedBody: `You completed the ${theme.name} section and practiced the main compounds from this topic.`,
                learnedLabels,
                elementLabels,
                kicker: "Section complete",
                title: `Congratulations! You finished ${theme.name}`
            }
        }
    );

    container.replaceChildren(
        factory.createElement(
            compileSceneSchema(definition)
        )
    );
}

export function renderHelpModalContent({
    compound,
    container,
    helpVisual
}) {
    if (!container || !compound) {
        return;
    }

    const factory = createSceneUiFactory();
    const definition = resolveSceneSchema(
        createHelpModalSchema(),
        {
            help: {
                description:
                    "Follow the animated path: start from one highlighted atom and drag through the glowing connection order.",
                kicker: "Help is here",
                title: `Build ${compound.formula} the right way`
            }
        }
    );

    const root = factory.createElement(
        compileSceneSchema(definition)
    );
    const visualContainer = root.querySelector("[data-help-visual-slot='true']");
    if (visualContainer && helpVisual) {
        visualContainer.appendChild(helpVisual);
    }

    container.replaceChildren(root);
}

export function renderValencyModalContent({
    container,
    validation
}) {
    if (!container || !validation) {
        return;
    }

    const factory = createSceneUiFactory();
    const definition = resolveSceneSchema(
        createValencyModalSchema({
            elements: validation.elements ?? [],
            issues: validation.issues ?? []
        }),
        {
            valency: {
                description:
                    "The atoms can stay on the board, but this mix cannot be evaluated until each element follows its allowed number of single connections.",
                issueBody:
                    "These atoms currently have more single connections than the simplified lab rules allow.",
                issueTitle: "What is wrong",
                kicker: "Valency check failed",
                theoryBody:
                    "In this lab each line counts as one bond. Compare the current number of links with the allowed valency for each element below.",
                theoryTitle: "Valency theory",
                title: "This structure breaks valency rules"
            }
        }
    );

    container.replaceChildren(
        factory.createElement(
            compileSceneSchema(definition)
        )
    );
}

function createLevelIntroSchema(actionId) {
    return sceneContainer({
        children: [
            sceneText({
                className: "level-intro-kicker",
                tagName: "div",
                text: { bind: "intro.kicker" }
            }),
            sceneText({
                className: "level-intro-title",
                id: "level-intro-title",
                tagName: "div",
                text: { bind: "intro.title" }
            }),
            sceneText({
                className: "level-intro-summary",
                tagName: "div",
                text: { bind: "intro.summary" }
            }),
            createIntroPanelSchema("Theme Context", { bind: "panels.overviewBody" }),
            createIntroPanelSchema("Level Goal", { bind: "panels.detailsBody" }),
            createIntroPanelSchema("Lesson Theory", { bind: "panels.theoryBody" }),
            createIntroPanelSchema("Mechanic", { bind: "panels.mechanicBody" }),
            sceneContainer({
                className: "level-intro-actions",
                children: [
                    sceneButton({
                        className: "level-intro-action",
                        attrs: {
                            disabled: { bind: "intro.disabled" }
                        },
                        on: {
                            click: {
                                action: actionId
                            }
                        },
                        text: { bind: "intro.actionLabel" }
                    })
                ]
            })
        ]
    });
}

function createIntroPanelSchema(title, bodyBinding) {
    return sceneContainer({
        className: "level-intro-panel",
        tagName: "section",
        children: [
            sceneText({
                className: "level-intro-panel-title",
                tagName: "div",
                text: title
            }),
            sceneText({
                className: "level-intro-panel-text",
                tagName: "div",
                text: bodyBinding
            })
        ]
    });
}

function createElementModalSchema() {
    return sceneContainer({
        children: [
            sceneText({
                className: "element-modal-symbol",
                id: "element-modal-title",
                tagName: "div",
                text: { bind: "element.symbol" }
            }),
            sceneText({
                className: "element-modal-name",
                tagName: "div",
                text: { bind: "element.name" }
            }),
            sceneText({
                className: "element-modal-meta",
                tagName: "div",
                text: { bind: "element.meta" }
            }),
            sceneText({
                className: "element-modal-description",
                tagName: "div",
                text: { bind: "element.description" }
            })
        ]
    });
}

function createCompoundModalSchema() {
    return sceneContainer({
        children: [
            sceneText({
                className: "compound-modal-kicker",
                tagName: "div",
                text: { bind: "compound.kicker" }
            }),
            sceneText({
                className: "compound-modal-title",
                id: "compound-modal-title",
                tagName: "div",
                text: { bind: "compound.name" }
            }),
            sceneText({
                className: "compound-modal-formula",
                tagName: "div",
                text: { bind: "compound.formula" }
            }),
            sceneText({
                className: "compound-modal-description",
                tagName: "div",
                text: { bind: "compound.description" }
            })
        ]
    });
}

function createThemeCompleteSchema({ learnedLabels = [], elementLabels = [], hasNote = false } = {}) {
    const children = [
            sceneText({
                className: "theme-complete-kicker",
                tagName: "div",
                text: { bind: "theme.kicker" }
            }),
            sceneText({
                className: "theme-complete-title",
                id: "theme-complete-title",
                tagName: "div",
                text: { bind: "theme.title" }
            }),
            sceneText({
                className: "theme-complete-description",
                tagName: "div",
                text: { bind: "theme.description" }
            }),
            createCompletePanelSchema("What You Learned", { bind: "theme.learnedBody" }, learnedLabels),
            createCompletePanelSchema("Elements In This Section", { bind: "theme.elementsBody" }, elementLabels)
    ];

    if (hasNote) {
        children.push(
            sceneText({
                className: "theme-complete-note",
                tagName: "div",
                text: { bind: "note" }
            })
        );
    }

    return sceneContainer({
        children
    });
}

function createHelpModalSchema() {
    return sceneContainer({
        children: [
            sceneText({
                className: "help-modal-kicker",
                tagName: "div",
                text: { bind: "help.kicker" }
            }),
            sceneText({
                className: "help-modal-title",
                id: "help-modal-title",
                tagName: "div",
                text: { bind: "help.title" }
            }),
            sceneText({
                className: "help-modal-description",
                tagName: "div",
                text: { bind: "help.description" }
            }),
            sceneContainer({
                className: "help-visual",
                data: {
                    helpVisualSlot: "true"
                }
            })
        ]
    });
}

function createValencyModalSchema({ issues = [], elements = [] } = {}) {
    return sceneContainer({
        children: [
            sceneText({
                className: "valency-modal-kicker",
                tagName: "div",
                text: { bind: "valency.kicker" }
            }),
            sceneText({
                className: "valency-modal-title",
                id: "valency-modal-title",
                tagName: "div",
                text: { bind: "valency.title" }
            }),
            sceneText({
                className: "valency-modal-description",
                tagName: "div",
                text: { bind: "valency.description" }
            }),
            createValencyPanelSchema("issue", issues),
            createValencyPanelSchema("theory", elements)
        ]
    });
}

function createCompletePanelSchema(title, bodyBinding, labels = []) {
    return sceneContainer({
        className: "theme-complete-panel",
        tagName: "section",
        children: [
            sceneText({
                className: "theme-complete-panel-title",
                tagName: "div",
                text: title
            }),
            sceneText({
                className: "theme-complete-panel-text",
                tagName: "div",
                text: bodyBinding
            }),
            sceneContainer({
                className: "theme-complete-pill-list",
                children: labels.map(label => createPillSchema(label))
            })
        ]
    });
}

function createPillSchema(label) {
    return sceneText({
        className: "theme-complete-pill",
        tagName: "div",
        text: label
    });
}

function createValencyPanelSchema(type, items = []) {
    const titleBinding = type === "issue" ? { bind: "valency.issueTitle" } : { bind: "valency.theoryTitle" };
    const bodyBinding = type === "issue" ? { bind: "valency.issueBody" } : { bind: "valency.theoryBody" };

    return sceneContainer({
        className: "valency-panel",
        tagName: "section",
        children: [
            sceneText({
                className: "valency-panel-title",
                tagName: "div",
                text: titleBinding
            }),
            sceneText({
                className: "valency-panel-text",
                tagName: "div",
                text: bodyBinding
            }),
            sceneContainer({
                className: type === "issue" ? "valency-issue-list" : "valency-theory-list",
                children: type === "issue"
                    ? items.map(issue => createValencyIssueSchema(issue))
                    : items.map(element => createValencyTheorySchema(element))
            })
        ]
    });
}

function createValencyIssueSchema(issue) {
    return sceneContainer({
        className: "valency-issue-item",
        children: [
            sceneText({
                className: "valency-issue-symbol",
                tagName: "div",
                text: issue.symbol
            }),
            sceneText({
                className: "valency-issue-title",
                tagName: "div",
                text: `${issue.elementName} has ${issue.actualBonds} connections, but only ${issue.allowedBonds} are allowed`
            }),
            sceneText({
                className: "valency-issue-body",
                tagName: "div",
                text: `Node ${issue.nodeId} exceeds the allowed valency by ${issue.actualBonds - issue.allowedBonds}. Remove or rearrange some links before mixing.`
            })
        ]
    });
}

function createValencyTheorySchema(element) {
    return sceneContainer({
        className: "valency-theory-card",
        tagName: "article",
        children: [
            sceneText({
                className: "valency-theory-header",
                tagName: "div",
                text: `${element.symbol} | valency ${element.valency}`
            }),
            sceneText({
                className: "valency-theory-title",
                tagName: "div",
                text: element.name
            }),
            sceneText({
                className: "valency-theory-body",
                tagName: "div",
                text: element.valencyTheory ?? `${element.name} is limited to ${element.valency} single connections in this lab.`
            })
        ]
    });
}
