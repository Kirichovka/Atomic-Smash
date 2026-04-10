import { createSceneUiFactory } from "../scene-ui/factory.js";
import { compileSceneSchema, resolveSceneSchema } from "../scene-ui/schema.js";

export function createPaletteRuntimeContentBuilder() {
    return {
        renderPaletteElementCard,
        renderPaletteTiles
    };
}

function renderPaletteTiles({
    container,
    elements,
    selectedSymbol,
    schemaConfig
}) {
    if (!container) {
        return;
    }

    container.replaceChildren();

    if (!elements.length) {
        container.appendChild(
            createSchemaElement(schemaConfig?.paletteEmptyState, {
                message: "No elements are available in this task yet."
            })
        );
        return;
    }

    const fragment = document.createDocumentFragment();
    elements.forEach(element => {
        fragment.appendChild(
            createSchemaElement(schemaConfig?.paletteTile, {
                tile: {
                    className: buildPaletteTileClassName(element.symbol === selectedSymbol),
                    symbol: element.symbol,
                    title: element.name
                }
            })
        );
    });

    container.appendChild(fragment);
}

function renderPaletteElementCard({
    container,
    element,
    schemaConfig
}) {
    if (!container) {
        return;
    }

    container.replaceChildren();

    if (!element) {
        container.appendChild(
            createSchemaElement(schemaConfig?.elementCardEmptyState, {
                message: "Select an element to see its description."
            })
        );
        return;
    }

    container.appendChild(
        createSchemaElement(schemaConfig?.elementCard, {
            element: {
                description: element.description,
                meta: "Available element in the current task progression",
                name: element.name,
                symbol: element.symbol
            }
        })
    );
}

function createSchemaElement(definition, bindings = {}) {
    if (!definition) {
        throw new Error("Palette runtime schema definition is missing.");
    }

    const factory = createSceneUiFactory();
    return factory.createElement(
        compileSceneSchema(
            resolveSceneSchema(definition, bindings)
        )
    );
}

function buildPaletteTileClassName(isSelected) {
    return ["element-template", isSelected ? "selected" : null].filter(Boolean).join(" ");
}
