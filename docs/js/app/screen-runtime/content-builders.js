import { createSceneUiFactory } from "../scene-ui/factory.js";
import { compileSceneSchema, resolveSceneSchema } from "../scene-ui/schema.js";

export function renderJournalCompoundCards({
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

export function renderJournalElementCards({
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

    const fragment = document.createDocumentFragment();
    elements.forEach(element => {
        fragment.appendChild(
            createSchemaElement(schemaConfig?.journalElementCard, {
                element: {
                    ...element,
                    className: buildClassName("journal-card", element.locked ? ["locked"] : [])
                },
                handlers: {
                    open: element.locked
                        ? null
                        : () => {
                            onSelectElement?.(element.symbol);
                            onOpenElementModal?.(element.raw);
                        }
                }
            })
        );
    });

    container.appendChild(fragment);
}

export function renderThemeCards({
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
