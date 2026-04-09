import { createSceneUiFactory } from "../scene-ui/factory.js";
import { compileSceneSchema, resolveSceneSchema } from "../scene-ui/schema.js";

export function createNavigationRuntimeContentBuilder() {
    return {
        renderMenuSheetDots
    };
}

function renderMenuSheetDots({
    activeThemeId,
    container,
    onOpenThemeSheet,
    schemaConfig,
    themes
}) {
    if (!container) {
        return;
    }

    container.replaceChildren();

    const fragment = document.createDocumentFragment();
    themes.forEach((theme, index) => {
        fragment.appendChild(
            createSchemaElement(schemaConfig?.menuSheetDot, {
                dot: {
                    ariaLabel: `Open ${theme.name} sheet`,
                    className: buildDotClassName(theme.id === activeThemeId),
                    title: `${index + 1}. ${theme.name}`
                },
                handlers: {
                    open: () => onOpenThemeSheet?.(theme.id)
                }
            })
        );
    });

    container.appendChild(fragment);
}

function createSchemaElement(definition, bindings = {}) {
    if (!definition) {
        throw new Error("Navigation runtime schema definition is missing.");
    }

    const factory = createSceneUiFactory();
    return factory.createElement(
        compileSceneSchema(
            resolveSceneSchema(definition, bindings)
        )
    );
}

function buildDotClassName(isActive) {
    return ["home-sheet-dot", isActive ? "active" : null].filter(Boolean).join(" ");
}
