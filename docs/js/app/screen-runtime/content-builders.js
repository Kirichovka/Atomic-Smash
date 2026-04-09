import { createSceneUiFactory } from "../scene-ui/factory.js";
import { compileSceneSchema, sceneButton, sceneContainer, sceneText } from "../scene-ui/schema.js";

export function renderJournalCompoundCards({
    compounds,
    container,
    onOpenCompoundModal
}) {
    if (!container) {
        return;
    }

    container.replaceChildren();

    if (!compounds.length) {
        container.appendChild(createEmptyState("No compounds discovered yet."));
        return;
    }

    const factory = createSceneUiFactory();
    const fragment = document.createDocumentFragment();

    compounds.forEach(compound => {
        fragment.appendChild(
            factory.createElement(
                compileSceneSchema(
                    createJournalCompoundCardSchema(compound, onOpenCompoundModal)
                )
            )
        );
    });

    container.appendChild(fragment);
}

export function renderJournalElementCards({
    container,
    elements,
    onOpenElementModal,
    onSelectElement
}) {
    if (!container) {
        return;
    }

    container.replaceChildren();

    const factory = createSceneUiFactory();
    const fragment = document.createDocumentFragment();

    elements.forEach(element => {
        fragment.appendChild(
            factory.createElement(
                compileSceneSchema(
                    createJournalElementCardSchema(element, onSelectElement, onOpenElementModal)
                )
            )
        );
    });

    container.appendChild(fragment);
}

export function renderThemeCards({
    container,
    onStartTheme,
    themes
}) {
    if (!container) {
        return;
    }

    container.replaceChildren();

    if (!themes.length) {
        container.appendChild(createEmptyState("No themes available yet."));
        return;
    }

    const factory = createSceneUiFactory();
    const fragment = document.createDocumentFragment();

    themes.forEach(theme => {
        fragment.appendChild(
            factory.createElement(
                compileSceneSchema(
                    createThemeCardSchema(theme, onStartTheme)
                )
            )
        );
    });

    container.appendChild(fragment);
}

function createJournalCompoundCardSchema(compound, onOpenCompoundModal) {
    return sceneButton({
        className: "journal-card",
        on: {
            click: () => onOpenCompoundModal?.(compound.raw)
        },
        children: [
            sceneText({
                className: "journal-card-kicker",
                tagName: "div",
                text: "Discovered compound"
            }),
            sceneText({
                className: "journal-card-title",
                tagName: "div",
                text: compound.formula
            }),
            sceneText({
                className: "journal-card-subtitle",
                tagName: "div",
                text: compound.name
            }),
            sceneText({
                className: "journal-card-description",
                tagName: "div",
                text: compound.description
            }),
            sceneText({
                className: "journal-card-index",
                tagName: "div",
                text: compound.indexLabel
            })
        ]
    });
}

function createJournalElementCardSchema(element, onSelectElement, onOpenElementModal) {
    return sceneButton({
        attrs: {
            disabled: element.locked
        },
        classNames: ["journal-card", ...(element.locked ? ["locked"] : [])],
        on: element.locked ? {} : {
            click: () => {
                onSelectElement?.(element.symbol);
                onOpenElementModal?.(element.raw);
            }
        },
        children: [
            sceneText({
                className: "journal-card-kicker",
                tagName: "div",
                text: element.kicker
            }),
            sceneText({
                className: "journal-card-title",
                tagName: "div",
                text: element.title
            }),
            sceneText({
                className: "journal-card-subtitle",
                tagName: "div",
                text: element.name
            }),
            sceneText({
                className: "journal-card-description",
                tagName: "div",
                text: element.description
            }),
            sceneText({
                className: "journal-card-index",
                tagName: "div",
                text: element.status
            })
        ]
    });
}

function createThemeCardSchema(theme, onStartTheme) {
    return sceneContainer({
        classNames: ["theme-card", ...theme.classNames],
        tagName: "article",
        children: [
            sceneText({
                className: "theme-card-kicker",
                tagName: "div",
                text: theme.kicker
            }),
            sceneText({
                className: "theme-card-name",
                tagName: "div",
                text: theme.name
            }),
            sceneText({
                className: "theme-card-description",
                tagName: "div",
                text: theme.description
            }),
            sceneText({
                className: "theme-card-progress",
                tagName: "div",
                text: theme.progress
            }),
            sceneText({
                className: "theme-card-meta",
                tagName: "div",
                text: theme.meta
            }),
            sceneButton({
                attrs: {
                    disabled: !theme.isReady
                },
                on: theme.isReady ? {
                    click: () => onStartTheme?.(theme.id)
                } : {},
                text: theme.actionLabel
            })
        ]
    });
}

function createEmptyState(message) {
    const factory = createSceneUiFactory();
    return factory.createElement(
        compileSceneSchema(
            sceneText({
                className: "empty-state",
                tagName: "div",
                text: message
            })
        )
    );
}
